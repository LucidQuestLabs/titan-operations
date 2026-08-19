import type { SchemaEra } from "../contracts/index.js";

export type SheetKind = "SOURCE_SUMMARY" | "OPERATIONAL_LEDGER";

export const EXPECTED_SHEETS = [
  "Sheet1",
  "Jan 2025",
  "Feb 2025",
  "March 2025",
  "April 2025",
  "May 2025",
  "June 2025",
  "July 2025",
  "Aug 2025",
  "Sept 2025",
  "Oct 2025",
  "Nov 2025",
  "Dec 2025",
] as const;

export type ExpectedSheetName = (typeof EXPECTED_SHEETS)[number];

export const ERA_BY_SHEET: Readonly<Record<Exclude<ExpectedSheetName, "Sheet1">, SchemaEra>> = {
  "Jan 2025": "ERA_2025_JAN_MAR",
  "Feb 2025": "ERA_2025_JAN_MAR",
  "March 2025": "ERA_2025_JAN_MAR",
  "April 2025": "ERA_2025_APR_JUN",
  "May 2025": "ERA_2025_APR_JUN",
  "June 2025": "ERA_2025_APR_JUN",
  "July 2025": "ERA_2025_JUL_AUG",
  "Aug 2025": "ERA_2025_JUL_AUG",
  "Sept 2025": "ERA_2025_SEP",
  "Oct 2025": "ERA_2025_OCT_DEC",
  "Nov 2025": "ERA_2025_OCT_DEC",
  "Dec 2025": "ERA_2025_OCT_DEC",
};

export interface HeaderField {
  readonly canonicalField: string;
  readonly column: number;
  readonly acceptedHeaders: readonly string[];
}

const BASE_JAN_JUN: readonly HeaderField[] = [
  ["legacy_job_number", 1, ["JOB #", "Job #"]],
  ["customer", 2, ["Customer"]],
  ["po", 3, ["PO"]],
  ["job_name", 4, ["Job 0me", "Job Name"]],
  ["due_day", 5, ["Due Day"]],
  ["due_date", 6, ["Due Date"]],
  ["due_time", 7, ["Due Time"]],
  ["buyout_ordered", 8, ["Buyout Ordered"]],
  ["vendor_po_composite", 9, ["Vendor & PO #"]],
  ["buyout_received", 10, ["Buyout Rcvd"]],
  ["production_status", 11, ["Status"]],
  ["delivery_mode", 12, ["Delivery Will Call"]],
  ["delivery_day_date", 13, ["DLV Day/Date"]],
  ["delivery_time", 14, ["DLV Time"]],
  ["operational_note", 15, ["Notes"]],
  ["entered_by", 16, ["Entered"]],
  ["burn_sheets", 17, ["Burn Sheets"]],
  ["liner_sheets", 18, ["Liner Sheets"]],
  ["liner_area", 19, ["Liner Area"]],
  ["liner_size", 20, ["Liner Size"]],
  ["coil_pc_count", 21, ["Coil Duct PC Count"]],
  ["coil_lbs", 22, ["Coil LBS"]],
  ["optimized_pc_count", 23, ["Optimized PC Count"]],
  ["optimized_lbs", 24, ["Optimized LBS"]],
  ["delivery_contact", 25, ["DLV Contact"]],
  ["phone", 26, ["Phone Number"]],
  ["text_flag", 27, ["Text"]],
].map(([canonicalField, column, acceptedHeaders]) => ({ canonicalField, column, acceptedHeaders })) as readonly HeaderField[];

const BASE_JUL_DEC: readonly HeaderField[] = [
  ["legacy_job_number", 1, ["Job #"]],
  ["customer", 2, ["Customer"]],
  ["po", 3, ["PO"]],
  ["job_name", 4, ["Job Name"]],
  ["priority", 5, ["Priority"]],
  ["due_day", 6, ["Due Day"]],
  ["due_date", 7, ["Due Date"]],
  ["due_time", 8, ["Due Time"]],
  ["buyout_ordered", 9, ["Buyout Ordered"]],
  ["vendor_po_composite", 10, ["Vendor & PO #"]],
  ["buyout_received", 11, ["Buyout Rcvd"]],
  ["production_status", 12, ["Status", "STATUS"]],
  ["delivery_mode", 13, ["Delivery Will Call"]],
  ["delivery_day_date", 14, ["DLV Day/Date"]],
  ["delivery_time", 15, ["DLV Time"]],
  ["operational_note", 16, ["Notes"]],
  ["exposed", 17, ["Exposed"]],
  ["entered_by", 18, ["Entered"]],
  ["burn_sheets", 19, ["Burn Sheets"]],
  ["liner_sheets", 20, ["Liner Sheets"]],
  ["liner_area", 21, ["Liner Area"]],
  ["liner_size", 22, ["Liner Size"]],
  ["coil_pc_count", 23, ["Coil Duct PC Count"]],
  ["coil_lbs", 24, ["Coil LBS"]],
  ["optimized_pc_count", 25, ["Optimized PC Count"]],
  ["optimized_lbs", 26, ["Optimized LBS"]],
  ["delivery_contact", 27, ["DLV Contact"]],
  ["phone", 28, ["Phone Number"]],
].map(([canonicalField, column, acceptedHeaders]) => ({ canonicalField, column, acceptedHeaders })) as readonly HeaderField[];

const field = (canonicalField: string, column: number, ...acceptedHeaders: string[]): HeaderField => ({
  canonicalField,
  column,
  acceptedHeaders,
});

export const HEADER_CONTRACTS: Readonly<Record<SchemaEra, readonly HeaderField[]>> = {
  ERA_2025_JAN_MAR: [
    ...BASE_JAN_JUN,
    field("early_job_total_unmapped", 28, "Job Total"),
    field("secondary_note_unclassified", 29, "Notes"),
  ],
  ERA_2025_APR_JUN: [
    ...BASE_JAN_JUN,
    field("secondary_note_unclassified", 28, "Notes"),
  ],
  ERA_2025_JUL_AUG: [
    ...BASE_JUL_DEC,
    field("text_flag", 29, "Text when Complete"),
    field("secondary_note_unclassified", 30, "Notes"),
  ],
  ERA_2025_SEP: [
    ...BASE_JUL_DEC,
    field("text_flag", 29, "Text"),
    field("secondary_note_unclassified", 30, "Notes"),
    field("scanned", 31, "Scanned (Date/Who)"),
    field("calculated", 32, "Calculated (Date/Who)"),
    field("invoiced", 33, "Invoiced (Date/Who)"),
  ],
  ERA_2025_OCT_DEC: [
    ...BASE_JUL_DEC,
    field("text_flag", 29, "Text"),
    field("office_only_note", 30, "Notes (OFFICE ONLY)"),
    field("scanned", 31, "Scanned (Date/Who)"),
    field("calculated", 32, "Calculated (Date/Who)"),
    field("invoiced", 33, "Invoiced (Date/Who)"),
  ],
};

export interface HeaderDiagnostic {
  readonly sheetName: string;
  readonly column: number;
  readonly canonicalField: string;
  readonly expected: readonly string[];
  readonly actual: string | null;
}

const normalizeHeader = (value: string): string => value.trim().toLocaleLowerCase("en-US");

export function validateHeaders(
  sheetName: string,
  era: SchemaEra,
  headers: readonly (string | null)[],
): readonly HeaderDiagnostic[] {
  const diagnostics: HeaderDiagnostic[] = [];
  for (const contract of HEADER_CONTRACTS[era]) {
    const actual = headers[contract.column - 1] ?? null;
    const accepted = actual !== null && contract.acceptedHeaders.some(
      (candidate) => normalizeHeader(candidate) === normalizeHeader(actual),
    );
    if (!accepted) {
      diagnostics.push({
        sheetName,
        column: contract.column,
        canonicalField: contract.canonicalField,
        expected: contract.acceptedHeaders,
        actual,
      });
    }
  }
  return diagnostics;
}

export function validateSheetInventory(sheetNames: readonly string[]): readonly string[] {
  const actual = new Set(sheetNames);
  const expected = new Set<string>(EXPECTED_SHEETS);
  return [
    ...EXPECTED_SHEETS.filter((name) => !actual.has(name)).map((name) => `Missing expected sheet: ${name}`),
    ...sheetNames.filter((name) => !expected.has(name)).map((name) => `Unknown sheet: ${name}`),
  ];
}

