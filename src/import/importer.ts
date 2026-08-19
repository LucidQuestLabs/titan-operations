import type { ImportBatchId } from "../contracts/index.js";
import { ReadOnlyWorkbookReader } from "./workbook-reader.js";
import { buildSnapshot, type ImmutableImportSnapshot } from "./snapshot.js";
import { IMPORTER_VERSION, registerSource, sha256File, stableDigest } from "./source-registration.js";

export interface ImportRunResult {
  readonly snapshot: ImmutableImportSnapshot;
  readonly sourceHashBefore: string;
  readonly sourceHashAfter: string;
  readonly sourceUnchanged: boolean;
}

export async function importWorkbookReadOnly(
  path: string,
  importedAt = new Date().toISOString(),
): Promise<ImportRunResult> {
  const source = await registerSource(path, importedAt);
  const sourceHashBefore = source.sha256;
  const importBatchId = `batch_${stableDigest(source.sha256, IMPORTER_VERSION).slice(0, 26)}` as ImportBatchId;
  const extraction = await new ReadOnlyWorkbookReader().extract(path, source, importBatchId);
  const snapshot = buildSnapshot(extraction, source, importBatchId);
  const sourceHashAfter = await sha256File(path);
  if (sourceHashAfter !== sourceHashBefore) {
    throw new Error("Source integrity failure: workbook bytes changed during read-only import");
  }
  return Object.freeze({ snapshot, sourceHashBefore, sourceHashAfter, sourceUnchanged: true });
}

