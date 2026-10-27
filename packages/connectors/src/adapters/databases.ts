import { assertServerRuntime, ConnectorError, inferFields, makePage, runRead, validateIdentity } from '../core.js';
import type { ConnectorIdentity, DataConnector, Field, FieldType } from '../types.js';
import { executionWarning, fieldsFrom, namedSqlType, parserWarning, resultObject, resultRows } from './driver-support.js';

const invalid = () => new ConnectorError('INVALID_RESPONSE', 'The database returned an invalid result.');
const snapshotWarning = 'This is a bounded snapshot without a continuation cursor. Narrow the registered query when truncated.';
function snapshot(cursor?: string) { if (cursor !== undefined) throw new ConnectorError('UNSUPPORTED_CURSOR', 'This snapshot adapter does not expose continuation cursors.'); }
function configured<T extends ConnectorIdentity>(options: T): T { assertServerRuntime(); const copy = { ...options }; validateIdentity(copy); return copy; }
function name(value: unknown): string { if (typeof value !== 'string' || !value || value.length > 1024 || /[\u0000-\u001f]/.test(value)) throw new ConnectorError('INVALID_CONFIG', 'Provide a nonempty configured source identifier.'); return value; }
function statement(value: unknown): string { if (typeof value !== 'string' || !value.trim() || value.length > 1_000_000) throw new ConnectorError('INVALID_QUERY', 'Provide a bounded server-owned statement.'); return value; }
function document(value: unknown): Record<string, any> { return resultObject(value); }
function sqlType(native: string): FieldType {
  let value = native;
  for (;;) { const wrapper = /^(?:Nullable|LowCardinality)\((.*)\)$/i.exec(value); if (!wrapper) break; value = wrapper[1]; }
  if (/^U?Int(?:8|16|32|64|128|256)$/i.test(value)) return 'integer';
  return /^NUMBER(?:\(|$)/i.test(value) ? 'decimal' : namedSqlType(value);
}
function metadata(raw: unknown, rows: unknown[][], native: (field: Record<string, any>) => unknown): Field[] {
  if (!Array.isArray(raw)) throw invalid();
  const columns = raw.map(document);
  const fields = fieldsFrom(columns.map(field => field.name), rows, columns.map(native), sqlType);
  return fields.map((field, index) => ({ ...field, ...(typeof columns[index].nullable === 'boolean' && { nullable: columns[index].nullable }) }));
}

export interface SqlServerRequest {
  arrayRowMode: boolean;
  input(name: string, ...args: any[]): unknown;
  query(text: string): Promise<unknown>;
  cancel(): unknown;
}
export interface SqlServerQuery { text: string; parameters?: Record<string, { value: unknown; type?: unknown }> }
export interface SqlServerOptions extends ConnectorIdentity {
  /** Return a fresh, configured mssql.Request for each read; its pool remains caller-owned. */
  request(): SqlServerRequest;
}
export function sqlServerConnector(input: SqlServerOptions): DataConnector<SqlServerQuery> {
  const options = configured(input);
  if (typeof options.request !== 'function') throw new ConnectorError('INVALID_CONFIG', 'Provide a configured SQL Server request factory.');
  return { id: options.id, provider: 'sql-server', capabilities: { runtime: 'server', pagination: 'none', cancellation: 'transport', queryLanguage: 'sql' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      snapshot(cursor); const text = statement(query?.text), request = options.request(); request.arrayRowMode = true;
      if (query.parameters !== undefined) for (const [key, binding] of Object.entries(document(query.parameters))) {
        if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(key) || !binding || typeof binding !== 'object' || !Object.hasOwn(binding, 'value')) throw new ConnectorError('INVALID_QUERY', 'SQL Server parameters require names and values.');
        if (binding.type === undefined) request.input(key, binding.value); else request.input(key, binding.type, binding.value);
      }
      const cancel = () => { try { request.cancel(); } catch { /* Keep provider errors private. */ } };
      signal.addEventListener('abort', cancel, { once: true });
      try {
        signal.throwIfAborted(); const result = document(await request.query(text)); signal.throwIfAborted();
        if (!Array.isArray(result.recordsets) || result.recordsets.length !== 1 || !Array.isArray(result.columns) || result.columns.length !== 1) throw invalid();
        const rows = resultRows(result.recordset), kept = rows.slice(0, limit);
        return makePage(options, 'sql-server', metadata(result.columns[0], kept, field => field.type?.declaration ?? field.type?.name), kept, {
          hasMore: rows.length > limit, truncated: rows.length > limit, warnings: [executionWarning, parserWarning, snapshotWarning],
        });
      } finally { signal.removeEventListener('abort', cancel); }
    }); },
  };
}

export interface OracleClient { execute(text: string, binds: any, options: any): Promise<unknown> }
export interface OracleQuery { text: string; binds?: Record<string, unknown> | readonly unknown[] }
export interface OracleOptions extends ConnectorIdentity {
  client: OracleClient;
  /** Pass oracledb.OUT_FORMAT_ARRAY. */
  outFormatArray: number;
  /** Use the official fetchTypeHandler to fetch NUMBER/high-precision time values as strings. */
  fetchTypeHandler?: (...args: any[]) => any;
}
export function oracleConnector(input: OracleOptions): DataConnector<OracleQuery> {
  const options = configured(input);
  if (options.outFormatArray !== 4001 || typeof options.client?.execute !== 'function') throw new ConnectorError('INVALID_CONFIG', 'Provide an Oracle connection and oracledb.OUT_FORMAT_ARRAY.');
  return { id: options.id, provider: 'oracle', capabilities: { runtime: 'server', pagination: 'none', cancellation: 'cooperative', queryLanguage: 'sql' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      snapshot(cursor); const text = statement(query?.text); let resultSet: any;
      try {
        signal.throwIfAborted();
        const result = document(await options.client.execute(text, query.binds ?? [], { outFormat: options.outFormatArray, resultSet: true, prefetchRows: 0, fetchArraySize: Math.min(limit + 1, 1000), ...(options.fetchTypeHandler && { fetchTypeHandler: options.fetchTypeHandler }) }));
        resultSet = result.resultSet;
        if (!resultSet || typeof resultSet.getRows !== 'function' || typeof resultSet.close !== 'function') throw invalid();
        signal.throwIfAborted(); const rows = resultRows(await resultSet.getRows(limit + 1)); signal.throwIfAborted();
        if (rows.length > limit + 1) throw invalid();
        const kept = rows.slice(0, limit);
        return makePage(options, 'oracle', metadata(result.metaData ?? resultSet.metaData, kept, field => field.dbTypeName), kept, { hasMore: rows.length > limit, truncated: rows.length > limit, warnings: [executionWarning, parserWarning, snapshotWarning, 'The adapter closes its ResultSet, never the caller connection. Configure Oracle callTimeout; cancellation does not call break() on a shared connection.'] });
      } finally { if (resultSet?.close) { try { await resultSet.close(); } catch { /* Do not replace the read outcome with provider details. */ } } }
    }); },
  };
}

export interface ClickHouseClient { query(options: any): Promise<{ json(): Promise<unknown>; close(): void }> }
export interface ClickHouseQuery { text: string; parameters?: Record<string, unknown> }
export function clickHouseConnector(input: ConnectorIdentity & { client: ClickHouseClient }): DataConnector<ClickHouseQuery> {
  const options = configured(input);
  return { id: options.id, provider: 'clickhouse', capabilities: { runtime: 'server', pagination: 'none', cancellation: 'transport', queryLanguage: 'sql' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      snapshot(cursor); const text = statement(query?.text); let result: Awaited<ReturnType<ClickHouseClient['query']>> | undefined;
      try {
        result = await options.client.query({ query: text, query_params: query.parameters, format: 'JSONCompact', abort_signal: signal, clickhouse_settings: { max_result_rows: limit + 1, result_overflow_mode: 'break', output_format_json_quote_64bit_integers: 1, output_format_json_quote_decimals: 1 } });
        signal.throwIfAborted(); const response = document(await result.json()); signal.throwIfAborted();
        const rows = resultRows(response.data), kept = rows.slice(0, limit);
        return makePage(options, 'clickhouse', metadata(response.meta, kept, field => field.type), kept, { hasMore: rows.length > limit, truncated: rows.length > limit, warnings: [snapshotWarning, 'ClickHouse enforces max_result_rows at block boundaries and can overfetch a block. Decimal and 64-bit integer output is requested as strings. Aborting HTTP does not guarantee immediate server query cancellation.'] });
      } finally { if (result) { try { result.close(); } catch { /* Caller owns the client. */ } } }
    }); },
  };
}

export interface SearchClient { search(request: any, options?: any): Promise<unknown> }
export interface SearchQuery { query?: Record<string, unknown>; source?: boolean | string[]; sort?: readonly Record<string, 'asc' | 'desc'>[] }
export interface SearchOptions extends ConnectorIdentity { client: SearchClient; index: string }
function searchConnector(input: SearchOptions, provider: 'elasticsearch' | 'opensearch'): DataConnector<SearchQuery> {
  const options = configured(input), index = name(options.index);
  return { id: options.id, provider, capabilities: { runtime: 'server', pagination: 'none', cancellation: provider === 'elasticsearch' ? 'transport' : 'cooperative', queryLanguage: 'document' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      snapshot(cursor); document(query); if (query.query !== undefined) document(query.query);
      const body = { query: query.query, _source: query.source, sort: query.sort, size: limit + 1, track_total_hits: true };
      // Elasticsearch v8+ returns the body directly; OpenSearch returns an ApiResponse wrapper.
      const response = document(await options.client.search(provider === 'opensearch' ? { index, body, allow_partial_search_results: false } : { index, ...body, allow_partial_search_results: false }, provider === 'elasticsearch' ? { signal, meta: false } : undefined));
      signal.throwIfAborted(); const data = provider === 'opensearch' ? document(response.body) : response;
      if (data.timed_out !== false || data.terminated_early === true || data.is_partial === true || document(data._shards).failed !== 0) throw new ConnectorError('PARTIAL_RESULT', 'The search timed out or returned partial shard results.');
      // Optional remote clusters may be skipped even with allow_partial_search_results=false.
      // A successful HTTP response must not turn their missing records into a complete snapshot.
      if (data._clusters !== undefined) {
        const clusters = document(data._clusters);
        if (!Number.isSafeInteger(clusters.total) || clusters.total < 0 || !Number.isSafeInteger(clusters.successful) || clusters.successful < 0 || ['skipped', 'partial', 'running', 'failed'].some(key => clusters[key] !== undefined && (!Number.isSafeInteger(clusters[key]) || clusters[key] < 0))) throw invalid();
        if (clusters.successful !== clusters.total || ['skipped', 'partial', 'running', 'failed'].some(key => (clusters[key] ?? 0) > 0) || (clusters.details !== undefined && Object.values(document(clusters.details)).some(value => { const detail = document(value); return detail.status !== 'successful' || detail.timed_out === true; }))) throw new ConnectorError('PARTIAL_RESULT', 'The search omitted or incompletely searched a configured remote cluster.');
      }
      const hits = document(data.hits); if (!Array.isArray(hits.hits) || hits.hits.length > limit + 1) throw invalid();
      const total = typeof hits.total === 'number' ? { value: hits.total, relation: 'eq' } : document(hits.total);
      if (!Number.isSafeInteger(total.value) || total.value < 0 || !['eq', 'gte'].includes(total.relation)) throw invalid();
      const records = hits.hits.map(document); if (records.some(hit => typeof hit._id !== 'string' || typeof hit._index !== 'string')) throw invalid();
      if (total.relation === 'eq' && total.value < records.length) throw invalid();
      const truncated = records.length > limit || total.value > Math.min(limit, records.length) || total.relation === 'gte';
      return makePage(options, provider, [{ name: 'hit', type: 'json' }], records.slice(0, limit).map(hit => [hit]), { hasMore: truncated, truncated, warnings: [snapshotWarning, 'Source JSON may already contain rounded numbers. Index exact large IDs/decimal values as strings. No point-in-time or search_after cursor is implied.', ...(provider === 'opensearch' ? ['OpenSearch cancellation is cooperative; the caller transport owns request cancellation.'] : [])] });
    }); },
  };
}
export const elasticsearchConnector = (options: SearchOptions): DataConnector<SearchQuery> => searchConnector(options, 'elasticsearch');
export const opensearchConnector = (options: SearchOptions): DataConnector<SearchQuery> => searchConnector(options, 'opensearch');

export interface RedisClient { mGet(keys: string[]): Promise<(string | null)[]> }
export interface RedisQuery { keys: readonly string[] }
export function redisConnector(input: ConnectorIdentity & { client: RedisClient }): DataConnector<RedisQuery> {
  const options = configured(input);
  return { id: options.id, provider: 'redis', capabilities: { runtime: 'server', pagination: 'none', cancellation: 'cooperative', queryLanguage: 'operation' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      snapshot(cursor);
      if (!query || !Array.isArray(query.keys) || query.keys.length > 100_000 || query.keys.some(key => typeof key !== 'string' || !key || key.length > 4096)) throw new ConnectorError('INVALID_QUERY', 'Provide at most 100000 explicit Redis string keys.');
      const keys = query.keys.slice(0, limit), values = keys.length ? await options.client.mGet(keys) : []; signal.throwIfAborted();
      if (!Array.isArray(values) || values.length !== keys.length || values.some(value => value !== null && typeof value !== 'string')) throw invalid();
      const truncated = query.keys.length > limit;
      return makePage(options, 'redis', [{ name: 'key', type: 'string' }, { name: 'value', type: 'string', nullable: true }], keys.map((key, index) => [key, values[index]]), { hasMore: truncated, truncated, warnings: [snapshotWarning, 'MGET reads explicit string keys only; missing or non-string values are null. Values remain raw strings. Redis Cluster requires keys in the same hash slot. Cancellation does not disconnect the caller client.'] });
    }); },
  };
}

export interface Neo4jRecord { keys: readonly (string | number)[]; get(index: number): unknown }
export interface Neo4jResult extends AsyncIterable<Neo4jRecord> { keys(): Promise<string[]> }
export interface Neo4jSession { run(text: string, parameters?: any, config?: any): Neo4jResult; close(): Promise<void> }
export interface Neo4jDriver { session(config: any): Neo4jSession }
export interface Neo4jQuery { text: string; parameters?: Record<string, unknown> }
export interface Neo4jOptions extends ConnectorIdentity {
  driver: Neo4jDriver; database: string; queryTimeoutMs?: number;
  /** Preserve official Integer/temporal/spatial/graph objects explicitly; never enable disableLosslessIntegers. */
  serialize(value: unknown): unknown;
}
export function neo4jConnector(input: Neo4jOptions): DataConnector<Neo4jQuery> {
  const options = configured(input), database = name(options.database), timeout = options.queryTimeoutMs ?? 30_000;
  if (typeof options.serialize !== 'function' || !Number.isSafeInteger(timeout) || timeout < 1 || timeout > 120_000) throw new ConnectorError('INVALID_CONFIG', 'Neo4j requires a serializer and a query timeout between 1 and 120000 milliseconds.');
  return { id: options.id, provider: 'neo4j', capabilities: { runtime: 'server', pagination: 'none', cancellation: 'cooperative', queryLanguage: 'document' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      snapshot(cursor); const text = statement(query?.text), session = options.driver.session({ database, defaultAccessMode: 'READ', fetchSize: Math.min(limit + 1, 1000) });
      let closing: Promise<void> | undefined;
      const close = () => closing ??= Promise.resolve().then(() => session.close()).catch(() => {});
      const abort = () => { void close(); }; signal.addEventListener('abort', abort, { once: true });
      try {
        signal.throwIfAborted(); const result = session.run(text, query.parameters, { timeout }); const names = await result.keys(); signal.throwIfAborted();
        if (!Array.isArray(names) || names.some(key => typeof key !== 'string')) throw invalid();
        const rows: unknown[][] = [];
        for await (const record of result) {
          signal.throwIfAborted(); if (JSON.stringify(record.keys) !== JSON.stringify(names)) throw invalid();
          rows.push(names.map((_, index) => options.serialize(record.get(index)))); if (rows.length > limit) break;
        }
        return makePage(options, 'neo4j', inferFields(names, rows.slice(0, limit)), rows.slice(0, limit), { hasMore: rows.length > limit, truncated: rows.length > limit, warnings: [snapshotWarning, 'READ routing is not an authorization boundary. Use read-only database privileges. The owned session is closed, never the caller driver. Serialize Integer and graph/temporal values without converting exact integers to JavaScript numbers.'] });
      } finally { signal.removeEventListener('abort', abort); await close(); }
    }); },
  };
}

export interface FirestoreQuery { limit(count: number): { get(): Promise<unknown> } }
export interface FirestoreOptions extends ConnectorIdentity {
  /** An already-authorized @google-cloud/firestore Query (including filters/order/converter). */
  query: FirestoreQuery;
  /** Convert Timestamp, GeoPoint, DocumentReference and other SDK values explicitly. */
  serialize(data: unknown): unknown;
}
export function firestoreConnector(input: FirestoreOptions): DataConnector<void> {
  const options = configured(input);
  if (typeof options.query?.limit !== 'function' || typeof options.serialize !== 'function') throw new ConnectorError('INVALID_CONFIG', 'Firestore requires a configured query and value serializer.');
  return { id: options.id, provider: 'firestore', capabilities: { runtime: 'server', pagination: 'none', cancellation: 'cooperative', queryLanguage: 'document' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      snapshot(cursor); if (query !== undefined) throw new ConnectorError('INVALID_QUERY', 'Firestore query configuration belongs on the server.');
      const result = document(await options.query.limit(limit + 1).get()); signal.throwIfAborted();
      if (!Array.isArray(result.docs) || result.docs.length > limit + 1) throw invalid();
      const rows = result.docs.slice(0, limit).map((raw: unknown) => { const doc = document(raw); if (typeof doc.id !== 'string' || typeof doc.ref?.path !== 'string' || typeof doc.data !== 'function') throw invalid(); return [doc.id, doc.ref.path, options.serialize(doc.data())]; });
      return makePage(options, 'firestore', [{ name: 'id', type: 'string' }, { name: 'path', type: 'string' }, { name: 'document', type: 'json' }], rows, { hasMore: result.docs.length > limit, truncated: result.docs.length > limit, warnings: [snapshotWarning, 'Configure the official server client with useBigInt: true for exact Firestore integers. Preserve Timestamp seconds/nanoseconds and reference paths in the serializer. A client-side timeout does not cancel Firestore work or billing.'] });
    }); },
  };
}

export interface SupabaseBuilder extends PromiseLike<unknown> { eq(column: string, value: unknown): SupabaseBuilder; is(column: string, value: null): SupabaseBuilder; order(column: string, options: { ascending: boolean }): SupabaseBuilder; limit(count: number): SupabaseBuilder; abortSignal(signal: AbortSignal): SupabaseBuilder }
/** Keep the entry point structural: supabase-js derives a recursive builder type from the caller's schema. */
export interface SupabaseClient { from(table: string): { select(...args: any[]): any } }
export interface SupabaseOptions extends ConnectorIdentity { client: SupabaseClient; table: string; columns?: string }
export interface SupabaseQuery { equals?: Record<string, string | number | boolean | null>; order?: { column: string; ascending?: boolean } }
export function supabaseConnector(input: SupabaseOptions): DataConnector<SupabaseQuery> {
  const options = configured(input), table = name(options.table), columns = options.columns ?? '*'; name(columns);
  return { id: options.id, provider: 'supabase', capabilities: { runtime: 'server', pagination: 'none', cancellation: 'transport', queryLanguage: 'rest' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      snapshot(cursor); document(query); let builder: SupabaseBuilder = options.client.from(table).select(columns, { count: 'exact' });
      for (const [column, value] of Object.entries(query.equals ?? {})) {
        if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(column) || (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) || (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))))) throw new ConnectorError('INVALID_QUERY', 'Supabase equality filters require simple column names and finite primitive values.');
        builder = value === null ? builder.is(column, null) : builder.eq(column, value);
      }
      if (query.order) { if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(query.order.column)) throw new ConnectorError('INVALID_QUERY', 'Provide a simple ordering column.'); builder = builder.order(query.order.column, { ascending: query.order.ascending !== false }); }
      const result = document(await builder.limit(limit + 1).abortSignal(signal)); signal.throwIfAborted();
      if (result.error) throw new ConnectorError('PROVIDER_ERROR', 'The configured Supabase read could not be completed.');
      if (!Array.isArray(result.data) || result.data.length > limit + 1 || !Number.isSafeInteger(result.count) || result.count < 0 || result.count < result.data.length) throw invalid();
      const truncated = result.count > Math.min(limit, result.data.length);
      return makePage(options, 'supabase', [{ name: 'record', type: 'json' }], result.data.slice(0, limit).map((record: unknown) => [document(record)]), { hasMore: truncated, truncated, warnings: [snapshotWarning, 'Exact count detects the PostgREST server row cap but can add query cost. RLS follows the caller-configured credentials; service-role clients can bypass RLS. Cast exact decimals/large integers to text in a server-owned view before JSON serialization.'] });
    }); },
  };
}
