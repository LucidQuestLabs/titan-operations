import { describe, expect, it } from "vitest";
import type { SchemaEra } from "../src/contracts/index.js";
import {
  ERA_BY_SHEET,
  EXPECTED_SHEETS,
  HEADER_CONTRACTS,
  validateHeaders,
  validateSheetInventory,
} from "../src/import/index.js";
import { HEADERS_BY_ERA } from "./fixtures.js";

describe("governed schema-era registry", () => {
  it("covers all five promoted schema eras and all 13 expected sheets", () => {
    expect(Object.keys(HEADER_CONTRACTS)).toHaveLength(5);
    expect(EXPECTED_SHEETS).toHaveLength(13);
    expect(validateSheetInventory(EXPECTED_SHEETS)).toEqual([]);
    expect(new Set(Object.values(ERA_BY_SHEET))).toEqual(new Set<SchemaEra>([
      "ERA_2025_JAN_MAR",
      "ERA_2025_APR_JUN",
      "ERA_2025_JUL_AUG",
      "ERA_2025_SEP",
      "ERA_2025_OCT_DEC",
    ]));
  });

  it.each(Object.entries(HEADERS_BY_ERA) as [SchemaEra, readonly string[]][])(
    "accepts exact governed headers for %s",
    (era, headers) => expect(validateHeaders("fixture", era, headers)).toEqual([]),
  );

  it("accepts case and outer-whitespace changes without fuzzy matching", () => {
    const headers = [...HEADERS_BY_ERA.ERA_2025_SEP];
    headers[11] = "  status  ";
    expect(validateHeaders("Sept 2025", "ERA_2025_SEP", headers)).toEqual([]);
  });

  it("maps the known Job 0me alias but rejects an unaccepted near-match", () => {
    const accepted = [...HEADERS_BY_ERA.ERA_2025_JAN_MAR];
    accepted[3] = "Job 0me";
    expect(validateHeaders("Jan 2025", "ERA_2025_JAN_MAR", accepted)).toEqual([]);

    const drifted = [...accepted];
    drifted[3] = "Job Nme";
    expect(validateHeaders("Jan 2025", "ERA_2025_JAN_MAR", drifted)).toEqual([
      expect.objectContaining({ column: 4, canonicalField: "job_name", actual: "Job Nme" }),
    ]);
  });

  it("reports missing/unknown sheets and blocks silent inventory drift", () => {
    const drifted: string[] = [
      ...EXPECTED_SHEETS.filter((name) => name !== "Nov 2025"),
      "Future 2026",
    ];
    expect(validateSheetInventory(drifted)).toEqual([
      "Missing expected sheet: Nov 2025",
      "Unknown sheet: Future 2026",
    ]);
  });

  it("keeps duplicate Notes headers coordinate-distinct", () => {
    const jan = HEADER_CONTRACTS.ERA_2025_JAN_MAR.filter((item) => item.acceptedHeaders.includes("Notes"));
    expect(jan.map(({ canonicalField, column }) => ({ canonicalField, column }))).toEqual([
      { canonicalField: "operational_note", column: 15 },
      { canonicalField: "secondary_note_unclassified", column: 29 },
    ]);
  });
});
