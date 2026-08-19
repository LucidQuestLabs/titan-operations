import { describe, expect, it } from "vitest";
import {
  buildPresentationDto,
  buyoutSourceState,
  deliverySourceState,
  queryPresentationJobs,
  summarizePresentationJobs,
} from "../src/masking/index.js";
import { evaluateJobRules, operationalFindings } from "../src/rules/index.js";
import { cell, job } from "./m3-fixtures.js";

const firstJob = job("query-a", {
  customer: cell("customer", "ACME   CO", "VALUE", 2, "Oct 2025", 20),
  buyout_ordered: cell("buyout_ordered", true, "VALUE", 9, "Oct 2025", 20),
  buyout_received: cell("buyout_received", false, "VALUE", 11, "Oct 2025", 20),
  delivery_mode: cell("delivery_mode", "Delivery", "VALUE", 13, "Oct 2025", 20),
  coil_lbs: cell("coil_lbs", 10, "VALUE", 24, "Oct 2025", 20),
});
const secondJob = job("query-b", {
  customer: cell("customer", "BETA", "VALUE", 2, "Nov 2025", 21),
  buyout_ordered: cell("buyout_ordered", false, "VALUE", 9, "Nov 2025", 21),
  delivery_mode: cell("delivery_mode", "Will Call", "VALUE", 13, "Nov 2025", 21),
  coil_lbs: cell("coil_lbs", null, "BLANK", 24, "Nov 2025", 21),
});
const first = { ...buildPresentationDto(firstJob, "snapshot", operationalFindings(evaluateJobRules(firstJob, "snapshot"))), customer: { display: "ACME   CO", normalizedDisplay: "Acme Company", presence: "VALUE" as const } };
const second = buildPresentationDto(secondJob, "snapshot", operationalFindings(evaluateJobRules(secondJob, "snapshot")));
const jobs = [first, second];

describe("presentation query and source-qualified summary", () => {
  it("reports raw versus normalized search lanes", () => {
    expect(queryPresentationJobs(jobs, { search: "ACME   CO" })[0]?.matchLane).toBe("SOURCE");
    expect(queryPresentationJobs(jobs, { search: "Acme Company" })[0]?.matchLane).toBe("NORMALIZED");
  });

  it("filters exact buyout, delivery, metric presence/range, and finding evidence", () => {
    expect(buyoutSourceState(first).key).toBe("ORDERED_TRUE_RECEIVED_NOT_TRUE");
    expect(deliverySourceState(first).key).toBe("VALUE:Delivery");
    expect(queryPresentationJobs(jobs, { buyout: "ORDERED_TRUE_RECEIVED_NOT_TRUE" }).map((item) => item.job.jobReleaseId)).toEqual(["job_query-a"]);
    expect(queryPresentationJobs(jobs, { delivery: "VALUE:Will Call" }).map((item) => item.job.jobReleaseId)).toEqual(["job_query-b"]);
    expect(queryPresentationJobs(jobs, { metricField: "coil_lbs", metricPresence: "BLANK" }).map((item) => item.job.jobReleaseId)).toEqual(["job_query-b"]);
    expect(queryPresentationJobs(jobs, { metricField: "coil_lbs", metricMin: 5, metricMax: 15 }).map((item) => item.job.jobReleaseId)).toEqual(["job_query-a"]);
    expect(queryPresentationJobs(jobs, { findingRuleId: "OPS-AWR-002" }).map((item) => item.job.jobReleaseId)).toEqual(["job_query-a"]);
  });

  it("sorts numeric VALUE before non-values in either direction", () => {
    expect(queryPresentationJobs(jobs, { sort: "metric", metricField: "coil_lbs", direction: "desc" }).map((item) => item.job.jobReleaseId)).toEqual(["job_query-a", "job_query-b"]);
  });

  it("reconciles delivery, buyout, and metric-presence distributions", () => {
    const summary = summarizePresentationJobs(jobs);
    expect(summary.deliveryDistribution.reduce((count, item) => count + item.count, 0)).toBe(2);
    expect(summary.buyoutDistribution.reduce((count, item) => count + item.count, 0)).toBe(2);
    expect(summary.metricPresenceDistribution.reduce((count, item) => count + item.count, 0)).toBe(16);
    expect(summary.presenceReviewCount).toBeGreaterThan(0);
    expect(summary.jobsWithMetricReviewCount).toBe(2);
  });
});
