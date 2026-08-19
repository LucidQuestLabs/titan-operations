import type { ExcelDataType, PresenceState, SchemaEra } from "../contracts/index.js";

export interface PresenceInput {
  readonly fieldAvailable: boolean;
  readonly excelDataType: ExcelDataType;
  readonly rawValue: unknown;
  readonly formulaText?: string | null;
  readonly formulaError?: boolean;
  readonly metric: boolean;
}

const CROSS_PERIOD_PHRASES = new Set(["included with june numbers"]);

export function classifyPresence(input: PresenceInput): PresenceState {
  if (!input.fieldAvailable) return "COLUMN_UNAVAILABLE";
  if (input.formulaError || input.excelDataType === "error") return "FORMULA_ERROR";
  if (input.excelDataType === "formula" || input.formulaText) return "FORMULA";
  if (input.rawValue === null || input.rawValue === undefined) return "BLANK";
  if (typeof input.rawValue === "string" && input.rawValue.trim() === "") return "BLANK";
  if (!input.metric) return "VALUE";
  if (typeof input.rawValue === "number") return "VALUE";
  if (typeof input.rawValue !== "string") return "MALFORMED";

  const normalized = input.rawValue.trim().toLocaleLowerCase("en-US");
  if (normalized === "na") return "EXPLICIT_NA";
  if (CROSS_PERIOD_PHRASES.has(normalized)) return "CROSS_PERIOD_ANNOTATION";
  if (normalized === "?" || normalized === "`" || normalized === "backtick") return "SOURCE_ANNOTATION";
  return "MALFORMED";
}

export const PRESENCE_LABELS: Readonly<Record<PresenceState, string>> = {
  VALUE: "Value in source",
  BLANK: "Blank in source",
  EXPLICIT_NA: "NA in source",
  COLUMN_UNAVAILABLE: "Not collected in this period",
  SOURCE_ANNOTATION: "Source annotation",
  CROSS_PERIOD_ANNOTATION: "Attributed elsewhere in source",
  MALFORMED: "Malformed source value",
  FORMULA: "Formula result (source)",
  FORMULA_ERROR: "Source formula error",
};

export const UNAVAILABLE_FIELDS_BY_ERA: Readonly<Record<SchemaEra, readonly string[]>> = {
  ERA_2025_JAN_MAR: ["priority", "exposed", "scanned", "calculated", "invoiced", "office_only_note"],
  ERA_2025_APR_JUN: ["early_job_total_unmapped", "priority", "exposed", "scanned", "calculated", "invoiced", "office_only_note"],
  ERA_2025_JUL_AUG: ["early_job_total_unmapped", "scanned", "calculated", "invoiced", "office_only_note"],
  ERA_2025_SEP: ["early_job_total_unmapped", "office_only_note"],
  ERA_2025_OCT_DEC: ["early_job_total_unmapped", "secondary_note_unclassified"],
};

export function isFieldAvailable(era: SchemaEra, canonicalField: string): boolean {
  return !UNAVAILABLE_FIELDS_BY_ERA[era].includes(canonicalField);
}

