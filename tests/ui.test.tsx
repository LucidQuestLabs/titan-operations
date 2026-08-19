// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/main.js";
import { buildPresentationDto } from "../src/masking/index.js";
import { evaluateJobRules, operationalFindings, RULE_DEFINITIONS } from "../src/rules/index.js";
import { cell, job } from "./m3-fixtures.js";
import type { OperationsApiResponse } from "../src/server/operations-api.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const record = job("ui", {
  burn_sheets: cell("burn_sheets", 0, "VALUE"),
  coil_lbs: cell("coil_lbs", null, "BLANK"),
  buyout_ordered: cell("buyout_ordered", true),
  buyout_received: cell("buyout_received", false),
});
const findings = operationalFindings(evaluateJobRules(record, "snapshot_m3"));
const dto = buildPresentationDto(record, "snapshot_m3", findings);
const response: OperationsApiResponse = {
  mode: "INTERNAL_DATA",
  snapshot: { snapshotId: "snapshot_m3", fileName: "sanitized-fixture.xlsx", sourceHash: "a".repeat(64), importBatchId: "batch_m3", jobCount: 1, reviewCount: 1, sourceUnchanged: true },
  jobs: [dto],
  rules: RULE_DEFINITIONS,
  reviewLedger: [{ sheetName: "Oct 2025", rowNumber: 99, classification: "REVIEW_RECORD", reasons: ["Structural anomaly"] }],
  summary: { findingsByRule: Object.fromEntries(RULE_DEFINITIONS.map((rule) => [rule.ruleId, findings.filter((finding) => finding.ruleId === rule.ruleId).length])), statusDistribution: { Building: 1 }, presenceReviewCount: 1 },
};

afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; history.replaceState({}, "", "/"); });

describe("owner-facing UI contract", () => {
  it("renders source-aware Jobs, preserves zero/blank distinction, supports keyboard search and opens detail", async () => {
    history.replaceState({}, "", "/operations/jobs?mode=internal");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } })));
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    await act(async () => { root.render(<App />); await Promise.resolve(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain("Jobs / Releases");
    expect(container.textContent).toContain("Blank in source");
    expect(container.textContent).toContain("0");

    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true })); });
    expect(document.activeElement?.tagName).toBe("INPUT");

    const recordLink = container.querySelector<HTMLButtonElement>(".record-link")!;
    await act(async () => { recordLink.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(container.textContent).toContain("Office events");
    expect(container.textContent).toContain("Independent evidence · no required sequence");
    expect(container.textContent).toContain("Provenance");
    await act(async () => root.unmount());
  });

  it("renders Overview without blocked overdue or official totals as numeric cards", async () => {
    history.replaceState({}, "", "/operations/overview?mode=internal");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response), { status: 200 })));
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    await act(async () => { root.render(<App />); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain("Operations Overview");
    expect(container.textContent).toContain("Overdue / official annual totals unavailable");
    expect(container.textContent).toContain("OPS-AWR-002 · PROP");
    await act(async () => root.unmount());
  });
});
