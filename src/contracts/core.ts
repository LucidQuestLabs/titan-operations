export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type SourceFileId = Brand<string, "SourceFileId">;
export type SourceCellId = Brand<string, "SourceCellId">;
export type SourceRecordId = Brand<string, "SourceRecordId">;
export type ImportBatchId = Brand<string, "ImportBatchId">;
export type SnapshotId = Brand<string, "SnapshotId">;
export type CustomerId = Brand<string, "CustomerId">;
export type CustomerAliasId = Brand<string, "CustomerAliasId">;
export type ProjectPoId = Brand<string, "ProjectPoId">;
export type JobReleaseId = Brand<string, "JobReleaseId">;

export type TruthClass =
  | "SOURCE_FACT"
  | "NORMALIZED_INTERPRETATION"
  | "DETERMINISTIC_DERIVED_RESULT"
  | "HUMAN_DECISION"
  | "AI_ADVISORY";

export type SchemaEra =
  | "ERA_2025_JAN_MAR"
  | "ERA_2025_APR_JUN"
  | "ERA_2025_JUL_AUG"
  | "ERA_2025_SEP"
  | "ERA_2025_OCT_DEC";

export type PresenceState =
  | "VALUE"
  | "BLANK"
  | "EXPLICIT_NA"
  | "COLUMN_UNAVAILABLE"
  | "SOURCE_ANNOTATION"
  | "CROSS_PERIOD_ANNOTATION"
  | "MALFORMED"
  | "FORMULA"
  | "FORMULA_ERROR";

export type ExcelDataType =
  | "blank"
  | "boolean"
  | "number"
  | "string"
  | "date"
  | "formula"
  | "error";

export interface SourceRef {
  readonly sourceFileId: SourceFileId;
  readonly fileName: string;
  readonly fileSha256: string;
  readonly sheetName: string;
  readonly row: number;
  readonly column: number;
  readonly address: string;
  readonly headerRaw: string | null;
  readonly canonicalField: string | null;
  readonly schemaEra: SchemaEra;
  readonly importBatchId: ImportBatchId;
}

export interface SourceCell<T = unknown> {
  readonly sourceCellId: SourceCellId;
  readonly ref: SourceRef;
  readonly excelDataType: ExcelDataType;
  readonly rawValue: T | null;
  readonly formulaText: string | null;
  readonly cachedValue: unknown | null;
  readonly displayText: string | null;
  readonly numberFormat: string | null;
  readonly mergedAnchor: boolean;
  readonly presence: PresenceState;
}

export interface NormalizedValue<T> {
  readonly value: T | null;
  readonly presence: PresenceState;
  readonly normalizerId: string;
  readonly normalizerVersion: string;
  readonly sourceCellIds: readonly SourceCellId[];
  readonly confidence: "EXACT" | "PARSED" | "AMBIGUOUS" | "UNPARSED";
  readonly anomalies: readonly string[];
}

export type RowClassification =
  | "JOB_RECORD"
  | "REVIEW_RECORD"
  | "PREFORMATTED_EMPTY"
  | "SOURCE_SUMMARY_ROW"
  | "EMPTY";

export interface RowClassificationResult {
  readonly classification: RowClassification;
  readonly reasons: readonly string[];
  readonly evidence: Readonly<Record<string, boolean>>;
}

export interface SourceFileRegistration {
  readonly sourceFileId: SourceFileId;
  readonly fileName: string;
  readonly path: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly importedAt: string;
  readonly importerVersion: string;
}

export interface ImportManifest {
  readonly importBatchId: ImportBatchId;
  readonly source: SourceFileRegistration;
  readonly snapshotId: SnapshotId;
  readonly importerVersion: string;
  readonly status: "DIAGNOSTIC" | "STAGED" | "PROMOTED" | "REJECTED";
  readonly fatalErrors: readonly string[];
  readonly warnings: readonly string[];
  readonly semanticSnapshotHash: string | null;
}

export interface AuditDecision {
  readonly decisionId: string;
  readonly state: "PROPOSED" | "ACCEPTED" | "REVISED" | "REJECTED" | "PROMOTED";
  readonly actor: string;
  readonly occurredAt: string;
  readonly sourceRefs: readonly SourceCellId[];
  readonly predecessorDecisionId: string | null;
}

