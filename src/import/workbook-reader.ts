import ExcelJS from "exceljs";
import type {
  ExcelDataType,
  ImportBatchId,
  SchemaEra,
  SourceCell,
  SourceCellId,
  SourceFileRegistration,
} from "../contracts/index.js";
import { classifyPresence } from "./presence.js";
import { ERA_BY_SHEET, HEADER_CONTRACTS, type ExpectedSheetName } from "./schema.js";
import { stableDigest } from "./source-registration.js";

export interface ExtractedRow {
  readonly sheetName: string;
  readonly rowNumber: number;
  readonly schemaEra: SchemaEra;
  readonly cells: Readonly<Record<string, SourceCell>>;
}

export interface WorkbookExtraction {
  readonly sheetNames: readonly string[];
  readonly headersBySheet: Readonly<Record<string, readonly (string | null)[]>>;
  readonly operationalRows: readonly ExtractedRow[];
  readonly summaryCells: readonly SourceCell[];
  readonly date1904: boolean;
}

const metricFields = new Set([
  "burn_sheets", "liner_sheets", "liner_area", "liner_size",
  "coil_pc_count", "coil_lbs", "optimized_pc_count", "optimized_lbs",
]);

function cellShape(value: ExcelJS.CellValue): {
  excelDataType: ExcelDataType;
  rawValue: unknown;
  formulaText: string | null;
  cachedValue: unknown | null;
  formulaError: boolean;
} {
  if (value === null || value === undefined) return { excelDataType: "blank", rawValue: null, formulaText: null, cachedValue: null, formulaError: false };
  if (value instanceof Date) return { excelDataType: "date", rawValue: value, formulaText: null, cachedValue: null, formulaError: false };
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return { excelDataType: typeof value as "boolean" | "number" | "string", rawValue: value, formulaText: null, cachedValue: null, formulaError: false };
  }
  if (typeof value === "object" && "formula" in value) {
    const formula = value as ExcelJS.CellFormulaValue;
    const result = formula.result ?? null;
    const formulaError = typeof result === "object" && result !== null && "error" in result;
    return { excelDataType: "formula", rawValue: null, formulaText: formula.formula, cachedValue: result, formulaError };
  }
  if (typeof value === "object" && "error" in value) {
    return { excelDataType: "error", rawValue: (value as ExcelJS.CellErrorValue).error, formulaText: null, cachedValue: null, formulaError: true };
  }
  if (typeof value === "object" && "text" in value) {
    return { excelDataType: "string", rawValue: String((value as { text: string }).text), formulaText: null, cachedValue: null, formulaError: false };
  }
  if (typeof value === "object" && "richText" in value) {
    const text = (value as ExcelJS.CellRichTextValue).richText.map((part) => part.text).join("");
    return { excelDataType: "string", rawValue: text, formulaText: null, cachedValue: null, formulaError: false };
  }
  return { excelDataType: "string", rawValue: String(value), formulaText: null, cachedValue: null, formulaError: false };
}

function extractCell(
  cell: ExcelJS.Cell,
  headerRaw: string | null,
  canonicalField: string | null,
  schemaEra: SchemaEra,
  source: SourceFileRegistration,
  importBatchId: ImportBatchId,
  fieldAvailable = true,
): SourceCell {
  const shape = cellShape(cell.value);
  const sourceCellId = `cell_${stableDigest(source.sha256, cell.worksheet.name, cell.address).slice(0, 32)}` as SourceCellId;
  const presence = classifyPresence({
    fieldAvailable,
    excelDataType: shape.excelDataType,
    rawValue: shape.rawValue,
    formulaText: shape.formulaText,
    formulaError: shape.formulaError,
    metric: canonicalField !== null && metricFields.has(canonicalField),
  });
  return Object.freeze({
    sourceCellId,
    ref: Object.freeze({
      sourceFileId: source.sourceFileId,
      fileName: source.fileName,
      fileSha256: source.sha256,
      sheetName: cell.worksheet.name,
      row: Number(cell.row),
      column: Number(cell.col),
      address: cell.address,
      headerRaw,
      canonicalField,
      schemaEra,
      importBatchId,
    }),
    excelDataType: shape.excelDataType,
    rawValue: shape.rawValue,
    formulaText: shape.formulaText,
    cachedValue: shape.cachedValue,
    displayText: cell.text || null,
    numberFormat: cell.numFmt || null,
    mergedAnchor: cell.isMerged ? cell.master.address === cell.address : false,
    presence,
  });
}

export class ReadOnlyWorkbookReader {
  async extract(
    path: string,
    source: SourceFileRegistration,
    importBatchId: ImportBatchId,
  ): Promise<WorkbookExtraction> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path);
    const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
    const headersBySheet: Record<string, readonly (string | null)[]> = {};
    const operationalRows: ExtractedRow[] = [];
    const summaryCells: SourceCell[] = [];

    for (const sheet of workbook.worksheets) {
      if (sheet.name === "Sheet1") {
        sheet.eachRow({ includeEmpty: false }, (row) => {
          row.eachCell({ includeEmpty: false }, (cell) => {
            summaryCells.push(extractCell(cell, null, null, "ERA_2025_JAN_MAR", source, importBatchId));
          });
        });
        continue;
      }
      if (!(sheet.name in ERA_BY_SHEET)) continue;
      const era = ERA_BY_SHEET[sheet.name as Exclude<ExpectedSheetName, "Sheet1">];
      const contract = HEADER_CONTRACTS[era];
      const maxColumn = Math.max(...contract.map((item) => item.column));
      const headers = Array.from({ length: maxColumn }, (_, index) => {
        const text = sheet.getCell(1, index + 1).text;
        return text === "" ? null : text;
      });
      headersBySheet[sheet.name] = headers;

      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
        const cells: Record<string, SourceCell> = {};
        for (const item of contract) {
          const cell = sheet.getCell(rowNumber, item.column);
          cells[item.canonicalField] = extractCell(
            cell,
            headers[item.column - 1] ?? null,
            item.canonicalField,
            era,
            source,
            importBatchId,
          );
        }
        operationalRows.push(Object.freeze({ sheetName: sheet.name, rowNumber, schemaEra: era, cells: Object.freeze(cells) }));
      }
    }

    return Object.freeze({
      sheetNames: Object.freeze(sheetNames),
      headersBySheet: Object.freeze(headersBySheet),
      operationalRows: Object.freeze(operationalRows),
      summaryCells: Object.freeze(summaryCells),
      date1904: workbook.properties.date1904 ?? false,
    });
  }
}
