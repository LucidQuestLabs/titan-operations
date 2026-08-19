import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { SourceFileId, SourceFileRegistration } from "../contracts/index.js";

export const IMPORTER_VERSION = "0.1.0";

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

export function stableDigest(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\n"), "utf8").digest("hex");
}

export async function registerSource(
  path: string,
  importedAt: string,
): Promise<SourceFileRegistration> {
  const details = await stat(path);
  const sha256 = await sha256File(path);
  const fileName = path.replaceAll("\\", "/").split("/").at(-1) ?? path;
  return Object.freeze({
    sourceFileId: `src_${sha256.slice(0, 24)}` as SourceFileId,
    fileName,
    path,
    sha256,
    sizeBytes: details.size,
    importedAt,
    importerVersion: IMPORTER_VERSION,
  });
}

