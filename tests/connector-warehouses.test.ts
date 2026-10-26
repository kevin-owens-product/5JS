import assert from 'node:assert/strict';
import test from 'node:test';
import { createBigQueryConnector, createDatabricksConnector, createSnowflakeConnector } from '../packages/connectors/src/adapters/warehouses.js';
import { ConnectorError } from '../packages/connectors/src/core.js';

const identity = { id: 'test-warehouse', source: 'Warehouse contract fixture', mode: 'fixture' as const, token: () => 'test-token' };
const query = { text: 'SELECT id, amount FROM approved_view' };
type Step = { result: unknown; status?: number; check?: (url: URL, init: RequestInit) => void };
function transport(steps: Step[]) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fetch: typeof globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input)); calls.push({ url, init });
    const step = steps.shift(); assert.ok(step, 'Unexpected provider request'); step.check?.(url, init);
    return new Response(JSON.stringify(step.result), { status: step.status ?? 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls };
}
const bqJob = { projectId: 'project-a', jobId: 'job-1', location: 'us-central1' };
const bqSchema = { fields: [{ name: 'id', type: 'INT64' }, { name: 'amount', type: 'NUMERIC' }] };
const bqRows = (values: string[][]) => values.map(row => ({ f: row.map(v => ({ v })) }));
const sfFields = [{ name: 'id', type: 'fixed', scale: 0, nullable: false }, { name: 'amount', type: 'fixed', scale: 9, nullable: true }];
const dbFields = [{ name: 'id', type_text: 'BIGINT', position: 0 }, { name: 'amount', type_text: 'DECIMAL(38,9)', position: 1 }];
function code(expected: string) { return (error: unknown) => error instanceof ConnectorError && error.code === expected; }

test('BigQuery submits typed parameters once, polls its job location, and preserves exact values across buffered and remote pages', async () => {
  let tokens = 0;
  const mock = transport([
    { result: { jobComplete: false, jobReference: bqJob }, check(url, init) {
      assert.equal(url.pathname, '/bigquery/v2/projects/project-a/queries'); assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'error');
      const body = JSON.parse(String(init.body)); assert.equal(body.useLegacySql, false); assert.equal(body.maximumBytesBilled, '1000000'); assert.equal(body.parameterMode, 'NAMED'); assert.equal(body.queryParameters[0].parameterType.type, 'INT64');
    } },
    { result: { jobComplete: true, schema: bqSchema, rows: bqRows([['9007199254740993', '0.123456789'], ['9007199254740994', '2.000000001']]), pageToken: 'provider-page-2' }, check(url) { assert.equal(url.searchParams.get('location'), 'us-central1'); assert.equal(url.pathname, '/bigquery/v2/projects/project-a/queries/job-1'); } },
    { result: { jobComplete: true, rows: bqRows([['9007199254740995', '3.000000001']]) }, check(url) { assert.equal(url.searchParams.get('pageToken'), 'provider-page-2'); } },
  ]);
  const connector = createBigQueryConnector({ ...identity, projectId: 'project-a', maximumBytesBilled: '1000000', fetch: mock.fetch, token: () => `test-${++tokens}` });
  const typedQuery = { ...query, parameters: [{ name: 'id', parameterType: { type: 'INT64' }, parameterValue: { value: '9007199254740993' } }] };
  const first = await connector.read(typedQuery, { limit: 1 });
  assert.deepEqual(first.rows, [['9007199254740993', '0.123456789']]); assert.equal(first.fields[0].type, 'integer'); assert.equal(first.fields[1].type, 'decimal'); assert.equal(first.provenance.queryId, 'job-1');
  assert.ok(first.page.nextCursor); assert.ok(!first.page.nextCursor.includes('SELECT')); assert.ok(!first.page.nextCursor.includes('provider-page'));
  const second = await connector.read(typedQuery, { limit: 1, cursor: first.page.nextCursor });
  assert.deepEqual(second.rows, [['9007199254740994', '2.000000001']]); assert.equal(mock.calls.length, 2, 'buffered rows do not resubmit or refetch the job');
  const third = await connector.read(typedQuery, { limit: 1, cursor: second.page.nextCursor });
  assert.deepEqual(third.rows, [['9007199254740995', '3.000000001']]); assert.equal(third.page.hasMore, false); assert.equal(tokens, 3);
  assert.equal(mock.calls.filter(call => call.init.method === 'POST').length, 1);
});

test('BigQuery decodes repeated and nested schema while preserving datetime and JSON source strings', async () => {
  const schema = { fields: [{ name: 'tags', type: 'STRING', mode: 'REPEATED' }, { name: 'profile', type: 'RECORD', fields: [{ name: 'active', type: 'BOOL' }, { name: '__proto__', type: 'STRING' }] }, { name: 'seen', type: 'TIMESTAMP' }, { name: 'payload', type: 'JSON' }] };
  const mock = transport([{ result: { jobComplete: true, jobReference: bqJob, schema, rows: [{ f: [{ v: [{ v: 'one' }, { v: 'two' }] }, { v: { f: [{ v: 'true' }, { v: 'safe-key' }] } }, { v: '1712345678.123456' }, { v: '{"id":9007199254740993}' }] }] } }]);
  const result = await createBigQueryConnector({ ...identity, projectId: 'project-a', fetch: mock.fetch }).read(query);
  assert.deepEqual(result.rows[0][0], ['one', 'two']); assert.equal((result.rows[0][1] as any).active, true); assert.equal((result.rows[0][1] as any).__proto__, 'safe-key');
  assert.equal(result.rows[0][2], '1712345678.123456'); assert.equal(result.rows[0][3], '{"id":9007199254740993}');
});

test('warehouse cursors reject another query, another instance, forged tokens, and expired states', async () => {
  const mock = transport([{ result: { jobComplete: true, jobReference: bqJob, schema: bqSchema, rows: bqRows([['1', '2'], ['3', '4']]) } }]);
  const connector = createBigQueryConnector({ ...identity, projectId: 'project-a', fetch: mock.fetch });
  const first = await connector.read(query, { limit: 1 });
  await assert.rejects(connector.read({ text: 'SELECT private_data' }, { cursor: first.page.nextCursor }), code('INVALID_CURSOR'));
  const other = createBigQueryConnector({ ...identity, projectId: 'project-a', fetch: mock.fetch });
  await assert.rejects(other.read(query, { cursor: first.page.nextCursor }), code('INVALID_CURSOR'));
  await assert.rejects(connector.read(query, { cursor: '{"queryId":"job-other"}' }), code('INVALID_CURSOR'));
  const now = Date.now; try { Date.now = () => now() + 300_001; await assert.rejects(connector.read(query, { cursor: first.page.nextCursor }), code('INVALID_CURSOR')); } finally { Date.now = now; }
  assert.equal(mock.calls.length, 1);
});

test('warehouse cursor storage has a hard bound and never changes connection provenance after configuration mutation', async () => {
  const mock = transport(Array.from({ length: 33 }, () => ({ result: { jobComplete: true, jobReference: bqJob, schema: bqSchema, rows: bqRows([['1', '2'], ['3', '4']]) } })));
  const config = { ...identity, projectId: 'project-a', fetch: mock.fetch };
  const connector = createBigQueryConnector(config); const first = await connector.read(query, { limit: 1 });
  config.source = 'Mutated source';
  for (let i = 0; i < 32; i++) assert.equal((await connector.read(query, { limit: 1 })).provenance.source, identity.source);
  await assert.rejects(connector.read(query, { cursor: first.page.nextCursor }), code('INVALID_CURSOR'));
});

test('BigQuery rejects schema drift and repeated continuation tokens', async () => {
  for (const second of [
    { jobComplete: true, schema: { fields: [{ name: 'unexpected', type: 'STRING' }] }, rows: [] },
    { jobComplete: true, rows: [], pageToken: 'repeat' },
  ]) {
    const mock = transport([{ result: { jobComplete: true, jobReference: bqJob, schema: bqSchema, rows: [], pageToken: 'repeat' } }, { result: second }]);
    const connector = createBigQueryConnector({ ...identity, projectId: 'project-a', fetch: mock.fetch }); const first = await connector.read(query);
    await assert.rejects(connector.read(query, { cursor: first.page.nextCursor }), code('INVALID_RESPONSE'));
  }
});

test('Snowflake slices partitions into exact requested pages without dropping rows or resubmitting statements', async () => {
  const mock = transport([
    { result: { statementHandle: 'statement-1', resultSetMetaData: { rowType: sfFields, partitionInfo: [{ rowCount: 3 }, { rowCount: 2 }] }, data: [['1', '0.123456789'], ['2', '2.000000001'], ['3', null]] }, check(_url, init) {
      const body = JSON.parse(String(init.body)); assert.equal(body.bindings['1'].type, 'FIXED'); assert.equal(body.parameters.MULTI_STATEMENT_COUNT, '1'); assert.equal(new Headers(init.headers).get('X-Snowflake-Authorization-Token-Type'), 'KEYPAIR_JWT');
    } },
    { result: { statementHandle: 'statement-1', data: [['4', '4.000000001'], ['5', '5.000000001']] }, check(url, init) { assert.equal(url.searchParams.get('partition'), '1'); assert.equal(init.method, 'GET'); } },
  ]);
  const connector = createSnowflakeConnector({ ...identity, accountUrl: 'https://account.snowflakecomputing.com', tokenType: 'KEYPAIR_JWT', fetch: mock.fetch });
  const typedQuery = { ...query, bindings: { '1': { type: 'FIXED', value: '9007199254740993' } } };
  const first = await connector.read(typedQuery, { limit: 2 }); const second = await connector.read(typedQuery, { limit: 2, cursor: first.page.nextCursor });
  assert.deepEqual(second.rows, [['3', null]]); assert.equal(mock.calls.length, 1);
  const third = await connector.read(typedQuery, { limit: 2, cursor: second.page.nextCursor });
  assert.deepEqual([...first.rows, ...second.rows, ...third.rows], [['1', '0.123456789'], ['2', '2.000000001'], ['3', null], ['4', '4.000000001'], ['5', '5.000000001']]);
  assert.equal(third.page.hasMore, false); assert.equal(first.fields[0].type, 'integer'); assert.equal(first.fields[1].type, 'decimal'); assert.equal(mock.calls.length, 2);
});

test('Snowflake polls pending executions, preserves booleans and timestamps, and rejects provider failures safely', async () => {
  const mock = transport([
    { result: { statementHandle: 'statement-2', code: '333334' }, status: 202 },
    { result: { statementHandle: 'statement-2', resultSetMetaData: { rowType: [{ name: 'same', type: 'boolean' }, { name: 'same', type: 'timestamp_ntz' }] }, data: [['true', '1712345678.123456789']] } },
  ]);
  const result = await createSnowflakeConnector({ ...identity, accountUrl: 'https://account.snowflakecomputing.com', fetch: mock.fetch }).read(query);
  assert.deepEqual(result.rows, [[true, '1712345678.123456789']]); assert.deepEqual(result.fields.map(field => field.name), ['same', 'same']);
  const failed = transport([{ result: { statementHandle: 'failed', sqlState: 'XX000', message: 'secret-token SELECT private' } }]);
  await assert.rejects(createSnowflakeConnector({ ...identity, accountUrl: 'https://account.snowflakecomputing.com', fetch: failed.fetch }).read(query), error => code('QUERY_FAILED')(error) && !String(error).includes('private'));
});

test('Databricks polls inline execution, retains truncated status, and pages chunk buffers without losing source rows', async () => {
  const mock = transport([
    { result: { statement_id: 'statement-3', status: { state: 'PENDING' } }, check(_url, init) {
      const body = JSON.parse(String(init.body)); assert.equal(body.disposition, 'INLINE'); assert.equal(body.format, 'JSON_ARRAY'); assert.equal(body.row_limit, 30); assert.equal(body.byte_limit, 100000); assert.equal(body.parameters[0].type, 'BIGINT');
    } },
    { result: { statement_id: 'statement-3', status: { state: 'SUCCEEDED' }, manifest: { format: 'JSON_ARRAY', schema: { columns: dbFields }, truncated: true }, result: { chunk_index: 0, data_array: [['1', '1.000000001'], ['2', '2.000000001'], ['3', '3.000000001']], next_chunk_index: 1, next_chunk_internal_link: '/api/2.0/sql/statements/statement-3/result/chunks/1' } } },
    { result: { chunk_index: 1, data_array: [['9007199254740993', '0.123456789']] }, check(url) { assert.ok(url.pathname.endsWith('/result/chunks/1')); } },
  ]);
  const connector = createDatabricksConnector({ ...identity, workspaceUrl: 'https://workspace.cloud.databricks.com', warehouseId: 'warehouse-1', maxRows: 30, maxBytes: 100000, fetch: mock.fetch });
  const typedQuery = { ...query, parameters: [{ name: 'id', type: 'BIGINT', value: '9007199254740993' }] };
  const first = await connector.read(typedQuery, { limit: 2 }), second = await connector.read(typedQuery, { limit: 2, cursor: first.page.nextCursor }), third = await connector.read(typedQuery, { limit: 2, cursor: second.page.nextCursor });
  assert.deepEqual([...first.rows, ...second.rows, ...third.rows], [['1', '1.000000001'], ['2', '2.000000001'], ['3', '3.000000001'], ['9007199254740993', '0.123456789']]);
  assert.equal(third.page.hasMore, false); assert.equal(third.page.truncated, true); assert.match(third.warnings.join(''), /cannot recover omitted rows/); assert.equal(mock.calls.filter(call => call.init.method === 'POST').length, 1);
});

test('Databricks rejects terminal failures and external links without forwarding credentials', async () => {
  for (const state of ['FAILED', 'CANCELED', 'CLOSED']) {
    const mock = transport([{ result: { statement_id: 'bad', status: { state, error: { message: 'secret-token SQL' } } } }]);
    await assert.rejects(createDatabricksConnector({ ...identity, workspaceUrl: 'https://workspace.cloud.databricks.com', warehouseId: 'wh', fetch: mock.fetch }).read(query), error => code('QUERY_FAILED')(error) && !String(error).includes('secret-token'));
  }
  const mock = transport([{ result: { statement_id: 'external', status: { state: 'SUCCEEDED' }, manifest: { format: 'JSON_ARRAY', schema: { columns: dbFields } }, result: { external_links: [{ external_link: 'https://evil.invalid/data?credential=secret' }] } } }]);
  await assert.rejects(createDatabricksConnector({ ...identity, workspaceUrl: 'https://workspace.cloud.databricks.com', warehouseId: 'wh', fetch: mock.fetch }).read(query), code('UNSUPPORTED'));
  assert.equal(mock.calls.length, 1);
});

test('warehouse abort and deadline stop polling without claiming native job cancellation', async () => {
  const aborted = transport([{ result: { statement_id: 'pending', status: { state: 'RUNNING' } } }]);
  const connector = createDatabricksConnector({ ...identity, workspaceUrl: 'https://workspace.cloud.databricks.com', warehouseId: 'wh', fetch: aborted.fetch });
  const controller = new AbortController(); const pending = connector.read(query, { signal: controller.signal });
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(pending, code('ABORTED')); assert.equal(aborted.calls.length, 1); assert.equal(connector.capabilities.cancellation, 'transport');
  const timed = transport([{ result: { jobComplete: false, jobReference: bqJob } }]);
  await assert.rejects(createBigQueryConnector({ ...identity, projectId: 'project-a', fetch: timed.fetch }).read(query, { timeoutMs: 10 }), code('TIMEOUT'));
  assert.equal(timed.calls.length, 1);
});

test('warehouse HTTP failures are sanitized, never retried, and unsafe configuration is rejected before network use', async () => {
  const mock = transport([{ result: { message: 'token=secret SELECT private' }, status: 429 }]);
  await assert.rejects(createBigQueryConnector({ ...identity, projectId: 'project-a', fetch: mock.fetch }).read(query), error => code('RATE_LIMITED')(error) && !String(error).includes('private'));
  assert.equal(mock.calls.length, 1);
  assert.throws(() => createSnowflakeConnector({ ...identity, accountUrl: 'http://localhost:1234', fetch: mock.fetch }), code('INVALID_CONFIG'));
  assert.throws(() => createDatabricksConnector({ ...identity, workspaceUrl: 'https://user:secret@host.test', warehouseId: 'wh', fetch: mock.fetch }), code('INVALID_CONFIG'));
  assert.throws(() => createDatabricksConnector({ ...identity, workspaceUrl: 'https://host.test', warehouseId: 'wh', maxRows: Infinity, fetch: mock.fetch }), code('INVALID_QUERY'));
  await assert.rejects(createBigQueryConnector({ ...identity, projectId: 'project-a', fetch: mock.fetch }).read({ text: '' }), code('INVALID_QUERY'));
});

test('warehouse responses cannot silently drop declared rows, skip chunks, or switch job identities', async () => {
  const bq = transport([
    { result: { jobComplete: false, jobReference: bqJob } },
    { result: { jobComplete: true, jobReference: { ...bqJob, jobId: 'wrong-job' }, schema: bqSchema, rows: [] } },
  ]);
  await assert.rejects(createBigQueryConnector({ ...identity, projectId: 'project-a', fetch: bq.fetch }).read(query), code('INVALID_RESPONSE'));
  for (const metadata of [
    { numRows: 2, rowType: sfFields },
    { rowType: sfFields, partitionInfo: [{ rowCount: 2 }] },
  ]) {
    const sf = transport([{ result: { statementHandle: 'incomplete', resultSetMetaData: metadata, data: [['1', '2']] } }]);
    await assert.rejects(createSnowflakeConnector({ ...identity, accountUrl: 'https://account.snowflakecomputing.com', fetch: sf.fetch }).read(query), code('INVALID_RESPONSE'));
  }
  for (const result of [
    { row_count: 2, data_array: [['1', '2']], next_chunk_index: 1 },
    { data_array: [['1', '2']] },
    { data_array: [['1', '2']], next_chunk_index: 2 },
  ]) {
    const db = transport([{ result: { statement_id: 'incomplete', status: { state: 'SUCCEEDED' }, manifest: { format: 'JSON_ARRAY', total_chunk_count: 2, schema: { columns: dbFields } }, result } }]);
    await assert.rejects(createDatabricksConnector({ ...identity, workspaceUrl: 'https://workspace.cloud.databricks.com', warehouseId: 'wh', fetch: db.fetch }).read(query), code('INVALID_RESPONSE'));
  }
  assert.throws(() => createBigQueryConnector({ ...identity, projectId: '..' }), code('INVALID_RESPONSE'));
});
