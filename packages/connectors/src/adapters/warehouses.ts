import type { Cell, DataConnector, DataPage, Field, FieldType, HttpOptions, ReadOptions } from '../types.js';
import { assertServerRuntime, ConnectorError, makePage, normalizeCell, runRead } from '../core.js';
import { createHttpClient } from '../http.js';

/** Native warehouse parameters preserve SQL types rather than guessing from JavaScript values. */
export interface BigQueryParameter {
  name?: string;
  parameterType: { type: string; arrayType?: unknown; structTypes?: readonly unknown[] };
  parameterValue: { value?: string | null; arrayValues?: readonly unknown[]; structValues?: Record<string, unknown> };
}
export interface BigQueryQuery { text: string; parameters?: readonly BigQueryParameter[]; parameterMode?: 'NAMED' | 'POSITIONAL' }
export interface BigQueryOptions extends HttpOptions { projectId: string; location?: string; maximumBytesBilled?: string }
export interface SnowflakeQuery { text: string; bindings?: Record<string, { type: string; value: string | null }> }
export interface SnowflakeOptions extends HttpOptions {
  accountUrl: string; warehouse?: string; database?: string; schema?: string; role?: string;
  tokenType?: 'OAUTH' | 'KEYPAIR_JWT' | 'PROGRAMMATIC_ACCESS_TOKEN';
}
export interface DatabricksQuery { text: string; parameters?: readonly { name: string; value?: string | null; type?: string }[] }
export interface DatabricksOptions extends HttpOptions {
  workspaceUrl: string; warehouseId: string; catalog?: string; schema?: string;
  /** Whole-result caps, independent of the requested page size. */
  maxRows?: number; maxBytes?: number;
}

const capabilities = { runtime: 'server', pagination: 'cursor', cancellation: 'transport', queryLanguage: 'sql' } as const;
const invalid = () => new ConnectorError('INVALID_RESPONSE', 'The warehouse returned an invalid result.');
const queryFailed = () => new ConnectorError('QUERY_FAILED', 'The warehouse query did not complete successfully.');
function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  return value as Record<string, any>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.length || value.length > 16_384) throw invalid();
  return value;
}
function id(value: unknown): string {
  const result = text(value);
  if (!/^[A-Za-z0-9._:-]+$/.test(result) || result === '.' || result === '..') throw invalid();
  return result;
}
function integer(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw invalid();
  return value as number;
}
function queryKey(query: { text: string }): string {
  if (!query || typeof query.text !== 'string' || !query.text.trim() || query.text.length > 1_000_000) throw new ConnectorError('INVALID_QUERY', 'A bounded, server-owned SQL statement is required.');
  try { const key = JSON.stringify(query); if (typeof key !== 'string') throw new Error(); return key; } catch { throw new ConnectorError('INVALID_QUERY', 'Query parameters must be JSON serializable.'); }
}
function check(signal: AbortSignal) { if (signal.aborted) throw new ConnectorError('ABORTED', 'The connector read was aborted.'); }
async function pause(signal: AbortSignal) {
  check(signal);
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new ConnectorError('ABORTED', 'The connector read was aborted.')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 200);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
/** Cursors are instance-local, opaque, expire after five minutes, and retain at most 32 states. */
function cursors<S>() {
  const states = new Map<string, { query: string; state: S; expires: number }>();
  function prune() { for (const [key, value] of states) if (value.expires <= Date.now()) states.delete(key); }
  return {
    get(cursor: string, query: string): S {
      prune(); const entry = states.get(cursor);
      if (!entry || entry.query !== query) throw new ConnectorError('INVALID_CURSOR', 'The cursor is expired or does not belong to this connector and query.');
      return entry.state;
    },
    put(query: string, state: S): string {
      prune(); while (states.size >= 32) states.delete(states.keys().next().value!);
      const cursor = crypto.randomUUID(); states.set(cursor, { query, state, expires: Date.now() + 300_000 }); return cursor;
    },
  };
}
function fieldType(native: string, scale?: unknown): FieldType {
  const value = native.toUpperCase();
  if (/^(INT64|INTEGER|BIGINT|INT|SMALLINT|TINYINT|LONG|SHORT|BYTE)$/.test(value)) return 'integer';
  if (/^(NUMERIC|BIGNUMERIC|DECIMAL|NUMBER|FIXED)/.test(value)) return scale === 0 ? 'integer' : 'decimal';
  if (/^(FLOAT|FLOAT64|DOUBLE|REAL)/.test(value)) return 'number';
  if (/^(BOOL|BOOLEAN)$/.test(value)) return 'boolean';
  if (value === 'DATE') return 'date';
  if (/^(TIMESTAMP|DATETIME|TIME)/.test(value)) return 'datetime';
  if (/^(BYTES|BINARY)$/.test(value)) return 'binary';
  if (/^(JSON|RECORD|STRUCT|ARRAY|OBJECT|VARIANT|MAP)/.test(value)) return 'json';
  if (/^(STRING|TEXT|VARCHAR|CHAR)/.test(value)) return 'string';
  return 'unknown';
}
function scalar(value: unknown, type: FieldType): Cell {
  if (value === null) return null;
  if (type === 'number') {
    const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (!Number.isFinite(number)) throw invalid(); return number;
  }
  if (type === 'boolean') {
    if (value === true || value === 'true' || value === 'TRUE') return true;
    if (value === false || value === 'false' || value === 'FALSE') return false;
    throw invalid();
  }
  // Exact integer/decimal and timestamp strings intentionally remain strings.
  if (['integer', 'decimal', 'date', 'datetime', 'binary', 'string'].includes(type) && typeof value !== 'string') throw invalid();
  return normalizeCell(value);
}
function positional(rows: unknown, fields: Field[]): Cell[][] {
  if (!Array.isArray(rows)) throw invalid();
  return rows.map(row => {
    if (!Array.isArray(row) || row.length !== fields.length) throw invalid();
    return row.map((value, i) => scalar(value, fields[i].type));
  });
}
interface Buffered { fields: Field[]; rows: Cell[][]; offset: number; queryId: string; truncated: boolean; warnings: string[] }
function page<S extends Buffered>(config: HttpOptions, provider: string, key: string, state: S, limit: number, hasRemote: boolean, registry: ReturnType<typeof cursors<S>>): DataPage {
  const rows = state.rows.slice(state.offset, state.offset + limit), offset = state.offset + rows.length;
  const hasMore = offset < state.rows.length || hasRemote;
  return makePage(config, provider, structuredClone(state.fields), structuredClone(rows), {
    hasMore, nextCursor: hasMore ? registry.put(key, { ...state, offset }) : undefined,
    truncated: state.truncated, warnings: state.warnings, queryId: state.queryId,
  });
}

interface BigQueryState extends Buffered { project: string; location?: string; schema: any[]; remoteToken?: string }
function checkBigQueryJob(result: any, context: Pick<BigQueryState, 'project' | 'queryId' | 'location'>) {
  if (result.jobReference !== undefined) {
    const job = object(result.jobReference);
    if (job.projectId !== context.project || job.jobId !== context.queryId || (job.location !== undefined && context.location !== undefined && job.location !== context.location)) throw invalid();
  }
}
function bigQueryFields(schema: any[]): Field[] {
  return schema.map(value => { const column = object(value), native = text(column.type); return { name: text(column.name), type: column.mode === 'REPEATED' ? 'json' : fieldType(native), nativeType: native, nullable: column.mode !== 'REQUIRED' }; });
}
function bigQueryCell(wrapper: unknown, column: any): Cell {
  const value = object(wrapper).v;
  if (value === null) return null;
  if (column.mode === 'REPEATED') {
    if (!Array.isArray(value)) throw invalid();
    return value.map(item => bigQueryCell(item, { ...column, mode: 'NULLABLE' }));
  }
  if (['RECORD', 'STRUCT'].includes(column.type)) {
    const fields = object(value).f;
    if (!Array.isArray(column.fields) || !Array.isArray(fields) || fields.length !== column.fields.length) throw invalid();
    const result: { [key: string]: Cell } = Object.create(null);
    column.fields.forEach((nested: any, i: number) => { result[text(nested.name)] = bigQueryCell(fields[i], nested); });
    return result;
  }
  return scalar(value, fieldType(column.type));
}
function bigQueryRows(response: any, schema: any[]): Cell[][] {
  if (response.rows === undefined) return [];
  if (!Array.isArray(response.rows)) throw invalid();
  return response.rows.map((row: unknown) => {
    const fields = object(row).f;
    if (!Array.isArray(fields) || fields.length !== schema.length) throw invalid();
    return fields.map((cell: unknown, i: number) => bigQueryCell(cell, schema[i]));
  });
}
export function createBigQueryConnector(config: BigQueryOptions): DataConnector<BigQueryQuery> {
  config = { ...config }; assertServerRuntime(); const project = id(config.projectId), registry = cursors<BigQueryState>();
  if (config.maximumBytesBilled !== undefined && !/^\d+$/.test(config.maximumBytesBilled)) throw new ConnectorError('INVALID_QUERY', 'The BigQuery billing limit must be a nonnegative integer string.');
  const http = createHttpClient({ ...config, baseUrl: 'https://bigquery.googleapis.com' });
  const path = (state: Pick<BigQueryState, 'project' | 'queryId' | 'location'>, limit: number, token?: string) => {
    const params = new URLSearchParams({ maxResults: String(limit), timeoutMs: '1000' });
    if (state.location) params.set('location', state.location);
    if (token) params.set('pageToken', token);
    return `/bigquery/v2/projects/${encodeURIComponent(state.project)}/queries/${encodeURIComponent(state.queryId)}?${params}`;
  };
  async function complete(response: any, context: Pick<BigQueryState, 'project' | 'queryId' | 'location'>, limit: number, signal: AbortSignal) {
    let result = object(response);
    for (let attempts = 0; result.jobComplete !== true; attempts++) {
      checkBigQueryJob(result, context);
      if (result.jobComplete !== false) throw invalid();
      if (attempts >= 300) throw new ConnectorError('TIMEOUT', 'The warehouse query is still running.');
      await pause(signal); result = object(await http.request(path(context, limit), { signal }));
    }
    checkBigQueryJob(result, context);
    return result;
  }
  return { id: config.id, provider: 'bigquery', capabilities, read(query, options?: ReadOptions) {
    return runRead(options, async ({ limit, cursor, signal }) => {
      const key = queryKey(query); query = JSON.parse(key); let state: BigQueryState;
      if (cursor) {
        state = registry.get(cursor, key);
        if (state.offset >= state.rows.length && state.remoteToken) {
          const result = object(await http.request(path(state, limit, state.remoteToken), { signal }));
          checkBigQueryJob(result, state);
          if (result.jobComplete !== true) throw invalid();
          const token = result.pageToken === undefined || result.pageToken === '' ? undefined : text(result.pageToken);
          if (token === state.remoteToken) throw invalid();
          if (result.schema && JSON.stringify(object(result.schema).fields) !== JSON.stringify(state.schema)) throw invalid();
          state = { ...state, rows: bigQueryRows(result, state.schema), offset: 0, remoteToken: token };
        }
      } else {
        const response = object(await http.request(`/bigquery/v2/projects/${encodeURIComponent(project)}/queries`, { method: 'POST', signal, body: {
          query: query.text, useLegacySql: false, maxResults: limit, timeoutMs: 1000,
          ...(config.location && { location: config.location }), ...(config.maximumBytesBilled !== undefined && { maximumBytesBilled: config.maximumBytesBilled }),
          ...(query.parameters && { queryParameters: query.parameters, parameterMode: query.parameterMode ?? 'NAMED' }),
        } }));
        const job = object(response.jobReference), context = { project: id(job.projectId), queryId: id(job.jobId), location: job.location === undefined ? config.location : text(job.location) };
        if (context.project !== project) throw invalid();
        const result = await complete(response, context, limit, signal), schema = object(result.schema).fields;
        if (!Array.isArray(schema)) throw invalid();
        state = { ...context, schema, fields: bigQueryFields(schema), rows: bigQueryRows(result, schema), offset: 0, remoteToken: result.pageToken ? text(result.pageToken) : undefined, truncated: false, warnings: Array.isArray(result.errors) && result.errors.length ? ['BigQuery returned query warnings; inspect the job in the provider console.'] : [] };
      }
      check(signal); return page(config, 'bigquery', key, state, limit, Boolean(state.remoteToken), registry);
    });
  } };
}

interface SnowflakeState extends Buffered { nextPartition: number; partitionCount: number; partitionRows?: number[] }
export function createSnowflakeConnector(config: SnowflakeOptions): DataConnector<SnowflakeQuery> {
  config = { ...config }; assertServerRuntime(); const registry = cursors<SnowflakeState>();
  const http = createHttpClient({ ...config, baseUrl: config.accountUrl, headers: { 'X-Snowflake-Authorization-Token-Type': config.tokenType ?? 'OAUTH' } });
  const path = (handle: string, partition?: number) => `/api/v2/statements/${encodeURIComponent(handle)}${partition === undefined ? '' : `?partition=${partition}`}`;
  async function complete(response: unknown, signal: AbortSignal) {
    let result = object(response), handle = id(result.statementHandle);
    for (let attempts = 0; !result.resultSetMetaData; attempts++) {
      if (result.sqlState && result.sqlState !== '00000') throw queryFailed();
      if (attempts >= 300) throw new ConnectorError('TIMEOUT', 'The warehouse query is still running.');
      await pause(signal); result = object(await http.request(path(handle), { signal }));
      if (result.statementHandle && result.statementHandle !== handle) throw invalid();
    }
    if (result.sqlState && result.sqlState !== '00000') throw queryFailed();
    return { result, handle };
  }
  return { id: config.id, provider: 'snowflake', capabilities, read(query, options?: ReadOptions) {
    return runRead(options, async ({ limit, cursor, signal }) => {
      const key = queryKey(query); query = JSON.parse(key); let state: SnowflakeState;
      if (cursor) {
        state = registry.get(cursor, key);
        if (state.offset >= state.rows.length && state.nextPartition < state.partitionCount) {
          const result = object(await http.request(path(state.queryId, state.nextPartition), { signal }));
          if (result.statementHandle && result.statementHandle !== state.queryId) throw invalid();
          if (result.sqlState && result.sqlState !== '00000') throw queryFailed();
          const rows = positional(result.data, state.fields);
          if (state.partitionRows && rows.length !== state.partitionRows[state.nextPartition]) throw invalid();
          state = { ...state, rows, offset: 0, nextPartition: state.nextPartition + 1 };
        }
      } else {
        const { result, handle } = await complete(await http.request('/api/v2/statements', { method: 'POST', signal, body: {
          statement: query.text, timeout: 60, parameters: { MULTI_STATEMENT_COUNT: '1' },
          ...(config.warehouse && { warehouse: config.warehouse }), ...(config.database && { database: config.database }),
          ...(config.schema && { schema: config.schema }), ...(config.role && { role: config.role }), ...(query.bindings && { bindings: query.bindings }),
        } }), signal);
        const metadata = object(result.resultSetMetaData);
        if (!Array.isArray(metadata.rowType)) throw invalid();
        const fields: Field[] = metadata.rowType.map((raw: unknown) => { const column = object(raw), native = text(column.type); return { name: text(column.name), type: fieldType(native, column.scale), nativeType: native, nullable: column.nullable !== false }; });
        if (metadata.partitionInfo !== undefined && !Array.isArray(metadata.partitionInfo)) throw invalid();
        const partitionCount = Math.max(1, metadata.partitionInfo?.length ?? 1);
        const rows = positional(result.data, fields), partitionRows = metadata.partitionInfo?.map((part: unknown) => integer(object(part).rowCount));
        if (partitionRows?.length && rows.length !== partitionRows[0]) throw invalid();
        if (metadata.numRows !== undefined && integer(metadata.numRows) !== (partitionRows?.length ? partitionRows.reduce((sum: number, count: number) => sum + count, 0) : rows.length)) throw invalid();
        state = { fields, rows, offset: 0, queryId: handle, nextPartition: 1, partitionCount, partitionRows: partitionRows?.length ? partitionRows : undefined, truncated: false, warnings: [] };
      }
      check(signal); return page(config, 'snowflake', key, state, limit, state.nextPartition < state.partitionCount, registry);
    });
  } };
}

interface DatabricksState extends Buffered { nextChunk?: number; chunk: number; totalChunks?: number }
function databricksResult(raw: unknown, fields: Field[], chunk: number, totalChunks?: number) {
  const result = object(raw);
  if (Array.isArray(result.external_links) && result.external_links.length) throw new ConnectorError('UNSUPPORTED', 'External warehouse result links are not supported by this inline connector.');
  if (result.chunk_index !== undefined && integer(result.chunk_index) !== chunk) throw invalid();
  const nextChunk = result.next_chunk_index === undefined ? undefined : integer(result.next_chunk_index);
  if (nextChunk !== undefined && nextChunk <= chunk) throw invalid();
  if (result.next_chunk_internal_link && nextChunk === undefined) throw new ConnectorError('UNSUPPORTED', 'The warehouse did not return an inline chunk index.');
  const rows = positional(result.data_array ?? [], fields);
  if (result.row_count !== undefined && integer(result.row_count) !== rows.length) throw invalid();
  if (totalChunks !== undefined && ((totalChunks === 0 && (rows.length > 0 || nextChunk !== undefined)) || (totalChunks > 0 && (chunk >= totalChunks || (chunk + 1 < totalChunks ? nextChunk !== chunk + 1 : nextChunk !== undefined))))) throw invalid();
  return { rows, nextChunk, chunk, offset: 0 };
}
export function createDatabricksConnector(config: DatabricksOptions): DataConnector<DatabricksQuery> {
  config = { ...config }; assertServerRuntime(); const registry = cursors<DatabricksState>(), warehouse = id(config.warehouseId);
  const maxRows = config.maxRows ?? 100_000, maxBytes = config.maxBytes ?? 8_000_000;
  if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 1_000_000 || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 20_000_000) throw new ConnectorError('INVALID_QUERY', 'Databricks result caps must be positive and bounded.');
  const http = createHttpClient({ ...config, baseUrl: config.workspaceUrl, maxResponseBytes: maxBytes + 1_000_000 });
  const path = (handle: string) => `/api/2.0/sql/statements/${encodeURIComponent(handle)}`;
  async function complete(response: unknown, signal: AbortSignal) {
    let result = object(response); const handle = id(result.statement_id);
    for (let attempts = 0; object(result.status).state !== 'SUCCEEDED'; attempts++) {
      if (!['PENDING', 'RUNNING'].includes(object(result.status).state)) throw queryFailed();
      if (attempts >= 300) throw new ConnectorError('TIMEOUT', 'The warehouse query is still running.');
      await pause(signal); result = object(await http.request(path(handle), { signal }));
      if (result.statement_id !== handle) throw invalid();
    }
    return { result, handle };
  }
  return { id: config.id, provider: 'databricks', capabilities, read(query, options?: ReadOptions) {
    return runRead(options, async ({ limit, cursor, signal }) => {
      const key = queryKey(query); query = JSON.parse(key); let state: DatabricksState;
      if (cursor) {
        state = registry.get(cursor, key);
        if (state.offset >= state.rows.length && state.nextChunk !== undefined) {
          const result = await http.request(`${path(state.queryId)}/result/chunks/${state.nextChunk}`, { signal });
          state = { ...state, ...databricksResult(result, state.fields, state.nextChunk, state.totalChunks) };
        }
      } else {
        const { result, handle } = await complete(await http.request('/api/2.0/sql/statements', { method: 'POST', signal, body: {
          statement: query.text, warehouse_id: warehouse, format: 'JSON_ARRAY', disposition: 'INLINE', wait_timeout: '0s',
          row_limit: maxRows, byte_limit: maxBytes,
          ...(config.catalog && { catalog: config.catalog }), ...(config.schema && { schema: config.schema }), ...(query.parameters && { parameters: query.parameters }),
        } }), signal);
        const manifest = object(result.manifest), columns = object(manifest.schema).columns;
        if (manifest.truncated !== undefined && typeof manifest.truncated !== 'boolean') throw invalid();
        if (manifest.format !== 'JSON_ARRAY' || !Array.isArray(columns)) throw invalid();
        const fields: Field[] = columns.map((raw: unknown, i: number) => { const column = object(raw), native = text(column.type_text ?? column.type_name); if (column.position !== undefined && column.position !== i) throw invalid(); return { name: text(column.name), type: fieldType(native), nativeType: native }; });
        const totalChunks = manifest.total_chunk_count === undefined ? undefined : integer(manifest.total_chunk_count);
        state = { fields, queryId: handle, totalChunks, truncated: manifest.truncated === true, warnings: manifest.truncated === true ? ['Databricks truncated the whole result at its configured row or byte cap; later pages cannot recover omitted rows.'] : [], ...databricksResult(result.result ?? { data_array: [] }, fields, 0, totalChunks) };
      }
      check(signal); return page(config, 'databricks', key, state, limit, state.nextChunk !== undefined, registry);
    });
  } };
}
