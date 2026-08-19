import type { JobReleaseId, SourceCellId } from "./core.js";

export type AwarenessRuleId =
  | "OPS-AWR-001"
  | "OPS-AWR-002"
  | "OPS-AWR-003"
  | "OPS-AWR-004"
  | "OPS-AWR-005"
  | "OPS-AWR-006"
  | "OPS-AWR-007";

export type RuleDisposition = "BLOCKED" | "PROPOSED_REVIEW_MODE";
export type RuleOutcome =
  | "FIRED"
  | "NOT_FIRED"
  | "NOT_APPLICABLE"
  | "DISABLED_BLOCKED"
  | "UNKNOWN_INSUFFICIENT_INPUT";

export interface RuleDefinition {
  readonly ruleId: AwarenessRuleId;
  readonly version: string;
  readonly disposition: RuleDisposition;
  readonly operational: boolean;
  readonly title: string;
  readonly snagIds: readonly string[];
}

export interface RuleEvaluation {
  readonly evaluationId: string;
  readonly ruleId: AwarenessRuleId;
  readonly ruleVersion: string;
  readonly jobReleaseId: JobReleaseId | null;
  readonly outcome: RuleOutcome;
  readonly disposition: RuleDisposition;
  readonly reason: string;
  readonly exclusions: readonly string[];
  readonly sourceCellIds: readonly SourceCellId[];
}

