import { describe, expect, it } from "vitest";
import type {
  ImportBatchId,
  SchemaEra,
  SourceCell,
  SourceCellId,
  SourceFileId,
  SourceFileRegistration,
} from "../src/contracts/index.js";
import {
  buildSnapshot,
  ERA_BY_SHEET,
  EXPECTED_SHEETS,
  HEADER_CONTRACTS,
  stableDigest,
  type ExtractedRow,
  type WorkbookExtraction,
} from "../src/import/index.js";
import { HEADERS_BY_ERA } from "./fixtures.js";

const source: SourceFileRegistration = {
  sourceFileId: "source_fixture" as SourceFileId,
  fileName: "sanitized-fixture.xlsx",
  path: "sanitized-fixture.xlsx",
  sha256: "a".repeat(64),
  sizeBytes: 100,
  importedAt: "2026-08-19T00:00:00.000Z",
  importerVersion: "0.1.0",
};
const importBatchId = "batch_fixture" as ImportBatchId;

const alpha = (column: number): string => {
  let result = "";
  for (let value = column; value > 0; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  }
  return result;
};

const makeCell = (
  sheetName: string,
  row: number,
  column: number,
  field: string,
  header: string,
  era: SchemaEra,
  rawValue: unknown,
): SourceCell => {
  const address = `${alpha(column)}${row}`;
  const isBlank = rawValue === null || rawValue === "";
  return {
    sourceCellId: `cell_${stableDigest(source.sha256, sheetName, address).slice(0, 32)}` as SourceCellId,
    ref: {
      sourceFileId: source.sourceFileId,
      fileName: source.fileName,
      fileSha256: source.sha256,
      sheetName,
      row,
      column,
      address,
      headerRaw: header,
      canonicalField: field,
      schemaEra: era,
      importBatchId,
    },
    excelDataType: isBlank ? "blank" : typeof rawValue === "boolean" ? "boolean" : typeof rawValue === "number" ? "number" : "string",
    rawValue,
    formulaText: null,
    cachedValue: null,
    displayText: isBlank ? null : String(rawValue),
    numberFormat: null,
    mergedAnchor: false,
    presence: isBlank ? "BLANK" : "VALUE",
  };
};

const makeRow = (
  sheetName: Exclude<(typeof EXPECTED_SHEETS)[number], "Sheet1">,
  rowNumber: number,
  values: Readonly<Record<string, unknown>>,
): ExtractedRow => {
  const era = ERA_BY_SHEET[sheetName];
  const cells = Object.fromEntries(HEADER_CONTRACTS[era].map((item) => [
    item.canonicalField,
    makeCell(sheetName, rowNumber, item.column, item.canonicalField, item.acceptedHeaders[0] ?? "", era, values[item.canonicalField] ?? null),
  ]));
  return { sheetName, rowNumber, schemaEra: era, cells };
};

const headersBySheet = Object.fromEntries(EXPECTED_SHEETS.filter((name) => name !== "Sheet1").map((name) => {
  const era = ERA_BY_SHEET[name];
  return [name, HEADERS_BY_ERA[era]];
}));

const extraction = (operationalRows: readonly ExtractedRow[]): WorkbookExtraction => ({
  sheetNames: EXPECTED_SHEETS,
  headersBySheet,
  operationalRows,
  summaryCells: [],
  date1904: false,
});

describe("immutable snapshot/domain foundation", () => {
  it("creates stable opaque IDs independent of reused legacy Job #", () => {
    const rows = [
      makeRow("Jan 2025", 2, { legacy_job_number: 1.1, customer: "ALPHA", job_name: "ONE", due_date: 45600, production_status: "Building" }),
      makeRow("Oct 2025", 2, { legacy_job_number: 1.1, customer: "BETA", job_name: "TWO", due_date: 45900, production_status: "Complete" }),
    ];
    const first = buildSnapshot(extraction(rows), source, importBatchId);
    const second = buildSnapshot(extraction(rows), source, importBatchId);
    expect(first.promotable).toBe(true);
    expect(first.jobs).toHaveLength(2);
    expect(first.jobs[0]?.jobReleaseId).not.toBe(first.jobs[1]?.jobReleaseId);
    expect(first.semanticSnapshotHash).toBe(second.semanticSnapshotHash);
    expect(first.jobs.map((job) => job.jobReleaseId)).toEqual(second.jobs.map((job) => job.jobReleaseId));
  });

  it("does not merge similar customers and keeps grouping provisional per source record", () => {
    const rows = [
      makeRow("Jan 2025", 2, { customer: "BP", job_name: "ONE", due_date: 45600 }),
      makeRow("Jan 2025", 3, { customer: "BP MECH", job_name: "TWO", due_date: 45601 }),
    ];
    const snapshot = buildSnapshot(extraction(rows), source, importBatchId);
    expect(snapshot.jobs[0]?.customerId).not.toBe(snapshot.jobs[1]?.customerId);
    expect(snapshot.jobs[0]?.provisionalProjectPoId).not.toBe(snapshot.jobs[1]?.provisionalProjectPoId);
    expect(snapshot.jobs.every((job) => job.groupingStatus === "PROVISIONAL")).toBe(true);
  });

  it("isolates review, preformatted, and summary-like rows from jobs", () => {
    const rows = [
      makeRow("Jan 2025", 2, { due_date: 45600 }),
      makeRow("Jan 2025", 3, { legacy_job_number: 3.1, buyout_ordered: false, buyout_received: false, text_flag: false }),
      makeRow("Jan 2025", 4, {}),
    ];
    const snapshot = buildSnapshot(extraction(rows), source, importBatchId);
    expect(snapshot.jobs).toHaveLength(0);
    expect(snapshot.counts.REVIEW_RECORD).toBe(1);
    expect(snapshot.counts.PREFORMATTED_EMPTY).toBe(1);
    expect(snapshot.counts.EMPTY).toBe(1);
    expect(snapshot.reviewLedger).toHaveLength(3);
    expect(Object.keys(snapshot.sourceCellsById).length).toBeGreaterThan(0);
    for (const entry of snapshot.reviewLedger) {
      expect(entry.sourceCellIds.every((id) => snapshot.sourceCellsById[id] !== undefined)).toBe(true);
    }
  });

  it("blocks promotion on exact header drift", () => {
    const badHeaders = { ...headersBySheet, "Jan 2025": [...HEADERS_BY_ERA.ERA_2025_JAN_MAR] };
    (badHeaders["Jan 2025"] as string[])[3] = "Job Nme";
    const drifted: WorkbookExtraction = { ...extraction([]), headersBySheet: badHeaders };
    const snapshot = buildSnapshot(drifted, source, importBatchId);
    expect(snapshot.promotable).toBe(false);
    expect(snapshot.fatalErrors.join(" ")).toContain("job_name");
  });
});
