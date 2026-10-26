import assert from 'node:assert/strict';
import test from 'node:test';
import { cubeConnector, dbtSemanticConnector, lookerConnector, powerBiConnector, tableauConnector } from '../packages/connectors/src/adapters/semantic.js';
import type { ArrowTable } from '../packages/connectors/src/adapters/files.js';
import { ConnectorError } from '../packages/connectors/src/core.js';

const identity = { id: 'semantic-test', source: 'Governed metrics', mode: 'fixture' as const, token: () => 'test-token' };
const code = (expected: string) => (error: unknown) => error instanceof ConnectorError && error.code === expected;
type Step = { body: unknown; status?: number; check?: (url: URL, init: RequestInit) => void };
function transport(steps: Step[]) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fetch: typeof globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input)); calls.push({ url, init }); const step = steps.shift(); assert.ok(step, 'Unexpected request'); step.check?.(url, init);
    return new Response(typeof step.body === 'string' ? step.body : JSON.stringify(step.body), { status: step.status ?? 200 });
  };
  return { fetch, calls };
}
function arrow(rows: unknown[][]): ArrowTable {
  return { numRows: rows.length, schema: { fields: [{ name: 'metric_time__month', type: { toString: () => 'Utf8' } }, { name: 'revenue', type: { toString: () => 'Int64' } }] }, getChildAt: column => ({ get: row => rows[row][column] }) };
}

test('Looker executes an unformatted inline Explore CSV preserving grain, duplicate labels and exact lexical values', async () => {
  const mock = transport([{ body: 'Month,Revenue,Revenue\r\n2026-01,9007199254740993,0.123456789123456789\r\n2026-02,2,3\r\n', check(url, init) {
    assert.equal(url.pathname, '/api/4.0/queries/run/csv'); assert.equal(url.searchParams.get('apply_formatting'), 'false'); assert.equal(url.searchParams.get('apply_vis'), 'false');
    assert.equal(new Headers(init.headers).get('authorization'), 'token test-token'); assert.equal(init.redirect, 'error');
    const body = JSON.parse(String(init.body)); assert.equal(body.limit, '2'); assert.deepEqual(body.fields, ['orders.month', 'orders.revenue', 'orders.rate']); assert.deepEqual(body.filters, { 'orders.status': 'complete' }); assert.equal(body.query_timezone, 'UTC');
  } }]);
  const result = await lookerConnector({ ...identity, baseUrl: 'https://company.looker.com', fetch: mock.fetch }).read({ model: 'commerce', view: 'orders', fields: ['orders.month', 'orders.revenue', 'orders.rate'], filters: { 'orders.status': 'complete' }, timezone: 'UTC' }, { limit: 1 });
  assert.deepEqual(result.rows, [['2026-01', '9007199254740993', '0.123456789123456789']]); assert.deepEqual(result.fields.map(field => field.name), ['Month', 'Revenue', 'Revenue']);
  assert.equal(result.provenance.provider, 'looker'); assert.equal(result.page.truncated, true); assert.equal(result.page.nextCursor, undefined); assert.equal(mock.calls.length, 1);
});

test('Power BI executes a bounded DAX table expression, includes nulls and preserves exact declared columns', async () => {
  const mock = transport([{ body: { results: [{ tables: [{ rows: [{ '[Month]': '2026-01', '[Revenue]': '9007199254740993.123', '[Missing]': null }] }] }] }, check(url, init) {
    assert.equal(url.pathname, '/v1.0/myorg/groups/group-1/datasets/dataset-1/executeQueries');
    const body = JSON.parse(String(init.body)); assert.equal(body.queries[0].query, 'EVALUATE TOPN(3, SUMMARIZECOLUMNS(...))'); assert.equal(body.serializerSettings.includeNulls, true);
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-token');
  } }]);
  const fields = [{ name: '[Revenue]', type: 'decimal' as const }, { name: '[Month]', type: 'string' as const }, { name: '[Missing]', type: 'unknown' as const }];
  const result = await powerBiConnector({ ...identity, datasetId: 'dataset-1', groupId: 'group-1', fetch: mock.fetch }).read({ tableExpression: 'SUMMARIZECOLUMNS(...)', fields }, { limit: 2 });
  assert.deepEqual(result.rows, [['9007199254740993.123', '2026-01', null]]); assert.deepEqual(result.fields, fields); assert.equal(result.page.truncated, false);
});

test('Power BI rejects successful-HTTP partial errors, multiple tables, schema loss and unsafe numbers', async () => {
  for (const [body, expected] of [
    [{ results: [{ error: { message: 'private SQL' }, tables: [{ rows: [{ '[n]': 1 }] }] }] }, 'QUERY_FAILED'],
    [{ results: [{ tables: [{ rows: [] }, { rows: [] }] }] }, 'QUERY_FAILED'],
    [{ results: [{ tables: [{ error: { message: 'row limit secret' }, rows: [] }] }] }, 'QUERY_FAILED'],
    [{ results: [{ tables: [{ rows: [{ '[other]': 1 }] }] }] }, 'INVALID_RESPONSE'],
    [{ results: [{ tables: [{ rows: [{ '[n]': 9007199254740992 }] }] }] }, 'PRECISION_LOSS'],
  ] as const) {
    const mock = transport([{ body }]);
    await assert.rejects(powerBiConnector({ ...identity, datasetId: 'dataset', fetch: mock.fetch }).read({ tableExpression: 'VALUES(T)', fields: [{ name: '[n]', type: 'integer' }] }), error => code(expected)(error) && !/private SQL|row limit secret/.test(String(error)));
    assert.equal(mock.calls.length, 1);
  }
});

test('Tableau exports configured summary CSV with encoded filters and Tableau-only auth', async () => {
  const mock = transport([{ body: 'Month,Revenue\n2026-01,123456789.123456789\n', check(url, init) {
    assert.equal(url.pathname, '/api/3.29/sites/site-1/views/view-1/data'); assert.equal(url.searchParams.get('vf_Region & market'), 'North, East'); assert.equal(url.searchParams.get('maxAge'), '2');
    const headers = new Headers(init.headers); assert.equal(headers.get('x-tableau-auth'), 'test-token'); assert.equal(headers.get('authorization'), null);
  } }]);
  const result = await tableauConnector({ ...identity, baseUrl: 'https://tableau.example.test', siteId: 'site-1', viewId: 'view-1', apiVersion: '3.29', maxAgeMinutes: 2, fetch: mock.fetch }).read({ filters: { 'Region & market': 'North, East' } });
  assert.deepEqual(result.rows, [['2026-01', '123456789.123456789']]); assert.equal(result.provenance.provider, 'tableau'); assert.match(result.warnings.join(' '), /summary-level.*first view/);
});

test('Cube preserves metric names and explicit time grain through documented Continue wait polling', async () => {
  let tokens = 0;
  const mock = transport([
    { body: { error: 'Continue wait' } },
    { body: { data: [{ 'Orders.createdAt.month': '2026-01-01', 'Orders.revenue': '9007199254740993.123' }, { 'Orders.createdAt.month': '2026-02-01', 'Orders.revenue': '2' }], annotation: { timeDimensions: { 'Orders.createdAt.month': { type: 'time' } }, measures: { 'Orders.revenue': { type: 'number' } }, dimensions: {} } }, check(url, init) {
      assert.equal(url.pathname, '/cubejs-api/v1/load'); assert.equal(new Headers(init.headers).get('authorization'), 'rotated-2');
      const body = JSON.parse(String(init.body)); assert.deepEqual(body.query.timeDimensions, [{ dimension: 'Orders.createdAt', granularity: 'month', dateRange: ['2026-01-01', '2026-12-31'] }]); assert.equal(body.query.limit, 2); assert.equal(body.query.offset, 0);
    } },
  ]);
  const result = await cubeConnector({ ...identity, baseUrl: 'https://cube.example.test', token: () => `rotated-${++tokens}`, fetch: mock.fetch }).read({ measures: ['Orders.revenue'], timeDimensions: [{ dimension: 'Orders.createdAt', granularity: 'month', dateRange: ['2026-01-01', '2026-12-31'] }] }, { limit: 1 });
  assert.deepEqual(result.rows, [['2026-01-01', '9007199254740993.123']]); assert.deepEqual(result.fields.map(field => field.name), ['Orders.createdAt.month', 'Orders.revenue']); assert.equal(result.page.truncated, true);
  assert.equal(mock.calls.length, 2); assert.equal(new Headers(mock.calls[0].init.headers).get('x-request-id'), new Headers(mock.calls[1].init.headers).get('x-request-id'));
});

test('Cube fails ordinary errors without retry and rejects unannotated or absent members', async () => {
  for (const [body, expected] of [
    [{ error: 'private SQL error' }, 'QUERY_FAILED'],
    [{ data: [{ secret: '1' }], annotation: { measures: { 'Orders.count': { type: 'number' } } } }, 'INVALID_RESPONSE'],
    [{ data: [{}], annotation: { measures: { 'Orders.count': { type: 'number' } } } }, 'INVALID_RESPONSE'],
  ] as const) {
    const mock = transport([{ body }]);
    await assert.rejects(cubeConnector({ ...identity, baseUrl: 'https://cube.example.test', fetch: mock.fetch }).read({ measures: ['Orders.count'] }), error => code(expected)(error) && !String(error).includes('private SQL'));
    assert.equal(mock.calls.length, 1);
  }
});

test('dbt executes semantic metrics with selected grain, polls once, and collects native Arrow pages only through preview cap', async () => {
  const mock = transport([
    { body: { data: { createQuery: { queryId: 'dbt-query-1' } } }, check(url, init) { assert.equal(url.pathname, '/api/graphql'); const body = JSON.parse(String(init.body)); assert.match(body.query, /mutation.*createQuery/); assert.equal(body.variables.environmentId, '123'); assert.equal(body.variables.limit, 3); assert.deepEqual(body.variables.groupBy, [{ name: 'metric_time', grain: 'MONTH' }]); } },
    { body: { data: { query: { status: 'RUNNING' } } } },
    { body: { data: { query: { status: 'SUCCESSFUL', totalPages: 2, arrowResult: btoa('page1') } } } },
    { body: { data: { query: { status: 'SUCCESSFUL', totalPages: 2, arrowResult: btoa('page2') } } }, check(_url, init) { assert.equal(JSON.parse(String(init.body)).variables.pageNum, 2); } },
  ]);
  const result = await dbtSemanticConnector({ ...identity, baseUrl: 'https://semantic-layer.cloud.getdbt.com', environmentId: '123', fetch: mock.fetch, tableFromIPC(bytes) { return new TextDecoder().decode(bytes) === 'page1' ? arrow([['2026-01', 9007199254740993n]]) : arrow([['2026-02', 2n], ['2026-03', 3n]]); } }).read({ metrics: [{ name: 'revenue' }], groupBy: [{ name: 'metric_time', grain: 'MONTH' }] }, { limit: 2 });
  assert.deepEqual(result.rows, [['2026-01', '9007199254740993'], ['2026-02', '2']]); assert.equal(result.provenance.provider, 'dbt'); assert.equal(result.provenance.queryId, 'dbt-query-1'); assert.equal(result.page.truncated, true);
  assert.equal(mock.calls.filter(call => String(call.init.body).includes('mutation')).length, 1); assert.equal(mock.calls.length, 4);
});

test('dbt rejects GraphQL failures, failed jobs, schema drift and malformed Arrow payloads without exposing provider text', async () => {
  for (const next of [
    { errors: [{ message: 'private warehouse sql' }] },
    { data: { query: { status: 'FAILED', error: 'secret token' } } },
    { data: { query: { status: 'SUCCESSFUL', totalPages: 1, arrowResult: 'https://foreign.test/secret' } } },
  ]) {
    const mock = transport([{ body: { data: { createQuery: { queryId: 'q' } } } }, { body: next }]);
    await assert.rejects(dbtSemanticConnector({ ...identity, baseUrl: 'https://semantic-layer.cloud.getdbt.com', environmentId: '1', fetch: mock.fetch, tableFromIPC: () => arrow([]) }).read({ metrics: [{ name: 'revenue' }] }), error => error instanceof ConnectorError && !/private|secret/.test(error.message));
    assert.equal(mock.calls.length, 2);
  }
  let decoded = 0;
  const mock = transport([{ body: { data: { createQuery: { queryId: 'q' } } } }, ...[1, 2].map(() => ({ body: { data: { query: { status: 'SUCCESSFUL', totalPages: 2, arrowResult: btoa('table') } } } }))]);
  await assert.rejects(dbtSemanticConnector({ ...identity, baseUrl: 'https://semantic-layer.cloud.getdbt.com', environmentId: '1', fetch: mock.fetch, tableFromIPC() { const result = arrow([['2026-01', 1n]]); if (++decoded === 2) result.schema.fields[0].name = 'changed-grain'; return result; } }).read({ metrics: [{ name: 'revenue' }] }), code('SCHEMA_CHANGED'));
});

test('semantic reads reject unsafe config, unsupported query options and cursors before network access', async () => {
  const mock = transport([]);
  assert.throws(() => lookerConnector({ ...identity, baseUrl: 'https://user:secret@looker.example.test', fetch: mock.fetch }), code('INVALID_CONFIG'));
  assert.throws(() => cubeConnector({ ...identity, baseUrl: 'https://cube.example.test', apiPath: '/../private', fetch: mock.fetch }), code('INVALID_CONFIG'));
  assert.throws(() => tableauConnector({ ...identity, baseUrl: 'https://tableau.example.test', siteId: '../other', viewId: 'view', apiVersion: '3.29', fetch: mock.fetch }), code('INVALID_CONFIG'));
  const connector = lookerConnector({ ...identity, baseUrl: 'https://looker.example.test', fetch: mock.fetch });
  await assert.rejects(connector.read({ model: 'm', view: 'v', fields: ['m.count'], pivots: ['m.region'] } as never), code('INVALID_QUERY'));
  await assert.rejects(connector.read({ model: 'm', view: 'v', fields: ['m.count'] }, { cursor: 'unsupported' }), code('UNSUPPORTED_CURSOR'));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(connector.read({ model: 'm', view: 'v', fields: ['m.count'] }, { signal: controller.signal }), code('ABORTED'));
  assert.equal(mock.calls.length, 0);
});

test('semantic deadlines stop pending work and HTTP errors do not cause blind retries', async () => {
  const pending = transport([{ body: { error: 'Continue wait' } }]);
  await assert.rejects(cubeConnector({ ...identity, baseUrl: 'https://cube.example.test', fetch: pending.fetch }).read({ measures: ['Orders.count'] }, { timeoutMs: 5 }), code('TIMEOUT'));
  assert.equal(pending.calls.length, 1);
  const denied = transport([{ body: 'private token', status: 403 }]);
  await assert.rejects(lookerConnector({ ...identity, baseUrl: 'https://looker.example.test', fetch: denied.fetch }).read({ model: 'm', view: 'v', fields: ['m.count'] }), error => code('AUTHENTICATION')(error) && !String(error).includes('private'));
  assert.equal(denied.calls.length, 1);
});

test('analytical CSV enforces byte limits, expected Explore columns, and stalled-body cancellation', async () => {
  const missing = transport([{ body: 'One column\nvalue\n' }]);
  await assert.rejects(lookerConnector({ ...identity, baseUrl: 'https://looker.example.test', fetch: missing.fetch }).read({ model: 'm', view: 'v', fields: ['m.count', 'm.month'] }), code('INVALID_RESPONSE'));
  let cancelled = 0;
  const fetch: typeof globalThis.fetch = async () => new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1)); },
    cancel() { cancelled++; },
  }));
  const options = { ...identity, baseUrl: 'https://tableau.example.test', siteId: 'site', viewId: 'view', apiVersion: '3.29' };
  await assert.rejects(tableauConnector({ ...options, fetch }).read({}), code('RESPONSE_TOO_LARGE')); assert.equal(cancelled, 1);
  const stalled: typeof globalThis.fetch = async () => new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled++; } }));
  await assert.rejects(tableauConnector({ ...options, fetch: stalled }).read({}, { timeoutMs: 5 }), code('TIMEOUT')); assert.equal(cancelled, 2);
});
