import { describe, expect, it } from "vitest";
import { InMemoryOperationsRepository, parseQuery, serializeQuery } from "../src/application/index.js";
import { cell, job, snapshot } from "./m3-fixtures.js";

describe("query/read-model repository", () => {
  it("searches source/normalized text and reports the match lane", () => {
    const repository = new InMemoryOperationsRepository(snapshot([job("A"), job("B")]));
    const result = repository.search({ search: "Customer A" });
    expect(result.total).toBe(1);
    expect(result.items[0]?.searchLane).toBe("RAW");
  });

  it("filters by raw status, era, presence, and finding", () => {
    const findingJob = job("finding", {
      buyout_ordered: cell("buyout_ordered", true),
      buyout_received: cell("buyout_received", false),
      coil_lbs: cell("coil_lbs", null, "BLANK"),
    });
    const repository = new InMemoryOperationsRepository(snapshot([findingJob, job("plain")]));
    expect(repository.search({ status: "Building" }).total).toBe(2);
    expect(repository.search({ era: "ERA_2025_OCT_DEC" }).total).toBe(2);
    expect(repository.search({ metricField: "coil_lbs", metricPresence: "BLANK" }).total).toBe(2);
    expect(repository.search({ findingRuleId: "OPS-AWR-002" }).total).toBe(1);
  });

  it("sorts numeric metric values before non-values without zero collapse", () => {
    const repository = new InMemoryOperationsRepository(snapshot([
      job("blank", { coil_lbs: cell("coil_lbs", null, "BLANK") }),
      job("zero", { coil_lbs: cell("coil_lbs", 0, "VALUE") }),
      job("ten", { coil_lbs: cell("coil_lbs", 10, "VALUE") }),
    ]));
    const result = repository.search({ sort: "metric", metricField: "coil_lbs" });
    expect(result.items.map((item) => item.job.jobReleaseId)).toEqual(["job_zero", "job_ten", "job_blank"]);
  });

  it("round-trips navigation/filter state", () => {
    const query = { search: "alpha", status: "Building", page: 2, pageSize: 25, direction: "desc" as const };
    expect(parseQuery(serializeQuery(query))).toEqual(query);
  });

  it("resolves provenance without workbook API access", () => {
    const repository = new InMemoryOperationsRepository(snapshot([job("lineage")]));
    expect(repository.lineage("job_lineage").some((sourceCell) => sourceCell.ref.address === "B10")).toBe(true);
  });
});

