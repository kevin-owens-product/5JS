import { assertServerRuntime, ConnectorError, makePage, normalizeCell, runRead, validateIdentity } from '../core.js';
import { createHttpClient } from '../http.js';
import type { Cell, ConnectorIdentity, DataConnector, Field, FieldType, HttpOptions } from '../types.js';
import { namedSqlType } from './driver-support.js';

/** Pass a configured official AWS SDK v3 client; command factories keep that SDK caller-owned. */
export interface AwsClient { send(command: any, options?: { abortSignal?: AbortSignal }): Promise<any> }
export type AwsCommand = (input: any) => unknown;
const invalid = () => new ConnectorError('INVALID_RESPONSE', 'The data service returned an invalid response.');
const failed = () => new ConnectorError('QUERY_FAILED', 'The data service query did not complete successfully.');
const jobWarning = 'The page limit bounds returned rows, not query execution or cost. Aborting transport/polling does not cancel the server job. Configure provider workgroup and statement limits.';
function object(value: unknown): Record<string, any> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid(); return value as Record<string, any>; }
function string(value: unknown, max = 16384): string { if (typeof value !== 'string' || !value || value.length > max || /[\u0000-\u001f]/.test(value)) throw invalid(); return value; }
function sql(value: unknown): string { if (typeof value !== 'string' || !value.trim() || value.length > 1_000_000) throw new ConnectorError('INVALID_QUERY', 'Provide a bounded server-owned SQL statement.'); return value; }
function configured<T extends ConnectorIdentity>(input: T): T { assertServerRuntime(); const config = { ...input }; validateIdentity(config); return config; }
function key(query: unknown): string { try { const result = JSON.stringify(normalizeCell(query)); if (result.length > 1_000_000) throw Error(); return result; } catch { throw new ConnectorError('INVALID_QUERY', 'Query parameters must be bounded serializable values.'); } }
function type(native: string): FieldType { if (/^(NUMBER|FIXED|NUMERIC|DECIMAL)/i.test(native)) return 'decimal'; if (/^(INT64|LONG|SHORT|BYTE)$/i.test(native)) return 'integer'; if (/^(STRING|VARCHAR|TEXT)/i.test(native)) return 'string'; return namedSqlType(native); }
function fields(raw: unknown, getName: (column: any) => unknown, getType: (column: any) => unknown): Field[] {
  if (!Array.isArray(raw)) throw invalid();
  return raw.map(value => { const column = object(value), nativeType = string(getType(column)); const name = getName(column); if (typeof name !== 'string') throw invalid(); return { name, type: type(nativeType), nativeType }; });
}
function rows(raw: unknown, width: number): unknown[][] { if (!Array.isArray(raw) || raw.some(row => !Array.isArray(row) || row.length !== width)) throw invalid(); return raw; }
function continuation(value: unknown): string | undefined { return value === undefined || value === null || value === '' ? undefined : string(value); }
function sameFields(left: Field[] | undefined, right: Field[]) { if (left && JSON.stringify(left) !== JSON.stringify(right)) throw new ConnectorError('SCHEMA_CHANGED', 'The service changed the result schema during pagination.'); }
function registry<S>() {
  const states = new Map<string, { binding: string; value: S; expires: number }>();
  const prune = () => { for (const [token, entry] of states) if (entry.expires <= Date.now()) states.delete(token); };
  return {
    get(token: string, binding: string): S { prune(); const entry = states.get(token); if (!entry || entry.binding !== binding) throw new ConnectorError('INVALID_CURSOR', 'The continuation is expired or belongs to another connector or query.'); return entry.value; },
    put(binding: string, value: S): string { prune(); while (states.size >= 32) states.delete(states.keys().next().value!); const token = crypto.randomUUID(); states.set(token, { binding, value, expires: Date.now() + 300_000 }); return token; },
  };
}
async function pause(signal: AbortSignal) {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new ConnectorError('ABORTED', 'The data read was cancelled.')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 100);
    signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
  });
}

export interface DynamoDBOptions extends ConnectorIdentity { client: AwsClient; queryCommand: AwsCommand; tableName: string; indexName?: string; consistentRead?: boolean }
export interface DynamoDBQuery {
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  /** Low-level DynamoDB AttributeValue objects retain N/NS values as exact strings. */
  expressionAttributeValues?: Record<string, unknown>;
  filterExpression?: string; projectionExpression?: string; scanIndexForward?: boolean;
}
export function dynamoDBConnector(input: DynamoDBOptions): DataConnector<DynamoDBQuery> {
  const config = configured(input), table = string(config.tableName), index = config.indexName === undefined ? undefined : string(config.indexName), cursors = registry<Record<string, unknown>>();
  if (typeof config.queryCommand !== 'function') throw new ConnectorError('INVALID_CONFIG', 'Provide the official DynamoDB QueryCommand factory.');
  return { id: config.id, provider: 'dynamodb', capabilities: { runtime: 'server', pagination: 'cursor', cancellation: 'transport', queryLanguage: 'document' },
    read(inputQuery, options) { return runRead(options, async ({ limit, cursor, signal }) => {
      const binding = key(inputQuery), query = structuredClone(inputQuery); string(query.keyConditionExpression);
      const previous = cursor ? cursors.get(cursor, binding) : undefined;
      const response = object(await config.client.send(config.queryCommand({ TableName: table, IndexName: index, ConsistentRead: config.consistentRead, KeyConditionExpression: query.keyConditionExpression, ExpressionAttributeNames: query.expressionAttributeNames, ExpressionAttributeValues: query.expressionAttributeValues, FilterExpression: query.filterExpression, ProjectionExpression: query.projectionExpression, ScanIndexForward: query.scanIndexForward, Limit: limit, ExclusiveStartKey: previous }), { abortSignal: signal }));
      signal.throwIfAborted(); const items = response.Items ?? []; if (!Array.isArray(items) || items.length > limit) throw invalid();
      const next = response.LastEvaluatedKey === undefined ? undefined : object(response.LastEvaluatedKey), hasMore = next !== undefined && Object.keys(next).length > 0;
      if (hasMore && previous && key(next) === key(previous)) throw new ConnectorError('INVALID_CURSOR', 'The service repeated its continuation key.');
      return makePage(config, 'dynamodb', [{ name: 'item', type: 'json', nativeType: 'DynamoDB AttributeValue map' }], items.map(item => [object(item)]), { hasMore, nextCursor: hasMore ? cursors.put(binding, structuredClone(next)) : undefined, warnings: ['Low-level AttributeValue N/NS strings remain exact; binary values normalize to hex. Limit applies to evaluated items before filtering: empty pages can legitimately have a continuation. Query only; no Scan or cross-page snapshot guarantee.'] });
    }); },
  };
}

export interface RedshiftOptions extends ConnectorIdentity {
  client: AwsClient; commands: { execute: AwsCommand; describe: AwsCommand; results: AwsCommand };
  database: string; clusterIdentifier?: string; workgroupName?: string; dbUser?: string; secretArn?: string;
}
export interface RedshiftQuery { text: string; parameters?: readonly { name: string; value: string }[] }
interface ResultState { queryId: string; fields: Field[]; rows: Cell[][]; offset: number; next?: string; history: string[]; total?: number; received?: number }
function bufferedPage(config: ConnectorIdentity, provider: string, binding: string, state: ResultState, limit: number, cursors: ReturnType<typeof registry<ResultState>>, warnings: string[]) {
  const values = state.rows.slice(state.offset, state.offset + limit), offset = state.offset + values.length, hasMore = offset < state.rows.length || state.next !== undefined;
  return makePage(config, provider, state.fields, values, { hasMore, nextCursor: hasMore ? cursors.put(binding, { ...state, offset }) : undefined, queryId: state.queryId, warnings });
}
function redshiftCell(raw: unknown): Cell {
  const cell = object(raw), keys = Object.keys(cell);
  if (keys.length !== 1) throw invalid();
  if (cell.isNull === true) return null;
  const value = cell[keys[0]];
  if (!['stringValue', 'longValue', 'doubleValue', 'booleanValue', 'blobValue'].includes(keys[0])) throw invalid();
  if ((keys[0] === 'stringValue' && typeof value !== 'string') || (['longValue', 'doubleValue'].includes(keys[0]) && typeof value !== 'number') || (keys[0] === 'booleanValue' && typeof value !== 'boolean') || (keys[0] === 'blobValue' && !(value instanceof Uint8Array))) throw invalid();
  return normalizeCell(value);
}
export function redshiftConnector(input: RedshiftOptions): DataConnector<RedshiftQuery> {
  const config = configured(input); config.commands = { ...config.commands }; const database = string(config.database), cursors = registry<ResultState>();
  if (!!config.clusterIdentifier === !!config.workgroupName || !Object.values(config.commands).every(command => typeof command === 'function') || !config.commands.execute || !config.commands.describe || !config.commands.results) throw new ConnectorError('INVALID_CONFIG', 'Configure a Redshift cluster or workgroup and the official Data API command factories.');
  return { id: config.id, provider: 'redshift', capabilities: { runtime: 'server', pagination: 'cursor', cancellation: 'transport', queryLanguage: 'sql' },
    read(inputQuery, options) { return runRead(options, async ({ limit, cursor, signal }) => {
      const binding = key(inputQuery), query = structuredClone(inputQuery); sql(query.text);
      if (query.parameters !== undefined && (!Array.isArray(query.parameters) || query.parameters.some(parameter => !parameter || typeof parameter.name !== 'string' || typeof parameter.value !== 'string'))) throw new ConnectorError('INVALID_QUERY', 'Redshift parameters require string names and values.');
      let state = cursor ? cursors.get(cursor, binding) : undefined;
      if (!state) {
        const started = object(await config.client.send(config.commands.execute({ Sql: query.text, Parameters: query.parameters, Database: database, ClusterIdentifier: config.clusterIdentifier, WorkgroupName: config.workgroupName, DbUser: config.dbUser, SecretArn: config.secretArn, ResultFormat: 'JSON', ClientToken: crypto.randomUUID() }), { abortSignal: signal }));
        const queryId = string(started.Id);
        for (let attempts = 0;; attempts++) {
          signal.throwIfAborted(); const status = object(await config.client.send(config.commands.describe({ Id: queryId }), { abortSignal: signal }));
          if (status.Id !== undefined && status.Id !== queryId) throw invalid();
          if (status.Status === 'FINISHED') { if (status.HasResultSet !== true) throw new ConnectorError('UNSUPPORTED_RESULT', 'The Redshift statement did not return a tabular result.'); break; }
          if (!['SUBMITTED', 'PICKED', 'STARTED'].includes(status.Status)) throw failed();
          if (attempts >= 300) throw new ConnectorError('TIMEOUT', 'The Redshift statement is still running.'); await pause(signal);
        }
        state = { queryId, fields: [], rows: [], offset: 0, history: [] };
      }
      if (state.offset >= state.rows.length) {
        const response = object(await config.client.send(config.commands.results({ Id: state.queryId, NextToken: state.next }), { abortSignal: signal })); signal.throwIfAborted();
        const schema = fields(response.ColumnMetadata, column => column.label ?? column.name, column => column.typeName); if (state.fields.length) sameFields(state.fields, schema);
        const values = rows(response.Records, schema.length); if (values.length > 100_000) throw new ConnectorError('RESPONSE_TOO_LARGE', 'The native Redshift result page exceeded 100000 rows.');
        const next = continuation(response.NextToken); if (next && state.history.includes(next)) throw new ConnectorError('INVALID_CURSOR', 'The service repeated a result continuation.');
        const total = response.TotalNumRows ?? state.total, received = (state.received ?? 0) + values.length;
        if (total !== undefined && (!Number.isSafeInteger(total) || total < 0 || (state.total !== undefined && total !== state.total) || received > total || (!next && received !== total))) throw new ConnectorError('INVALID_RESPONSE', 'Redshift returned inconsistent result row counts.');
        state = { ...state, fields: schema, rows: values.map(row => row.map(redshiftCell)), offset: 0, next, total, received, history: next ? [...state.history, next].slice(-100) : state.history };
      }
      return bufferedPage(config, 'redshift', binding, state, limit, cursors, [jobWarning, 'Redshift controls native result page size; the adapter buffers/slices that page without resubmitting SQL. Cast large integer and exact decimal columns to VARCHAR when the Data API would otherwise emit lossy JSON numbers.']);
    }); },
  };
}

export interface AthenaOptions extends ConnectorIdentity { client: AwsClient; commands: { start: AwsCommand; execution: AwsCommand; results: AwsCommand }; workGroup: string; database?: string; catalog?: string; outputLocation?: string }
export interface AthenaQuery { text: string; executionParameters?: readonly string[] }
interface AthenaState { queryId: string; next: string; fields: Field[]; history: string[] }
export function athenaConnector(input: AthenaOptions): DataConnector<AthenaQuery> {
  const config = configured(input); config.commands = { ...config.commands }; const workGroup = string(config.workGroup), cursors = registry<AthenaState>();
  if (!config.commands.start || !config.commands.execution || !config.commands.results || !Object.values(config.commands).every(command => typeof command === 'function')) throw new ConnectorError('INVALID_CONFIG', 'Provide the official Athena command factories.');
  return { id: config.id, provider: 'athena', capabilities: { runtime: 'server', pagination: 'cursor', cancellation: 'transport', queryLanguage: 'sql' },
    read(inputQuery, options) { return runRead(options, async ({ limit, cursor, signal }) => {
      const binding = key(inputQuery), query = structuredClone(inputQuery); sql(query.text);
      if (query.executionParameters !== undefined && (!Array.isArray(query.executionParameters) || query.executionParameters.some(parameter => typeof parameter !== 'string'))) throw new ConnectorError('INVALID_QUERY', 'Athena execution parameters must use the native string representation.');
      const state = cursor ? cursors.get(cursor, binding) : undefined; let queryId = state?.queryId;
      if (!queryId) {
        const started = object(await config.client.send(config.commands.start({ QueryString: query.text, ExecutionParameters: query.executionParameters, WorkGroup: workGroup, QueryExecutionContext: { Database: config.database, Catalog: config.catalog }, ...(config.outputLocation && { ResultConfiguration: { OutputLocation: config.outputLocation } }), ClientRequestToken: crypto.randomUUID() }), { abortSignal: signal }));
        queryId = string(started.QueryExecutionId);
        for (let attempts = 0;; attempts++) {
          signal.throwIfAborted(); const execution = object(object(await config.client.send(config.commands.execution({ QueryExecutionId: queryId }), { abortSignal: signal })).QueryExecution);
          if (execution.QueryExecutionId !== undefined && execution.QueryExecutionId !== queryId) throw invalid();
          const status = object(execution.Status).State;
          if (status === 'SUCCEEDED') {
            if (execution.SubstatementType !== undefined && execution.SubstatementType !== 'SELECT') throw new ConnectorError('UNSUPPORTED_RESULT', 'The Athena adapter supports SELECT result tables.');
            break;
          }
          if (!['QUEUED', 'RUNNING'].includes(status)) throw failed();
          if (attempts >= 300) throw new ConnectorError('TIMEOUT', 'The Athena query is still running.'); await pause(signal);
        }
      }
      const response = object(await config.client.send(config.commands.results({ QueryExecutionId: queryId, QueryResultType: 'DATA_ROWS', MaxResults: Math.min(1000, limit + (state ? 0 : 1)), NextToken: state?.next }), { abortSignal: signal })); signal.throwIfAborted();
      const result = object(response.ResultSet), columns = object(result.ResultSetMetadata).ColumnInfo;
      const schema = fields(columns, column => column.Label ?? column.Name, column => column.Type); sameFields(state?.fields, schema);
      if (!Array.isArray(result.Rows) || result.Rows.length > Math.min(1000, limit + (state ? 0 : 1))) throw invalid();
      const values: Cell[][] = result.Rows.map((raw: unknown) => { const data = object(raw).Data; if (!Array.isArray(data) || data.length !== schema.length) throw invalid(); return data.map(item => { const value = object(item).VarCharValue; if (value === undefined) return null; if (typeof value !== 'string') throw invalid(); return value; }); });
      if (!state && values.length) {
        if (values[0].some((value, index) => value !== columns[index].Name && value !== columns[index].Label)) throw new ConnectorError('INVALID_RESPONSE', 'Athena did not return the expected initial column header.');
        values.shift();
      }
      const next = continuation(response.NextToken), history = state?.history ?? [];
      if (next && history.includes(next)) throw new ConnectorError('INVALID_CURSOR', 'The service repeated a result continuation.');
      return makePage(config, 'athena', schema, values, { hasMore: next !== undefined, nextCursor: next ? cursors.put(binding, { queryId, next, fields: schema, history: [...history, next].slice(-100) }) : undefined, queryId, warnings: [jobWarning, 'Athena DATA_ROWS preserves cells as VarCharValue strings; an absent value is null. The initial header is removed once. Native result pages are at most 1000 rows. ExecutionParameters retain Athena SQL-literal semantics; output S3 access is application-owned.'] });
    }); },
  };
}

export interface TrinoOptions extends HttpOptions { baseUrl: string; user: string; catalog?: string; schema?: string }
export interface TrinoQuery { text: string }
export function trinoConnector(input: TrinoOptions): DataConnector<TrinoQuery> {
  const config = configured(input), user = string(config.user, 128), http = createHttpClient({ ...config, baseUrl: config.baseUrl }), origin = new URL(config.baseUrl).origin, cursors = registry<ResultState>();
  const headers = { 'content-type': 'text/plain; charset=utf-8', 'X-Trino-User': user, ...(config.catalog && { 'X-Trino-Catalog': string(config.catalog, 128) }), ...(config.schema && { 'X-Trino-Schema': string(config.schema, 128) }) };
  function nextPath(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    let url: URL; try { url = new URL(string(value)); } catch { throw invalid(); }
    if (url.origin !== origin || url.username || url.password || url.hash || !url.pathname.startsWith('/v1/statement/')) throw new ConnectorError('INVALID_URL', 'Trino returned a continuation outside the configured statement origin.');
    return url.pathname + url.search;
  }
  function decode(response: unknown, previous?: ResultState): ResultState {
    const result = object(response); if (result.error) throw failed();
    const queryId = string(result.id); if (previous && previous.queryId !== queryId) throw invalid();
    if (result.updateType !== undefined || (result.data !== undefined && result.data !== null && !Array.isArray(result.data))) throw new ConnectorError('UNSUPPORTED_RESULT', 'The Trino adapter supports inline tabular results only; spooling and update statements are unsupported.');
    const schema = result.columns === undefined ? previous?.fields ?? [] : fields(result.columns, column => column.name, column => column.type);
    if (previous?.fields.length && result.columns !== undefined) sameFields(previous.fields, schema);
    const data = result.data ?? []; if (data.length > 100_000) throw new ConnectorError('RESPONSE_TOO_LARGE', 'The native Trino result page exceeded 100000 rows.');
    const values = rows(data, schema.length).map(row => row.map(cell => normalizeCell(cell))), next = nextPath(result.nextUri), history = previous?.history ?? [];
    if (next && history.includes(next)) throw new ConnectorError('INVALID_CURSOR', 'Trino repeated a continuation URI.');
    if (!next && !schema.length) throw invalid();
    return { queryId, fields: schema, rows: values, offset: 0, next, history: next ? [...history, next].slice(-100) : history };
  }
  return { id: config.id, provider: 'trino', capabilities: { runtime: 'server', pagination: 'cursor', cancellation: 'transport', queryLanguage: 'sql' },
    read(query, options) { return runRead(options, async ({ limit, cursor, signal }) => {
      const binding = key(query), text = sql(query?.text);
      if (Object.keys(query).some(name => name !== 'text')) throw new ConnectorError('INVALID_QUERY', 'Trino accepts server-owned SQL text; client parameter interpolation is unsupported.');
      let state = cursor ? cursors.get(cursor, binding) : decode(await http.request('/v1/statement', { method: 'POST', body: text, headers, signal }));
      for (let attempts = 0; state.offset >= state.rows.length && state.next; attempts++) {
        if (attempts >= 300) throw new ConnectorError('TIMEOUT', 'Trino has not produced a result page.');
        if (!state.rows.length) await pause(signal);
        state = decode(await http.request(state.next, { headers, signal }), state);
      }
      signal.throwIfAborted();
      return bufferedPage(config, 'trino', binding, state, limit, cursors, [jobWarning, 'Trino inline pages are buffered without following foreign-origin links. Spooling, prepared-statement/session mutation headers, and automatic SQL interpolation are unsupported. Cast exact large integers/decimals to VARCHAR before JSON serialization when needed.']);
    }); },
  };
}
