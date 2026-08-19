import type {
  CustomerId,
  ImportBatchId,
  JobReleaseId,
  NormalizedValue,
  PresenceState,
  SchemaEra,
  SnapshotId,
  SourceCell,
  SourceFileRegistration,
  SourceRecordId,
} from "../contracts/index.js";
import { classifyRow, type RowEvidence } from "./row-classifier.js";
import type { ExtractedRow, WorkbookExtraction } from "./workbook-reader.js";
import { candidateKey, normalizeIdentifier, normalizeText } from "./normalizers.js";
import { stableDigest } from "./source-registration.js";
import { ERA_BY_SHEET, validateHeaders, validateSheetInventory } from "./schema.js";

export interface ImportedJobRelease {
  readonly jobReleaseId: JobReleaseId;
  readonly sourceRecordId: SourceRecordId;
  readonly customerId: CustomerId | null;
  readonly provisionalProjectPoId: string;
  readonly groupingStatus: "PROVISIONAL";
  readonly legacyJobNumber: NormalizedValue<string>;
  readonly customer: NormalizedValue<string>;
  readonly po: NormalizedValue<string>;
  readonly jobName: NormalizedValue<string>;
  readonly productionStatus: NormalizedValue<string>;
  readonly schemaEra: SchemaEra;
  readonly sourceCells: Readonly<Record<string, SourceCell>>;
}

export interface ReviewLedgerEntry {
  readonly sheetName: string;
  readonly rowNumber: number;
  readonly classification: "REVIEW_RECORD" | "PREFORMATTED_EMPTY" | "SOURCE_SUMMARY_ROW" | "EMPTY";
  readonly reasons: readonly string[];
  readonly sourceCellIds: readonly string[];
}

export interface ImmutableImportSnapshot {
  readonly snapshotId: SnapshotId;
  readonly importBatchId: ImportBatchId;
  readonly source: SourceFileRegistration;
  readonly semanticSnapshotHash: string;
  readonly promotable: boolean;
  readonly fatalErrors: readonly string[];
  readonly warnings: readonly string[];
  readonly jobs: readonly ImportedJobRelease[];
  readonly reviewLedger: readonly ReviewLedgerEntry[];
  readonly sourceSummaryCells: readonly SourceCell[];
  readonly sourceCellsById: Readonly<Record<string, SourceCell>>;
  readonly counts: Readonly<Record<"JOB_RECORD" | "REVIEW_RECORD" | "PREFORMATTED_EMPTY" | "SOURCE_SUMMARY_ROW" | "EMPTY", number>>;
}

const value = (cell: SourceCell | undefined): unknown => cell?.rawValue ?? null;
const nonblank = (cell: SourceCell | undefined): boolean => cell !== undefined && cell.presence !== "BLANK";

function structuralAnomaly(row: ExtractedRow): boolean {
  const identity = [row.cells.legacy_job_number, row.cells.customer, row.cells.po].map((cell) => cell?.displayText ?? "");
  const events = [row.cells.scanned, row.cells.calculated, row.cells.invoiced].map((cell) => cell?.displayText ?? "");
  const duplicatesOfficeEvents = events.some(Boolean) && identity.filter(Boolean).length >= 2 && identity.filter(Boolean).every((entry) => events.includes(entry));
  const repeatedLongValues = new Map<string, string[]>();
  for (const [field, cell] of Object.entries(row.cells)) {
    const display = cell.displayText?.trim() ?? "";
    if (display.length < 20) continue;
    const fields = repeatedLongValues.get(display) ?? [];
    fields.push(field);
    repeatedLongValues.set(display, fields);
  }
  const repeatedAcrossCorruptedIdentity = [...repeatedLongValues.values()].some((fields) =>
    fields.length >= 4 && fields.filter((field) => ["legacy_job_number", "customer", "po", "job_name"].includes(field)).length >= 2,
  );
  return duplicatesOfficeEvents || repeatedAcrossCorruptedIdentity;
}

function evidenceFor(row: ExtractedRow): RowEvidence {
  const metrics = ["burn_sheets", "liner_sheets", "liner_area", "liner_size", "coil_pc_count", "coil_lbs", "optimized_pc_count", "optimized_lbs"];
  const booleanFields = [row.cells.buyout_ordered, row.cells.buyout_received, row.cells.text_flag, row.cells.exposed].filter(Boolean) as SourceCell[];
  const onlyDefaultBooleans = booleanFields.length > 0 && booleanFields.every((cell) => cell.rawValue === false) &&
    Object.entries(row.cells).every(([field, cell]) => ["legacy_job_number", "buyout_ordered", "buyout_received", "text_flag", "exposed"].includes(field) || cell.presence === "BLANK");
  const hasFormula = Object.values(row.cells).some((cell) => cell.presence === "FORMULA" || cell.presence === "FORMULA_ERROR");
  return {
    customer: value(row.cells.customer),
    po: value(row.cells.po),
    jobName: value(row.cells.job_name),
    dueDate: value(row.cells.due_date),
    dueTime: value(row.cells.due_time),
    status: value(row.cells.production_status),
    deliveryMode: value(row.cells.delivery_mode),
    operationalNote: value(row.cells.operational_note),
    enteredBy: value(row.cells.entered_by),
    metricPresence: metrics.map((field) => row.cells[field]?.presence ?? "BLANK" as PresenceState),
    deliveryContact: value(row.cells.delivery_contact),
    phone: value(row.cells.phone),
    officeEvents: [value(row.cells.scanned), value(row.cells.calculated), value(row.cells.invoiced)],
    legacyJobNumber: value(row.cells.legacy_job_number),
    defaultBooleanValuesOnly: onlyDefaultBooleans,
    structuralAnomaly: structuralAnomaly(row),
    sourceSummaryFormulaOrLabel: hasFormula && !nonblank(row.cells.customer) && !nonblank(row.cells.job_name),
  };
}

function requiredCell(row: ExtractedRow, field: string): SourceCell {
  const cell = row.cells[field];
  if (!cell) throw new Error(`Missing mapped field ${field} at ${row.sheetName}!${row.rowNumber}`);
  return cell;
}

export function buildSnapshot(
  extraction: WorkbookExtraction,
  source: SourceFileRegistration,
  importBatchId: ImportBatchId,
): ImmutableImportSnapshot {
  const fatalErrors = [...validateSheetInventory(extraction.sheetNames)];
  for (const [sheetName, era] of Object.entries(ERA_BY_SHEET)) {
    fatalErrors.push(...validateHeaders(sheetName, era, extraction.headersBySheet[sheetName] ?? []).map(
      (item) => `${item.sheetName}!column ${item.column} ${item.canonicalField}: expected ${item.expected.join("|")}, found ${item.actual ?? "<blank>"}`,
    ));
  }

  const jobs: ImportedJobRelease[] = [];
  const reviewLedger: ReviewLedgerEntry[] = [];
  const sourceCellsById: Record<string, SourceCell> = {};
  const counts = { JOB_RECORD: 0, REVIEW_RECORD: 0, PREFORMATTED_EMPTY: 0, SOURCE_SUMMARY_ROW: 0, EMPTY: 0 };
  for (const row of extraction.operationalRows) {
    for (const cell of Object.values(row.cells)) sourceCellsById[cell.sourceCellId] = cell;
    const result = classifyRow(evidenceFor(row));
    counts[result.classification] += 1;
    const sourceCellIds = Object.values(row.cells).map((cell) => cell.sourceCellId);
    if (result.classification !== "JOB_RECORD") {
      reviewLedger.push(Object.freeze({
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        classification: result.classification,
        reasons: result.reasons,
        sourceCellIds,
      }));
      continue;
    }

    const sourceRecordDigest = stableDigest(source.sha256, row.sheetName, String(row.rowNumber), "titan-ops-import-v0.1");
    const sourceRecordId = `record_${sourceRecordDigest.slice(0, 32)}` as SourceRecordId;
    const jobReleaseId = `job_${stableDigest("job-release", sourceRecordDigest).slice(0, 26)}` as JobReleaseId;
    const customerCell = requiredCell(row, "customer");
    const customerNormalized = normalizeText(customerCell);
    const customerId = customerNormalized.value === null
      ? null
      : `customer_${stableDigest("customer", candidateKey(customerNormalized.value)).slice(0, 24)}` as CustomerId;
    jobs.push(Object.freeze({
      jobReleaseId,
      sourceRecordId,
      customerId,
      provisionalProjectPoId: `project_${stableDigest("provisional-per-record", sourceRecordDigest).slice(0, 24)}`,
      groupingStatus: "PROVISIONAL",
      legacyJobNumber: normalizeIdentifier(requiredCell(row, "legacy_job_number")),
      customer: customerNormalized,
      po: normalizeIdentifier(requiredCell(row, "po")),
      jobName: normalizeText(requiredCell(row, "job_name")),
      productionStatus: normalizeText(requiredCell(row, "production_status")),
      schemaEra: row.schemaEra,
      sourceCells: row.cells,
    }));
  }
  for (const cell of extraction.summaryCells) sourceCellsById[cell.sourceCellId] = cell;

  const semanticSnapshotHash = stableDigest(
    source.sha256,
    ...jobs.map((job) => `${job.sourceRecordId}:${job.jobReleaseId}`),
    ...reviewLedger.filter((entry) => entry.classification !== "EMPTY").map((entry) => `${entry.sheetName}:${entry.rowNumber}:${entry.classification}`),
  );
  return Object.freeze({
    snapshotId: `snapshot_${semanticSnapshotHash.slice(0, 26)}` as SnapshotId,
    importBatchId,
    source,
    semanticSnapshotHash,
    promotable: fatalErrors.length === 0,
    fatalErrors: Object.freeze(fatalErrors),
    warnings: Object.freeze(["Source summary is UNRECONCILED and excluded from Job/Release projection"]),
    jobs: Object.freeze(jobs),
    reviewLedger: Object.freeze(reviewLedger),
    sourceSummaryCells: extraction.summaryCells,
    sourceCellsById: Object.freeze(sourceCellsById),
    counts: Object.freeze(counts),
  });
}
