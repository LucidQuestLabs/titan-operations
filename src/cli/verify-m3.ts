import { importWorkbookReadOnly } from "../import/index.js";
import { buildPresentationDto, maskPresentationDtos } from "../masking/index.js";
import { evaluateJobRules, operationalFindings } from "../rules/index.js";

const sourcePath = process.argv[2];
const profileKey = process.env.TITAN_RC0_MASK_KEY;
if (!sourcePath || !profileKey) {
  throw new Error("Usage: TITAN_RC0_MASK_KEY=<session-secret> node dist/cli/verify-m3.js <authorized-workbook.xlsx>");
}

const result = await importWorkbookReadOnly(sourcePath);
const evaluations = result.snapshot.jobs.flatMap((job) => evaluateJobRules(job, result.snapshot.snapshotId));
const findings = operationalFindings(evaluations);
const internalDtos = result.snapshot.jobs.map((job) => buildPresentationDto(
  job,
  result.snapshot.snapshotId,
  operationalFindings(evaluateJobRules(job, result.snapshot.snapshotId)),
));
const maskedDtos = maskPresentationDtos(internalDtos, {
  profileId: "titan-rc0-masked-demo",
  version: "0.1.0",
  secretRef: "environment:TITAN_RC0_MASK_KEY",
  profileKey,
  dateShiftDays: 0,
  redactOfficeOnlyNotes: true,
});

const sensitiveFields = internalDtos.flatMap((dto) => ([
  ["customer", dto.customer.display],
  ["po", dto.po.display],
  ["jobName", dto.jobName.display],
  ["legacyJobNumber", dto.legacyJobNumber.display],
  ["phone", dto.phone.display],
  ["operationalNote", dto.operationalNote.display],
  ["officeOnlyNote", dto.officeOnlyNote.display],
  ["dueDate", dto.dueDate.display],
  ["vendorPoComposite", dto.vendorPoComposite.display],
  ["deliveryContact", dto.deliveryContact.display],
  ["deliveryDayDate", dto.deliveryDayDate.display],
  ["enteredBy", dto.enteredBy.display],
  ...Object.values(dto.officeEvents).map((event) => ["officeEvent", event.display] as const),
  ...dto.provenance.fields.filter((field) => ["legacy_job_number", "customer", "po", "job_name", "phone", "operational_note", "office_only_note", "due_date", "vendor_po_composite", "delivery_contact", "entered_by", "delivery_day_date", "scanned", "calculated", "invoiced"].includes(field.canonicalField)).map((field) => ["provenanceRaw", field.rawDisplay] as const),
  ["sourceFile", dto.provenance.sourceFile],
] as const))
  .filter((entry) => typeof entry[1] === "string" && entry[1].trim().length >= 6)
  .map(([fieldName, value]) => ({ fieldName, value: String(value) }));
const maskedStrings = new Set<string>();
const collectStrings = (candidate: unknown): void => {
  if (typeof candidate === "string") { maskedStrings.add(candidate.toLocaleLowerCase("en-US")); return; }
  if (Array.isArray(candidate)) { candidate.forEach(collectStrings); return; }
  if (candidate && typeof candidate === "object") Object.values(candidate).forEach(collectStrings);
};
collectStrings(maskedDtos);
const leaks = sensitiveFields.filter(({ value }) => maskedStrings.has(value.toLocaleLowerCase("en-US")));
const leakCountByField = Object.fromEntries([...new Set(leaks.map(({ fieldName }) => fieldName))].map((fieldName) => [fieldName, leaks.filter((candidate) => candidate.fieldName === fieldName).length]));
const fixedMaskVocabulary = new Set(["customer", "project", "release", "job", "po", "complete"]);
const classifyLeak = (value: string): "FIXED_MASK_VOCABULARY" | "GENERATED_ALIAS_COLLISION" | "ACTIONABLE" => {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (fixedMaskVocabulary.has(normalized)) return "FIXED_MASK_VOCABULARY";
  if (/^(customer \d{3}|project \d{3}( \/ release \d{3})?|po-c\d{3}-\d{3}|jr-2025-\d{4}|\(000\) 000-\d{4})$/i.test(value.trim())) return "GENERATED_ALIAS_COLLISION";
  return "ACTIONABLE";
};
const leakClassifications = Object.fromEntries(["FIXED_MASK_VOCABULARY", "GENERATED_ALIAS_COLLISION", "ACTIONABLE"].map((classification) => [classification, leaks.filter(({ value }) => classifyLeak(value) === classification).length]));
const actionableLeakCount = leaks.filter(({ value }) => classifyLeak(value) === "ACTIONABLE").length;
const blockedOperationalCount = evaluations.filter((item) => item.disposition === "BLOCKED" && item.outcome === "FIRED").length;
const invariantFailureCount = internalDtos.filter((dto, index) => {
  const masked = maskedDtos[index];
  return !masked || masked.jobReleaseId !== dto.jobReleaseId || JSON.stringify(masked.metrics) !== JSON.stringify(dto.metrics) || JSON.stringify(masked.findings) !== JSON.stringify(dto.findings);
}).length;

const report = {
  snapshotId: result.snapshot.snapshotId,
  jobCount: result.snapshot.jobs.length,
  evaluationCount: evaluations.length,
  reviewModeFindingCount: findings.length,
  findingsByRule: Object.fromEntries(["OPS-AWR-002", "OPS-AWR-003", "OPS-AWR-004", "OPS-AWR-007"].map((ruleId) => [ruleId, findings.filter((item) => item.ruleId === ruleId).length])),
  blockedOperationalCount,
  maskedDtoCount: maskedDtos.length,
  invariantFailureCount,
  leakCount: leaks.length,
  leakCountByField,
  leakClassifications,
  actionableLeakCount,
  sourceUnchanged: result.sourceUnchanged,
};

if (blockedOperationalCount !== 0 || invariantFailureCount !== 0 || actionableLeakCount !== 0) process.exitCode = 1;
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
