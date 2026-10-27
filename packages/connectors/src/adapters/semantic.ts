import { assertServerRuntime, ConnectorError, makePage, normalizeCell, runRead } from '../core.js';
import type { Cell, DataConnector, Field, HttpOptions } from '../types.js';
import { createHttpClient } from '../http.js';
import { decodeArrowTable, parseCsvTable } from './files.js';
import type { ArrowCellDecoder, ArrowTable, FileTable } from './files.js';

const capabilities = { runtime: 'server', pagination: 'none', cancellation: 'transport', queryLanguage: 'operation' } as const;
const invalid = () => new ConnectorError('INVALID_RESPONSE', 'The analytical source returned an invalid result.');
const failure = () => new ConnectorError('QUERY_FAILED', 'The analytical source could not complete the query.');
const scopeWarning = 'Results retain the source query grain; the connector does not aggregate metrics again. A capped snapshot requires a narrower query, not a continuation cursor.';
function object(value: unknown): Record<string, any> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid(); return value as Record<string, any>; }
function string(value: unknown, max = 512): string { if (typeof value !== 'string' || !value.length || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new ConnectorError('INVALID_QUERY', 'Provide bounded source identifiers and query values.'); return value; }
function identifier(value: unknown) { const name = string(value); if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new ConnectorError('INVALID_CONFIG', 'Provide a source identifier, not a URL or path.'); return name; }
function members(value: unknown, required = false): string[] {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || value.length > 100 || (required && !value.length)) throw new ConnectorError('INVALID_QUERY', 'Select between one and 100 analytical members.');
  const result = Array.from(value, item => string(item));
  if (new Set(result).size !== result.length) throw new ConnectorError('INVALID_QUERY', 'Analytical member names must be distinct.');
  return result;
}
function snapshotQuery<T>(query: T, allowed: string[]): T {
  if (!query || typeof query !== 'object' || Array.isArray(query) || Object.keys(query).some(key => !allowed.includes(key))) throw new ConnectorError('INVALID_QUERY', 'Unsupported analytical query options.');
  try { const serialized = JSON.stringify(query); if (serialized.length > 100_000) throw new Error(); return JSON.parse(serialized); } catch { throw new ConnectorError('INVALID_QUERY', 'Analytical queries must be bounded JSON values.'); }
}
function noCursor(cursor?: string) { if (cursor !== undefined) throw new ConnectorError('UNSUPPORTED_CURSOR', 'This analytical connector returns bounded snapshots without continuation cursors.'); }
function values(input: unknown): Record<string, string> | undefined {
  if (input === undefined) return undefined;
  const entries = Object.entries(object(input)); if (entries.length > 100) throw new ConnectorError('INVALID_QUERY', 'Too many analytical filters.');
  return Object.fromEntries(entries.map(([key, value]) => [string(key), string(value, 4096)]));
}
async function pause(signal: AbortSignal) {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new ConnectorError('ABORTED', 'The analytical request was cancelled.')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 100);
    signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
  });
}

/** Adapt the shared bounded HTTP transport to provider-specific authentication and CSV responses. */
function analyticalHttp(config: HttpOptions, baseUrl: string, auth: 'bearer' | 'looker' | 'cube' | 'tableau' = 'bearer') {
  const fetcher = config.fetch ?? globalThis.fetch;
  const http = createHttpClient({ ...config, baseUrl, fetch: async (input, init = {}) => {
    const headers = new Headers(init.headers), authorization = headers.get('authorization')!;
    if (auth === 'looker') headers.set('authorization', `token ${authorization.slice(7)}`);
    if (auth === 'cube') headers.set('authorization', authorization.slice(7));
    if (auth === 'tableau') { headers.delete('authorization'); headers.set('x-tableau-auth', authorization.slice(7)); }
    init.signal?.throwIfAborted();
    return fetcher(input, { ...init, headers });
  } });
  return {
    request: http.request,
    async csv(path: string, signal: AbortSignal, body?: unknown): Promise<string> {
      // The shared transport supplies safe origin validation, refreshed auth,
      // redirects, cancellation and HTTP errors. Convert bounded CSV to a JSON
      // string for its parser, without materializing an unbounded body first.
      const textHttp = createHttpClient({ ...config, baseUrl, maxResponseBytes: 32 * 1024 * 1024, fetch: async (input, init = {}) => {
        const headers = new Headers(init.headers), authorization = headers.get('authorization')!;
        headers.set('accept', 'text/csv');
        if (auth === 'looker') headers.set('authorization', `token ${authorization.slice(7)}`);
        if (auth === 'tableau') { headers.delete('authorization'); headers.set('x-tableau-auth', authorization.slice(7)); }
        init.signal?.throwIfAborted();
        const response = await fetcher(input, { ...init, headers });
        if (!response.ok) return response;
        const reader = response.body?.getReader(); if (!reader) throw invalid();
        const cancel = () => { void reader.cancel().catch(() => {}); }; signal.addEventListener('abort', cancel, { once: true });
        let text = '', size = 0; const decoder = new TextDecoder('utf-8', { fatal: true });
        try {
          for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 8 * 1024 * 1024) throw new ConnectorError('RESPONSE_TOO_LARGE', 'The analytical CSV response exceeded 8 MiB.'); text += decoder.decode(next.value, { stream: true }); }
          signal.throwIfAborted(); text += decoder.decode(); return Response.json(text);
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); signal.removeEventListener('abort', cancel); }
      } });
      return textHttp.request(path, { method: body === undefined ? 'GET' : 'POST', body, signal });
    },
  };
}
function resultPage(config: HttpOptions, provider: string, table: FileTable, limit: number, warnings: string[] = [], queryId?: string) {
  const truncated = table.truncated || table.rows.length > limit;
  return makePage(config, provider, table.fields, table.rows.slice(0, limit), { hasMore: truncated, truncated, warnings: [scopeWarning, ...warnings], queryId });
}

export interface LookerOptions extends HttpOptions { baseUrl: string }
export interface LookerQuery { model: string; view: string; fields: string[]; filters?: Record<string, string>; sorts?: string[]; timezone?: string }
/** Explore CSV with formatting/pivots disabled; lexical values and duplicate labels remain intact. */
export function lookerConnector(options: LookerOptions): DataConnector<LookerQuery> {
  const config = { ...options }; assertServerRuntime(); const http = analyticalHttp(config, config.baseUrl, 'looker');
  return { id: config.id, provider: 'looker', capabilities, read(query, options) { return runRead(options, async ({ limit, cursor, signal }) => {
    noCursor(cursor); query = snapshotQuery(query, ['model', 'view', 'fields', 'filters', 'sorts', 'timezone']);
    const body = { model: string(query.model), view: string(query.view), fields: members(query.fields, true), filters: values(query.filters), sorts: members(query.sorts), query_timezone: query.timezone === undefined ? undefined : string(query.timezone), limit: String(limit + 1) };
    const csv = await http.csv('/api/4.0/queries/run/csv?apply_formatting=false&apply_vis=false', signal, body);
    const table = parseCsvTable(csv, limit + 1); if (table.fields.length !== body.fields.length) throw invalid();
    return resultPage(config, 'looker', table, limit, ['Explore CSV preserves source lexical values. Pivots, totals, table calculations, and visualization formatting are outside this adapter scope.']);
  }); } };
}

export interface PowerBiOptions extends HttpOptions { datasetId: string; groupId?: string }
export interface PowerBiQuery {
  /** A server-owned DAX table expression, not a complete EVALUATE statement. */
  tableExpression: string;
  /** Exact returned keys, including DAX square-bracket aliases, in desired column order. */
  fields: Field[];
}
function recordRows(records: unknown, fields: Field[]): Cell[][] {
  if (!Array.isArray(records)) throw invalid(); const names = new Set(fields.map(field => field.name));
  if (names.size !== fields.length) throw new ConnectorError('INVALID_QUERY', 'Object-based API results require distinct column names.');
  return records.map(raw => { const record = object(raw); if (Object.keys(record).some(key => !names.has(key)) || fields.some(field => !Object.hasOwn(record, field.name))) throw invalid(); return fields.map(field => normalizeCell(record[field.name])); });
}
export function powerBiConnector(options: PowerBiOptions): DataConnector<PowerBiQuery> {
  const config = { ...options }; assertServerRuntime(); const dataset = identifier(config.datasetId), group = config.groupId === undefined ? undefined : identifier(config.groupId), http = analyticalHttp(config, 'https://api.powerbi.com');
  return { id: config.id, provider: 'power-bi', capabilities, read(query, options) { return runRead(options, async ({ limit, cursor, signal }) => {
    noCursor(cursor); query = snapshotQuery(query, ['tableExpression', 'fields']);
    if (typeof query.tableExpression !== 'string' || !query.tableExpression.trim() || !Array.isArray(query.fields) || !query.fields.length || query.fields.length > 100 || query.fields.some(field => !field || typeof field.name !== 'string' || !['string', 'number', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'binary', 'json', 'unknown'].includes(field.type))) throw new ConnectorError('INVALID_QUERY', 'Provide a DAX table expression and its exact returned field metadata.');
    const result = object(await http.request(`/v1.0/myorg/${group ? `groups/${group}/` : ''}datasets/${dataset}/executeQueries`, { method: 'POST', signal, body: { queries: [{ query: `EVALUATE TOPN(${limit + 1}, ${query.tableExpression})` }], serializerSettings: { includeNulls: true } } }));
    if (result.error || !Array.isArray(result.results) || result.results.length !== 1) throw failure();
    const execution = object(result.results[0]); if (execution.error || !Array.isArray(execution.tables) || execution.tables.length !== 1) throw failure();
    const table = object(execution.tables[0]); if (table.error) throw failure();
    return resultPage(config, 'power-bi', { fields: query.fields, rows: recordRows(table.rows, query.fields), truncated: false }, limit, ['Power BI DAX TOPN is a bounded preview without a stable continuation. Represent exact decimal and large numeric values as text in the source DAX expression; unsafe JSON integers are rejected.']);
  }); } };
}

export interface TableauOptions extends HttpOptions { baseUrl: string; siteId: string; viewId: string; apiVersion: string; maxAgeMinutes?: number }
export interface TableauQuery { filters?: Record<string, string> }
/** Query View Data exports summary CSV, not underlying detail rows. */
export function tableauConnector(options: TableauOptions): DataConnector<TableauQuery> {
  const config = { ...options }; assertServerRuntime(); const site = identifier(config.siteId), view = identifier(config.viewId);
  if (!/^\d+\.\d+$/.test(config.apiVersion) || (config.maxAgeMinutes !== undefined && (!Number.isSafeInteger(config.maxAgeMinutes) || config.maxAgeMinutes < 1))) throw new ConnectorError('INVALID_CONFIG', 'Provide a Tableau REST API version and a positive cache age.');
  const http = analyticalHttp(config, config.baseUrl, 'tableau');
  return { id: config.id, provider: 'tableau', capabilities, read(query, options) { return runRead(options, async ({ limit, cursor, signal }) => {
    noCursor(cursor); query = snapshotQuery(query, ['filters']); const parameters = new URLSearchParams({ maxAge: String(config.maxAgeMinutes ?? 1) });
    for (const [name, value] of Object.entries(values(query.filters) ?? {})) parameters.set(`vf_${name}`, value);
    const csv = await http.csv(`/api/${config.apiVersion}/sites/${site}/views/${view}/data?${parameters}`, signal);
    return resultPage(config, 'tableau', parseCsvTable(csv, limit + 1), limit, ['Tableau exports cached summary-level data. A dashboard export contains its first view only; this is not an underlying-detail or whole-dashboard extract.']);
  }); } };
}

export interface CubeOptions extends HttpOptions { baseUrl: string; apiPath?: string }
export interface CubeQuery {
  measures?: string[]; dimensions?: string[]; segments?: string[];
  timeDimensions?: { dimension: string; granularity?: string; dateRange?: string | string[] }[];
  filters?: Record<string, unknown>[]; order?: [string, 'asc' | 'desc'][]; timezone?: string;
}
export function cubeConnector(options: CubeOptions): DataConnector<CubeQuery> {
  const config = { ...options }; assertServerRuntime(); const apiPath = config.apiPath ?? '/cubejs-api/v1';
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(apiPath)) throw new ConnectorError('INVALID_CONFIG', 'Provide a fixed Cube API path without query parameters or traversal.');
  const http = analyticalHttp(config, config.baseUrl, 'cube');
  return { id: config.id, provider: 'cube', capabilities, read(query, options) { return runRead(options, async ({ limit, cursor, signal }) => {
    noCursor(cursor); query = snapshotQuery(query, ['measures', 'dimensions', 'segments', 'timeDimensions', 'filters', 'order', 'timezone']);
    const measures = members(query.measures), dimensions = members(query.dimensions); members(query.segments);
    if (!measures.length && !dimensions.length && !query.timeDimensions?.length) throw new ConnectorError('INVALID_QUERY', 'Select a Cube measure or dimension.');
    const requestId = crypto.randomUUID(); let response: Record<string, any>;
    for (;;) {
      response = object(await http.request(`${apiPath}/load`, { method: 'POST', signal, headers: { 'x-request-id': requestId }, body: { query: { ...query, limit: limit + 1, offset: 0 } } }));
      if (response.error !== 'Continue wait') break;
      await pause(signal);
    }
    if (response.error || response.results) throw failure();
    const annotation = object(response.annotation), names: string[] = [], metadata: Record<string, any> = Object.create(null);
    for (const section of ['dimensions', 'timeDimensions', 'measures']) for (const [name, field] of Object.entries(object(annotation[section] ?? {}))) { if (names.includes(name)) throw invalid(); names.push(name); metadata[name] = object(field); }
    if (!names.length) throw invalid();
    const fields: Field[] = names.map(name => ({ name, nativeType: String(metadata[name].type), type: metadata[name].type === 'number' ? 'decimal' : metadata[name].type === 'time' ? 'datetime' : metadata[name].type === 'boolean' ? 'boolean' : 'string' }));
    return resultPage(config, 'cube', { fields, rows: recordRows(response.data, fields), truncated: false }, limit, ['Cube member names and time-grain suffixes are retained. Numeric strings stay exact; source-cache freshness follows Cube configuration.']);
  }); } };
}

export interface DbtSemanticOptions extends HttpOptions {
  baseUrl: string; environmentId: string;
  tableFromIPC(data: Uint8Array): ArrowTable | Promise<ArrowTable>;
  decodeCell?: ArrowCellDecoder;
}
export interface DbtSemanticQuery {
  metrics: { name: string; alias?: string }[];
  groupBy?: { name: string; grain?: string }[];
  where?: { sql: string }[];
}
const createDbtQuery = 'mutation MotifQuery($environmentId: BigInt!, $metrics: [MetricInput!]!, $groupBy: [GroupByInput!], $where: [WhereInput!], $limit: Int!) { createQuery(environmentId: $environmentId, metrics: $metrics, groupBy: $groupBy, where: $where, limit: $limit) { queryId } }';
const getDbtQuery = 'query MotifResult($environmentId: BigInt!, $queryId: String!, $pageNum: Int!) { query(environmentId: $environmentId, queryId: $queryId, pageNum: $pageNum) { status error totalPages arrowResult } }';
export function dbtSemanticConnector(options: DbtSemanticOptions): DataConnector<DbtSemanticQuery> {
  const config = { ...options }; assertServerRuntime();
  if (!/^\d+$/.test(config.environmentId) || typeof config.environmentId !== 'string' || typeof config.tableFromIPC !== 'function') throw new ConnectorError('INVALID_CONFIG', 'Provide a dbt environment ID and an Apache Arrow tableFromIPC reader.');
  const http = analyticalHttp(config, config.baseUrl);
  async function graphql(query: string, variables: unknown, signal: AbortSignal) { const response = object(await http.request('/api/graphql', { method: 'POST', signal, body: { query, variables } })); if (response.errors) throw failure(); return object(response.data); }
  return { id: config.id, provider: 'dbt', capabilities, read(query, options) { return runRead(options, async ({ limit, cursor, signal }) => {
    noCursor(cursor); query = snapshotQuery(query, ['metrics', 'groupBy', 'where']);
    if (!Array.isArray(query.metrics) || !query.metrics.length || query.metrics.length > 100 || query.metrics.some(metric => !metric || typeof metric.name !== 'string') || (query.groupBy !== undefined && (!Array.isArray(query.groupBy) || query.groupBy.length > 100 || query.groupBy.some(group => !group || typeof group.name !== 'string'))) || (query.where !== undefined && (!Array.isArray(query.where) || query.where.length > 100 || query.where.some(filter => !filter || typeof filter.sql !== 'string')))) throw new ConnectorError('INVALID_QUERY', 'Select dbt metrics and optional dimensions at their intended time grain.');
    const created = await graphql(createDbtQuery, { environmentId: config.environmentId, ...query, limit: limit + 1 }, signal), queryId = string(object(created.createQuery).queryId);
    const rows: Cell[][] = []; let fields: Field[] | undefined, schema = '', truncated = false, totalPages = 1;
    for (let page = 1; page <= totalPages; page++) {
      let result: Record<string, any>;
      for (;;) {
        result = object((await graphql(getDbtQuery, { environmentId: config.environmentId, queryId, pageNum: page }, signal)).query);
        if (result.status === 'SUCCESSFUL') break;
        if (result.error || !['PENDING', 'RUNNING', 'QUEUED', 'CREATED', 'COMPILING', 'EXECUTING'].includes(result.status)) throw failure();
        await pause(signal);
      }
      if (result.error || !Number.isSafeInteger(result.totalPages) || result.totalPages < 1 || result.totalPages > 1000 || (page > 1 && result.totalPages !== totalPages)) throw invalid();
      totalPages = result.totalPages;
      if (typeof result.arrowResult !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(result.arrowResult) || result.arrowResult.length % 4 !== 0) throw invalid();
      const binary = Uint8Array.from(atob(result.arrowResult), character => character.charCodeAt(0));
      const table = decodeArrowTable(await config.tableFromIPC(binary), limit + 1 - rows.length, config.decodeCell);
      if (!table.rows.length && page < totalPages) throw invalid();
      if (fields && schema !== JSON.stringify(table.fields)) throw new ConnectorError('SCHEMA_CHANGED', 'The dbt result schema changed between pages.');
      fields = table.fields; schema = JSON.stringify(fields); rows.push(...table.rows); truncated ||= table.truncated;
      if (rows.length > limit || truncated) { truncated ||= page < totalPages; break; }
    }
    signal.throwIfAborted(); return resultPage(config, 'dbt', { fields: fields!, rows, truncated }, limit, ['Metrics execute in the dbt Semantic Layer. Native Arrow result pages are collected only through the requested preview cap; this does not read dbt manifest metadata.'], queryId);
  }); } };
}
