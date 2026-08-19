import { importWorkbookReadOnly } from "../import/index.js";
import {
  buildPresentationDto,
  maskPresentationDtos,
  summarizePresentationJobs,
  type DistributionEntry,
  type LoadedMaskProfile,
  type OperationsPresentationDto,
} from "../masking/index.js";
import { evaluateJobRules, operationalFindings, RULE_DEFINITIONS } from "../rules/index.js";

export interface OperationsApiResponse {
  readonly mode: "INTERNAL_DATA" | "MASKED_DEMO";
  readonly snapshot: {
    readonly snapshotId: string;
    readonly fileName: string;
    readonly sourceHash: string;
    readonly importBatchId: string;
    readonly jobCount: number;
    readonly reviewCount: number;
    readonly sourceUnchanged: boolean;
  };
  readonly jobs: readonly OperationsPresentationDto[];
  readonly rules: typeof RULE_DEFINITIONS;
  readonly reviewLedger: readonly { readonly sheetName: string; readonly rowNumber: number; readonly classification: string; readonly reasons: readonly string[] }[];
  readonly summary: {
    readonly findingsByRule: Readonly<Record<string, number>>;
    readonly statusDistribution: Readonly<Record<string, number>>;
    readonly presenceReviewCount: number;
    readonly jobsWithMetricReviewCount: number;
    readonly deliveryDistribution: readonly DistributionEntry[];
    readonly buyoutDistribution: readonly DistributionEntry[];
    readonly metricPresenceDistribution: readonly DistributionEntry[];
  };
}

export async function createOperationsApiResponse(
  workbookPath: string,
  mode: "INTERNAL_DATA" | "MASKED_DEMO",
  profileKey: string | null,
): Promise<OperationsApiResponse> {
  const imported = await importWorkbookReadOnly(workbookPath);
  const internalDtos = imported.snapshot.jobs.map((job) => {
    const findings = operationalFindings(evaluateJobRules(job, imported.snapshot.snapshotId));
    return buildPresentationDto(job, imported.snapshot.snapshotId, findings);
  });
  let jobs: readonly OperationsPresentationDto[] = internalDtos;
  if (mode === "MASKED_DEMO") {
    const profile: LoadedMaskProfile | null = profileKey ? {
      profileId: "titan-rc0-masked-demo",
      version: "0.1.0",
      secretRef: "environment:TITAN_RC0_MASK_KEY",
      profileKey,
      dateShiftDays: 0,
      redactOfficeOnlyNotes: true,
    } : null;
    jobs = maskPresentationDtos(internalDtos, profile);
  }
  const allFindings = jobs.flatMap((job) => job.findings);
  const findingsByRule = Object.fromEntries(RULE_DEFINITIONS.map((rule) => [rule.ruleId, allFindings.filter((finding) => finding.ruleId === rule.ruleId).length]));
  const statusDistribution: Record<string, number> = {};
  for (const job of jobs) {
    const status = String(job.status.display ?? "Blank in source");
    statusDistribution[status] = (statusDistribution[status] ?? 0) + 1;
  }
  const sourceSummary = summarizePresentationJobs(jobs);
  return Object.freeze({
    mode,
    snapshot: {
      snapshotId: imported.snapshot.snapshotId,
      fileName: mode === "MASKED_DEMO" ? "2025 Work Schedule" : imported.snapshot.source.fileName,
      sourceHash: imported.snapshot.source.sha256,
      importBatchId: imported.snapshot.importBatchId,
      jobCount: jobs.length,
      reviewCount: imported.snapshot.counts.REVIEW_RECORD,
      sourceUnchanged: imported.sourceUnchanged,
    },
    jobs,
    rules: RULE_DEFINITIONS,
    reviewLedger: imported.snapshot.reviewLedger.filter((entry) => entry.classification !== "EMPTY").map(({ sheetName, rowNumber, classification, reasons }) => ({ sheetName, rowNumber, classification, reasons })),
    summary: { findingsByRule, statusDistribution, ...sourceSummary },
  });
}
