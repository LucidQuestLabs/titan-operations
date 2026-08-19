import { describe, expect, it } from "vitest";
import { buildPresentationDto, findPresentationLeaks, maskPresentationDtos, MaskProfileError, type LoadedMaskProfile } from "../src/masking/index.js";
import { evaluateJobRules, operationalFindings } from "../src/rules/index.js";
import { cell, job } from "./m3-fixtures.js";

const profile: LoadedMaskProfile = {
  profileId: "masked-demo-rc0",
  version: "0.1.0",
  secretRef: "session-key",
  profileKey: "test-only-governed-key",
  dateShiftDays: 0,
  redactOfficeOnlyNotes: true,
};

const dtoFor = (record: ReturnType<typeof job>) => {
  const evaluations = evaluateJobRules(record, "snapshot_m3");
  return buildPresentationDto(record, "snapshot_m3", operationalFindings(evaluations));
};

describe("deterministic fail-closed Masked Demo", () => {
  it("fails closed when profile/key is missing", () => {
    expect(() => maskPresentationDtos([dtoFor(job("A"))], null)).toThrow(MaskProfileError);
    expect(() => maskPresentationDtos([dtoFor(job("A"))], { ...profile, profileKey: "" })).toThrow(MaskProfileError);
  });

  it("is deterministic and preserves shared customer equality", () => {
    const a = dtoFor(job("A"));
    const bRecord = { ...job("B"), customerId: job("A").customerId };
    const b = dtoFor(bRecord);
    const first = maskPresentationDtos([a, b], profile);
    const second = maskPresentationDtos([a, b], profile);
    expect(first).toEqual(second);
    expect(first[0]?.customer.display).toBe(first[1]?.customer.display);
    expect(first[0]?.jobName.display).not.toBe(first[1]?.jobName.display);
  });

  it("preserves counts, IDs, rule findings, metric values, and presence states", () => {
    const source = dtoFor(job("invariant", {
      coil_pc_count: cell("coil_pc_count", 3),
      coil_lbs: cell("coil_lbs", null, "EXPLICIT_NA"),
    }));
    const masked = maskPresentationDtos([source], profile)[0]!;
    expect(masked.jobReleaseId).toBe(source.jobReleaseId);
    expect(masked.findings).toEqual(source.findings);
    expect(masked.metrics).toEqual(source.metrics);
    expect(masked.mode).toBe("MASKED_DEMO");
    expect(masked.banner).toBe("MASKED DEMO - NOT SOURCE DATA");
  });

  it("shifts dates uniformly by whole weeks while preserving intervals/weekdays", () => {
    const firstRecord = job("date-a", { due_date: cell("due_date", "2025-10-03") });
    const secondRecord = job("date-b", { due_date: cell("due_date", "2025-10-17") });
    const masked = maskPresentationDtos([dtoFor(firstRecord), dtoFor(secondRecord)], profile);
    const firstDate = new Date(String(masked[0]?.dueDate.display));
    const secondDate = new Date(String(masked[1]?.dueDate.display));
    expect((secondDate.getTime() - firstDate.getTime()) / 86_400_000).toBe(14);
    expect(firstDate.getUTCDay()).toBe(new Date("2025-10-03").getUTCDay());
  });

  it("redacts protected strings across the serialized presentation boundary", () => {
    const source = dtoFor(job("leak"));
    const masked = maskPresentationDtos([source], profile);
    expect(findPresentationLeaks(masked, ["Customer leak", "Project leak", "555-0100", "Sensitive note", "Internal sensitive note", "sanitized-fixture.xlsx"])).toEqual([]);
  });

  it("preserves numeric zero versus blank/NA states", () => {
    const source = dtoFor(job("presence", {
      burn_sheets: cell("burn_sheets", 0, "VALUE"),
      coil_lbs: cell("coil_lbs", null, "BLANK"),
      optimized_lbs: cell("optimized_lbs", "NA", "EXPLICIT_NA"),
    }));
    const masked = maskPresentationDtos([source], profile)[0]!;
    expect(masked.metrics.burn_sheets).toEqual({ display: "0", presence: "VALUE" });
    expect(masked.metrics.coil_lbs?.presence).toBe("BLANK");
    expect(masked.metrics.optimized_lbs?.presence).toBe("EXPLICIT_NA");
  });
});

