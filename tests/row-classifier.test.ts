import { describe, expect, it } from "vitest";
import { classifyRow } from "../src/import/index.js";
import { row } from "./fixtures.js";

describe("row classification", () => {
  it("qualifies identity plus substantive operational evidence as a job", () => {
    expect(classifyRow(row({ customer: "Customer", jobName: "Release 1", dueDate: 45600 })).classification).toBe("JOB_RECORD");
  });

  it("does not use nonblank legacy Job # as sole job qualification", () => {
    expect(classifyRow(row({ legacyJobNumber: "1.1", defaultBooleanValuesOnly: true })).classification).toBe("PREFORMATTED_EMPTY");
  });

  it("preserves partial substantive rows for review", () => {
    expect(classifyRow(row({ dueDate: 45600 })).classification).toBe("REVIEW_RECORD");
  });

  it("preserves structurally shifted identity evidence for review", () => {
    expect(classifyRow(row({ customer: "actor-like", jobName: "Release", dueDate: 45600, structuralAnomaly: true })).classification).toBe("REVIEW_RECORD");
  });

  it("allows a coherent row with whitespace-only Job # to qualify independently", () => {
    expect(classifyRow(row({ legacyJobNumber: "   ", customer: "Customer", jobName: "Release", status: "Building" })).classification).toBe("JOB_RECORD");
  });

  it("isolates source summary formulas from job projection", () => {
    expect(classifyRow(row({ sourceSummaryFormulaOrLabel: true, metricPresence: ["FORMULA"] })).classification).toBe("SOURCE_SUMMARY_ROW");
  });

  it("leaves truly empty rows empty", () => {
    expect(classifyRow(row()).classification).toBe("EMPTY");
  });
});

