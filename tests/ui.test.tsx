// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/main.js";
import { buildPresentationDto, maskPresentationDtos, summarizePresentationJobs } from "../src/masking/index.js";
import { evaluateJobRules, operationalFindings, RULE_DEFINITIONS } from "../src/rules/index.js";
import { cell, job } from "./m3-fixtures.js";
import type { OperationsApiResponse } from "../src/server/operations-api.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const record = job("ui", {
  burn_sheets: cell("burn_sheets", 0, "VALUE", 19, "Oct 2025", 10),
  coil_lbs: cell("coil_lbs", null, "BLANK", 24, "Oct 2025", 10),
  buyout_ordered: cell("buyout_ordered", true, "VALUE", 9, "Oct 2025", 10),
  buyout_received: cell("buyout_received", false, "VALUE", 11, "Oct 2025", 10),
  delivery_mode: cell("delivery_mode", "Delivery", "VALUE", 13, "Oct 2025", 10),
});
const record2 = job("ui2", {
  priority: cell("priority", null, "BLANK", 8, "Nov 2025", 11),
  customer: cell("customer", "Second Customer", "VALUE", 2, "Nov 2025", 11),
  job_name: cell("job_name", "Second Project", "VALUE", 4, "Nov 2025", 11),
  production_status: cell("production_status", "Complete", "VALUE", 12, "Nov 2025", 11),
  buyout_ordered: cell("buyout_ordered", false, "VALUE", 9, "Nov 2025", 11),
  delivery_mode: cell("delivery_mode", "Will Call", "VALUE", 13, "Nov 2025", 11),
  coil_lbs: cell("coil_lbs", 42, "VALUE", 24, "Nov 2025", 11),
});
const dto = buildPresentationDto(record, "snapshot_m3", operationalFindings(evaluateJobRules(record, "snapshot_m3")));
const dto2 = buildPresentationDto(record2, "snapshot_m3", operationalFindings(evaluateJobRules(record2, "snapshot_m3")));

function apiResponse(jobs = [dto, dto2], mode: OperationsApiResponse["mode"] = "INTERNAL_DATA"): OperationsApiResponse {
  const allFindings = jobs.flatMap((item) => item.findings);
  const presentationSummary = summarizePresentationJobs(jobs);
  return {
    mode,
    snapshot: { snapshotId: "snapshot_m3", fileName: mode === "MASKED_DEMO" ? "2025 Work Schedule" : "sanitized-fixture.xlsx", sourceHash: "a".repeat(64), importBatchId: "batch_m3", jobCount: jobs.length, reviewCount: 1, sourceUnchanged: true },
    jobs,
    rules: RULE_DEFINITIONS,
    reviewLedger: [{ sheetName: "Oct 2025", rowNumber: 99, classification: "REVIEW_RECORD", reasons: ["Structural anomaly"] }],
    summary: {
      findingsByRule: Object.fromEntries(RULE_DEFINITIONS.map((rule) => [rule.ruleId, allFindings.filter((finding) => finding.ruleId === rule.ruleId).length])),
      statusDistribution: { Building: 1, Complete: 1 },
      ...presentationSummary,
    },
  };
}

async function render(path: string, responder: (url: string) => OperationsApiResponse = () => apiResponse()): Promise<{ container: HTMLDivElement; root: Root }> {
  history.replaceState({}, "", path);
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(responder(String(input))), { status: 200, headers: { "Content-Type": "application/json" } })));
  const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
  await act(async () => { root.render(<App />); await new Promise((resolve) => setTimeout(resolve, 0)); });
  return { container, root };
}

const labelControl = <T extends HTMLInputElement | HTMLSelectElement>(container: HTMLElement, label: string): T => {
  const element = [...container.querySelectorAll("label")].find((candidate) => candidate.textContent?.includes(label));
  if (!element) throw new Error(`Missing label: ${label}`);
  return element.querySelector<T>("input,select")!;
};

afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; history.replaceState({}, "", "/"); });

describe("owner-facing UI contract", () => {
  it("supports governed filters, URL state, keyboard selection/focus, provenance focus trap, and detail", async () => {
    const { container, root } = await render("/operations/jobs?mode=internal");
    expect(container.textContent).toContain("Jobs / Releases"); expect(container.textContent).toContain("Blank in source"); expect(container.textContent).toContain("0");

    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true })); });
    expect(document.activeElement?.tagName).toBe("INPUT");

    const delivery = labelControl<HTMLSelectElement>(container, "Delivery / Will Call source");
    await act(async () => { delivery.value = "VALUE:Delivery"; delivery.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(container.querySelectorAll("tr[data-job-row]")).toHaveLength(1); expect(location.search).toContain("delivery=VALUE%3ADelivery");

    const row = container.querySelector<HTMLTableRowElement>("tr[data-job-row]")!; row.focus();
    await act(async () => { row.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })); });
    expect(row.getAttribute("aria-selected")).toBe("true"); expect(location.search).toContain("compare=job_ui");

    await act(async () => { row.dispatchEvent(new KeyboardEvent("keydown", { key: "r", bubbles: true })); });
    expect(container.querySelector("[role='dialog']")).not.toBeNull(); expect((document.activeElement as HTMLElement).getAttribute("aria-label")).toBe("Close provenance");
    await act(async () => { document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); });
    expect((document.activeElement as HTMLElement).getAttribute("aria-label")).toBe("Close provenance");
    await act(async () => { document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(container.querySelector("[role='dialog']")).toBeNull(); expect(document.activeElement).toBe(row);

    await act(async () => { row.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(container.textContent).toContain("Office events"); expect(container.textContent).toContain("Provenance");
    await act(async () => root.unmount());
  });

  it("renders reconciled Overview buyout, delivery, and data-quality context with equivalent links", async () => {
    const { container, root } = await render("/operations/overview?mode=internal");
    expect(container.textContent).toContain("Buyout source state"); expect(container.textContent).toContain("Delivery / Will Call distribution"); expect(container.textContent).toContain("Data quality · metric presence");
    expect(container.textContent).toContain("Overdue / official annual totals unavailable"); expect(container.textContent).toContain("OPS-AWR-002 · PROP");
    const deliveryButton = [...container.querySelectorAll<HTMLButtonElement>(".overview-context button")].find((button) => button.textContent?.includes("Delivery"))!;
    await act(async () => { deliveryButton.click(); });
    expect(location.pathname).toBe("/operations/jobs"); expect(location.search).toContain("delivery=VALUE%3ADelivery"); expect(labelControl<HTMLSelectElement>(container, "Delivery / Will Call source").value).toBe("VALUE:Delivery");
    await act(async () => root.unmount());
  });

  it("compares 2–8 Historical records by canonical field while preserving presence labels", async () => {
    const { container, root } = await render("/operations/history?mode=internal");
    expect(container.textContent).toContain("Compare 2–8 source records");
    const buttons = [...container.querySelectorAll<HTMLButtonElement>(".selection-button")];
    await act(async () => { buttons[0]!.click(); buttons[1]!.click(); });
    expect(container.textContent).toContain("Compare 2 source records"); expect(container.textContent).toContain("Canonical field");
    expect(container.textContent).toContain("Not collected in this period"); expect(container.textContent).toContain("Blank in source");
    await act(async () => root.unmount());
  });

  it("shows Awareness finding provenance and navigates to its source drawer", async () => {
    const { container, root } = await render("/operations/awareness?mode=internal&rule=OPS-AWR-002");
    expect(container.textContent).toContain("PROP · REVIEW"); expect(container.textContent).toContain("inputs I10, J10, K10");
    const source = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Inspect finding source")!;
    await act(async () => { source.click(); });
    expect(container.querySelector("[role='dialog']")?.textContent).toContain("buyout_ordered");
    await act(async () => root.unmount());
  });

  it("switches Internal to Masked Demo in place, preserves route/selection, and hides protected fixture text", async () => {
    const maskedJobs = maskPresentationDtos([dto, dto2], { profileId: "test", version: "0.1.0", secretRef: "test", profileKey: "ui-test-key", dateShiftDays: 0, redactOfficeOnlyNotes: true });
    vi.stubGlobal("confirm", vi.fn(() => true));
    const { container, root } = await render("/operations/jobs?mode=internal&compare=job_ui", (url) => url.includes("mode=masked") ? apiResponse([...maskedJobs], "MASKED_DEMO") : apiResponse());
    const routeBefore = location.pathname; const switcher = container.querySelector<HTMLButtonElement>(".mode-switch")!;
    await act(async () => { switcher.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain("MASKED DEMO — NOT SOURCE DATA"); expect(location.pathname).toBe(routeBefore); expect(location.search).toContain("compare=job_ui");
    expect(container.textContent).not.toContain("Customer ui"); expect(container.textContent).not.toContain("Sensitive note");
    await act(async () => root.unmount());
  });
});
