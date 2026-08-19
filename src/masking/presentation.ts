import type { PresenceState, RuleEvaluation } from "../contracts/index.js";
import type { ImportedJobRelease } from "../import/index.js";

export interface PresentationField<T = string | number | boolean> {
  readonly display: T | null;
  readonly presence: PresenceState;
  readonly normalizedDisplay?: T | null;
}

export interface OperationsPresentationDto {
  readonly mode: "INTERNAL_DATA" | "MASKED_DEMO";
  readonly snapshotId: string;
  readonly jobReleaseId: string;
  readonly sourceRecordId: string;
  readonly customerId: string | null;
  readonly customer: PresentationField;
  readonly projectPoId: string;
  readonly po: PresentationField;
  readonly jobName: PresentationField;
  readonly legacyJobNumber: PresentationField;
  readonly phone: PresentationField;
  readonly operationalNote: PresentationField;
  readonly officeOnlyNote: PresentationField;
  readonly dueDate: PresentationField;
  readonly dueDay: PresentationField;
  readonly dueTime: PresentationField;
  readonly priority: PresentationField;
  readonly status: PresentationField;
  readonly exposed: PresentationField;
  readonly buyoutOrdered: PresentationField;
  readonly vendorPoComposite: PresentationField;
  readonly buyoutReceived: PresentationField;
  readonly deliveryMode: PresentationField;
  readonly deliveryDayDate: PresentationField;
  readonly deliveryTime: PresentationField;
  readonly deliveryContact: PresentationField;
  readonly textFlag: PresentationField;
  readonly enteredBy: PresentationField;
  readonly officeEvents: Readonly<Record<"scanned" | "calculated" | "invoiced", PresentationField>>;
  readonly metrics: Readonly<Record<string, PresentationField>>;
  readonly findings: readonly RuleEvaluation[];
  readonly provenance: {
    readonly sourceFile: string;
    readonly sourceHash: string;
    readonly importBatchId: string;
    readonly sheetName: string;
    readonly rowNumber: number;
    readonly fields: readonly {
      readonly sourceCellId: string;
      readonly canonicalField: string;
      readonly address: string;
      readonly header: string | null;
      readonly excelType: string;
      readonly presence: PresenceState;
      readonly rawDisplay: string | null;
      readonly formulaText: string | null;
    }[];
  };
  readonly banner: string | null;
}

const field = (job: ImportedJobRelease, name: string): PresentationField => {
  const cell = job.sourceCells[name];
  return { display: cell?.displayText ?? null, presence: cell?.presence ?? "COLUMN_UNAVAILABLE" };
};
const normalizedField = (job: ImportedJobRelease, name: string, normalizedDisplay: string | null): PresentationField => ({ ...field(job, name), normalizedDisplay });

export function buildPresentationDto(job: ImportedJobRelease, snapshotId: string, findings: readonly RuleEvaluation[]): OperationsPresentationDto {
  const metrics = Object.fromEntries(["burn_sheets", "liner_sheets", "liner_area", "liner_size", "coil_pc_count", "coil_lbs", "optimized_pc_count", "optimized_lbs"].map((name) => [name, field(job, name)]));
  const first = Object.values(job.sourceCells)[0];
  const fields = Object.entries(job.sourceCells).map(([canonicalField, sourceCell]) => ({
    sourceCellId: sourceCell.sourceCellId,
    canonicalField,
    address: sourceCell.ref.address,
    header: sourceCell.ref.headerRaw,
    excelType: sourceCell.excelDataType,
    presence: sourceCell.presence,
    rawDisplay: sourceCell.displayText,
    formulaText: sourceCell.formulaText,
  }));
  return Object.freeze({
    mode: "INTERNAL_DATA",
    snapshotId,
    jobReleaseId: job.jobReleaseId,
    sourceRecordId: job.sourceRecordId,
    customerId: job.customerId,
    customer: normalizedField(job, "customer", job.customer.value),
    projectPoId: job.provisionalProjectPoId,
    po: normalizedField(job, "po", job.po.value),
    jobName: normalizedField(job, "job_name", job.jobName.value),
    legacyJobNumber: normalizedField(job, "legacy_job_number", job.legacyJobNumber.value),
    phone: field(job, "phone"),
    operationalNote: field(job, "operational_note"),
    officeOnlyNote: field(job, "office_only_note"),
    dueDate: field(job, "due_date"),
    dueDay: field(job, "due_day"),
    dueTime: field(job, "due_time"),
    priority: field(job, "priority"),
    status: normalizedField(job, "production_status", job.productionStatus.value),
    exposed: field(job, "exposed"),
    buyoutOrdered: field(job, "buyout_ordered"),
    vendorPoComposite: field(job, "vendor_po_composite"),
    buyoutReceived: field(job, "buyout_received"),
    deliveryMode: field(job, "delivery_mode"),
    deliveryDayDate: field(job, "delivery_day_date"),
    deliveryTime: field(job, "delivery_time"),
    deliveryContact: field(job, "delivery_contact"),
    textFlag: field(job, "text_flag"),
    enteredBy: field(job, "entered_by"),
    officeEvents: { scanned: field(job, "scanned"), calculated: field(job, "calculated"), invoiced: field(job, "invoiced") },
    metrics,
    findings,
    provenance: {
      sourceFile: first?.ref.fileName ?? "",
      sourceHash: first?.ref.fileSha256 ?? "",
      importBatchId: first?.ref.importBatchId ?? "",
      sheetName: first?.ref.sheetName ?? "",
      rowNumber: first?.ref.row ?? 0,
      fields,
    },
    banner: null,
  });
}
