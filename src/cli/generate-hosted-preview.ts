import { createHash, createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createOperationsApiResponse, type OperationsApiResponse } from "../server/operations-api.js";

const GENERATOR_ID = "titan-rc0-hosted-preview";
const GENERATOR_VERSION = "0.1.0";
const SOURCE_WORKBOOK_LABEL = "2025 Work Schedule 123.xlsx";
const SOURCE_WORKBOOK_SHA256 = "E3D9522382A2BDC05A96BC3370D4886351D7180DE2DA864961C0534BD57B33A0";
const FROZEN_IMPLEMENTATION_COMMIT = "f20c39000830a44905c6afa31969d9c8610d9558";
const DEPLOYMENT_BRANCH = "rc0/netlify-owner-preview";

const [workbookPath, dataOutputPath = "public/data/rc0-preview.json", manifestOutputPath = "deployment/rc0-preview-data-manifest.json"] = process.argv.slice(2);
const profileKey = process.env.TITAN_RC0_MASK_KEY;
const generatedAt = process.env.TITAN_RC0_GENERATED_AT ?? new Date().toISOString();

if (!workbookPath) {
  throw new Error("Usage: TITAN_RC0_MASK_KEY=<secret> node dist/server/src/cli/generate-hosted-preview.js <authorized-workbook.xlsx> [data-output] [manifest-output]");
}
if (!profileKey?.trim()) {
  throw new Error("TITAN_RC0_MASK_KEY is required; hosted preview generation fails closed.");
}

const digest = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");
const hostedId = (kind: string, value: string): string =>
  `hosted_${kind}_${createHmac("sha256", profileKey).update(`${GENERATOR_VERSION}:${kind}:${value}`).digest("hex").slice(0, 28)}`;

const [internal, masked] = await Promise.all([
  createOperationsApiResponse(workbookPath, "INTERNAL_DATA", null),
  createOperationsApiResponse(workbookPath, "MASKED_DEMO", profileKey),
]);
if (masked.snapshot.sourceHash.toUpperCase() !== SOURCE_WORKBOOK_SHA256) {
  throw new Error(`Source workbook hash mismatch: expected ${SOURCE_WORKBOOK_SHA256}, received ${masked.snapshot.sourceHash.toUpperCase()}`);
}
if (!masked.snapshot.sourceUnchanged) {
  throw new Error("Source integrity check failed during hosted preview generation.");
}

const derivative: OperationsApiResponse = Object.freeze({
  ...masked,
  mode: "MASKED_DEMO",
  jobs: Object.freeze(masked.jobs.map((job) => Object.freeze({
    ...job,
    customerId: job.customerId ? hostedId("customer", job.customerId) : null,
  }))),
});

const derivativeJson = `${JSON.stringify(derivative)}\n`;
const derivativeSnapshotSha256 = digest(derivativeJson);
const derivativeStrings = new Set<string>();
const collectStrings = (candidate: unknown): void => {
  if (typeof candidate === "string") { derivativeStrings.add(candidate.toLocaleLowerCase("en-US")); return; }
  if (Array.isArray(candidate)) { candidate.forEach(collectStrings); return; }
  if (candidate && typeof candidate === "object") Object.values(candidate).forEach(collectStrings);
};
collectStrings(derivative);
const protectedSourceValues = internal.jobs.flatMap((job) => [
  job.customerId,
  job.customer.display,
  job.po.display,
  job.jobName.display,
  job.legacyJobNumber.display,
  job.phone.display,
  job.operationalNote.display,
  job.officeOnlyNote.display,
  job.dueDate.display,
  job.vendorPoComposite.display,
  job.deliveryContact.display,
  job.deliveryDayDate.display,
  job.enteredBy.display,
  ...Object.values(job.officeEvents).map((event) => event.display),
  ...job.provenance.fields
    .filter((field) => ["legacy_job_number", "customer", "po", "job_name", "phone", "operational_note", "office_only_note", "due_date", "vendor_po_composite", "delivery_contact", "entered_by", "delivery_day_date", "scanned", "calculated", "invoiced"].includes(field.canonicalField))
    .map((field) => field.rawDisplay),
  job.provenance.sourceFile,
]).filter((value): value is string => typeof value === "string" && value.trim().length >= 6);
const fixedMaskVocabulary = new Set(["customer", "project", "release", "complete"]);
const actionableProtectedValueLeaks = [...new Set(protectedSourceValues)].filter((value) => {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (!derivativeStrings.has(normalized)) return false;
  if (fixedMaskVocabulary.has(normalized)) return false;
  if (/^(customer \d{3}|project \d{3}( \/ release \d{3})?|po-c\d{3}-\d{3}|jr-2025-\d{4}|\(000\) 000-\d{4})$/i.test(value.trim())) return false;
  return true;
});
if (actionableProtectedValueLeaks.length > 0) {
  throw new Error(`Hosted derivative leak audit failed with ${actionableProtectedValueLeaks.length} protected source values.`);
}
if (internal.snapshot.jobCount !== derivative.snapshot.jobCount || JSON.stringify(internal.summary.findingsByRule) !== JSON.stringify(derivative.summary.findingsByRule)) {
  throw new Error("Hosted derivative invariance check failed for records or rule findings.");
}
const manifest = {
  schema: "titan-operations-rc0-preview-data-manifest",
  version: "0.1.0",
  generatedAt,
  generator: { id: GENERATOR_ID, version: GENERATOR_VERSION },
  sourceWorkbookLabel: SOURCE_WORKBOOK_LABEL,
  sourceWorkbookSha256: SOURCE_WORKBOOK_SHA256,
  frozenImplementationCommit: FROZEN_IMPLEMENTATION_COMMIT,
  deploymentBranch: DEPLOYMENT_BRANCH,
  derivativeSnapshotSha256,
  qualifiedRecordCount: derivative.snapshot.jobCount,
  reviewRecordCount: derivative.snapshot.reviewCount,
  ruleCatalog: derivative.rules.map((rule) => ({ id: rule.ruleId, version: rule.version, disposition: rule.disposition })),
  maskingProfile: { id: "titan-rc0-masked-demo", version: "0.1.0", keyMaterialIncluded: false },
  valueClassification: "MASKED",
  dataMode: "MASKED_DEMO",
  purpose: "CONTROLLED_OWNER_PREVIEW",
  provenanceSupportLevel: "MASKED_SOURCE_HASH_SHEET_ROW_CELL_AND_TYPED_PRESENCE",
  verification: {
    sourceUnchanged: true,
    recordCountInvariant: true,
    ruleFindingCountsInvariant: true,
    actionableProtectedValueLeakCount: 0,
  },
  generationEnvironment: { node: process.version, platform: process.platform, architecture: process.arch },
  authorityStatement: "DERIVED PREVIEW DATA — NOT SOURCE AUTHORITY",
} as const;

await mkdir(dirname(dataOutputPath), { recursive: true });
await mkdir(dirname(manifestOutputPath), { recursive: true });
await writeFile(dataOutputPath, derivativeJson, { encoding: "utf8", flag: "w" });
await writeFile(manifestOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "w" });

process.stdout.write(`${JSON.stringify({
  dataOutputPath,
  manifestOutputPath,
  derivativeSnapshotSha256,
  qualifiedRecordCount: derivative.snapshot.jobCount,
  reviewRecordCount: derivative.snapshot.reviewCount,
  mode: derivative.mode,
}, null, 2)}\n`);
