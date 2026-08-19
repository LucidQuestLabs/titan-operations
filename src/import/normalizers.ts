import type {
  NormalizationHistory,
  NormalizationInterpretation,
  NormalizedValue,
  PresenceState,
  SourceCell,
  SourceCellId,
} from "../contracts/index.js";
import { stableDigest } from "./source-registration.js";

const VERSION = "0.1.0";

export function candidateKey(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

const sameSourceEvidence = (left: readonly SourceCellId[], right: readonly SourceCellId[]): boolean =>
  left.length === right.length && left.every((sourceCellId, index) => sourceCellId === right[index]);

function interpretation<T>(
  normalized: NormalizedValue<T>,
  supersedesInterpretationId: string | null,
): NormalizationInterpretation<T> {
  const interpretationId = `normalization_${stableDigest(
    supersedesInterpretationId ?? "origin",
    normalized.normalizerId,
    normalized.normalizerVersion,
    normalized.presence,
    JSON.stringify(normalized.value),
    normalized.confidence,
    ...normalized.sourceCellIds,
    ...normalized.anomalies,
  ).slice(0, 28)}`;
  return Object.freeze({
    ...normalized,
    sourceCellIds: Object.freeze([...normalized.sourceCellIds]),
    anomalies: Object.freeze([...normalized.anomalies]),
    interpretationId,
    supersedesInterpretationId,
  });
}

export function beginNormalizationHistory<T>(normalized: NormalizedValue<T>): NormalizationHistory<T> {
  const first = interpretation(normalized, null);
  return Object.freeze({
    sourceCellIds: first.sourceCellIds,
    currentInterpretationId: first.interpretationId,
    interpretations: Object.freeze([first]),
  });
}

export function supersedeNormalization<T>(
  history: NormalizationHistory<T>,
  successor: NormalizedValue<T>,
): NormalizationHistory<T> {
  if (!sameSourceEvidence(history.sourceCellIds, successor.sourceCellIds)) {
    throw new Error("Normalization supersession cannot substitute immutable source evidence.");
  }
  const next = interpretation(successor, history.currentInterpretationId);
  return Object.freeze({
    sourceCellIds: history.sourceCellIds,
    currentInterpretationId: next.interpretationId,
    interpretations: Object.freeze([...history.interpretations, next]),
  });
}

export function normalizedNull<T>(presence: PresenceState, sourceCellIds: readonly SourceCellId[] = []): NormalizedValue<T> {
  return Object.freeze({
    value: null,
    presence,
    normalizerId: "presence-only",
    normalizerVersion: VERSION,
    sourceCellIds,
    confidence: "UNPARSED",
    anomalies: [],
  });
}

export function normalizeText(cell: SourceCell): NormalizedValue<string> {
  if (cell.presence !== "VALUE") return normalizedNull(cell.presence, [cell.sourceCellId]);
  const source = cell.rawValue instanceof Date
    ? cell.rawValue.toISOString()
    : String(cell.rawValue ?? "");
  return Object.freeze({
    value: source.trim(),
    presence: "VALUE",
    normalizerId: "lexical-text",
    normalizerVersion: VERSION,
    sourceCellIds: [cell.sourceCellId],
    confidence: "EXACT",
    anomalies: [],
  });
}

export function normalizeIdentifier(cell: SourceCell): NormalizedValue<string> {
  if (cell.presence !== "VALUE") return normalizedNull(cell.presence, [cell.sourceCellId]);
  const value = typeof cell.rawValue === "number"
    ? Number.isInteger(cell.rawValue) ? String(cell.rawValue) : String(cell.rawValue)
    : String(cell.rawValue ?? "").trim();
  return Object.freeze({
    value,
    presence: "VALUE",
    normalizerId: "identifier-string",
    normalizerVersion: VERSION,
    sourceCellIds: [cell.sourceCellId],
    confidence: "EXACT",
    anomalies: [],
  });
}

export function normalizeBoolean(cell: SourceCell): NormalizedValue<boolean> {
  if (cell.presence !== "VALUE") return normalizedNull(cell.presence, [cell.sourceCellId]);
  if (typeof cell.rawValue !== "boolean") {
    return Object.freeze({
      ...normalizedNull<boolean>("MALFORMED", [cell.sourceCellId]),
      normalizerId: "excel-boolean-only",
      anomalies: ["Non-Boolean source value was not coerced"],
    });
  }
  return Object.freeze({
    value: cell.rawValue,
    presence: "VALUE",
    normalizerId: "excel-boolean-only",
    normalizerVersion: VERSION,
    sourceCellIds: [cell.sourceCellId],
    confidence: "EXACT",
    anomalies: [],
  });
}

export function normalizeNumber(cell: SourceCell): NormalizedValue<number | string> {
  if (cell.presence !== "VALUE") return normalizedNull(cell.presence, [cell.sourceCellId]);
  if (typeof cell.rawValue !== "number") {
    return Object.freeze({
      ...normalizedNull<number | string>("MALFORMED", [cell.sourceCellId]),
      normalizerId: "numeric-source-only",
      anomalies: ["Nonnumeric metric was not coerced"],
    });
  }
  return Object.freeze({
    value: cell.rawValue,
    presence: "VALUE",
    normalizerId: "numeric-source-only",
    normalizerVersion: VERSION,
    sourceCellIds: [cell.sourceCellId],
    confidence: "EXACT",
    anomalies: [],
  });
}

export function normalizeDate(cell: SourceCell): NormalizedValue<string> {
  if (cell.presence !== "VALUE") return normalizedNull(cell.presence, [cell.sourceCellId]);
  if (!(cell.rawValue instanceof Date)) {
    return Object.freeze({
      ...normalizedNull<string>("MALFORMED", [cell.sourceCellId]),
      normalizerId: "excel-date-only",
      confidence: "AMBIGUOUS",
      anomalies: ["Text/number date retained without semantic coercion"],
    });
  }
  return Object.freeze({
    value: cell.rawValue.toISOString().slice(0, 10),
    presence: "VALUE",
    normalizerId: "excel-date-only",
    normalizerVersion: VERSION,
    sourceCellIds: [cell.sourceCellId],
    confidence: "EXACT",
    anomalies: [],
  });
}
