import { describe, expect, it } from "vitest";
import type { ImportBatchId, SchemaEra, SourceCell, SourceCellId, SourceFileId } from "../src/contracts/index.js";
import {
  beginNormalizationHistory,
  candidateKey,
  normalizeBoolean,
  normalizeIdentifier,
  normalizeNumber,
  supersedeNormalization,
} from "../src/import/index.js";

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

  it("preserves append-only normalization supersession history and source evidence", () => {
    const source = makeCell(75727);
    const first = normalizeIdentifier(source);
    const history = beginNormalizationHistory(first);
    const successor = Object.freeze({ ...first, normalizerVersion: "0.2.0", value: "75727" });
    const superseded = supersedeNormalization(history, successor);

    expect(history.interpretations).toHaveLength(1);
    expect(superseded.interpretations).toHaveLength(2);
    expect(superseded.interpretations[0]).toEqual(history.interpretations[0]);
    expect(superseded.interpretations[1]?.supersedesInterpretationId).toBe(history.currentInterpretationId);
    expect(superseded.currentInterpretationId).toBe(superseded.interpretations[1]?.interpretationId);
    expect(superseded.sourceCellIds).toEqual([source.sourceCellId]);
    expect(Object.isFrozen(superseded.interpretations)).toBe(true);
  });

  it("rejects a supersession that substitutes different source evidence", () => {
    const first = normalizeIdentifier(makeCell(75727));
    const history = beginNormalizationHistory(first);
    const changedEvidence = Object.freeze({
      ...first,
      normalizerVersion: "0.2.0",
      sourceCellIds: ["cell_other" as SourceCellId],
    });
    expect(() => supersedeNormalization(history, changedEvidence)).toThrow("cannot substitute immutable source evidence");
  });
});
