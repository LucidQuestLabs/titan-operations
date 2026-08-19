import { importWorkbookReadOnly } from "../import/index.js";

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error("Usage: node dist/cli/import-authorized.js <authorized-workbook.xlsx>");
}

const result = await importWorkbookReadOnly(sourcePath);
const summaryCells = result.snapshot.sourceSummaryCells;
const allRetainedCells = Object.values(result.snapshot.sourceCellsById);
const report = {
  status: result.snapshot.promotable ? "STAGED" : "DIAGNOSTIC",
  source: {
    fileName: result.snapshot.source.fileName,
    sizeBytes: result.snapshot.source.sizeBytes,
    sha256: result.snapshot.source.sha256,
  },
  importerVersion: result.snapshot.source.importerVersion,
  importBatchId: result.snapshot.importBatchId,
  snapshotId: result.snapshot.snapshotId,
  semanticSnapshotHash: result.snapshot.semanticSnapshotHash,
  sourceUnchanged: result.sourceUnchanged,
  counts: result.snapshot.counts,
  sourceSummaryCellCount: summaryCells.length,
  retainedFormulaCellCount: allRetainedCells.filter((cell) => cell.presence === "FORMULA").length,
  retainedFormulaErrorCellCount: allRetainedCells.filter((cell) => cell.presence === "FORMULA_ERROR").length,
  reviewLocations: result.snapshot.reviewLedger
    .filter((entry) => entry.classification === "REVIEW_RECORD")
    .map((entry) => ({ sheetName: entry.sheetName, rowNumber: entry.rowNumber, reasons: entry.reasons })),
  fatalErrors: result.snapshot.fatalErrors,
  warnings: result.snapshot.warnings,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
