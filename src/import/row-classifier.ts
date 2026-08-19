import type { PresenceState, RowClassificationResult } from "../contracts/index.js";

export interface RowEvidence {
  readonly customer: unknown;
  readonly po: unknown;
  readonly jobName: unknown;
  readonly dueDate: unknown;
  readonly dueTime: unknown;
  readonly status: unknown;
  readonly deliveryMode: unknown;
  readonly operationalNote: unknown;
  readonly enteredBy: unknown;
  readonly metricPresence: readonly PresenceState[];
  readonly deliveryContact: unknown;
  readonly phone: unknown;
  readonly officeEvents: readonly unknown[];
  readonly legacyJobNumber: unknown;
  readonly defaultBooleanValuesOnly: boolean;
  readonly structuralAnomaly: boolean;
  readonly sourceSummaryFormulaOrLabel: boolean;
}

const present = (value: unknown): boolean =>
  value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");

const anyPresent = (values: readonly unknown[]): boolean => values.some(present);

export function classifyRow(row: RowEvidence): RowClassificationResult {
  const identityEvidence = anyPresent([row.customer, row.po, row.jobName]);
  const scheduleEvidence = anyPresent([row.dueDate, row.dueTime]);
  const workflowEvidence = anyPresent([row.status, row.deliveryMode, row.operationalNote, row.enteredBy]);
  const productionEvidence = row.metricPresence.some((state) =>
    ["VALUE", "EXPLICIT_NA", "SOURCE_ANNOTATION", "CROSS_PERIOD_ANNOTATION", "MALFORMED", "FORMULA", "FORMULA_ERROR"].includes(state),
  );
  const contactEvidence = anyPresent([row.deliveryContact, row.phone]);
  const officeEvidence = anyPresent(row.officeEvents);
  const substantiveEvidence = identityEvidence || scheduleEvidence || workflowEvidence || productionEvidence || contactEvidence || officeEvidence;
  const evidence = {
    identityEvidence,
    scheduleEvidence,
    workflowEvidence,
    productionEvidence,
    contactEvidence,
    officeEvidence,
    structuralAnomaly: row.structuralAnomaly,
  };

  if (row.structuralAnomaly) {
    return { classification: "REVIEW_RECORD", reasons: ["Structural identity/source anomaly requires review"], evidence };
  }
  if (row.sourceSummaryFormulaOrLabel && !identityEvidence) {
    return { classification: "SOURCE_SUMMARY_ROW", reasons: ["Summary label/formula without job identity"], evidence };
  }
  if (identityEvidence && (scheduleEvidence || workflowEvidence || productionEvidence)) {
    return { classification: "JOB_RECORD", reasons: ["Identity plus substantive operational evidence"], evidence };
  }
  if (substantiveEvidence) {
    return { classification: "REVIEW_RECORD", reasons: ["Partial substantive evidence requires review"], evidence };
  }
  if (present(row.legacyJobNumber) || row.defaultBooleanValuesOnly) {
    return { classification: "PREFORMATTED_EMPTY", reasons: ["Only legacy Job #, default Boolean, or formatting evidence"], evidence };
  }
  return { classification: "EMPTY", reasons: ["No source evidence"], evidence };
}

