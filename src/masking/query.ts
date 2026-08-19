import type { PresenceState } from "../contracts/index.js";
import type { OperationsPresentationDto, PresentationField } from "./presentation.js";

export type SearchMatchLane = "SOURCE" | "NORMALIZED" | null;
export type PresentationSort = "source" | "customer" | "jobName" | "status" | "metric";
export type SortDirection = "asc" | "desc";

export interface PresentationJobQuery {
  readonly search?: string;
  readonly status?: string;
  readonly era?: string;
  readonly buyout?: string;
  readonly delivery?: string;
  readonly metricField?: string;
  readonly metricPresence?: string;
  readonly metricMin?: number | null;
  readonly metricMax?: number | null;
  readonly findingRuleId?: string;
  readonly sort?: PresentationSort;
  readonly direction?: SortDirection;
}

export interface PresentationJobResult {
  readonly job: OperationsPresentationDto;
  readonly matchLane: SearchMatchLane;
}

export interface DistributionEntry {
  readonly key: string;
  readonly label: string;
  readonly count: number;
}

export interface PresentationSummary {
  readonly deliveryDistribution: readonly DistributionEntry[];
  readonly buyoutDistribution: readonly DistributionEntry[];
  readonly metricPresenceDistribution: readonly DistributionEntry[];
  readonly presenceReviewCount: number;
  readonly jobsWithMetricReviewCount: number;
}

const metricNames = ["burn_sheets", "liner_sheets", "liner_area", "liner_size", "coil_pc_count", "coil_lbs", "optimized_pc_count", "optimized_lbs"] as const;

const presenceLabels: Readonly<Record<PresenceState, string>> = {
  VALUE: "Value in source",
  BLANK: "Blank in source",
  EXPLICIT_NA: "NA in source",
  COLUMN_UNAVAILABLE: "Not collected in this period",
  SOURCE_ANNOTATION: "Source annotation",
  CROSS_PERIOD_ANNOTATION: "Attributed elsewhere in source",
  MALFORMED: "Could not parse",
  FORMULA: "Formula result (source)",
  FORMULA_ERROR: "Source formula error",
};

const text = (value: unknown): string => String(value ?? "").trim();
const normalized = (value: unknown): string => text(value).toLocaleLowerCase("en-US");

const booleanValue = (field: PresentationField): boolean | null => {
  if (field.presence !== "VALUE") return null;
  if (field.display === true || normalized(field.display) === "true") return true;
  if (field.display === false || normalized(field.display) === "false") return false;
  return null;
};

export function buyoutSourceState(job: OperationsPresentationDto): { readonly key: string; readonly label: string } {
  const ordered = booleanValue(job.buyoutOrdered);
  const received = booleanValue(job.buyoutReceived);
  if (ordered === true && received === true) return { key: "ORDERED_TRUE_RECEIVED_TRUE", label: "Ordered true · received true" };
  if (ordered === true) return { key: "ORDERED_TRUE_RECEIVED_NOT_TRUE", label: "Ordered true · received not true" };
  if (ordered === false) return { key: "ORDERED_FALSE", label: "Ordered false" };
  return { key: "SOURCE_STATE_REVIEW", label: "Buyout source state needs review" };
}

export function deliverySourceState(job: OperationsPresentationDto): { readonly key: string; readonly label: string } {
  if (job.deliveryMode.presence === "VALUE") {
    const label = text(job.deliveryMode.display) || "Recorded empty text";
    return { key: `VALUE:${label}`, label };
  }
  return { key: `PRESENCE:${job.deliveryMode.presence}`, label: presenceLabels[job.deliveryMode.presence] };
}

function searchLane(job: OperationsPresentationDto, search: string): SearchMatchLane | false {
  const needle = normalized(search);
  if (!needle) return null;
  const searchable = [job.customer, job.po, job.jobName, job.legacyJobNumber, job.deliveryContact];
  if (searchable.some((field) => normalized(field.display).includes(needle))) return "SOURCE";
  if (searchable.some((field) => normalized(field.normalizedDisplay).includes(needle))) return "NORMALIZED";
  return false;
}

function metricCandidates(job: OperationsPresentationDto, metricField: string | undefined): readonly PresentationField[] {
  if (!metricField || metricField === "ANY") return metricNames.map((name) => job.metrics[name]).filter((field): field is PresentationField => field !== undefined);
  const field = job.metrics[metricField];
  return field ? [field] : [];
}

function matchesMetric(job: OperationsPresentationDto, query: PresentationJobQuery): boolean {
  const candidates = metricCandidates(job, query.metricField);
  if (query.metricPresence && query.metricPresence !== "ALL") {
    const presenceMatches = query.metricPresence === "NON_VALUE"
      ? candidates.some((field) => field.presence !== "VALUE")
      : candidates.some((field) => field.presence === query.metricPresence);
    if (!presenceMatches) return false;
  }
  if (query.metricMin !== null && query.metricMin !== undefined || query.metricMax !== null && query.metricMax !== undefined) {
    return candidates.some((field) => {
      if (field.presence !== "VALUE") return false;
      const value = typeof field.display === "number" ? field.display : Number(field.display);
      if (!Number.isFinite(value)) return false;
      if (query.metricMin !== null && query.metricMin !== undefined && value < query.metricMin) return false;
      if (query.metricMax !== null && query.metricMax !== undefined && value > query.metricMax) return false;
      return true;
    });
  }
  return true;
}

function compareText(left: unknown, right: unknown): number {
  return text(left).localeCompare(text(right), "en-US", { numeric: true, sensitivity: "base" });
}

function compareJobs(left: OperationsPresentationDto, right: OperationsPresentationDto, query: PresentationJobQuery): number {
  const direction = query.direction === "desc" ? -1 : 1;
  if (query.sort === "customer") return compareText(left.customer.normalizedDisplay ?? left.customer.display, right.customer.normalizedDisplay ?? right.customer.display) * direction;
  if (query.sort === "jobName") return compareText(left.jobName.normalizedDisplay ?? left.jobName.display, right.jobName.normalizedDisplay ?? right.jobName.display) * direction;
  if (query.sort === "status") return compareText(left.status.display, right.status.display) * direction;
  if (query.sort === "metric" && query.metricField && query.metricField !== "ANY") {
    const a = left.metrics[query.metricField];
    const b = right.metrics[query.metricField];
    const aValue = a?.presence === "VALUE" ? Number(a.display) : Number.NaN;
    const bValue = b?.presence === "VALUE" ? Number(b.display) : Number.NaN;
    const aNumeric = Number.isFinite(aValue);
    const bNumeric = Number.isFinite(bValue);
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    if (aNumeric && bNumeric && aValue !== bValue) return (aValue - bValue) * direction;
    return compareText(a?.presence, b?.presence);
  }
  const sheet = compareText(left.provenance.sheetName, right.provenance.sheetName);
  if (sheet !== 0) return sheet * direction;
  return (left.provenance.rowNumber - right.provenance.rowNumber) * direction;
}

export function queryPresentationJobs(
  jobs: readonly OperationsPresentationDto[],
  query: PresentationJobQuery,
): readonly PresentationJobResult[] {
  return jobs.flatMap((job) => {
    const lane = searchLane(job, query.search ?? "");
    if (lane === false) return [];
    if (query.status && query.status !== "ALL" && text(job.status.display) !== query.status) return [];
    if (query.era && query.era !== "ALL" && !job.provenance.sheetName.includes(query.era)) return [];
    if (query.buyout && query.buyout !== "ALL" && buyoutSourceState(job).key !== query.buyout) return [];
    if (query.delivery && query.delivery !== "ALL" && deliverySourceState(job).key !== query.delivery) return [];
    if (query.findingRuleId && query.findingRuleId !== "ALL" && !job.findings.some((finding) => finding.ruleId === query.findingRuleId)) return [];
    if (!matchesMetric(job, query)) return [];
    return [{ job, matchLane: lane }];
  }).sort((left, right) => compareJobs(left.job, right.job, query) || left.job.jobReleaseId.localeCompare(right.job.jobReleaseId));
}

function distribution(entries: readonly { readonly key: string; readonly label: string }[]): readonly DistributionEntry[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const entry of entries) {
    const current = counts.get(entry.key) ?? { label: entry.label, count: 0 };
    counts.set(entry.key, { label: current.label, count: current.count + 1 });
  }
  return Object.freeze([...counts.entries()].map(([key, value]) => Object.freeze({ key, ...value })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)));
}

export function summarizePresentationJobs(jobs: readonly OperationsPresentationDto[]): PresentationSummary {
  const metricFields = jobs.flatMap((job) => metricNames.map((name) => job.metrics[name]).filter((field): field is PresentationField => field !== undefined));
  const nonValues = metricFields.filter((field) => field.presence !== "VALUE");
  return Object.freeze({
    deliveryDistribution: distribution(jobs.map(deliverySourceState)),
    buyoutDistribution: distribution(jobs.map(buyoutSourceState)),
    metricPresenceDistribution: distribution(metricFields.map((field) => ({ key: field.presence, label: presenceLabels[field.presence] }))),
    presenceReviewCount: nonValues.length,
    jobsWithMetricReviewCount: jobs.filter((job) => metricNames.some((name) => job.metrics[name]?.presence !== "VALUE")).length,
  });
}
