import type { RuleDefinition, RuleEvaluation, SourceCell, SourceCellId } from "../contracts/index.js";
import type { ImportedJobRelease } from "../import/index.js";
import { stableDigest } from "../import/index.js";
import { RULE_DEFINITIONS } from "./registry.js";

const metrics = ["burn_sheets", "liner_sheets", "liner_area", "liner_size", "coil_pc_count", "coil_lbs", "optimized_pc_count", "optimized_lbs"] as const;

const evaluation = (
  definition: RuleDefinition,
  job: ImportedJobRelease,
  snapshotId: string,
  outcome: RuleEvaluation["outcome"],
  reason: string,
  cells: readonly (SourceCell | undefined)[],
  detailKey = "default",
): RuleEvaluation => Object.freeze({
  evaluationId: `eval_${stableDigest(snapshotId, job.sourceRecordId, definition.ruleId, definition.version, detailKey).slice(0, 28)}`,
  ruleId: definition.ruleId,
  ruleVersion: definition.version,
  jobReleaseId: job.jobReleaseId,
  outcome,
  disposition: definition.disposition,
  reason,
  exclusions: [],
  sourceCellIds: cells.filter((cell): cell is SourceCell => cell !== undefined).map((cell) => cell.sourceCellId as SourceCellId),
});

function boolValue(cell: SourceCell | undefined): boolean | null | "MALFORMED" {
  if (!cell || cell.presence === "BLANK" || cell.presence === "COLUMN_UNAVAILABLE") return null;
  return typeof cell.rawValue === "boolean" ? cell.rawValue : "MALFORMED";
}

function evaluate002(definition: RuleDefinition, job: ImportedJobRelease, snapshotId: string): RuleEvaluation {
  const ordered = job.sourceCells.buyout_ordered;
  const received = job.sourceCells.buyout_received;
  const vendor = job.sourceCells.vendor_po_composite;
  const orderedValue = boolValue(ordered);
  if (orderedValue === "MALFORMED") return evaluation(definition, job, snapshotId, "UNKNOWN_INSUFFICIENT_INPUT", "Buyout Ordered is malformed; no condition was asserted.", [ordered]);
  if (orderedValue !== true) return evaluation(definition, job, snapshotId, "NOT_APPLICABLE", "Buyout is not recorded as ordered true.", [ordered]);
  if (boolValue(received) === true) return evaluation(definition, job, snapshotId, "NOT_FIRED", "Buyout is recorded as ordered and received.", [ordered, received, vendor]);
  const detail = vendor?.presence === "VALUE" ? "Vendor/PO source reference is present." : "Vendor/PO source reference is absent in source.";
  return evaluation(definition, job, snapshotId, "FIRED", `Buyout is recorded as ordered; received is ${received?.presence ?? "unavailable"}. ${detail}`, [ordered, received, vendor]);
}

function evaluate003(definition: RuleDefinition, job: ImportedJobRelease, snapshotId: string): RuleEvaluation {
  const channels = [
    ["Coil", job.sourceCells.coil_pc_count, job.sourceCells.coil_lbs],
    ["Optimized", job.sourceCells.optimized_pc_count, job.sourceCells.optimized_lbs],
  ] as const;
  const fired = channels.filter(([, pieces, pounds]) =>
    pieces?.presence === "VALUE" && typeof pieces.rawValue === "number" && pieces.rawValue > 0 && pounds?.presence !== "VALUE",
  );
  if (fired.length === 0) return evaluation(definition, job, snapshotId, "NOT_FIRED", "No positive piece channel lacks a numeric recorded pounds value.", channels.flatMap(([, pieces, pounds]) => [pieces, pounds]));
  const reason = fired.map(([channel, pieces, pounds]) => `${channel} records ${String(pieces?.rawValue)} pieces while pounds are ${pounds?.presence ?? "unavailable"}; no pounds were inferred.`).join(" ");
  return evaluation(definition, job, snapshotId, "FIRED", reason, fired.flatMap(([, pieces, pounds]) => [pieces, pounds]), fired.map(([name]) => name).join("+"));
}

function eventDate(cell: SourceCell | undefined): number | null {
  if (!cell || cell.presence !== "VALUE") return null;
  if (cell.rawValue instanceof Date) return cell.rawValue.getTime();
  const match = String(cell.rawValue ?? "").match(/\b(1[0-2]|0?[1-9])\/(3[01]|[12]\d|0?[1-9])(?:\/(\d{2,4}))?\b/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const rawYear = match[3];
  const year = rawYear ? (rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear)) : 2025;
  return Date.UTC(year, month - 1, day);
}

function evaluate004(definition: RuleDefinition, job: ImportedJobRelease, snapshotId: string): RuleEvaluation {
  const cells = [job.sourceCells.scanned, job.sourceCells.calculated, job.sourceCells.invoiced];
  const labels = ["Scanned", "Calculated", "Invoiced"];
  const exact = cells.map((cell, index) => ({ cell, index, date: eventDate(cell) })).filter((item): item is { cell: SourceCell; index: number; date: number } => item.cell !== undefined && item.date !== null);
  if (exact.length < 2) return evaluation(definition, job, snapshotId, "NOT_APPLICABLE", "Fewer than two exact office-event dates are available.", cells);
  for (let index = 1; index < exact.length; index += 1) {
    const previous = exact[index - 1];
    const current = exact[index];
    if (previous && current && current.date < previous.date) {
      return evaluation(definition, job, snapshotId, "FIRED", `${labels[current.index]} is recorded before ${labels[previous.index]}; chronology is flagged for review, not declared erroneous.`, [previous.cell, current.cell], `${previous.index}-${current.index}`);
    }
  }
  return evaluation(definition, job, snapshotId, "NOT_FIRED", "Exact office-event dates are nondecreasing by label order.", exact.map((item) => item.cell));
}

function evaluate007(definition: RuleDefinition, job: ImportedJobRelease, snapshotId: string): RuleEvaluation {
  const reviewCells = metrics.map((field) => job.sourceCells[field]).filter((cell): cell is SourceCell =>
    cell !== undefined && ["EXPLICIT_NA", "SOURCE_ANNOTATION", "CROSS_PERIOD_ANNOTATION", "MALFORMED", "FORMULA_ERROR"].includes(cell.presence),
  );
  if (reviewCells.length === 0) return evaluation(definition, job, snapshotId, "NOT_FIRED", "No review-mode metric source state is present on this record.", metrics.map((field) => job.sourceCells[field]));
  const reason = reviewCells.map((cell) => `${cell.ref.canonicalField ?? cell.ref.headerRaw ?? cell.ref.address}: ${cell.presence}`).join("; ");
  return evaluation(definition, job, snapshotId, "FIRED", reason, reviewCells, reviewCells.map((cell) => cell.ref.canonicalField).join("+"));
}

export function evaluateJobRules(job: ImportedJobRelease, snapshotId: string): readonly RuleEvaluation[] {
  return RULE_DEFINITIONS.map((definition) => {
    if (definition.disposition === "BLOCKED") {
      return evaluation(definition, job, snapshotId, "DISABLED_BLOCKED", "Rule is blocked by Titan clarification and is non-operational.", []);
    }
    if (definition.ruleId === "OPS-AWR-002") return evaluate002(definition, job, snapshotId);
    if (definition.ruleId === "OPS-AWR-003") return evaluate003(definition, job, snapshotId);
    if (definition.ruleId === "OPS-AWR-004") return evaluate004(definition, job, snapshotId);
    return evaluate007(definition, job, snapshotId);
  });
}

export function operationalFindings(evaluations: readonly RuleEvaluation[]): readonly RuleEvaluation[] {
  return evaluations.filter((item) => item.disposition === "PROPOSED_REVIEW_MODE" && item.outcome === "FIRED");
}

