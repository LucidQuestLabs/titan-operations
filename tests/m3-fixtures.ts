import type {
  CustomerId,
  ImportBatchId,
  JobReleaseId,
  NormalizedValue,
  PresenceState,
  SchemaEra,
  SnapshotId,
  SourceCell,
  SourceCellId,
  SourceFileId,
  SourceFileRegistration,
  SourceRecordId,
} from "../src/contracts/index.js";
import type { ImmutableImportSnapshot, ImportedJobRelease } from "../src/import/index.js";

const fileSha = "b".repeat(64);
const importBatchId = "batch_m3" as ImportBatchId;

export const cell = (
  field: string,
  rawValue: unknown,
  presence: PresenceState = rawValue === null ? "BLANK" : "VALUE",
  column = 1,
  sheetName = "Oct 2025",
  row = 10,
): SourceCell => ({
  sourceCellId: `cell_${field}_${row}` as SourceCellId,
  ref: {
    sourceFileId: "source_m3" as SourceFileId,
    fileName: "sanitized-fixture.xlsx",
    fileSha256: fileSha,
    sheetName,
    row,
    column,
    address: `${String.fromCharCode(64 + Math.min(column, 26))}${row}`,
    headerRaw: field,
    canonicalField: field,
    schemaEra: "ERA_2025_OCT_DEC",
    importBatchId,
  },
  excelDataType: presence === "BLANK" ? "blank" : typeof rawValue === "boolean" ? "boolean" : typeof rawValue === "number" ? "number" : "string",
  rawValue,
  formulaText: null,
  cachedValue: null,
  displayText: rawValue === null ? null : String(rawValue),
  numberFormat: null,
  mergedAnchor: false,
  presence,
});

const normalized = <T>(value: T | null, sourceCellId: SourceCellId, presence: PresenceState = value === null ? "BLANK" : "VALUE"): NormalizedValue<T> => ({
  value,
  presence,
  normalizerId: "fixture",
  normalizerVersion: "0.1.0",
  sourceCellIds: [sourceCellId],
  confidence: value === null ? "UNPARSED" : "EXACT",
  anomalies: [],
});

export const job = (id: string, overrides: Readonly<Record<string, SourceCell>> = {}): ImportedJobRelease => {
  const cells: Record<string, SourceCell> = {
    legacy_job_number: cell("legacy_job_number", id, "VALUE", 1),
    customer: cell("customer", `Customer ${id}`, "VALUE", 2),
    po: cell("po", `PO-${id}`, "VALUE", 3),
    job_name: cell("job_name", `Project ${id}`, "VALUE", 4),
    due_date: cell("due_date", "2025-10-03", "VALUE", 7),
    buyout_ordered: cell("buyout_ordered", false, "VALUE", 9),
    vendor_po_composite: cell("vendor_po_composite", null, "BLANK", 10),
    buyout_received: cell("buyout_received", false, "VALUE", 11),
    production_status: cell("production_status", "Building", "VALUE", 12),
    operational_note: cell("operational_note", "Sensitive note", "VALUE", 16),
    burn_sheets: cell("burn_sheets", 0, "VALUE", 19),
    liner_sheets: cell("liner_sheets", null, "BLANK", 20),
    liner_area: cell("liner_area", null, "BLANK", 21),
    liner_size: cell("liner_size", null, "BLANK", 22),
    coil_pc_count: cell("coil_pc_count", 0, "VALUE", 23),
    coil_lbs: cell("coil_lbs", null, "BLANK", 24),
    optimized_pc_count: cell("optimized_pc_count", 0, "VALUE", 25),
    optimized_lbs: cell("optimized_lbs", null, "BLANK", 26),
    phone: cell("phone", "555-0100", "VALUE", 28),
    office_only_note: cell("office_only_note", "Internal sensitive note", "VALUE", 30),
    scanned: cell("scanned", null, "BLANK", 31),
    calculated: cell("calculated", null, "BLANK", 32),
    invoiced: cell("invoiced", null, "BLANK", 33),
    ...overrides,
  };
  return {
    jobReleaseId: `job_${id}` as JobReleaseId,
    sourceRecordId: `record_${id}` as SourceRecordId,
    customerId: `customer_${id}` as CustomerId,
    provisionalProjectPoId: `project_${id}`,
    groupingStatus: "PROVISIONAL",
    legacyJobNumber: normalized(String(cells.legacy_job_number?.rawValue ?? ""), cells.legacy_job_number!.sourceCellId),
    customer: normalized(String(cells.customer?.rawValue ?? ""), cells.customer!.sourceCellId),
    po: normalized(String(cells.po?.rawValue ?? ""), cells.po!.sourceCellId),
    jobName: normalized(String(cells.job_name?.rawValue ?? ""), cells.job_name!.sourceCellId),
    productionStatus: normalized(String(cells.production_status?.rawValue ?? ""), cells.production_status!.sourceCellId),
    schemaEra: "ERA_2025_OCT_DEC" as SchemaEra,
    sourceCells: cells,
  };
};

export const snapshot = (jobs: readonly ImportedJobRelease[]): ImmutableImportSnapshot => {
  const source: SourceFileRegistration = {
    sourceFileId: "source_m3" as SourceFileId,
    fileName: "sanitized-fixture.xlsx",
    path: "sanitized-fixture.xlsx",
    sha256: fileSha,
    sizeBytes: 100,
    importedAt: "2026-08-19T00:00:00.000Z",
    importerVersion: "0.1.0",
  };
  const sourceCellsById = Object.fromEntries(jobs.flatMap((record) => Object.values(record.sourceCells)).map((sourceCell) => [sourceCell.sourceCellId, sourceCell]));
  return {
    snapshotId: "snapshot_m3" as SnapshotId,
    importBatchId,
    source,
    semanticSnapshotHash: "c".repeat(64),
    promotable: true,
    fatalErrors: [],
    warnings: [],
    jobs,
    reviewLedger: [],
    sourceSummaryCells: [],
    sourceCellsById,
    counts: { JOB_RECORD: jobs.length, REVIEW_RECORD: 0, PREFORMATTED_EMPTY: 0, SOURCE_SUMMARY_ROW: 0, EMPTY: 0 },
  };
};

