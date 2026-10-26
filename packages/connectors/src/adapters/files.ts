import { ConnectorError, normalizeCell, runRead, validateIdentity } from '../core.js';
import type { Cell, ConnectorIdentity, DataConnector, Field, FieldType } from '../types.js';
import { jsonConnector } from './json.js';

export interface CsvOptions extends ConnectorIdentity {
  data: string | Uint8Array;
  /** A header is required unless explicit column names are supplied. */
  columns?: readonly string[];
  delimiter?: ',' | ';' | '\t' | '|';
  maxBytes?: number;
  maxRows?: number;
}
export interface ArrowField { name: string; type: { toString(): string; dictionary?: { toString(): string } }; nullable?: boolean }
export interface ArrowVector { get(index: number): unknown }
/** Structural subset of Apache Arrow JS Table, preserving duplicate field names by position. */
export interface ArrowTable {
  readonly numRows: number;
  readonly schema: { readonly fields: readonly ArrowField[] };
  getChildAt(index: number): ArrowVector | null;
}
export type ArrowCellDecoder = (vector: ArrowVector, row: number, field: ArrowField) => unknown;
export interface ArrowOptions extends ConnectorIdentity {
  data: Uint8Array;
  /** Pass Apache Arrow JS tableFromIPC. The caller owns library initialization. */
  tableFromIPC(data: Uint8Array): ArrowTable | Promise<ArrowTable>;
  /** Required for decimal, temporal and nested types. Read exact raw vector values before conversion. */
  decodeCell?: ArrowCellDecoder;
  maxBytes?: number;
  maxRows?: number;
}
export interface ParquetOptions extends ArrowOptions {
  /** Pass parquet-wasm readParquet after its runtime has been initialized. */
  readParquet(data: Uint8Array, options: { limit: number }): { intoIPCStream(): Uint8Array; free(): void };
}
export interface FileTable { fields: Field[]; rows: Cell[][]; truncated: boolean }
const maxCells = 1_000_000;

function invalid(): never { throw new ConnectorError('INVALID_FILE', 'The supplied tabular file or reader result is invalid.'); }
function bounds(maxBytes = 8 * 1024 * 1024, maxRows = 100_000) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 32 * 1024 * 1024 || !Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 100_000) throw new ConnectorError('INVALID_CONFIG', 'File limits must be 1–32 MiB and 1–100000 rows.');
  return { maxBytes, maxRows };
}
function bytes(data: Uint8Array, maxBytes: number) {
  if (!(data instanceof Uint8Array)) invalid();
  if (data.byteLength > maxBytes) throw new ConnectorError('FILE_TOO_LARGE', 'The supplied file exceeds its byte limit.');
  return data.slice();
}
function names(columns: readonly string[]) {
  if (!Array.isArray(columns) || columns.length < 1 || columns.length > 1000 || Array.from(columns).some(name => typeof name !== 'string' || name.length > 512)) invalid();
}

/** RFC 4180 quoting, CRLF/LF records, UTF-8 BOM, duplicate headers, and no implicit type coercion. */
export function parseCsvTable(text: string, maxRows: number, columns?: readonly string[], delimiter = ','): FileTable {
  if (typeof text !== 'string' || ![',', ';', '\t', '|'].includes(delimiter)) invalid();
  text = text.replace(/^\uFEFF/, '');
  let headers = columns ? [...columns] : undefined;
  if (headers) names(headers);
  let row: string[] = [], value = '', quoted = false, closed = false, started = false;
  const rows: Cell[][] = [];
  const finish = () => {
    row.push(value); value = ''; closed = false; started = false;
    if (!headers) { names(row); headers = row; }
    else {
      if (row.length !== headers.length) invalid();
      if ((rows.length + 1) * headers.length > maxCells) throw new ConnectorError('FILE_TOO_LARGE', 'The decoded table exceeds one million cells. Use a smaller file or row cap.');
      rows.push(row);
    }
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '\0') invalid();
    if (quoted) {
      if (character === '"') { if (text[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } }
      else value += character;
      continue;
    }
    if (character === delimiter) { row.push(value); value = ''; closed = false; started = true; if (row.length > 1000) invalid(); }
    else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[i + 1] === '\n') i++;
      finish(); if (rows.length > maxRows) return { fields: headers!.map(name => ({ name, type: 'string' })), rows: rows.slice(0, maxRows), truncated: true };
    } else if (character === '"') {
      if (value.length || closed) invalid(); quoted = true; started = true;
    } else { if (closed) invalid(); value += character; started = true; }
  }
  if (quoted) invalid();
  if (started || closed || row.length || value.length) finish();
  if (!headers) invalid();
  return { fields: headers.map(name => ({ name, type: 'string' })), rows: rows.slice(0, maxRows), truncated: rows.length > maxRows };
}
function arrowType(type: string): FieldType {
  if (/Decimal/i.test(type)) return 'decimal';
  if (/Timestamp|Time|Duration/i.test(type)) return 'datetime';
  if (/Date/i.test(type)) return 'date';
  if (/Int|Uint/i.test(type) && !/List|Struct|Map|Dictionary|Union/i.test(type)) return 'integer';
  if (/Float/i.test(type)) return 'number';
  if (/Bool/i.test(type)) return 'boolean';
  if (/Utf8/i.test(type)) return 'string';
  if (/Binary/i.test(type)) return 'binary';
  return 'json';
}
/** Shared with dbt's Arrow result API. No Date/decimal/nested-value conversion is guessed. */
export function decodeArrowTable(table: ArrowTable, maxRows: number, decodeCell?: ArrowCellDecoder): FileTable {
  if (!table || !Number.isSafeInteger(table.numRows) || table.numRows < 0 || !table.schema || !Array.isArray(table.schema.fields) || typeof table.getChildAt !== 'function') invalid();
  const sourceFields = [...table.schema.fields]; names(sourceFields.map(field => field?.name));
  if (Math.min(maxRows, table.numRows) * sourceFields.length > maxCells) throw new ConnectorError('FILE_TOO_LARGE', 'The decoded table exceeds one million cells. Use a smaller file or row cap.');
  const fields: Field[] = sourceFields.map(field => {
    if (!field.type || typeof field.type.toString !== 'function') invalid();
    const nativeType = field.type.toString();
    if (typeof nativeType !== 'string' || nativeType.length > 512) invalid();
    return { name: field.name, type: arrowType((field.type.dictionary ?? field.type).toString()), nativeType, nullable: field.nullable };
  });
  const vectors = fields.map((_field, index) => { const vector = table.getChildAt(index); if (!vector || typeof vector.get !== 'function') invalid(); return vector; });
  const rows: Cell[][] = [];
  for (let row = 0; row < Math.min(maxRows, table.numRows); row++) {
    rows.push(fields.map((field, column) => {
      const value = decodeCell ? decodeCell(vectors[column], row, sourceFields[column]) : vectors[column].get(row);
      const valueType = (sourceFields[column].type.dictionary ?? sourceFields[column].type).toString();
      if (!decodeCell && value !== null && /Decimal|Timestamp|Time|Duration|Date|List|Struct|Map|Union|Dictionary/i.test(valueType)) throw new ConnectorError('UNSUPPORTED_TYPE', 'Arrow decimal, temporal, and nested values require an explicit lossless decodeCell function.');
      return normalizeCell(value);
    }));
  }
  return { fields, rows, truncated: table.numRows > maxRows };
}
function snapshot(identity: ConnectorIdentity, provider: string, table: FileTable, warnings: string[]): DataConnector<void> {
  const connector = jsonConnector({ ...identity, fields: table.fields, rows: table.rows });
  return { ...connector, provider, async read(query, options) {
    const page = await connector.read(query, options);
    return { ...page, provenance: { ...page.provenance, provider }, page: { ...page.page, truncated: table.truncated }, warnings: [...warnings, ...(table.truncated ? ['The file snapshot reached its configured row cap; later pages cannot recover omitted rows.'] : [])] };
  } };
}
export function csvConnector(options: CsvOptions): DataConnector<void> {
  const identity = { id: options.id, source: options.source, mode: options.mode }; validateIdentity(identity);
  const { maxBytes, maxRows } = bounds(options.maxBytes, options.maxRows);
  const encoded = typeof options.data === 'string' ? new TextEncoder().encode(options.data) : options.data;
  let text: string; try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes(encoded, maxBytes)); } catch (error) { if (error instanceof ConnectorError) throw error; return invalid(); }
  return snapshot(identity, 'csv', parseCsvTable(text, maxRows, options.columns, options.delimiter), ['CSV cells remain strings, including empty strings; assign numeric, date, and null meaning explicitly.']);
}
function binaryConnector(options: ArrowOptions, provider: 'arrow' | 'parquet', read: (data: Uint8Array, limit: number) => ArrowTable | Promise<ArrowTable>): DataConnector<void> {
  const identity = { id: options.id, source: options.source, mode: options.mode }; validateIdentity(identity);
  const { maxBytes, maxRows } = bounds(options.maxBytes, options.maxRows), data = bytes(options.data, maxBytes), decodeCell = options.decodeCell;
  if (typeof options.tableFromIPC !== 'function') throw new ConnectorError('INVALID_CONFIG', 'Supply the official Apache Arrow tableFromIPC reader.');
  let loaded: Promise<DataConnector<void>> | undefined;
  return { id: identity.id, provider, capabilities: { runtime: 'universal', pagination: 'cursor', cancellation: 'cooperative', queryLanguage: 'operation' },
    read(query, options) { return runRead(options, async ({ limit, cursor, signal }) => {
      if (query !== undefined) throw new ConnectorError('INVALID_QUERY', 'A supplied file snapshot does not accept queries.');
      if (!loaded) loaded = Promise.resolve().then(() => read(data.slice(), maxRows + 1)).then(table => snapshot(identity, provider, decodeArrowTable(table, maxRows, decodeCell), ['File decoding is caller-owned and may materialize the whole supplied file. Synchronous readers cannot be interrupted.'])).catch(error => { loaded = undefined; if (error instanceof ConnectorError) throw error; throw new ConnectorError('INVALID_FILE', 'The supplied file could not be decoded.'); });
      const connector = await loaded; signal.throwIfAborted(); return connector.read(undefined, { limit, cursor, signal });
    }); },
  };
}
export function arrowConnector(options: ArrowOptions): DataConnector<void> {
  const reader = options.tableFromIPC;
  return binaryConnector(options, 'arrow', data => reader(data));
}
export function parquetConnector(options: ParquetOptions): DataConnector<void> {
  const readParquet = options.readParquet, tableFromIPC = options.tableFromIPC;
  if (typeof readParquet !== 'function') throw new ConnectorError('INVALID_CONFIG', 'Supply the initialized parquet-wasm readParquet reader.');
  return binaryConnector(options, 'parquet', async (data, limit) => {
    const table = readParquet(data, { limit }); let consumed = false;
    try { const ipc = table.intoIPCStream(); consumed = true; return await tableFromIPC(ipc); }
    finally { if (!consumed) table.free(); }
  });
}
