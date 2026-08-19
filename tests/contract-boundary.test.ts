import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

describe("M1 contract boundaries", () => {
  it("contains no UI or workbook implementation imports", async () => {
    const contractPaths = [
      "../src/contracts/core.ts",
      "../src/contracts/domain.ts",
      "../src/contracts/rules.ts",
      "../src/contracts/masking.ts",
    ];
    for (const relative of contractPaths) {
      const text = await readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
      expect(text).not.toMatch(/from ["'](?:react|xlsx|exceljs|@oai\/artifact-tool)/);
    }
  });

  it("preserves all seven governed awareness IDs without assigning semantics", async () => {
    const text = await readFile(fileURLToPath(new URL("../src/contracts/rules.ts", import.meta.url)), "utf8");
    for (let number = 1; number <= 7; number += 1) {
      expect(text).toContain(`OPS-AWR-00${number}`);
    }
    expect(text).not.toMatch(/overdueDays|profit|margin|laborRate|quoteToJob/);
  });
});

