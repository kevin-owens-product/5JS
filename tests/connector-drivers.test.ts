import test from 'node:test';
import assert from 'node:assert/strict';
import { postgresConnector } from '../packages/connectors/src/adapters/postgres.js';
import { mysqlConnector } from '../packages/connectors/src/adapters/mysql.js';
import { sqliteConnector } from '../packages/connectors/src/adapters/sqlite.js';
import { duckdbConnector } from '../packages/connectors/src/adapters/duckdb.js';
import { mongodbConnector } from '../packages/connectors/src/adapters/mongodb.js';

const identity = { id: 'test-source', source: 'Contract test database', mode: 'fixture' as const };

test('driver constructors validate identity before querying and retain their configured identity and client', async () => {
  const factories = [postgresConnector, mysqlConnector, sqliteConnector, duckdbConnector, mongodbConnector];
  for (const factory of factories) {
    const client = {
      async query() { return { fields: [], rows: [] }; },
      async execute() { return [[], []]; },
      prepare() { return { columns: () => [], setReturnArrays() {}, setReadBigInts() {}, *iterate() {} }; },
      async runAndReadUntil() { return { done: true, columnNames: () => [], columnTypes: () => [], getRowsJson: () => [] }; },
    };
    const options = { ...identity, client, collection: { find() { return { toArray: async () => [], close: async () => {} }; } }, serialize: () => null };
    assert.throws(() => factory({ ...options, id: 'invalid/id' }), /connector ID/);
    assert.throws(() => factory({ ...options, source: 'postgresql://user:password@host/db' }), /source label/);
    const connector = factory(options);
    options.id = 'mutated'; options.source = 'Mutated database';
    (options as { mode: string }).mode = 'live';
    options.client = null as any; options.collection = null as any; options.serialize = null as any;
    const page = await connector.read({ text: 'select 1', filter: {} });
    assert.equal(connector.id, identity.id); assert.equal(page.provenance.connectorId, identity.id);
    assert.equal(page.provenance.source, identity.source); assert.equal(page.provenance.mode, identity.mode);
  }
});

test('PostgreSQL binds values and preserves duplicate field names, decimal strings, and large integers', async () => {
  const calls: unknown[] = [];
  const client = { async query(config: unknown) { calls.push(config); return {
    fields: [{ name: 'id', dataTypeID: 20 }, { name: 'id', dataTypeID: 1700 }, { name: 'at', dataTypeID: 1114 }],
    rows: [['9223372036854775807', '123.456789123456789', '2026-06-01 12:00:00.123456']],
  }; } };
  const connector = postgresConnector({ ...identity, client });
  const page = await connector.read({ text: 'select $1 as id', values: ["test'--"] });
  assert.deepEqual(calls, [{ text: 'select $1 as id', values: ["test'--"], rowMode: 'array' }]);
  assert.deepEqual(page.fields.map(field => [field.name, field.type]), [['id', 'integer'], ['id', 'decimal'], ['at', 'datetime']]);
  assert.deepEqual(page.rows, [['9223372036854775807', '123.456789123456789', '2026-06-01 12:00:00.123456']]);
  assert.equal(page.provenance.provider, 'postgresql'); assert.equal(page.provenance.mode, 'fixture');
  assert.equal(page.page.truncated, false);
  assert.equal(connector.capabilities.cancellation, 'cooperative');
});

test('SQL result limits are explicit truncation without an invented continuation token', async () => {
  const connector = postgresConnector({ ...identity, client: { async query() { return { fields: [{ name: 'n', dataTypeID: 23 }], rows: [[1], [2], [3]] }; } } });
  const page = await connector.read({ text: 'select n from source' }, { limit: 2 });
  assert.deepEqual(page.rows, [[1], [2]]);
  assert.equal(page.page.hasMore, true); assert.equal(page.page.truncated, true); assert.equal(page.page.nextCursor, undefined);
  assert.match(page.warnings.join(' '), /not database work/);
  await assert.rejects(connector.read({ text: 'select n' }, { cursor: 'invented-token' }), /does not support continuation/);
});

test('driver failures and malformed result sets do not expose secrets or accept object-row collisions', async () => {
  const secret = 'postgresql://private-user:private-password@example.test/secrets';
  const connector = postgresConnector({ ...identity, client: { async query() { throw new Error(secret); } } });
  await assert.rejects(connector.read({ text: 'select private_data' }), error => {
    assert.doesNotMatch(String(error), /private-user|private-password|private_data|example.test/); return true;
  });
  const invalid = postgresConnector({ ...identity, client: { async query() { return { fields: [{ name: 'n' }], rows: [{ n: 1 }] }; } } });
  await assert.rejects(invalid.read({ text: 'select n' }), /positional array rows/);
  const multi = postgresConnector({ ...identity, client: { async query() { return [{ fields: [], rows: [] }, { fields: [], rows: [] }]; } } });
  await assert.rejects(multi.read({ text: 'select 1; select 2' }), /one tabular result/);
});

test('MySQL and MariaDB use mysql2 prepared execution with array rows and native metadata', async () => {
  let captured: unknown;
  const connector = mysqlConnector({ ...identity, provider: 'mariadb', client: { async execute(config) {
    captured = config; return [[['9007199254740993', '0.100000000000001', 'TEXT column']], [{ name: 'value', columnType: 8 }, { name: 'value', columnType: 246 }, { name: 'note', columnType: 252, characterSet: 45 }]];
  } } });
  const page = await connector.read({ text: 'select ? as value', values: ['untrusted value'] });
  assert.deepEqual(captured, { sql: 'select ? as value', values: ['untrusted value'], rowsAsArray: true });
  assert.deepEqual(page.fields.map(field => field.type), ['integer', 'decimal', 'string']);
  assert.equal(page.provenance.provider, 'mariadb'); assert.equal(page.rows[0][0], '9007199254740993');
  await assert.rejects(mysqlConnector({ ...identity, client: { async execute() { return [{ affectedRows: 1 }, undefined]; } } }).read({ text: 'select 1' }), /could not complete/);
});

test('SQLite iterator reads one lookahead row, releases execution, and never closes its caller database', async () => {
  let closed = 0, released = 0, read = 0, arrays = false, bigints = false;
  const client = { close() { closed++; }, prepare() { return {
    columns: () => [{ name: 'n', type: 'INTEGER' }], setReturnArrays(value: boolean) { arrays = value; }, setReadBigInts(value: boolean) { bigints = value; },
    *iterate() { try { for (let value = 1; value < 10; value++) { read++; yield [BigInt(value)]; } } finally { released++; } },
  }; } };
  const page = await sqliteConnector({ ...identity, client }).read({ text: 'select n' }, { limit: 2 });
  assert.deepEqual(page.rows, [['1'], ['2']]); assert.equal(read, 3); assert.equal(released, 1); assert.equal(closed, 0);
  assert.ok(arrays && bigints); assert.equal(page.fields[0].type, 'integer'); assert.equal(page.page.truncated, true);
  assert.match(page.warnings[0], /cannot interrupt/);
  await assert.rejects(sqliteConnector({ ...identity, client: { prepare: () => ({ all: () => [] }) } }).read({ text: 'select 1' }), /Node 22.16/);
});

test('SQLite live in-memory reads preserve duplicate names, exact INT64 values and bound inputs', async context => {
  let DatabaseSync: typeof import('node:sqlite').DatabaseSync;
  try { ({ DatabaseSync } = await import('node:sqlite')); }
  catch { context.skip('This Node runtime does not enable node:sqlite.'); return; }
  const db = new DatabaseSync(':memory:');
  try {
    const probe = db.prepare('select 1');
    if (typeof probe.setReturnArrays !== 'function' || typeof probe.columns !== 'function') { context.skip('Positional node:sqlite requires Node 22.16+; mock contract tests still run.'); return; }
    db.exec('create table facts (id INTEGER, decimal_text TEXT); insert into facts values (9223372036854775807, \'0.123456789123456789\');');
    const connector = sqliteConnector({ ...identity, client: db });
    const page = await connector.read({ text: 'select id as same, decimal_text as same, ? as bound from facts', values: ["x'); drop table facts; --"] });
    assert.deepEqual(page.fields.map(field => field.name), ['same', 'same', 'bound']);
    assert.deepEqual(page.rows, [['9223372036854775807', '0.123456789123456789', "x'); drop table facts; --"]]);
    assert.equal(db.prepare('select count(*) n from facts').get()?.n, 1);
    const empty = await connector.read({ text: 'select id from facts where 1 = 0' });
    assert.equal(empty.rows.length, 0); assert.equal(empty.fields[0].name, 'id');
  } finally { db.close(); }
});

test('DuckDB Neo uses bounded reader retrieval and JSON conversion without flattening exact values', async () => {
  const calls: unknown[] = [];
  const connector = duckdbConnector({ ...identity, client: { async runAndReadUntil(...args) {
    calls.push(args); return { done: false, columnNames: () => ['amount', 'at', 'nested'], columnTypes: () => ['DECIMAL(38,18)', 'TIMESTAMP_NS', 'STRUCT(id BIGINT)'], getRowsJson: () => [
      ['123.456789123456789123', '2026-06-01 00:00:00.123456789', { id: '9223372036854775807' }], ['2', '2026-06-02', {}], ['3', '2026-06-03', {}],
    ] };
  } } });
  const page = await connector.read({ text: 'select * from facts where id > $1', values: [10] }, { limit: 1 });
  assert.deepEqual(calls, [['select * from facts where id > $1', 2, [10]]]);
  assert.deepEqual(page.fields.map(field => field.type), ['decimal', 'datetime', 'json']);
  assert.equal(page.rows[0][0], '123.456789123456789123'); assert.equal(page.page.truncated, true); assert.equal(page.rows.length, 1);
});

test('DuckDB releases its result after success, conversion failure, and an aborted pending read', async () => {
  let closed = 0, connectionClosed = 0;
  const reader = () => ({ done: false, columnNames: () => ['value'], columnTypes: () => ['BIGINT'], getRowsJson: () => [['9223372036854775807']], closeSync() { closed++; } });
  const client = { closeSync() { connectionClosed++; }, async runAndReadUntil() { return reader(); } };
  await duckdbConnector({ ...identity, client }).read({ text: 'select value' }, { limit: 1 });
  assert.equal(closed, 1); assert.equal(connectionClosed, 0);
  await assert.rejects(duckdbConnector({ ...identity, client: { async runAndReadUntil() { return { ...reader(), getRowsJson() { throw Error('secret conversion details'); } }; } } }).read({ text: 'select value' }), error => !String(error).includes('secret'));
  assert.equal(closed, 2);
  let resolveReader!: (value: ReturnType<typeof reader>) => void;
  const controller = new AbortController();
  const pending = duckdbConnector({ ...identity, client: { runAndReadUntil: () => new Promise(resolve => { resolveReader = resolve; }) } }).read({ text: 'select value' }, { signal: controller.signal });
  controller.abort(); await assert.rejects(pending, /cancelled/);
  resolveReader(reader()); await new Promise(resolve => setImmediate(resolve));
  assert.equal(closed, 3); assert.equal(connectionClosed, 0);
});

test('MongoDB caps find results, forwards abort, retains BSON through canonical EJSON and closes its cursor', async () => {
  let capturedFilter: unknown, capturedOptions: Record<string, unknown> | undefined, closes = 0;
  const serializationOptions: unknown[] = [];
  const connector = mongodbConnector({ ...identity, maxTimeMS: 2000, serialize(document, options) { serializationOptions.push(options); return document; }, collection: { find(filter, options) {
    capturedFilter = filter; capturedOptions = options; return { async toArray() { return [{ _id: { $oid: 'a'.repeat(24) }, amount: { $numberDecimal: '123.456789123456789' } }, { _id: { $oid: 'b'.repeat(24) } }]; }, async close() { closes++; } };
  } } });
  const page = await connector.read({ filter: { status: 'active' }, projection: { amount: 1 }, sort: { _id: 1 } }, { limit: 1 });
  assert.deepEqual(capturedFilter, { status: 'active' }); assert.equal(capturedOptions?.limit, 2); assert.equal(capturedOptions?.maxTimeMS, 2000);
  assert.equal(capturedOptions?.promoteLongs, false); assert.ok(capturedOptions?.signal instanceof AbortSignal);
  assert.deepEqual(serializationOptions, [{ relaxed: false }]); assert.equal(closes, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(page.rows)), [[{ _id: { $oid: 'a'.repeat(24) }, amount: { $numberDecimal: '123.456789123456789' } }]]);
  assert.equal(page.fields[0].type, 'json'); assert.equal(page.page.truncated, true);
});

test('MongoDB closes a failing cursor and errors do not disclose provider messages', async () => {
  let closes = 0;
  const connector = mongodbConnector({ ...identity, serialize: value => value, collection: { find() { return { async toArray() { throw new Error('mongodb://private:secret@internal/'); }, async close() { closes++; } }; } } });
  await assert.rejects(connector.read({}), error => { assert.doesNotMatch(String(error), /private|secret|internal/); return true; });
  assert.equal(closes, 1);
  await assert.rejects(connector.read({}, { cursor: 'not-supported' }), /does not expose continuation/);
});

test('pre-aborted driver reads never execute a query', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  const connector = postgresConnector({ ...identity, client: { async query() { calls++; return { fields: [], rows: [] }; } } });
  await assert.rejects(connector.read({ text: 'select 1' }, { signal: controller.signal }));
  assert.equal(calls, 0);
});
