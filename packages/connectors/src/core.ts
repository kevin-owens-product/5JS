import type { Cell, ConnectorIdentity, DataConnector, DataPage, Field, FieldType, ReadOptions } from './types.js';

export class ConnectorError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'ConnectorError'; }
}
export function assertServerRuntime(): void {
  if (typeof window !== 'undefined') throw new ConnectorError('SERVER_ONLY', 'This adapter requires a server runtime. Use a registered application endpoint in the browser.');
}
export function normalizeCell(value: unknown, seen = new WeakSet<object>(), depth = 0): Cell {
  if (depth > 32) throw new ConnectorError('INVALID_RESULT', 'A result exceeds the supported nesting depth.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) throw new ConnectorError('PRECISION_LOSS', 'A result contains a nonfinite or unsafe numeric value. Configure the driver to return exact values as strings.');
    return value;
  }
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new ConnectorError('INVALID_RESULT', 'A result contains an invalid date.');
    return value.toISOString();
  }
  if (value instanceof Uint8Array) return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
  if (typeof value !== 'object' || !value) throw new ConnectorError('INVALID_RESULT', 'A result contains an unsupported value.');
  if (seen.has(value)) throw new ConnectorError('INVALID_RESULT', 'A result contains a circular value.');
  seen.add(value);
  try {
    if (Array.isArray(value)) return Array.from(value, cell => normalizeCell(cell, seen, depth + 1));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new ConnectorError('INVALID_RESULT', 'Serialize driver-specific objects with the official driver serializer before normalization.');
    const result: { [key: string]: Cell } = Object.create(null);
    for (const [key, item] of Object.entries(value)) if (item !== undefined) result[key] = normalizeCell(item, seen, depth + 1);
    return result;
  } finally { seen.delete(value); }
}
function valueType(value: unknown): FieldType {
  if (value === null || value === undefined) return 'unknown';
  if (typeof value === 'bigint') return 'integer';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'datetime';
  if (value instanceof Uint8Array) return 'binary';
  return 'json';
}
export function inferFields(names: string[], rows: unknown[][]): Field[] {
  return names.map((name, index) => {
    const types = new Set(rows.map(row => valueType(row[index])).filter(type => type !== 'unknown'));
    const type: FieldType = types.size === 1 ? [...types][0] : types.size === 2 && types.has('integer') && types.has('number') ? 'number' : 'unknown';
    return { name, type, nullable: rows.some(row => row[index] == null) };
  });
}
export function validateIdentity(identity: ConnectorIdentity): void {
  if (typeof identity.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(identity.id) || typeof identity.source !== 'string' || !identity.source.trim() || identity.source.length > 160 || /:\/\/|[\r\n]|(?:password|token|secret)=/i.test(identity.source)) throw new ConnectorError('INVALID_CONFIG', 'Provide a connector ID and a short public source label without credentials or connection URLs.');
  if (identity.mode !== undefined && identity.mode !== 'fixture' && identity.mode !== 'live') throw new ConnectorError('INVALID_CONFIG', 'Invalid source mode.');
}
export function makePage(identity: ConnectorIdentity, provider: string, fields: Field[], rows: unknown[][], meta: { hasMore?: boolean; nextCursor?: string; truncated?: boolean; warnings?: string[]; queryId?: string } = {}): DataPage {
  validateIdentity(identity);
  if (!Array.isArray(fields) || Array.from(fields).some(field => !field || typeof field.name !== 'string') || !Array.isArray(rows) || Array.from(rows).some(row => !Array.isArray(row) || row.length !== fields.length)) throw new ConnectorError('INVALID_RESULT', 'Result fields and positional rows do not match.');
  if (meta.nextCursor !== undefined && (!meta.hasMore || !meta.nextCursor)) throw new ConnectorError('INVALID_RESULT', 'A continuation cursor requires more results.');
  return { fields: fields.map(field => ({ ...field })), rows: rows.map(row => Array.from(row, value => normalizeCell(value))),
    provenance: { connectorId: identity.id, provider, source: identity.source, fetchedAt: new Date().toISOString(), mode: identity.mode ?? 'live', ...(meta.queryId && { queryId: meta.queryId }) },
    page: { hasMore: meta.hasMore ?? false, truncated: meta.truncated ?? false, ...(meta.nextCursor && { nextCursor: meta.nextCursor }) }, warnings: [...(meta.warnings ?? [])] };
}
export interface ReadScope { limit: number; cursor?: string; signal: AbortSignal }
export async function runRead<Result = DataPage>(options: ReadOptions | undefined, work: (scope: ReadScope) => Promise<Result>): Promise<Result> {
  const limit = options?.limit ?? 1000, timeoutMs = options?.timeoutMs ?? 30000;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 5000 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new ConnectorError('INVALID_LIMIT', 'Page size must be 1–5000 rows and timeout must be 1–120000 milliseconds.');
  if (options?.cursor !== undefined && (typeof options.cursor !== 'string' || options.cursor.length > 16384 || !options.cursor)) throw new ConnectorError('INVALID_CURSOR', 'Invalid continuation cursor.');
  const controller = new AbortController(); let timedOut = false;
  const abort = () => controller.abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  options?.signal?.addEventListener('abort', abort, { once: true });
  if (options?.signal?.aborted) controller.abort();
  let rejectAbort: () => void = () => {};
  try {
    const interrupted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(new ConnectorError(timedOut ? 'TIMEOUT' : 'ABORTED', timedOut ? 'The data request timed out. Provider work may still be running.' : 'The data request was cancelled. Provider work may still be running.'));
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
      if (controller.signal.aborted) rejectAbort();
    });
    if (controller.signal.aborted) return await interrupted;
    return await Promise.race([work({ limit, cursor: options?.cursor, signal: controller.signal }), interrupted]);
  } catch (error) {
    if (error instanceof ConnectorError) throw error;
    throw new ConnectorError('PROVIDER_ERROR', 'The source could not complete this request. Check server-side configuration and provider diagnostics.');
  } finally {
    clearTimeout(timer); options?.signal?.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', rejectAbort);
  }
}

/** Explicitly bounded collection. It never silently claims a partial dataset is complete. */
export async function collectPages<Q>(connector: DataConnector<Q>, query: Q, options: ReadOptions & { maxRows?: number; maxPages?: number } = {}): Promise<DataPage> {
  const maxRows = options.maxRows ?? 10000, maxPages = options.maxPages ?? 10;
  if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 100000 || !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 100) throw new ConnectorError('INVALID_LIMIT', 'Collection limits must be 1–100000 rows and 1–100 pages.');
  const rows: Cell[][] = [], seen = new Set<string>(); let result: DataPage | undefined, cursor = options.cursor;
  const warnings = new Set<string>(); let firstSchema = '', anyTruncated = false;
  for (let index = 0; index < maxPages; index++) {
    const limit = Math.min(options.limit ?? 1000, maxRows - rows.length);
    const page = await connector.read(query, { ...options, cursor, limit });
    const schema = JSON.stringify(page.fields);
    if (result && (schema !== firstSchema || page.provenance.connectorId !== result.provenance.connectorId || page.provenance.source !== result.provenance.source || page.provenance.provider !== result.provenance.provider || page.provenance.mode !== result.provenance.mode)) throw new ConnectorError('SCHEMA_CHANGED', 'The schema or source changed during pagination; the collection was rejected.');
    if (!result) firstSchema = schema;
    if (page.rows.length > limit) throw new ConnectorError('INVALID_RESULT', 'The connector exceeded the requested page size.');
    anyTruncated ||= page.page.truncated;
    rows.push(...page.rows); page.warnings.forEach(warning => warnings.add(warning)); result = page;
    if (!page.page.hasMore || !page.page.nextCursor || rows.length >= maxRows) break;
    if (seen.has(page.page.nextCursor)) throw new ConnectorError('INVALID_CURSOR', 'The source repeated a continuation cursor.');
    seen.add(page.page.nextCursor); cursor = page.page.nextCursor;
  }
  if (result!.page.hasMore) warnings.add('Collection stopped before all source rows were retrieved. Use the continuation cursor when available.');
  return { ...result!, rows, warnings: [...warnings], page: { ...result!.page, truncated: anyTruncated || result!.page.hasMore } };
}
