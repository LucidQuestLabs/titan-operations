import { describe, expect, it } from "vitest";
import {
  classifyPresence,
  isFieldAvailable,
  PRESENCE_LABELS,
} from "../src/import/index.js";
import { ALL_PRESENCE_STATES } from "./fixtures.js";

describe("presence and missingness taxonomy", () => {
  it("preserves every promoted state with a presentation label", () => {
    expect(Object.keys(PRESENCE_LABELS).sort()).toEqual([...ALL_PRESENCE_STATES].sort());
  });

  it.each([
    [{ fieldAvailable: false, excelDataType: "blank", rawValue: null, metric: true }, "COLUMN_UNAVAILABLE"],
    [{ fieldAvailable: true, excelDataType: "blank", rawValue: null, metric: true }, "BLANK"],
    [{ fieldAvailable: true, excelDataType: "string", rawValue: " NA ", metric: true }, "EXPLICIT_NA"],
    [{ fieldAvailable: true, excelDataType: "string", rawValue: "Included with June Numbers", metric: true }, "CROSS_PERIOD_ANNOTATION"],
    [{ fieldAvailable: true, excelDataType: "string", rawValue: "?", metric: true }, "SOURCE_ANNOTATION"],
    [{ fieldAvailable: true, excelDataType: "string", rawValue: "not numeric", metric: true }, "MALFORMED"],
    [{ fieldAvailable: true, excelDataType: "formula", rawValue: 14, formulaText: "=SUM(A1:A2)", metric: true }, "FORMULA"],
    [{ fieldAvailable: true, excelDataType: "error", rawValue: "#REF!", formulaError: true, metric: true }, "FORMULA_ERROR"],
    [{ fieldAvailable: true, excelDataType: "number", rawValue: 0, metric: true }, "VALUE"],
  ] as const)("classifies %o as %s", (input, expected) => {
    expect(classifyPresence(input)).toBe(expected);
  });

  it("never converts zero to blank or an unavailable value", () => {
    expect(classifyPresence({ fieldAvailable: true, excelDataType: "number", rawValue: 0, metric: true })).toBe("VALUE");
  });

  it("distinguishes era-unavailable fields from present blank fields", () => {
    expect(isFieldAvailable("ERA_2025_JAN_MAR", "priority")).toBe(false);
    expect(isFieldAvailable("ERA_2025_JUL_AUG", "priority")).toBe(true);
    expect(isFieldAvailable("ERA_2025_SEP", "office_only_note")).toBe(false);
    expect(isFieldAvailable("ERA_2025_OCT_DEC", "office_only_note")).toBe(true);
  });
});

