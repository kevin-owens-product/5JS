import { ConnectorError } from '../core.js';
import { createHttpClient } from '../http.js';
import type { DataConnector, Field, HttpOptions } from '../types.js';
import { changingResults, configIdentifier, invalidProductResponse, noQuery, productConnector, productObject, productString } from './product-support.js';

export interface GoogleSheetsOptions extends HttpOptions {
  spreadsheetId: string;
  sheet: string;
  /** One-based first column and inclusive row interval; headers are explicitly supplied. */
  firstColumn?: number;
  startRow: number;
  endRow: number;
  fields: readonly Field[];
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
}
function columnName(column: number): string {
  let result = '';
  for (let value = column; value > 0; value = Math.floor((value - 1) / 26)) result = String.fromCharCode(65 + (value - 1) % 26) + result;
  return result;
}

/** Values API reads within one fixed rectangular range; no file listing, discovery or writes. */
export function googleSheetsConnector(options: GoogleSheetsOptions): DataConnector<void> {
  const spreadsheet = configIdentifier(options.spreadsheetId, /^[A-Za-z0-9_-]{1,256}$/);
  const firstColumn = options.firstColumn ?? 1, { startRow, endRow } = options;
  if (!productString(options.sheet, 100) || !Number.isSafeInteger(firstColumn) || firstColumn < 1 || !Number.isSafeInteger(startRow) || startRow < 1 || !Number.isSafeInteger(endRow) || endRow < startRow || endRow - startRow >= 100000 || endRow > 1000000 || !Array.isArray(options.fields) || options.fields.length < 1 || options.fields.length > 100 || Array.from(options.fields).some(field => !field || typeof field.name !== 'string' || !['string', 'number', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'binary', 'json', 'unknown'].includes(field.type)) || firstColumn + options.fields.length - 1 > 18278) throw new ConnectorError('INVALID_CONFIG', 'Configure a bounded Sheets rectangle with 1–100 named columns and at most 100000 rows.');
  const fields: Field[] = options.fields.map(field => ({ ...field }));
  const sheet = `'${options.sheet.replaceAll("'", "''")}'`;
  const render = options.valueRenderOption ?? 'FORMATTED_VALUE';
  if (!['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'].includes(render)) throw new ConnectorError('INVALID_CONFIG', 'Unsupported Sheets rendering mode.');
  const http = createHttpClient({ ...options, baseUrl: 'https://sheets.googleapis.com' });
  return productConnector(options, 'google-sheets', noQuery, async (_query, next, limit, signal) => {
    const first = next === undefined ? startRow : Number(next), last = Math.min(endRow, first + limit - 1);
    if (!Number.isSafeInteger(first) || first < startRow || first > endRow) throw invalidProductResponse();
    const range = `${sheet}!${columnName(firstColumn)}${first}:${columnName(firstColumn + fields.length - 1)}${last}`;
    const parameters = new URLSearchParams({ majorDimension: 'ROWS', valueRenderOption: render, dateTimeRenderOption: 'FORMATTED_STRING' });
    const response = productObject(await http.request(`/v4/spreadsheets/${spreadsheet}/values/${encodeURIComponent(range)}?${parameters}`, { signal }));
    if (response.majorDimension !== undefined && response.majorDimension !== 'ROWS') throw invalidProductResponse();
    const values = response.values ?? [];
    if (!Array.isArray(values) || values.length > last - first + 1 || values.some(row => !Array.isArray(row) || row.length > fields.length)) throw invalidProductResponse();
    const rows = Array.from({ length: last - first + 1 }, (_, row) => Array.from({ length: fields.length }, (_, column) => values[row]?.[column] ?? null));
    return { fields, rows, next: last < endRow ? last + 1 : undefined, warnings: [changingResults,
      'One row per configured sheet row, including blank rows. The Values API omits trailing empty cells/rows; omitted cells are represented as null, not inferred zero or false. Supplied field types do not parse or coerce source values.',
      render === 'FORMATTED_VALUE' ? 'Formatted values reflect spreadsheet locale and display precision; they are not guaranteed exact underlying numeric values.' : render === 'FORMULA' ? 'Formula cells contain formula text; literal cells retain their provider values.' : 'Unformatted numeric values already use spreadsheet/JSON number precision; exact identifiers and decimals should be stored as text.',
    ] };
  });
}
