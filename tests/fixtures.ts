import type { PresenceState, SchemaEra } from "../src/contracts/index.js";
import type { RowEvidence } from "../src/import/index.js";

export const HEADERS_BY_ERA: Readonly<Record<SchemaEra, readonly string[]>> = {
  ERA_2025_JAN_MAR: [
    "Job #", "Customer", "PO", "Job 0me", "Due Day", "Due Date", "Due Time",
    "Buyout Ordered", "Vendor & PO #", "Buyout Rcvd", "Status", "Delivery Will Call",
    "DLV Day/Date", "DLV Time", "Notes", "Entered", "Burn Sheets", "Liner Sheets",
    "Liner Area", "Liner Size", "Coil Duct PC Count", "Coil LBS", "Optimized PC Count",
    "Optimized LBS", "DLV Contact", "Phone Number", "Text", "Job Total", "Notes",
  ],
  ERA_2025_APR_JUN: [
    "Job #", "Customer", "PO", "Job Name", "Due Day", "Due Date", "Due Time",
    "Buyout Ordered", "Vendor & PO #", "Buyout Rcvd", "Status", "Delivery Will Call",
    "DLV Day/Date", "DLV Time", "Notes", "Entered", "Burn Sheets", "Liner Sheets",
    "Liner Area", "Liner Size", "Coil Duct PC Count", "Coil LBS", "Optimized PC Count",
    "Optimized LBS", "DLV Contact", "Phone Number", "Text", "Notes",
  ],
  ERA_2025_JUL_AUG: [
    "Job #", "Customer", "PO", "Job Name", "Priority", "Due Day", "Due Date", "Due Time",
    "Buyout Ordered", "Vendor & PO #", "Buyout Rcvd", "Status", "Delivery Will Call",
    "DLV Day/Date", "DLV Time", "Notes", "Exposed", "Entered", "Burn Sheets", "Liner Sheets",
    "Liner Area", "Liner Size", "Coil Duct PC Count", "Coil LBS", "Optimized PC Count",
    "Optimized LBS", "DLV Contact", "Phone Number", "Text when Complete", "Notes",
  ],
  ERA_2025_SEP: [
    "Job #", "Customer", "PO", "Job Name", "Priority", "Due Day", "Due Date", "Due Time",
    "Buyout Ordered", "Vendor & PO #", "Buyout Rcvd", "STATUS", "Delivery Will Call",
    "DLV Day/Date", "DLV Time", "Notes", "Exposed", "Entered", "Burn Sheets", "Liner Sheets",
    "Liner Area", "Liner Size", "Coil Duct PC Count", "Coil LBS", "Optimized PC Count",
    "Optimized LBS", "DLV Contact", "Phone Number", "Text", "Notes", "Scanned (Date/Who)",
    "Calculated (Date/Who)", "Invoiced (Date/Who)",
  ],
  ERA_2025_OCT_DEC: [
    "Job #", "Customer", "PO", "Job Name", "Priority", "Due Day", "Due Date", "Due Time",
    "Buyout Ordered", "Vendor & PO #", "Buyout Rcvd", "STATUS", "Delivery Will Call",
    "DLV Day/Date", "DLV Time", "Notes", "Exposed", "Entered", "Burn Sheets", "Liner Sheets",
    "Liner Area", "Liner Size", "Coil Duct PC Count", "Coil LBS", "Optimized PC Count",
    "Optimized LBS", "DLV Contact", "Phone Number", "Text", "Notes (OFFICE ONLY)",
    "Scanned (Date/Who)", "Calculated (Date/Who)", "Invoiced (Date/Who)",
  ],
};

const baseRow: RowEvidence = {
  customer: null,
  po: null,
  jobName: null,
  dueDate: null,
  dueTime: null,
  status: null,
  deliveryMode: null,
  operationalNote: null,
  enteredBy: null,
  metricPresence: [],
  deliveryContact: null,
  phone: null,
  officeEvents: [],
  legacyJobNumber: null,
  defaultBooleanValuesOnly: false,
  structuralAnomaly: false,
  sourceSummaryFormulaOrLabel: false,
};

export const row = (overrides: Partial<RowEvidence> = {}): RowEvidence => ({ ...baseRow, ...overrides });

export const ALL_PRESENCE_STATES: readonly PresenceState[] = [
  "VALUE",
  "BLANK",
  "EXPLICIT_NA",
  "COLUMN_UNAVAILABLE",
  "SOURCE_ANNOTATION",
  "CROSS_PERIOD_ANNOTATION",
  "MALFORMED",
  "FORMULA",
  "FORMULA_ERROR",
];

