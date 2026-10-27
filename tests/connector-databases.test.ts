import assert from 'node:assert/strict';
import test from 'node:test';
import { sqlServerConnector, oracleConnector, clickHouseConnector, elasticsearchConnector, opensearchConnector, redisConnector, neo4jConnector, firestoreConnector, supabaseConnector, type SupabaseBuilder } from '../packages/connectors/src/adapters/databases.js';

const identity = { id: 'database-fixture', source: 'Database contract fixture', mode: 'fixture' as const };
const secret = 'password=private-database-secret';
const safeError = (error: unknown) => { assert.doesNotMatch(String(error), /private-database-secret/); return true; };
const tick = () => new Promise(resolve => setImmediate(resolve));

test('SQL Server uses request-local array rows and typed native bindings, retaining duplicate columns', async () => {
  const inputs: unknown[] = []; let text = '', arrayMode = false;
  const type = { declaration: 'varchar' };
  const request = { set arrayRowMode(value: boolean) { arrayMode = value; }, get arrayRowMode() { return arrayMode; }, input(...args: unknown[]) { inputs.push(args); }, cancel() {}, async query(value: string) { text = value; return { recordsets: [[['9007199254740993', '0.000000000000000001'], ['2', '3']]], recordset: [['9007199254740993', '0.000000000000000001'], ['2', '3']], columns: [[{ name: 'same', type: { declaration: 'bigint' }, nullable: false }, { name: 'same', type: { declaration: 'decimal' }, nullable: true }]] }; } };
  const config = { ...identity, request: () => request }, connector = sqlServerConnector(config); config.id = 'changed';
  const page = await connector.read({ text: 'select @id', parameters: { id: { type, value: "x'; drop table x--" } } }, { limit: 1 });
  assert.equal(arrayMode, true); assert.equal(text, 'select @id'); assert.deepEqual(inputs, [['id', type, "x'; drop table x--"]]);
  assert.deepEqual(page.rows, [['9007199254740993', '0.000000000000000001']]); assert.deepEqual(page.fields.map(field => field.name), ['same', 'same']);
  assert.deepEqual(page.fields.map(field => field.type), ['integer', 'decimal']); assert.equal(page.page.truncated, true); assert.equal(page.provenance.connectorId, identity.id);
});

test('SQL Server cancels only its owned request and rejects multi-result responses and provider details', async () => {
  let cancelled = 0, finish!: (result: unknown) => void;
  const connector = sqlServerConnector({ ...identity, request: () => ({ arrayRowMode: false, input() {}, cancel() { cancelled++; }, query: () => new Promise(resolve => { finish = resolve; }) }) });
  const abort = new AbortController(), pending = connector.read({ text: 'select 1' }, { signal: abort.signal }); abort.abort();
  await assert.rejects(pending, /cancelled/); assert.equal(cancelled, 1); finish({}); await tick();
  const read = (query: () => Promise<unknown>) => sqlServerConnector({ ...identity, request: () => ({ arrayRowMode: false, input() {}, cancel() {}, query }) }).read({ text: 'select 1' });
  await assert.rejects(read(async () => ({ recordsets: [[], []], columns: [[], []] })), /invalid result/);
  await assert.rejects(read(async () => { throw Error(secret); }), safeError);
});

test('Oracle fetches only limit plus lookahead and closes the owned ResultSet on every outcome', async () => {
  let closed = 0, requested = 0, executeOptions: any, binds: unknown;
  const fetchTypeHandler = () => ({ type: 'STRING' });
  const connector = oracleConnector({ ...identity, outFormatArray: 4001, fetchTypeHandler, client: { async execute(_text, inputBinds, options) { binds = inputBinds; executeOptions = options; return { metaData: [{ name: 'same', dbTypeName: 'NUMBER', nullable: false }, { name: 'same', dbTypeName: 'TIMESTAMP' }], resultSet: { async getRows(count: number) { requested = count; return [['9223372036854775807', '2026-01-01 01:02:03.123456789'], ['2', null]]; }, async close() { closed++; } } }; } } });
  const page = await connector.read({ text: 'select :tenant from source', binds: { tenant: "x'--" } }, { limit: 1 });
  assert.equal(requested, 2); assert.equal(closed, 1); assert.deepEqual(binds, { tenant: "x'--" });
  assert.equal(executeOptions.resultSet, true); assert.equal(executeOptions.prefetchRows, 0); assert.equal(executeOptions.fetchTypeHandler, fetchTypeHandler);
  assert.deepEqual(page.rows, [['9223372036854775807', '2026-01-01 01:02:03.123456789']]); assert.equal(page.page.truncated, true);
  await assert.rejects(oracleConnector({ ...identity, outFormatArray: 4001, client: { async execute() { return { resultSet: { async getRows() { throw Error(secret); }, async close() { closed++; } } }; } } }).read({ text: 'select 1' }), safeError);
  assert.equal(closed, 2);
  assert.throws(() => oracleConnector({ ...identity, client: { execute: async () => ({}) }, outFormatArray: 4002 }), /OUT_FORMAT_ARRAY/);
});

test('Oracle releases a ResultSet that arrives after cancellation without breaking the caller connection', async () => {
  let finish!: (result: unknown) => void, closed = 0, fetched = 0;
  const abort = new AbortController();
  const pending = oracleConnector({ ...identity, outFormatArray: 4001, client: { execute: () => new Promise(resolve => { finish = resolve; }) } }).read({ text: 'select 1' }, { signal: abort.signal });
  abort.abort(); await assert.rejects(pending, /cancelled/);
  finish({ resultSet: { async getRows() { fetched++; return []; }, async close() { closed++; } } }); await tick();
  assert.equal(closed, 1); assert.equal(fetched, 0);
});

test('ClickHouse uses JSONCompact, typed parameters, exact numeric settings, abort and result cleanup', async () => {
  let captured: any, closed = 0;
  const connector = clickHouseConnector({ ...identity, client: { async query(options) { captured = options; return { async json() { return { meta: [{ name: 'id', type: 'UInt64' }, { name: 'amount', type: 'Decimal(38,18)' }], data: [['9223372036854775807', '0.123456789123456789'], ['2', '1']] }; }, close() { closed++; } }; } } });
  const page = await connector.read({ text: 'select {tenant:String}', parameters: { tenant: 'tenant-one' } }, { limit: 1 });
  assert.equal(captured.format, 'JSONCompact'); assert.deepEqual(captured.query_params, { tenant: 'tenant-one' }); assert.ok(captured.abort_signal instanceof AbortSignal);
  assert.deepEqual(captured.clickhouse_settings, { max_result_rows: 2, result_overflow_mode: 'break', output_format_json_quote_64bit_integers: 1, output_format_json_quote_decimals: 1 });
  assert.equal(page.rows[0][1], '0.123456789123456789'); assert.equal(page.fields[0].type, 'integer'); assert.equal(page.page.truncated, true); assert.equal(closed, 1);
  await assert.rejects(clickHouseConnector({ ...identity, client: { async query() { return { async json() { throw Error(secret); }, close() { closed++; } }; } } }).read({ text: 'select 1' }), safeError); assert.equal(closed, 2);
});

const searchResponse = () => ({ timed_out: false, _shards: { failed: 0 }, hits: { total: { value: 20, relation: 'eq' }, hits: [{ _id: 'customer-1', _index: 'customers', _source: { exact: '9223372036854775807' }, _score: 1 }] } });
test('Elasticsearch and OpenSearch use their actual distinct request and response shapes', async () => {
  for (const [factory, provider] of [[elasticsearchConnector, 'elasticsearch'], [opensearchConnector, 'opensearch']] as const) {
    let request: any, transport: any;
    const connector = factory({ ...identity, index: 'customers', client: { async search(input, options) { request = input; transport = options; return provider === 'elasticsearch' ? searchResponse() : { body: searchResponse(), statusCode: 200 }; } } });
    const page = await connector.read({ query: { term: { tenant: 'one' } }, source: ['exact'] }, { limit: 1 });
    const body = provider === 'opensearch' ? request.body : request;
    assert.equal(request.index, 'customers'); assert.equal(body.size, 2); assert.equal(body.track_total_hits, true); assert.equal(request.allow_partial_search_results, false);
    assert.deepEqual(body.query, { term: { tenant: 'one' } }); assert.equal(page.provenance.provider, provider); assert.equal(page.page.truncated, true);
    if (provider === 'elasticsearch') assert.ok(transport.signal instanceof AbortSignal); else assert.equal(transport, undefined);
    assert.equal((page.rows[0][0] as any)._source.exact, '9223372036854775807');
  }
});

test('Search adapters reject partial shards, timeouts, malformed hits and unsafe source numbers', async () => {
  for (const modify of [
    (data: any) => { data.timed_out = true; },
    (data: any) => { data._shards.failed = 1; },
    (data: any) => { data.hits.hits[0]._id = null; },
    (data: any) => { data.hits.hits[0]._source.exact = 9007199254740992; },
  ]) {
    const data = searchResponse(); modify(data);
    await assert.rejects(elasticsearchConnector({ ...identity, index: 'customers', client: { search: async () => data } }).read({}));
  }
});

test('Search adapters reject skipped or incomplete remote clusters even without failed shards', async () => {
  for (const [factory, wrapped] of [[elasticsearchConnector, false], [opensearchConnector, true]] as const) {
    for (const clusters of [
      { total: 2, successful: 1, skipped: 1 },
      { total: 2, successful: 1, skipped: 0, partial: 1 },
      { total: 2, successful: 1, skipped: 0, running: 1 },
      { total: 2, successful: 2, skipped: 0, details: { remote: { status: 'partial', timed_out: true } } },
    ]) {
      const data = { ...searchResponse(), _clusters: clusters };
      await assert.rejects(factory({ ...identity, index: 'local,remote:customers', client: { search: async () => wrapped ? { body: data } : data } }).read({}), /remote cluster/);
    }
    const data = { ...searchResponse(), _clusters: { total: 2, successful: 2, skipped: 0, details: { local: { status: 'successful' }, remote: { status: 'successful', timed_out: false } } } };
    const page = await factory({ ...identity, index: 'local,remote:customers', client: { search: async () => wrapped ? { body: data } : data } }).read({});
    assert.equal(page.rows.length, 1);
  }
});

test('Search completeness compares exact totals with returned records, not only the requested limit', async () => {
  const data = searchResponse(); data.hits.total.value = 2;
  const connector = elasticsearchConnector({ ...identity, index: 'customers', client: { search: async () => data } });
  const incomplete = await connector.read({}, { limit: 100 });
  assert.equal(incomplete.rows.length, 1); assert.equal(incomplete.page.truncated, true); assert.equal(incomplete.page.hasMore, true); assert.equal(incomplete.page.nextCursor, undefined);
  data.hits.total.value = 1;
  assert.equal((await connector.read({}, { limit: 100 })).page.truncated, false);
  data.hits.total.value = 0;
  await assert.rejects(connector.read({}), /invalid result/);
});

test('Redis reads only explicit bounded MGET keys, preserving missing values, duplicate keys, and raw JSON text', async () => {
  let calls = 0, captured: string[] = [];
  const connector = redisConnector({ ...identity, client: { async mGet(keys) { calls++; captured = keys; return ['{"id":9223372036854775807}', null]; } } });
  const page = await connector.read({ keys: ['same', 'same', 'unread'] }, { limit: 2 });
  assert.deepEqual(captured, ['same', 'same']); assert.deepEqual(page.rows, [['same', '{"id":9223372036854775807}'], ['same', null]]); assert.equal(page.page.truncated, true);
  assert.equal((await connector.read({ keys: [] })).rows.length, 0); assert.equal(calls, 1);
  await assert.rejects(connector.read({ keys: ['x'] }, { cursor: 'unsupported' }), /does not expose/); assert.equal(calls, 1);
  await assert.rejects(redisConnector({ ...identity, client: { mGet: async () => [] } }).read({ keys: ['x'] }), /invalid result/);
});

test('Neo4j streams positional records, preserves official integers with serialization, and closes only its session', async () => {
  class Integer { toString() { return '9223372036854775807'; } }
  let closed = 0, iterated = 0, released = 0, sessionOptions: any, queryOptions: any, parameters: any;
  const connector = neo4jConnector({ ...identity, database: 'analytics', queryTimeoutMs: 5000, serialize: value => value instanceof Integer ? value.toString() : value, driver: { session(options) { sessionOptions = options; return {
    run(_text, values, config) { parameters = values; queryOptions = config; return { keys: async () => ['same', 'same'], async *[Symbol.asyncIterator]() { try { for (let index = 0; index < 4; index++) { iterated++; yield { keys: ['same', 'same'], get(column: number) { return column === 0 ? new Integer() : 'retained'; } }; } } finally { released++; } } }; },
    async close() { closed++; },
  }; } } });
  const page = await connector.read({ text: 'MATCH (c) WHERE c.tenant = $tenant RETURN c.id, c.status', parameters: { tenant: "x'--" } }, { limit: 1 });
  assert.deepEqual(page.rows, [['9223372036854775807', 'retained']]); assert.equal(page.page.truncated, true);
  assert.equal(iterated, 2); assert.equal(released, 1); assert.equal(closed, 1); assert.equal(sessionOptions.defaultAccessMode, 'READ'); assert.equal(queryOptions.timeout, 5000); assert.deepEqual(parameters, { tenant: "x'--" });
});

test('Neo4j retains an empty result schema and closes failed sessions without leaking errors', async () => {
  let closed = 0;
  const create = (fail: boolean) => neo4jConnector({ ...identity, database: 'analytics', serialize: value => value, driver: { session() { return { run() { return { keys: async () => ['id'], async *[Symbol.asyncIterator]() { if (fail) throw Error(secret); } }; }, async close() { closed++; } }; } } });
  assert.deepEqual((await create(false).read({ text: 'MATCH (n) WHERE false RETURN n.id AS id' })).fields.map(field => field.name), ['id']);
  await assert.rejects(create(true).read({ text: 'MATCH (n) RETURN n' }), safeError); assert.equal(closed, 2);
});

test('Firestore bounds a configured official query and serializes exact integers, timestamps, and reference paths', async () => {
  let requested = 0;
  const connector = firestoreConnector({ ...identity, query: { limit(count) { requested = count; return { async get() { return { docs: [{ id: 'one', ref: { path: 'tenants/t/customers/one' }, data: () => ({ sessions: 9007199254740993n, at: { seconds: 12, nanoseconds: 123456789 } }) }, { id: 'two', ref: { path: 'tenants/t/customers/two' }, data: () => ({}) }] }; } }; } }, serialize: value => value });
  const page = await connector.read(undefined, { limit: 1 });
  assert.equal(requested, 2); assert.equal(page.rows[0][1], 'tenants/t/customers/one'); assert.equal((page.rows[0][2] as any).sessions, '9007199254740993'); assert.equal((page.rows[0][2] as any).at.nanoseconds, 123456789); assert.equal(page.page.truncated, true);
  await assert.rejects(connector.read({} as any), /configuration belongs on the server/);
});

function supabaseFixture(response: unknown) {
  const calls: unknown[] = [];
  const builder = { eq(...args: unknown[]) { calls.push(['eq', ...args]); return this; }, is(...args: unknown[]) { calls.push(['is', ...args]); return this; }, order(...args: unknown[]) { calls.push(['order', ...args]); return this; }, limit(count: number) { calls.push(['limit', count]); return this; }, abortSignal(signal: AbortSignal) { calls.push(['signal', signal]); return this; }, then(resolve: any, reject: any) { return Promise.resolve(response).then(resolve, reject); } } as SupabaseBuilder;
  return { calls, client: { from(table: string) { calls.push(['from', table]); return { select(...args: unknown[]) { calls.push(['select', ...args]); return builder; } }; } } };
}

test('Supabase uses RLS-aware table reads, native null/equality filters and exact counts to detect server row caps', async () => {
  const { client, calls } = supabaseFixture({ data: [{ id: '9007199254740993', revenue: '12.00000000000001' }], count: 100, error: null });
  const page = await supabaseConnector({ ...identity, client, table: 'approved_customers', columns: 'id,revenue' }).read({ equals: { tenant: 'one', deleted: null }, order: { column: 'id' } }, { limit: 5 });
  assert.deepEqual(calls.slice(0, 5), [['from', 'approved_customers'], ['select', 'id,revenue', { count: 'exact' }], ['eq', 'tenant', 'one'], ['is', 'deleted', null], ['order', 'id', { ascending: true }]]);
  assert.deepEqual(calls[5], ['limit', 6]); assert.ok((calls[6] as any)[1] instanceof AbortSignal);
  assert.equal(page.page.truncated, true); assert.equal((page.rows[0][0] as any).revenue, '12.00000000000001');
});

test('Supabase rejects unsafe inputs, absent counts and secret provider errors', async () => {
  for (const response of [{ data: [], count: null, error: null }, { data: null, count: null, error: { message: secret } }]) {
    await assert.rejects(supabaseConnector({ ...identity, table: 'customers', client: supabaseFixture(response).client }).read({}), safeError);
  }
  await assert.rejects(supabaseConnector({ ...identity, table: 'customers', client: supabaseFixture({ data: [], count: 0 }).client }).read({ equals: { id: 9007199254740992 } }), /finite primitive/);
});

test('new database adapters honor pre-abort before calling configured clients', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  const connector = redisConnector({ ...identity, client: { async mGet() { calls++; throw Error(secret); } } });
  await assert.rejects(connector.read({ keys: ['customer'] }, { signal: controller.signal }), /cancelled/); assert.equal(calls, 0);
  assert.throws(() => redisConnector({ ...identity, source: 'redis://user:password@host', client: { mGet: async () => [] } }), /source label/);
});
