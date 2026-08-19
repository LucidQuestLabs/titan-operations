import type { RuleDefinition } from "../contracts/index.js";

export const RULE_DEFINITIONS: readonly RuleDefinition[] = Object.freeze([
  { ruleId: "OPS-AWR-001", version: "0.1.0", disposition: "BLOCKED", operational: false, title: "Due / Overdue Attention", snagIds: ["SNAG-007", "SNAG-009"] },
  { ruleId: "OPS-AWR-002", version: "0.1.0", disposition: "PROPOSED_REVIEW_MODE", operational: true, title: "Unresolved Buyout Source Condition", snagIds: ["SNAG-011"] },
  { ruleId: "OPS-AWR-003", version: "0.1.0", disposition: "PROPOSED_REVIEW_MODE", operational: true, title: "Pieces Without Associated Pounds", snagIds: ["SNAG-008", "SNAG-012"] },
  { ruleId: "OPS-AWR-004", version: "0.1.0", disposition: "PROPOSED_REVIEW_MODE", operational: true, title: "Office Event Chronology Review", snagIds: ["SNAG-003"] },
  { ruleId: "OPS-AWR-005", version: "0.1.0", disposition: "BLOCKED", operational: false, title: "Complete With Absent Office Handoff Fields", snagIds: ["SNAG-003", "SNAG-007"] },
  { ruleId: "OPS-AWR-006", version: "0.1.0", disposition: "BLOCKED", operational: false, title: "Delivery Information Completeness", snagIds: ["SNAG-009"] },
  { ruleId: "OPS-AWR-007", version: "0.1.0", disposition: "PROPOSED_REVIEW_MODE", operational: true, title: "Schema / Metric Source State", snagIds: ["SNAG-002", "SNAG-008", "SNAG-012"] },
]);

export function assertUniqueRuleRegistry(definitions: readonly RuleDefinition[] = RULE_DEFINITIONS): void {
  const keys = new Set<string>();
  for (const definition of definitions) {
    const key = `${definition.ruleId}:${definition.version}`;
    if (keys.has(key)) throw new Error(`Duplicate rule definition: ${key}`);
    keys.add(key);
  }
}

