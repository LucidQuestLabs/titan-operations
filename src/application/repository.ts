import type { PresenceState, RuleEvaluation, SourceCell } from "../contracts/index.js";
import type { ImmutableImportSnapshot, ImportedJobRelease } from "../import/index.js";
import { evaluateJobRules, operationalFindings } from "../rules/index.js";

export interface JobReleaseQuery {
  readonly search?: string;
  readonly status?: string;
  readonly era?: string;
  readonly metricField?: string;
  readonly metricPresence?: PresenceState;
  readonly findingRuleId?: string;
  readonly sort?: "customer" | "jobName" | "metric";
  readonly direction?: "asc" | "desc";
  readonly page?: number;
  readonly pageSize?: number;
}

export interface JobReleaseReadModel {
  readonly job: ImportedJobRelease;
  readonly evaluations: readonly RuleEvaluation[];
  readonly findings: readonly RuleEvaluation[];
  readonly searchLane: "RAW" | "NORMALIZED" | null;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

const normalizedText = (job: ImportedJobRelease): string => [job.customer.value, job.po.value, job.jobName.value, job.productionStatus.value].filter(Boolean).join(" ").toLocaleLowerCase("en-US");
const rawText = (job: ImportedJobRelease): string => Object.values(job.sourceCells).map((cell) => cell.displayText ?? "").join(" ").toLocaleLowerCase("en-US");

export class InMemoryOperationsRepository {
  constructor(readonly snapshot: ImmutableImportSnapshot) {}

  search(query: JobReleaseQuery = {}): Page<JobReleaseReadModel> {
    const needle = query.search?.trim().toLocaleLowerCase("en-US") ?? "";
    let models = this.snapshot.jobs.map((job): JobReleaseReadModel => {
      const evaluations = evaluateJobRules(job, this.snapshot.snapshotId);
      const normalizedMatch = needle !== "" && normalizedText(job).includes(needle);
      const rawMatch = needle !== "" && rawText(job).includes(needle);
      return { job, evaluations, findings: operationalFindings(evaluations), searchLane: rawMatch ? "RAW" : normalizedMatch ? "NORMALIZED" : null };
    });
    if (needle) models = models.filter((model) => model.searchLane !== null);
    if (query.status) models = models.filter((model) => model.job.sourceCells.production_status?.displayText?.trim() === query.status);
    if (query.era) models = models.filter((model) => model.job.schemaEra === query.era);
    if (query.metricField && query.metricPresence) models = models.filter((model) => model.job.sourceCells[query.metricField!]?.presence === query.metricPresence);
    if (query.findingRuleId) models = models.filter((model) => model.findings.some((finding) => finding.ruleId === query.findingRuleId));

    const direction = query.direction === "desc" ? -1 : 1;
    models.sort((left, right) => {
      if (query.sort === "customer") return (left.job.customer.value ?? "").localeCompare(right.job.customer.value ?? "") * direction;
      if (query.sort === "jobName") return (left.job.jobName.value ?? "").localeCompare(right.job.jobName.value ?? "") * direction;
      if (query.sort === "metric" && query.metricField) {
        const a = left.job.sourceCells[query.metricField];
        const b = right.job.sourceCells[query.metricField];
        const aNumeric = a?.presence === "VALUE" && typeof a.rawValue === "number";
        const bNumeric = b?.presence === "VALUE" && typeof b.rawValue === "number";
        if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
        if (aNumeric && bNumeric) return ((a.rawValue as number) - (b.rawValue as number)) * direction;
      }
      return left.job.jobReleaseId.localeCompare(right.job.jobReleaseId);
    });

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 50));
    const start = (page - 1) * pageSize;
    return Object.freeze({ items: Object.freeze(models.slice(start, start + pageSize)), total: models.length, page, pageSize });
  }

  get(jobReleaseId: string): JobReleaseReadModel | null {
    const job = this.snapshot.jobs.find((candidate) => candidate.jobReleaseId === jobReleaseId);
    if (!job) return null;
    const evaluations = evaluateJobRules(job, this.snapshot.snapshotId);
    return Object.freeze({ job, evaluations, findings: operationalFindings(evaluations), searchLane: null });
  }

  lineage(jobReleaseId: string): readonly SourceCell[] {
    const job = this.snapshot.jobs.find((candidate) => candidate.jobReleaseId === jobReleaseId);
    return job ? Object.freeze(Object.values(job.sourceCells)) : [];
  }

  reviewLedger() { return this.snapshot.reviewLedger; }
}

export function serializeQuery(query: JobReleaseQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value));
  return params.toString();
}

export function parseQuery(serialized: string): JobReleaseQuery {
  const params = new URLSearchParams(serialized);
  const page = params.get("page");
  const pageSize = params.get("pageSize");
  return {
    ...(params.get("search") ? { search: params.get("search")! } : {}),
    ...(params.get("status") ? { status: params.get("status")! } : {}),
    ...(params.get("era") ? { era: params.get("era")! } : {}),
    ...(params.get("metricField") ? { metricField: params.get("metricField")! } : {}),
    ...(params.get("metricPresence") ? { metricPresence: params.get("metricPresence")! as PresenceState } : {}),
    ...(params.get("findingRuleId") ? { findingRuleId: params.get("findingRuleId")! } : {}),
    ...(params.get("sort") ? { sort: params.get("sort")! as NonNullable<JobReleaseQuery["sort"]> } : {}),
    ...(params.get("direction") ? { direction: params.get("direction")! as NonNullable<JobReleaseQuery["direction"]> } : {}),
    ...(page ? { page: Number(page) } : {}),
    ...(pageSize ? { pageSize: Number(pageSize) } : {}),
  };
}
