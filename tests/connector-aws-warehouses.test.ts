import assert from 'node:assert/strict';
import test from 'node:test';
import { collectPages, ConnectorError } from '../packages/connectors/src/core.js';
import { dynamoDBConnector, redshiftConnector, athenaConnector, trinoConnector } from '../packages/connectors/src/adapters/aws-warehouses.js';

const identity = { id: 'aws-fixture', source: 'Warehouse contract fixture', mode: 'fixture' as const };
const command = (operation: string) => (input: any) => ({ operation, input });
const redshiftCommands = { execute: command('execute'), describe: command('describe'), results: command('results') };
const athenaCommands = { start: command('start'), execution: command('execution'), results: command('results') };
const safeError = (error: unknown) => { assert.doesNotMatch(String(error), /private-token|password|raw-sql/); return true; };
const sql = { text: 'select * from approved_customers where tenant = :tenant', parameters: [{ name: 'tenant', value: "one'--" }] };

test('DynamoDB uses low-level AttributeValues and follows empty filtered pages through LastEvaluatedKey', async () => {
  const calls: any[] = [], signals: AbortSignal[] = [];
  const config = { ...identity, tableName: 'approved-customers', client: { async send(request: any, options: any) { calls.push(request); signals.push(options.abortSignal); return request.input.ExclusiveStartKey ? { Items: [{ id: { N: '9223372036854775807' }, amount: { N: '0.000000000000000001' }, blob: { B: new Uint8Array([0, 255]) } }] } : { Items: [], LastEvaluatedKey: { id: { N: '1' } } }; } }, queryCommand: command('query') };
  const connector = dynamoDBConnector(config); config.tableName = 'mutated-table';
  const query = { keyConditionExpression: '#tenant = :tenant', expressionAttributeNames: { '#tenant': 'tenant' }, expressionAttributeValues: { ':tenant': { S: 'one' } }, filterExpression: 'active = :active' };
  const page = await collectPages(connector, query, { limit: 1 });
  assert.equal(page.rows.length, 1); assert.equal(page.page.truncated, false); assert.equal(calls.length, 2); assert.equal(calls[0].input.TableName, 'approved-customers'); assert.equal(calls[0].input.Limit, 1);
  assert.deepEqual(calls[0].input.ExpressionAttributeValues, query.expressionAttributeValues); assert.deepEqual(calls[1].input.ExclusiveStartKey, { id: { N: '1' } }); assert.ok(signals.every(signal => signal instanceof AbortSignal));
  const item = page.rows[0][0] as any; assert.equal(item.id.N, '9223372036854775807'); assert.equal(item.amount.N, '0.000000000000000001'); assert.equal(item.blob.B, '0x00ff');
});

test('DynamoDB rejects changed queries, foreign/expired/evicted handles and repeated native keys', async () => {
  let count = 0;
  const config = { ...identity, tableName: 'customers', client: { async send() { count++; return { Items: [], LastEvaluatedKey: { id: { S: 'same' } } }; } }, queryCommand: command('query') };
  const connector = dynamoDBConnector(config), query = { keyConditionExpression: 'tenant = :tenant' }, first = await connector.read(query);
  await assert.rejects(connector.read({ keyConditionExpression: 'other = :tenant' }, { cursor: first.page.nextCursor }), /another connector or query/);
  await assert.rejects(dynamoDBConnector(config).read(query, { cursor: first.page.nextCursor }), /another connector or query/);
  assert.equal(count, 1);
  await assert.rejects(connector.read(query, { cursor: first.page.nextCursor }), /repeated/);
  for (let index = 0; index < 32; index++) await connector.read(query);
  await assert.rejects(connector.read(query, { cursor: first.page.nextCursor }), /expired/);
  const latest = await connector.read(query), now = Date.now;
  try { Date.now = () => now() + 300001; await assert.rejects(connector.read(query, { cursor: latest.page.nextCursor }), /expired/); }
  finally { Date.now = now; }
});

const redshiftColumns = [{ label: 'same', typeName: 'int8' }, { label: 'same', typeName: 'numeric' }];
test('Redshift submits typed parameters once, polls its statement, and slices native result pages without losing rows', async () => {
  const calls: any[] = []; let statuses = 0;
  const connector = redshiftConnector({ ...identity, database: 'analytics', workgroupName: 'reporting', commands: redshiftCommands, client: { async send(request, options) { calls.push(request); assert.ok(options?.abortSignal instanceof AbortSignal);
    if (request.operation === 'execute') return { Id: 'query-one' };
    if (request.operation === 'describe') return { Id: 'query-one', Status: ++statuses === 1 ? 'STARTED' : 'FINISHED', HasResultSet: true };
    return { ColumnMetadata: redshiftColumns, Records: request.input.NextToken ? [[{ longValue: 4 }, { isNull: true }]] : [[{ longValue: 1 }, { stringValue: '0.000000000000000001' }], [{ longValue: 2 }, { stringValue: '2.00' }], [{ longValue: 3 }, { stringValue: '3.00' }]], ...(request.input.NextToken ? {} : { NextToken: 'native-page-two' }) };
  } } });
  const page = await collectPages(connector, sql, { limit: 1 });
  assert.deepEqual(page.rows, [[1, '0.000000000000000001'], [2, '2.00'], [3, '3.00'], [4, null]]); assert.deepEqual(page.fields.map(field => field.name), ['same', 'same']);
  assert.equal(calls.filter(call => call.operation === 'execute').length, 1); assert.equal(calls.filter(call => call.operation === 'results').length, 2);
  assert.deepEqual(calls[0].input.Parameters, sql.parameters); assert.equal(calls[0].input.WorkgroupName, 'reporting'); assert.equal(calls[0].input.ResultFormat, 'JSON');
  assert.equal(calls.filter(call => call.operation === 'results')[1].input.NextToken, 'native-page-two'); assert.equal(page.provenance.queryId, 'query-one'); assert.equal(page.page.truncated, false);
});

function redshiftFixture(result: any, status: any = { Status: 'FINISHED', HasResultSet: true }) {
  return redshiftConnector({ ...identity, database: 'analytics', clusterIdentifier: 'reporting', commands: redshiftCommands, client: { async send(request) { if (request.operation === 'execute') return { Id: 'query-one' }; if (request.operation === 'describe') return status; return typeof result === 'function' ? result(request.input) : result; } } });
}
test('Redshift withholds failures, rejects unsafe numbers, multi-arm cells, and statements without tables', async () => {
  await assert.rejects(redshiftFixture({}, { Status: 'FAILED', Error: 'password=private-token raw-sql' }).read(sql), safeError);
  await assert.rejects(redshiftFixture({}, { Status: 'FINISHED', HasResultSet: false }).read(sql), /tabular result/);
  for (const cell of [{ longValue: 9007199254740992 }, { stringValue: 'one', isNull: true }, { stringValue: 1 }]) await assert.rejects(redshiftFixture({ ColumnMetadata: [{ name: 'id', typeName: 'int8' }], Records: [[cell]] }).read(sql));
});

test('Redshift guards cursor bindings, repeated tokens, and schema drift', async () => {
  const query = { text: 'select id' };
  for (const drift of [false, true]) {
    const connector = redshiftFixture((input: any) => ({ ColumnMetadata: [{ name: input.NextToken && drift ? 'changed' : 'id', typeName: 'varchar' }], Records: [[{ stringValue: 'one' }]], NextToken: 'same-token' }));
    const first = await connector.read(query, { limit: 1 });
    await assert.rejects(connector.read({ text: 'select another_id' }, { cursor: first.page.nextCursor }), /another connector or query/);
    await assert.rejects(connector.read(query, { cursor: first.page.nextCursor }), drift ? /schema/ : /repeated/);
  }
});

test('Redshift rejects missing declared rows and counts that change between native result pages', async () => {
  await assert.rejects(redshiftFixture({ ColumnMetadata: [{ name: 'id', typeName: 'varchar' }], Records: [[{ stringValue: 'one' }]], TotalNumRows: 2 }).read(sql), /row counts/);
  const connector = redshiftFixture((input: any) => ({ ColumnMetadata: [{ name: 'id', typeName: 'varchar' }], Records: [[{ stringValue: 'one' }]], TotalNumRows: input.NextToken ? 3 : 2, ...(input.NextToken ? {} : { NextToken: 'next' }) }));
  const first = await connector.read(sql, { limit: 1 }); await assert.rejects(connector.read(sql, { cursor: first.page.nextCursor }), /row counts/);
});

test('Athena submits native execution parameters, polls once and strips only the initial header', async () => {
  const calls: any[] = [], columns = [{ Name: 'same', Type: 'bigint' }, { Name: 'same', Type: 'decimal(38,18)' }];
  const connector = athenaConnector({ ...identity, workGroup: 'bounded-analytics', database: 'analytics', outputLocation: 's3://fixture-results/prefix', commands: athenaCommands, client: { async send(request, options) { calls.push(request); assert.ok(options?.abortSignal instanceof AbortSignal);
    if (request.operation === 'start') return { QueryExecutionId: 'athena-one' };
    if (request.operation === 'execution') return { QueryExecution: { QueryExecutionId: 'athena-one', Status: { State: 'SUCCEEDED' } } };
    return { ResultSet: { ResultSetMetadata: { ColumnInfo: columns }, Rows: request.input.NextToken ? [{ Data: [{ VarCharValue: 'same' }, {}] }] : [{ Data: [{ VarCharValue: 'same' }, { VarCharValue: 'same' }] }, { Data: [{ VarCharValue: '9223372036854775807' }, { VarCharValue: '0.123456789123456789' }] }] }, ...(request.input.NextToken ? {} : { NextToken: 'athena-page-two' }) };
  } } });
  const query = { text: 'SELECT id, amount FROM customers WHERE tenant = ?', executionParameters: ["'tenant-one'"] };
  const page = await collectPages(connector, query, { limit: 1 });
  assert.deepEqual(page.rows, [['9223372036854775807', '0.123456789123456789'], ['same', null]]); assert.deepEqual(page.fields.map(field => field.name), ['same', 'same']);
  assert.equal(calls.filter(call => call.operation === 'start').length, 1); assert.deepEqual(calls[0].input.ExecutionParameters, query.executionParameters);
  assert.equal(calls[0].input.WorkGroup, 'bounded-analytics'); assert.deepEqual(calls.filter(call => call.operation === 'results').map(call => call.input.MaxResults), [2, 1]); assert.equal(page.provenance.queryId, 'athena-one');
});

function athenaFixture(result: any, status = 'SUCCEEDED') {
  return athenaConnector({ ...identity, workGroup: 'analytics', commands: athenaCommands, client: { async send(request) { if (request.operation === 'start') return { QueryExecutionId: 'athena-one' }; if (request.operation === 'execution') return { QueryExecution: { Status: { State: status, StateChangeReason: 'password=private-token' } } }; return typeof result === 'function' ? result(request.input) : result; } } });
}
test('Athena detects failed jobs, missing headers, malformed cells and changed result schemas', async () => {
  await assert.rejects(athenaFixture({}, 'FAILED').read({ text: 'SELECT id' }), safeError);
  const schema = { ColumnInfo: [{ Name: 'id', Type: 'varchar' }] };
  for (const data of [[{ VarCharValue: 'not-a-header' }], [{ VarCharValue: 123 }]]) await assert.rejects(athenaFixture({ ResultSet: { ResultSetMetadata: schema, Rows: [{ Data: data }] } }).read({ text: 'SELECT id' }));
  const connector = athenaFixture((input: any) => ({ ResultSet: { ResultSetMetadata: { ColumnInfo: [{ Name: input.NextToken ? 'other' : 'id', Type: 'varchar' }] }, Rows: [{ Data: [{ VarCharValue: input.NextToken ? 'value' : 'id' }] }] }, NextToken: 'next' }));
  const first = await connector.read({ text: 'SELECT id' }, { limit: 1 });
  await assert.rejects(connector.read({ text: 'SELECT id' }, { cursor: first.page.nextCursor }), /schema/);
});

test('Athena retains exact empty schemas and caps its provider page size at 1000 including the first header', async () => {
  let max = 0;
  const connector = athenaConnector({ ...identity, workGroup: 'analytics', commands: athenaCommands, client: { async send(request) { if (request.operation === 'start') return { QueryExecutionId: 'one' }; if (request.operation === 'execution') return { QueryExecution: { Status: { State: 'SUCCEEDED' } } }; max = request.input.MaxResults; return { ResultSet: { ResultSetMetadata: { ColumnInfo: [{ Name: 'id', Type: 'bigint' }] }, Rows: [{ Data: [{ VarCharValue: 'id' }] }] } }; } } });
  const page = await connector.read({ text: 'SELECT id FROM empty' }, { limit: 5000 }); assert.equal(max, 1000); assert.equal(page.rows.length, 0); assert.equal(page.fields[0].name, 'id'); assert.equal(page.page.hasMore, false);
});

test('Trino follows validated coordinator nextUri pages, buffers oversized chunks, and preserves positional values', async () => {
  const calls: { url: string; init?: RequestInit }[] = []; let tokens = 0;
  const connector = trinoConnector({ ...identity, baseUrl: 'https://trino.example.test', user: 'analytics', catalog: 'lakehouse', schema: 'approved', token: () => `token-${++tokens}`, fetch: (async (input, init) => {
    const url = String(input); calls.push({ url, init });
    if (init?.method === 'POST') return Response.json({ id: 'trino-one', nextUri: 'https://trino.example.test/v1/statement/queued/one/1' });
    if (url.endsWith('/1')) return Response.json({ id: 'trino-one', columns: [{ name: 'same', type: 'varchar' }, { name: 'same', type: 'decimal(38,18)' }], data: [['9223372036854775807', '0.123456789123456789'], ['2', null], ['3', '3']], nextUri: 'https://trino.example.test/v1/statement/executing/one/2' });
    return Response.json({ id: 'trino-one', data: [['4', '4']] });
  }) as typeof fetch });
  const page = await collectPages(connector, { text: 'SELECT exact_id, amount FROM approved_customers' }, { limit: 1 });
  assert.deepEqual(page.rows, [['9223372036854775807', '0.123456789123456789'], ['2', null], ['3', '3'], ['4', '4']]); assert.deepEqual(page.fields.map(field => field.name), ['same', 'same']);
  assert.equal(calls.length, 3); assert.equal(tokens, 3); assert.equal(calls[0].init?.body, 'SELECT exact_id, amount FROM approved_customers'); assert.equal(new Headers(calls[0].init?.headers).get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(new Headers(calls[0].init?.headers).get('X-Trino-User'), 'analytics'); assert.equal(calls[0].init?.redirect, 'error'); assert.equal(page.page.truncated, false);
});

test('Trino refuses foreign links, spooling, statement updates and private provider error bodies', async () => {
  for (const response of [
    { id: 'one', nextUri: 'https://evil.test/v1/statement/one' },
    { id: 'one', nextUri: 'https://trino.example.test/admin/secrets' },
    { id: 'one', data: { segments: [{ uri: 'https://s3.example.test/private' }] } },
    { id: 'one', updateType: 'INSERT', columns: [] },
    { id: 'one', error: { message: 'password=private-token raw-sql' } },
  ]) {
    let calls = 0;
    const connector = trinoConnector({ ...identity, baseUrl: 'https://trino.example.test', user: 'analytics', token: () => 'fixture-token', fetch: (async () => { calls++; return Response.json(response); }) as typeof fetch });
    await assert.rejects(connector.read({ text: 'SELECT id' }), safeError); assert.equal(calls, 1);
  }
});

test('Trino rejects result identity switches, schema drift, repeated nextUri, and query-changing cursor reuse', async () => {
  for (const change of ['identity', 'schema', 'repeat']) {
    const next = 'https://trino.example.test/v1/statement/executing/one/1'; let calls = 0;
    const connector = trinoConnector({ ...identity, baseUrl: 'https://trino.example.test', user: 'analytics', token: () => 'fixture', fetch: (async () => Response.json(++calls === 1 ? { id: 'one', columns: [{ name: 'id', type: 'varchar' }], data: [['one']], nextUri: next } : { id: change === 'identity' ? 'two' : 'one', columns: [{ name: change === 'schema' ? 'other' : 'id', type: 'varchar' }], data: [['two']], ...(change === 'repeat' && { nextUri: next }) })) as typeof fetch });
    const first = await connector.read({ text: 'SELECT id' }, { limit: 1 });
    await assert.rejects(connector.read({ text: 'SELECT another' }, { cursor: first.page.nextCursor }), /another connector or query/);
    await assert.rejects(connector.read({ text: 'SELECT id' }, { cursor: first.page.nextCursor })); assert.equal(calls, 2);
  }
});

test('AWS and Trino timeouts stop local waits without claiming provider job cancellation', async () => {
  const connector = redshiftFixture({}, { Status: 'STARTED' });
  await assert.rejects(connector.read(sql, { timeoutMs: 2 }), (error: ConnectorError) => error.code === 'TIMEOUT');
  await assert.rejects(athenaFixture({}, 'RUNNING').read({ text: 'SELECT id' }, { timeoutMs: 2 }), (error: ConnectorError) => error.code === 'TIMEOUT');
  let calls = 0;
  const trino = trinoConnector({ ...identity, baseUrl: 'https://trino.example.test', user: 'analytics', token: () => 'fixture', fetch: (async () => { calls++; return Response.json({ id: 'one', nextUri: 'https://trino.example.test/v1/statement/queued/one/1' }); }) as typeof fetch });
  await assert.rejects(trino.read({ text: 'SELECT id' }, { timeoutMs: 2 }), (error: ConnectorError) => error.code === 'TIMEOUT'); assert.equal(calls, 1);
});

test('AWS provider errors and invalid construction remain sanitized before any query executes', async () => {
  await assert.rejects(dynamoDBConnector({ ...identity, tableName: 'customers', queryCommand: command('query'), client: { async send() { throw Error('password=private-token raw-sql'); } } }).read({ keyConditionExpression: 'id = :id' }), safeError);
  assert.throws(() => redshiftConnector({ ...identity, database: 'analytics', commands: redshiftCommands, client: { send: async () => ({}) } }), /cluster or workgroup/);
  const controller = new AbortController(); controller.abort(); let calls = 0;
  const connector = dynamoDBConnector({ ...identity, tableName: 'customers', queryCommand: command('query'), client: { async send() { calls++; return {}; } } });
  await assert.rejects(connector.read({ keyConditionExpression: 'id = :id' }, { signal: controller.signal }), /cancelled/); assert.equal(calls, 0);
});
