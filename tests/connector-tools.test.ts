import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectorError } from '../packages/connectors/src/core.js';
import { stripeConnector } from '../packages/connectors/src/adapters/stripe.js';
import { hubspotConnector } from '../packages/connectors/src/adapters/hubspot.js';
import { airtableConnector } from '../packages/connectors/src/adapters/airtable.js';
import { jsonConnector } from '../packages/connectors/src/adapters/json.js';

type Call = { url: URL; init: RequestInit };
function mockHttp(responses: unknown[]) {
  const calls: Call[] = [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    calls.push({ url: new URL(String(input)), init });
    assert.ok(responses.length, 'unexpected additional request');
    const response = responses.shift();
    return response instanceof Response ? response : new Response(JSON.stringify(response), { headers: { 'content-type': 'application/json' } });
  };
  return { calls, fetch: fetcher };
}
const identity = { id: 'demo-source', source: 'Demo source', token: () => 'server-secret' };
const stripeRecord = (id = 'cus_one') => ({ id, object: 'customer', created: 1700000000, balance: 0, email: null, metadata: { precise: '9007199254740993', decimal: '1.000000000001' } });
const hubspotRecord = (id = '100') => ({ id, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z', archived: false, properties: { empty: null, amount: '123456789.00001' } });
const airtableRecord = (id = 'recOne') => ({ id, createdTime: '2026-01-01T00:00:00.000Z', fields: { Name: 'Example', Null: null, Number: '9007199254740993' } });
function hasCode(code: string) { return (error: unknown) => error instanceof ConnectorError && error.code === code; }
function plain<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

test('Stripe uses fixed-origin native pagination, fresh tokens, and lossless records', async () => {
  const http = mockHttp([{ object: 'list', data: [stripeRecord()], has_more: true }, { object: 'list', data: [stripeRecord('cus_two')], has_more: false }]);
  let tokens = 0;
  const connector = stripeConnector({ ...identity, ...http, token: () => `token-${++tokens}`, apiVersion: '2026-09-30.clover', account: 'acct_demo' });
  const first = await connector.read({ resource: 'customers' }, { limit: 500 });
  assert.equal(first.rows.length, 1);
  assert.equal(first.page.hasMore, true);
  assert.equal(first.page.truncated, false);
  assert.deepEqual(plain(first.rows[0][3]), stripeRecord());
  assert.equal(Object.hasOwn(first.rows[0][3] as object, 'missing'), false);
  const second = await connector.read({ resource: 'customers' }, { cursor: first.page.nextCursor });
  assert.equal(second.page.hasMore, false);
  assert.deepEqual(first.fields, second.fields);
  assert.equal(tokens, 2);
  assert.equal(http.calls[0].url.origin, 'https://api.stripe.com');
  assert.equal(http.calls[0].url.searchParams.get('limit'), '100');
  assert.equal(http.calls[1].url.searchParams.get('starting_after'), 'cus_one');
  assert.equal(http.calls[1].init.redirect, 'error');
  assert.equal(new Headers(http.calls[1].init.headers).get('authorization'), 'Bearer token-2');
  assert.equal(new Headers(http.calls[0].init.headers).get('stripe-account'), 'acct_demo');
  assert.ok(!first.page.nextCursor?.includes('token-'));
});

test('Stripe restricts resources and binds cursors to query and source', async () => {
  const http = mockHttp([{ object: 'list', data: [stripeRecord()], has_more: true }]);
  const connector = stripeConnector({ ...identity, ...http });
  const first = await connector.read({ resource: 'customers' });
  await assert.rejects(connector.read({ resource: 'products' }, { cursor: first.page.nextCursor }), hasCode('INVALID_CURSOR'));
  const other = stripeConnector({ ...identity, source: 'Other source', ...http });
  await assert.rejects(other.read({ resource: 'customers' }, { cursor: first.page.nextCursor }), hasCode('INVALID_CURSOR'));
  await assert.rejects(connector.read({ resource: '//malicious.example' } as never), hasCode('INVALID_QUERY'));
  assert.equal(http.calls.length, 1);
});

test('Stripe checkout session resource maps to its documented nested path', async () => {
  const http = mockHttp([{ object: 'list', data: [], has_more: false }]);
  await stripeConnector({ ...identity, ...http }).read({ resource: 'checkout_sessions' });
  assert.equal(http.calls[0].url.pathname, '/v1/checkout/sessions');
});

for (const [description, response] of [
  ['missing has_more', { object: 'list', data: [] }],
  ['empty advancing page', { object: 'list', data: [], has_more: true }],
  ['malformed record', { object: 'list', data: [{ id: 5 }], has_more: false }],
  ['oversized page', { object: 'list', data: [stripeRecord(), stripeRecord('cus_two')], has_more: false }],
] as const) {
  test(`Stripe rejects ${description}`, async () => {
    const http = mockHttp([response]);
    await assert.rejects(stripeConnector({ ...identity, ...http }).read({ resource: 'customers' }, { limit: 1 }), hasCode('INVALID_RESPONSE'));
  });
}

test('HubSpot selects properties, preserves null/missing, and ignores next links', async () => {
  const http = mockHttp([{ results: [hubspotRecord()], paging: { next: { after: '101', link: 'https://evil.example/steal-token' } } }, { results: [hubspotRecord('101')] }]);
  const connector = hubspotConnector({ ...identity, ...http });
  const query = { object: 'contacts', properties: ['empty', 'amount'], archived: false } as const;
  const first = await connector.read({ ...query, properties: [...query.properties] }, { limit: 2 });
  const properties = first.rows[0][1] as Record<string, unknown>;
  assert.equal(properties.empty, null);
  assert.equal(properties.amount, '123456789.00001');
  assert.equal(Object.hasOwn(properties, 'missing'), false);
  await connector.read({ ...query, properties: ['amount', 'empty'] }, { cursor: first.page.nextCursor });
  assert.equal(http.calls[0].url.searchParams.get('properties'), 'amount,empty');
  assert.equal(http.calls[1].url.searchParams.get('after'), '101');
  assert.equal(http.calls[1].url.origin, 'https://api.hubapi.com');
  assert.equal(http.calls[1].url.pathname, '/crm/v3/objects/contacts');
  assert.equal(http.calls[1].url.searchParams.get('limit'), '100');
});

test('HubSpot rejects changed property selection, archive mode, and malformed next cursors', async () => {
  const http = mockHttp([{ results: [hubspotRecord()], paging: { next: { after: '101' } } }, { results: [], paging: { next: { after: 101 } } }]);
  const connector = hubspotConnector({ ...identity, ...http });
  const first = await connector.read({ object: 'contacts', properties: ['amount'] });
  await assert.rejects(connector.read({ object: 'contacts', properties: ['name'] }, { cursor: first.page.nextCursor }), hasCode('INVALID_CURSOR'));
  await assert.rejects(connector.read({ object: 'contacts', properties: ['amount'], archived: true }, { cursor: first.page.nextCursor }), hasCode('INVALID_CURSOR'));
  await assert.rejects(connector.read({ object: 'contacts' }), hasCode('INVALID_RESPONSE'));
});

test('HubSpot rejects nonprogressing cursors before callers can loop', async () => {
  const http = mockHttp([{ results: [hubspotRecord()], paging: { next: { after: '101' } } }, { results: [hubspotRecord('101')], paging: { next: { after: '101' } } }]);
  const connector = hubspotConnector({ ...identity, ...http });
  const first = await connector.read({ object: 'contacts' });
  await assert.rejects(connector.read({ object: 'contacts' }, { cursor: first.page.nextCursor }), hasCode('INVALID_RESPONSE'));
});

test('Airtable uses server-owned base/table, encoded offset, field selection, and omission warning', async () => {
  const http = mockHttp([{ records: [airtableRecord()], offset: 'itrOne/recOne?x=y' }, { records: [] }]);
  const connector = airtableConnector({ ...identity, ...http, baseId: 'appDemo', tableId: 'tblDemo' });
  const first = await connector.read({ fields: ['Name', 'Null'], view: 'Sales & success' }, { limit: 200 });
  assert.deepEqual(plain(first.rows[0][2]), airtableRecord().fields);
  assert.equal(Object.hasOwn(first.rows[0][2] as object, 'Unchecked'), false);
  assert.ok(first.warnings.some(warning => warning.includes('false') && warning.includes('cannot be recovered')));
  const second = await connector.read({ fields: ['Null', 'Name'], view: 'Sales & success' }, { cursor: first.page.nextCursor });
  assert.equal(second.page.hasMore, false);
  assert.deepEqual(first.fields, second.fields);
  assert.equal(http.calls[0].url.origin, 'https://api.airtable.com');
  assert.equal(http.calls[0].url.pathname, '/v0/appDemo/tblDemo');
  assert.equal(http.calls[0].url.searchParams.get('pageSize'), '100');
  assert.deepEqual(http.calls[0].url.searchParams.getAll('fields[]'), ['Name', 'Null']);
  assert.equal(http.calls[1].url.searchParams.get('offset'), 'itrOne/recOne?x=y');
});

test('Airtable rejects invalid base/table and cross-view or cross-table cursor reuse', async () => {
  assert.throws(() => airtableConnector({ ...identity, baseId: 'https://evil.example', tableId: 'tblDemo' }), hasCode('INVALID_CONFIG'));
  const http = mockHttp([{ records: [airtableRecord()], offset: 'next' }]);
  const connector = airtableConnector({ ...identity, ...http, baseId: 'appDemo', tableId: 'tblDemo' });
  const first = await connector.read({ view: 'Sales' });
  await assert.rejects(connector.read({ view: 'Everyone' }, { cursor: first.page.nextCursor }), hasCode('INVALID_CURSOR'));
  const other = airtableConnector({ ...identity, ...http, baseId: 'appDemo', tableId: 'tblOther' });
  await assert.rejects(other.read({ view: 'Sales' }, { cursor: first.page.nextCursor }), hasCode('INVALID_CURSOR'));
  assert.equal(http.calls.length, 1);
});

test('Airtable rejects malformed and nonprogressing list responses', async () => {
  for (const response of [{ records: null }, { records: [], offset: 'next' }, { records: [airtableRecord()], offset: '' }, { records: [{ ...airtableRecord(), fields: [] }] }]) {
    const http = mockHttp([response]);
    const connector = airtableConnector({ ...identity, ...http, baseId: 'appDemo', tableId: 'tblDemo' });
    await assert.rejects(connector.read({}), hasCode('INVALID_RESPONSE'));
  }
});

test('REST queries reject oversized cursor bindings before any source request', async () => {
  const http = mockHttp([]);
  const longNames = Array.from({ length: 100 }, (_, index) => '"'.repeat(125) + String(index).padStart(3, '0'));
  const airtable = airtableConnector({ ...identity, ...http, baseId: 'appDemo', tableId: 'tblDemo' });
  const hubspot = hubspotConnector({ ...identity, ...http });
  await assert.rejects(airtable.read({ fields: longNames }), hasCode('INVALID_QUERY'));
  await assert.rejects(hubspot.read({ object: 'contacts', properties: longNames }), hasCode('INVALID_QUERY'));
  assert.equal(http.calls.length, 0);
});

test('accepted escaped query bindings and maximum native cursors remain resumable', async () => {
  const offset = '"'.repeat(2048);
  const http = mockHttp([{ records: [airtableRecord()], offset }, { records: [] }]);
  const connector = airtableConnector({ ...identity, ...http, baseId: 'appDemo', tableId: 'tblDemo' });
  const fields = Array.from({ length: 20 }, (_, index) => '"'.repeat(125) + String(index).padStart(3, '0'));
  const first = await connector.read({ fields });
  assert.ok(first.page.nextCursor!.length <= 16384);
  await connector.read({ fields }, { cursor: first.page.nextCursor });
  assert.equal(http.calls[1].url.searchParams.get('offset'), offset);
});

test('HTTP failures and token failures never expose provider response or secrets', async () => {
  const http = mockHttp([new Response('server-secret and private customer data', { status: 429 })]);
  const connector = stripeConnector({ ...identity, ...http });
  await assert.rejects(connector.read({ resource: 'customers' }), error => {
    assert.ok(hasCode('RATE_LIMITED')(error));
    assert.ok(!(error as Error).message.includes('server-secret'));
    assert.ok(!(error as Error).message.includes('private customer data'));
    return true;
  });
  assert.equal(http.calls.length, 1, 'rate limits are not blindly retried');
  const brokenToken = hubspotConnector({ ...identity, token: () => { throw new Error('server-secret'); }, fetch: http.fetch });
  await assert.rejects(brokenToken.read({ object: 'contacts' }), error => error instanceof ConnectorError && !error.message.includes('server-secret'));
  assert.equal(http.calls.length, 1);
});

test('HTTP adapters reject malformed JSON with a safe error', async () => {
  const http = mockHttp([new Response('{"token":"server-secret"')]);
  await assert.rejects(stripeConnector({ ...identity, ...http }).read({ resource: 'customers' }), error => hasCode('INVALID_RESPONSE')(error) && !(error as Error).message.includes('server-secret'));
});

test('HTTP adapters forward abort and refuse already cancelled reads', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  let requestSignal: AbortSignal | undefined;
  const fetcher: typeof fetch = async (_input, init) => {
    calls++;
    requestSignal = init?.signal as AbortSignal;
    return new Promise<Response>((_resolve, reject) => requestSignal?.addEventListener('abort', () => reject(new Error('secret transport detail')), { once: true }));
  };
  const connector = stripeConnector({ ...identity, fetch: fetcher });
  await assert.rejects(connector.read({ resource: 'customers' }, { signal: controller.signal }), hasCode('ABORTED'));
  assert.equal(calls, 0);
  const active = new AbortController();
  const read = connector.read({ resource: 'customers' }, { signal: active.signal });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls, 1);
  active.abort();
  await assert.rejects(read, hasCode('ABORTED'));
  assert.equal(requestSignal?.aborted, true);
});

test('JSON snapshots retain duplicate columns, bigint strings, nested null, and immutable values', async () => {
  const fields = [{ name: 'duplicate', type: 'integer' }, { name: 'duplicate', type: 'json' }] as const;
  const original = { amount: '1.00000000000001', nullable: null };
  const rows: unknown[][] = [[9007199254740993n, original], [2, { tag: 'second' }]];
  const connector = jsonConnector({ id: 'json-demo', source: 'Uploaded records', fields, rows });
  original.amount = 'changed';
  rows[0][0] = 9;
  const first = await connector.read(undefined, { limit: 1 });
  assert.equal(first.rows[0][0], '9007199254740993');
  assert.deepEqual(plain(first.rows[0][1]), { amount: '1.00000000000001', nullable: null });
  assert.deepEqual(first.fields.map(field => field.name), ['duplicate', 'duplicate']);
  (first.rows[0][1] as Record<string, unknown>).amount = 'consumer mutation';
  first.fields[0].name = 'consumer field mutation';
  const repeat = await connector.read(undefined, { limit: 1 });
  assert.equal((repeat.rows[0][1] as Record<string, unknown>).amount, '1.00000000000001');
  assert.equal(repeat.fields[0].name, 'duplicate');
  const second = await connector.read(undefined, { limit: 1, cursor: first.page.nextCursor });
  assert.equal(second.rows[0][0], 2);
  assert.equal(second.page.hasMore, false);
  assert.equal(second.page.truncated, false);
  assert.equal(connector.capabilities.runtime, 'universal');
});

test('JSON snapshot cursors cannot be reused against another instance or forged into invalid offsets', async () => {
  const options = { id: 'json-demo', source: 'JSON data', fields: [{ name: 'id', type: 'integer' as const }], rows: [[1], [2]] };
  const connector = jsonConnector(options);
  const page = await connector.read(undefined, { limit: 1 });
  await assert.rejects(jsonConnector(options).read(undefined, { cursor: page.page.nextCursor }), hasCode('INVALID_CURSOR'));
  const cursor = JSON.parse(page.page.nextCursor!);
  for (const value of [-1, 3, 0.5, '1']) {
    await assert.rejects(connector.read(undefined, { cursor: JSON.stringify({ ...cursor, value }) }), hasCode('INVALID_CURSOR'));
  }
  await assert.rejects(connector.read(undefined, { cursor: 'not-json' }), hasCode('INVALID_CURSOR'));
});

test('JSON snapshot cursor identity survives module counter resets and rejects stale persisted cursors', async () => {
  const options = { id: 'json-restart', source: 'JSON data', fields: [{ name: 'id', type: 'integer' as const }], rows: [[1], [2]] };
  const firstModule = await import('../packages/connectors/src/adapters/json.ts?instance=first');
  const restartedModule = await import('../packages/connectors/src/adapters/json.ts?instance=restarted');
  const first = await firstModule.jsonConnector(options).read(undefined, { limit: 1 });
  await assert.rejects(restartedModule.jsonConnector(options).read(undefined, { cursor: first.page.nextCursor }), hasCode('INVALID_CURSOR'));
});

test('JSON snapshots reject shape mismatches and values with existing precision loss', () => {
  assert.throws(() => jsonConnector({ id: 'json', source: 'Data', fields: [{ name: 'value', type: 'number' }], rows: [[]] }), hasCode('INVALID_CONFIG'));
  assert.throws(() => jsonConnector({ id: 'json', source: 'Data', fields: [{ name: 'value', type: 'number' }], rows: [[Number.MAX_SAFE_INTEGER + 1]] }), hasCode('PRECISION_LOSS'));
});

test('JSON empty snapshots return a complete typed page and honour pre-abort', async () => {
  const connector = jsonConnector({ id: 'json', source: 'Data', fields: [{ name: 'id', type: 'string' }], rows: [], mode: 'fixture' });
  const page = await connector.read();
  assert.deepEqual(page.rows, []);
  assert.equal(page.fields[0].name, 'id');
  assert.equal(page.provenance.mode, 'fixture');
  assert.deepEqual(page.page, { hasMore: false, truncated: false });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(connector.read(undefined, { signal: controller.signal }), hasCode('ABORTED'));
});
