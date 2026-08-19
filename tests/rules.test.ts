import { describe, expect, it } from "vitest";
import { evaluateJobRules, operationalFindings, RULE_DEFINITIONS, assertUniqueRuleRegistry } from "../src/rules/index.js";
import { cell, job } from "./m3-fixtures.js";

const byId = (id: string, overrides = {}) => evaluateJobRules(job(id, overrides), "snapshot_m3");

describe("Systems Awareness governed dispositions", () => {
  it("registers all seven unique rules with required blocked/review states", () => {
    expect(() => assertUniqueRuleRegistry()).not.toThrow();
    expect(RULE_DEFINITIONS).toHaveLength(7);
    expect(RULE_DEFINITIONS.filter((item) => item.disposition === "BLOCKED").map((item) => item.ruleId)).toEqual([
      "OPS-AWR-001", "OPS-AWR-005", "OPS-AWR-006",
    ]);
  });

  it("never emits blocked rules as operational findings", () => {
    const evaluations = byId("blocked");
    expect(evaluations.filter((item) => item.disposition === "BLOCKED").every((item) => item.outcome === "DISABLED_BLOCKED")).toBe(true);
    expect(operationalFindings(evaluations).some((item) => item.disposition === "BLOCKED")).toBe(false);
  });

  it.each([
    [true, false, "FIRED"],
    [true, true, "NOT_FIRED"],
    [false, false, "NOT_APPLICABLE"],
  ] as const)("OPS-AWR-002 handles ordered=%s received=%s", (ordered, received, expected) => {
    const result = byId("buyout", {
      buyout_ordered: cell("buyout_ordered", ordered),
      buyout_received: cell("buyout_received", received),
    }).find((item) => item.ruleId === "OPS-AWR-002");
    expect(result?.outcome).toBe(expected);
    expect(result?.disposition).toBe("PROPOSED_REVIEW_MODE");
  });

  it("OPS-AWR-003 distinguishes positive pieces/blank pounds from zero pieces", () => {
    const fired = byId("pieces", {
      coil_pc_count: cell("coil_pc_count", 3),
      coil_lbs: cell("coil_lbs", null, "BLANK"),
    }).find((item) => item.ruleId === "OPS-AWR-003");
    const zero = byId("zero", {
      coil_pc_count: cell("coil_pc_count", 0),
      coil_lbs: cell("coil_lbs", null, "BLANK"),
    }).find((item) => item.ruleId === "OPS-AWR-003");
    const recordedZero = byId("recorded-zero", {
      coil_pc_count: cell("coil_pc_count", 3),
      coil_lbs: cell("coil_lbs", 0, "VALUE"),
    }).find((item) => item.ruleId === "OPS-AWR-003");
    expect(fired?.outcome).toBe("FIRED");
    expect(zero?.outcome).toBe("NOT_FIRED");
    expect(recordedZero?.outcome).toBe("NOT_FIRED");
  });

  it("OPS-AWR-004 flags chronology for review without declaring error", () => {
    const result = byId("events", {
      scanned: cell("scanned", "AA 9/30"),
      calculated: cell("calculated", "BB 9/29"),
      invoiced: cell("invoiced", "CC 9/30"),
    }).find((item) => item.ruleId === "OPS-AWR-004");
    expect(result?.outcome).toBe("FIRED");
    expect(result?.reason).toContain("flagged for review, not declared erroneous");
  });

  it("OPS-AWR-007 preserves exact source-state labels", () => {
    const result = byId("source-state", {
      coil_lbs: cell("coil_lbs", "Included with June Numbers", "CROSS_PERIOD_ANNOTATION"),
    }).find((item) => item.ruleId === "OPS-AWR-007");
    expect(result?.outcome).toBe("FIRED");
    expect(result?.reason).toContain("CROSS_PERIOD_ANNOTATION");
  });

  it("keeps evaluation IDs deterministic", () => {
    expect(byId("stable").map((item) => item.evaluationId)).toEqual(byId("stable").map((item) => item.evaluationId));
  });
});

