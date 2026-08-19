import { describe, expect, it } from "vitest";
import type { ImportBatchId, SchemaEra, SourceCell, SourceCellId, SourceFileId } from "../src/contracts/index.js";
import { candidateKey, normalizeBoolean, normalizeIdentifier, normalizeNumber } from "../src/import/index.js";

const makeCell = (rawValue: unknown, presence: SourceCell["presence"] = "VALUE"): SourceCell => ({
  sourceCellId: "cell_test" as SourceCellId,
  ref: {
    sourceFileId: "source_test" as SourceFileId,
    fileName: "fixture.xlsx",
    fileSha256: "a".repeat(64),
    sheetName: "Jan 2025",
    row: 2,
    column: 1,
    address: "A2",
    headerRaw: "Job #",
    canonicalField: "legacy_job_number",
    schemaEra: "ERA_2025_JAN_MAR" as SchemaEra,
    importBatchId: "batch_test" as ImportBatchId,
  },
  excelDataType: typeof rawValue === "boolean" ? "boolean" : typeof rawValue === "number" ? "number" : "string",
  rawValue,
  formulaText: null,
  cachedValue: null,
  displayText: rawValue === null ? null : String(rawValue),
  numberFormat: null,
  mergedAnchor: false,
  presence,
});

describe("versioned normalizers", () => {
  it("creates conservative candidate keys without merging distinct names", () => {
    expect(candidateKey("  BP   MECH ")).toBe("bp mech");
    expect(candidateKey("BP")).not.toBe(candidateKey("BP MECH"));
  });

  it("normalizes numeric identifiers as strings without adding decimals", () => {
    expect(normalizeIdentifier(makeCell(75727)).value).toBe("75727");
  });

  it("refuses to coerce non-Boolean values", () => {
    const result = normalizeBoolean(makeCell("yes"));
    expect(result.value).toBeNull();
    expect(result.presence).toBe("MALFORMED");
  });

  it("keeps formula/non-value metrics nonnumeric", () => {
    const result = normalizeNumber(makeCell(null, "FORMULA"));
    expect(result.value).toBeNull();
    expect(result.presence).toBe("FORMULA");
  });
});

