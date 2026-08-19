import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { OperationsApiResponse } from "../src/server/operations-api.js";

interface HostedManifest {
  readonly derivativeSnapshotSha256: string;
  readonly qualifiedRecordCount: number;
  readonly reviewRecordCount: number;
  readonly dataMode: string;
  readonly valueClassification: string;
  readonly authorityStatement: string;
  readonly verification: {
    readonly sourceUnchanged: boolean;
    readonly recordCountInvariant: boolean;
    readonly ruleFindingCountsInvariant: boolean;
    readonly actionableProtectedValueLeakCount: number;
  };
}

describe("hosted Masked Demo derivative", () => {
  it("matches its manifest and contains no hosted Internal Data path", async () => {
    const [payloadBytes, manifestText] = await Promise.all([
      readFile("public/data/rc0-preview.json"),
      readFile("deployment/rc0-preview-data-manifest.json", "utf8"),
    ]);
    const payloadText = payloadBytes.toString("utf8");
    const payload = JSON.parse(payloadText) as OperationsApiResponse;
    const manifest = JSON.parse(manifestText) as HostedManifest;
    const hash = createHash("sha256").update(payloadBytes).digest("hex");

    expect(hash).toBe(manifest.derivativeSnapshotSha256);
    expect(payload.mode).toBe("MASKED_DEMO");
    expect(payload.jobs).toHaveLength(manifest.qualifiedRecordCount);
    expect(payload.snapshot.reviewCount).toBe(manifest.reviewRecordCount);
    expect(payload.jobs.every((job) => job.mode === "MASKED_DEMO" && job.banner === "MASKED DEMO - NOT SOURCE DATA")).toBe(true);
    expect(payload.jobs.every((job) => job.customerId === null || job.customerId.startsWith("hosted_customer_"))).toBe(true);
    expect(payloadText).not.toContain("INTERNAL_DATA");
    expect(payloadText).not.toContain("TITAN_RC0_MASK_KEY");
    expect(payloadText).not.toContain("TITAN_RC0_WORKBOOK_PATH");
    expect(payloadText).not.toMatch(/[A-Z]:\\/);
    expect(manifest.dataMode).toBe("MASKED_DEMO");
    expect(manifest.valueClassification).toBe("MASKED");
    expect(manifest.authorityStatement).toBe("DERIVED PREVIEW DATA — NOT SOURCE AUTHORITY");
    expect(manifest.verification).toEqual({
      sourceUnchanged: true,
      recordCountInvariant: true,
      ruleFindingCountsInvariant: true,
      actionableProtectedValueLeakCount: 0,
    });
  });
});
