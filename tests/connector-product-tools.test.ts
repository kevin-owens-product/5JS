import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectorError } from '../packages/connectors/src/core.js';
import { salesforceConnector, shopifyConnector, zendeskConnector, intercomConnector, segmentConnector } from '../packages/connectors/src/adapters/product-tools.js';
import { googleAnalyticsConnector, mixpanelConnector, amplitudeConnector, posthogConnector } from '../packages/connectors/src/adapters/product-analytics.js';
import { googleSheetsConnector } from '../packages/connectors/src/adapters/google-sheets.js';

const identity = { id: 'test', source: 'Protocol test source', mode: 'fixture' as const, token: () => 'test-secret' };
type Call = { url: URL; init: RequestInit; headers: Headers; body?: any };
function transport(responses: unknown[]) {
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: new URL(String(input)), init, headers: new Headers(init.headers), body: init.body === undefined ? undefined : JSON.parse(String(init.body)) });
    assert.ok(responses.length, 'Unexpected extra source request');
    const value = responses.shift();
    return value instanceof Response ? value : new Response(JSON.stringify(value));
  };
  return { calls, fetch };
}
const code = (expected: string) => (error: unknown) => error instanceof ConnectorError && error.code === expected;
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));

test('Salesforce buffers native batches without skipping records and validates query-more URLs', async () => {
  const http = transport([
    { records: [{ Id: 'one', amount: '0.00001' }, { Id: 'two' }], done: false, nextRecordsUrl: '/services/data/v66.0/query/locator-2' },
    { records: [{ Id: 'three' }], done: true },
  ]);
  const connector = salesforceConnector({ ...identity, ...http, instanceUrl: 'https://example.my.salesforce.com', apiVersion: '66.0' });
  const query = { soql: 'SELECT Id, Amount FROM Opportunity' };
  const first = await connector.read(query, { limit: 1 });
  const second = await connector.read(query, { limit: 1, cursor: first.page.nextCursor });
  assert.equal(http.calls.length, 1);
  const third = await connector.read(query, { limit: 1, cursor: second.page.nextCursor });
  assert.deepEqual(plain([...first.rows, ...second.rows, ...third.rows]), [[{ Id: 'one', amount: '0.00001' }], [{ Id: 'two' }], [{ Id: 'three' }]]);
  assert.equal(http.calls[0].headers.get('sforce-query-options'), 'batchSize=2000');
  assert.equal(http.calls[0].url.searchParams.get('q'), query.soql);
  assert.equal(http.calls[1].url.pathname, '/services/data/v66.0/query/locator-2');
  assert.equal(third.page.hasMore, false);
  assert.equal(first.page.truncated, false);
});

test('Salesforce rejects hostile continuation links and cross-query handles', async () => {
  const hostile = transport([{ records: [{ Id: 'one' }], done: false, nextRecordsUrl: 'https://evil.example/secret' }]);
  await assert.rejects(salesforceConnector({ ...identity, ...hostile, instanceUrl: 'https://example.my.salesforce.com', apiVersion: '66.0' }).read({ soql: 'SELECT Id FROM Account' }), code('INVALID_RESPONSE'));
  assert.equal(hostile.calls.length, 1);
  const http = transport([{ records: [{ Id: 'one' }, { Id: 'two' }], done: true }]);
  const connector = salesforceConnector({ ...identity, ...http, instanceUrl: 'https://example.my.salesforce.com', apiVersion: '66.0' });
  const first = await connector.read({ soql: 'SELECT Id FROM Account' }, { limit: 1 });
  await assert.rejects(connector.read({ soql: 'SELECT Id FROM Contact' }, { cursor: first.page.nextCursor }), code('INVALID_CURSOR'));
});

test('Shopify uses token headers, fixed GraphQL selections, variables and native cursors', async () => {
  const http = transport([
    { data: { orders: { edges: [{ node: { id: 'gid://shopify/Order/1', totalPriceSet: { shopMoney: { amount: '0.123456789', currencyCode: 'USD' } } } }], pageInfo: { hasNextPage: true, endCursor: 'cursor-one' } } } },
    { data: { orders: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } } },
  ]);
  let tokens = 0;
  const connector = shopifyConnector({ ...identity, ...http, shop: 'demo-shop', apiVersion: '2026-10', token: () => `fresh-${++tokens}` });
  const query = { resource: 'orders' as const, search: 'status:open " literal' };
  const first = await connector.read(query, { limit: 1000 });
  await connector.read(query, { cursor: first.page.nextCursor });
  assert.equal(http.calls[0].url.href, 'https://demo-shop.myshopify.com/admin/api/2026-10/graphql.json');
  assert.equal(http.calls[0].body.variables.first, 250);
  assert.equal(http.calls[0].body.variables.query, query.search);
  assert.ok(!http.calls[0].body.query.includes(query.search));
  assert.equal(http.calls[1].body.variables.after, 'cursor-one');
  assert.equal(http.calls[1].headers.get('x-shopify-access-token'), 'fresh-2');
  assert.equal(http.calls[1].headers.get('authorization'), null);
  assert.equal((first.rows[0][0] as any).totalPriceSet.shopMoney.amount, '0.123456789');
});

test('Shopify fails closed on partial GraphQL errors and unsupported resources', async () => {
  const http = transport([{ errors: [{ message: 'test-secret protected customer' }], data: { customers: {} } }]);
  const connector = shopifyConnector({ ...identity, ...http, shop: 'demo', apiVersion: '2026-10' });
  await assert.rejects(connector.read({ resource: 'customers' }), error => code('QUERY_FAILED')(error) && !String(error).includes('test-secret'));
  await assert.rejects(connector.read({ resource: 'mutation' } as never), code('INVALID_QUERY'));
});

test('GA4 reports aggregate grain, string metrics, metadata warnings and ordered offset pages', async () => {
  const headers = { dimensionHeaders: [{ name: 'date' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }] };
  const http = transport([
    { ...headers, rows: [{ dimensionValues: [{ value: '20261001' }], metricValues: [{ value: '9007199254740993' }] }], rowCount: 2, metadata: { subjectToThresholding: true, dataLossFromOtherRow: true } },
    { ...headers, rows: [{ dimensionValues: [{ value: '20261002' }], metricValues: [{ value: '5' }] }], rowCount: 2 },
  ]);
  const connector = googleAnalyticsConnector({ ...identity, ...http, propertyId: '123' });
  const query = { dimensions: ['date'], metrics: ['activeUsers'], startDate: '2026-10-01', endDate: '2026-10-02' };
  const first = await connector.read(query, { limit: 1 });
  const second = await connector.read(query, { limit: 1, cursor: first.page.nextCursor });
  assert.deepEqual(first.rows, [['20261001', '9007199254740993']]);
  assert.equal(first.fields[1].type, 'integer');
  assert.equal(http.calls[0].url.href, 'https://analyticsdata.googleapis.com/v1beta/properties/123:runReport');
  assert.equal(http.calls[1].body.offset, '1');
  assert.deepEqual(http.calls[0].body.orderBys, [{ dimension: { dimensionName: 'date' }, desc: false }]);
  assert.ok(first.warnings.some(value => value.includes('thresholding')));
  assert.ok(first.warnings.some(value => value.includes('not generally additive')));
  assert.equal(second.page.hasMore, false);
});

test('GA4 rejects missing metrics, header drift, nonprogressing pages and invalid absolute dates', async () => {
  const query = { dimensions: ['date'], metrics: ['activeUsers'], startDate: '2026-02-01', endDate: '2026-02-02' };
  const http = transport([{ dimensionHeaders: [{ name: 'unexpected' }], metricHeaders: [{ name: 'activeUsers' }], rowCount: 0 }]);
  const connector = googleAnalyticsConnector({ ...identity, ...http, propertyId: '123' });
  await assert.rejects(connector.read(query), code('INVALID_RESPONSE'));
  await assert.rejects(connector.read({ ...query, metrics: [] }), code('INVALID_QUERY'));
  await assert.rejects(connector.read({ ...query, endDate: '2026-02-30' }), code('INVALID_QUERY'));
  const empty = transport([{ dimensionHeaders: [{ name: 'date' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }], rows: [], rowCount: 4 }]);
  await assert.rejects(googleAnalyticsConnector({ ...identity, ...empty, propertyId: '123' }).read(query), code('INVALID_RESPONSE'));
});

test('GA4 accepts an empty ProtoJSON report with an omitted zero rowCount', async () => {
  const headers = { dimensionHeaders: [{ name: 'date' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }] };
  const http = transport([headers, { ...headers, rows: [{ dimensionValues: [{ value: '20261001' }], metricValues: [{ value: '1' }] }] }]);
  const connector = googleAnalyticsConnector({ ...identity, ...http, propertyId: '123' });
  const query = { dimensions: ['date'], metrics: ['activeUsers'], startDate: '2026-10-01', endDate: '2026-10-01' };
  const empty = await connector.read(query);
  assert.deepEqual(empty.rows, []);
  assert.deepEqual(empty.page, { hasMore: false, truncated: false });
  await assert.rejects(connector.read(query), code('INVALID_RESPONSE'), 'missing rowCount must not conceal nonempty results');
});

test('Mixpanel parses bounded NDJSON exports and truthfully reports an unresumable truncation', async () => {
  const events = [{ event: 'Checkout', properties: { distinct_id: '00001', time: 1, amount: '1.00001' } }, { event: 'Checkout', properties: { time: 2 } }];
  const http = transport([new Response(events.map(value => JSON.stringify(value)).join('\n') + '\n', { headers: { 'content-type': 'text/plain' } })]);
  const connector = mixpanelConnector({ id: 'mix', source: 'Event export', ...http, region: 'EU', projectId: '321', credentials: () => ({ username: 'service-user', password: 'service-secret' }) });
  const query = { fromDate: '2026-10-01', toDate: '2026-10-02', events: ['Checkout'] };
  const page = await connector.read(query, { limit: 1 });
  assert.equal(http.calls[0].url.origin, 'https://data-eu.mixpanel.com');
  assert.equal(http.calls[0].url.searchParams.get('limit'), '2');
  assert.equal(http.calls[0].url.searchParams.get('time_in_ms'), 'true');
  assert.equal(atob(http.calls[0].headers.get('authorization')!.slice(6)), 'service-user:service-secret');
  assert.equal((page.rows[0][0] as any).properties.distinct_id, '00001');
  assert.equal(page.page.hasMore, true);
  assert.equal(page.page.truncated, true);
  assert.equal(page.page.nextCursor, undefined);
  await assert.rejects(connector.read(query, { cursor: 'fabricated' }), code('UNSUPPORTED_CURSOR'));
});

test('Mixpanel validates date bounds and malformed or oversized exports', async () => {
  const options = { id: 'mix', source: 'Events', projectId: '1', credentials: () => ({ username: 'u', password: 'p' }) };
  const query = { fromDate: '2026-01-01', toDate: '2026-01-02' };
  const http = transport([new Response('{"event":"secret"\nnot-json')]);
  const connector = mixpanelConnector({ ...options, ...http });
  await assert.rejects(connector.read({ ...query, toDate: '2026-12-31' }), code('INVALID_QUERY'));
  await assert.rejects(connector.read(query), error => code('INVALID_RESPONSE')(error) && !String(error).includes('secret'));
  const large = transport([new Response('x'.repeat(8 * 1024 * 1024 + 1))]);
  await assert.rejects(mixpanelConnector({ ...options, ...large }).read(query), code('RESPONSE_TOO_LARGE'));
});

test('Amplitude fetches daily aggregates once and locally pages exact fetched series', async () => {
  const http = transport([{ data: { series: [[5, null, 7]], seriesLabels: ['all'], xValues: ['2026-10-01', '2026-10-02', '2026-10-03'] } }]);
  const connector = amplitudeConnector({ id: 'amp', source: 'Product analytics', ...http, credentials: () => ({ username: 'api-key', password: 'secret-key' }) });
  const query = { event: 'Checkout started', metric: 'uniques' as const, startDate: '2026-10-01', endDate: '2026-10-03' };
  const first = await connector.read(query, { limit: 2 });
  const second = await connector.read(query, { limit: 2, cursor: first.page.nextCursor });
  assert.deepEqual([...first.rows, ...second.rows], [['2026-10-01', 'all', 5], ['2026-10-02', 'all', null], ['2026-10-03', 'all', 7]]);
  assert.equal(http.calls.length, 1);
  assert.equal(http.calls[0].url.pathname, '/api/2/events/segmentation');
  assert.equal(http.calls[0].url.searchParams.get('i'), '1');
  assert.deepEqual(JSON.parse(http.calls[0].url.searchParams.get('e')!), { event_type: 'Checkout started' });
  assert.ok(first.warnings[0].includes('not additive'));
  assert.equal(second.page.truncated, false);
});

test('Amplitude refuses series/date shape mismatches', async () => {
  const http = transport([{ data: { series: [[1, 2]], seriesLabels: ['all'], xValues: ['2026-10-01'] } }]);
  const connector = amplitudeConnector({ id: 'amp', source: 'Analytics', ...http, credentials: () => ({ username: 'u', password: 'p' }) });
  await assert.rejects(connector.read({ event: '_all', metric: 'totals', startDate: '2026-10-01', endDate: '2026-10-01' }), code('INVALID_RESPONSE'));
});

test('PostHog calls a pinned named endpoint, preserves SQL columns and binds continuations', async () => {
  const http = transport([{ columns: ['id', 'amount'], results: [{ id: '1', amount: '0.123456789' }], hasMore: true }, { columns: ['id', 'amount'], results: [['2', null]], hasMore: false }]);
  const connector = posthogConnector({ ...identity, ...http, host: 'https://us.posthog.com', projectId: '123', endpoint: 'customer_revenue', version: 2 });
  const query = { variables: { tenant: 'authorized-tenant' } };
  const first = await connector.read(query, { limit: 1 });
  const second = await connector.read(query, { limit: 1, cursor: first.page.nextCursor });
  assert.equal(http.calls[0].url.pathname, '/api/projects/123/endpoints/customer_revenue/run/');
  assert.equal(http.calls[0].body.version, 2);
  assert.equal(http.calls[1].body.offset, 1);
  assert.deepEqual([...first.rows, ...second.rows], [['1', '0.123456789'], ['2', null]]);
  await assert.rejects(connector.read({ variables: { tenant: 'other' } }, { cursor: first.page.nextCursor }), code('INVALID_CURSOR'));
  assert.ok(!http.calls.some(call => call.url.pathname.includes('/query')));
});

test('PostHog rejects async incomplete responses and ambiguous object columns', async () => {
  for (const [response, error] of [
    [{ query_status: { complete: false, id: 'pending' } }, 'QUERY_PENDING'],
    [{ columns: ['x', 'x'], results: [{ x: 1 }], hasMore: false }, 'INVALID_RESPONSE'],
    [{ columns: ['x'], results: [], hasMore: true }, 'INVALID_RESPONSE'],
    [{ columns: ['x'], results: [], hasMore: false, endpoint_version: 2 }, 'SCHEMA_CHANGED'],
  ] as const) {
    const http = transport([response]);
    const connector = posthogConnector({ ...identity, ...http, host: 'https://eu.posthog.com', projectId: '1', endpoint: 'approved_query', version: 1 });
    await assert.rejects(connector.read({}), code(error));
  }
});

test('Segment uses Basic token authentication and native profile trait cursors', async () => {
  const http = transport([{ traits: { opted_out: false, missing_value: null }, cursor: { has_more: true, next: 'next-trait', url: 'https://evil.example' } }, { traits: { amount: '0.100001' }, cursor: { has_more: false, next: '' } }]);
  const connector = segmentConnector({ ...identity, ...http, spaceId: 'space-one', region: 'EU', collection: 'users' });
  const query = { profile: 'user_id:kevin@example.test', resource: 'traits' as const };
  const first = await connector.read(query, { limit: 2 });
  const second = await connector.read(query, { cursor: first.page.nextCursor });
  assert.deepEqual(first.rows, [['opted_out', false], ['missing_value', null]]);
  assert.equal(atob(http.calls[0].headers.get('authorization')!.slice(6)), 'test-secret:');
  assert.equal(http.calls[1].url.origin, 'https://profiles.euw1.segment.com');
  assert.equal(http.calls[1].url.searchParams.get('next'), 'next-trait');
  assert.deepEqual(second.rows, [['amount', '0.100001']]);
});

test('Segment returns event/external-id records and rejects missing continuation metadata', async () => {
  for (const resource of ['events', 'external_ids'] as const) {
    const http = transport([{ data: [{ id: 'event-or-external-id' }], cursor: { has_more: false, next: '' } }]);
    const result = await segmentConnector({ ...identity, ...http, spaceId: 'space' }).read({ profile: 'user_id:1', resource });
    assert.equal((result.rows[0][0] as any).id, 'event-or-external-id');
  }
  const http = transport([{ data: [], cursor: { has_more: true, next: '' } }]);
  await assert.rejects(segmentConnector({ ...identity, ...http, spaceId: 'space' }).read({ profile: 'user_id:1', resource: 'events' }), code('INVALID_RESPONSE'));
});

test('Zendesk uses cursor pagination without following links and retains ticket IDs', async () => {
  const http = transport([{ tickets: [{ id: 1, subject: null }], meta: { has_more: true, after_cursor: 'native' }, links: { next: 'https://evil.example' } }, { tickets: [], meta: { has_more: false, after_cursor: null } }]);
  const connector = zendeskConnector({ ...identity, ...http, subdomain: 'demo-support' });
  const first = await connector.read({ resource: 'tickets' });
  await connector.read({ resource: 'tickets' }, { cursor: first.page.nextCursor });
  assert.equal(http.calls[0].url.origin, 'https://demo-support.zendesk.com');
  assert.equal(http.calls[0].url.searchParams.get('page[size]'), '100');
  assert.equal(http.calls[1].url.searchParams.get('page[after]'), 'native');
  assert.deepEqual(plain(first.rows), [[{ id: 1, subject: null }]]);
});

test('Intercom pins the API version and pages contacts through starting_after', async () => {
  const http = transport([{ type: 'list', data: [{ id: 'contact-one' }], pages: { next: { starting_after: 'native' } } }, { type: 'list', data: [], pages: { next: null } }]);
  const connector = intercomConnector({ ...identity, ...http, apiVersion: '2.17', region: 'AU' });
  const first = await connector.read();
  await connector.read(undefined, { cursor: first.page.nextCursor });
  assert.equal(http.calls[0].url.origin, 'https://api.au.intercom.io');
  assert.equal(http.calls[0].headers.get('intercom-version'), '2.17');
  assert.equal(http.calls[0].url.searchParams.get('per_page'), '150');
  assert.equal(http.calls[1].url.searchParams.get('starting_after'), 'native');
});

test('Zendesk organizations request boundary indicators and Intercom accepts a nullable final pages value', async () => {
  const zendesk = transport([{ organizations: [], meta: { has_more: false } }]);
  await zendeskConnector({ ...identity, ...zendesk, subdomain: 'demo' }).read({ resource: 'organizations' });
  assert.equal(zendesk.calls[0].url.searchParams.get('include_boundary_indicators'), 'true');
  const intercom = transport([{ type: 'list', data: [], pages: null }]);
  const page = await intercomConnector({ ...identity, ...intercom, apiVersion: '2.17' }).read();
  assert.equal(page.page.hasMore, false);
});

test('Google Sheets reads a fixed rectangle and preserves blank cells and exact strings', async () => {
  const http = transport([{ majorDimension: 'ROWS', values: [['00001', '0.1000000000001'], ['00002']] }, { majorDimension: 'ROWS' }]);
  const connector = googleSheetsConnector({ ...identity, ...http, spreadsheetId: 'document-id', sheet: "Customer's data", firstColumn: 2, startRow: 3, endRow: 5, fields: [{ name: 'id', type: 'string' }, { name: 'value', type: 'decimal' }] });
  const first = await connector.read(undefined, { limit: 2 });
  const second = await connector.read(undefined, { limit: 2, cursor: first.page.nextCursor });
  assert.deepEqual(first.rows, [['00001', '0.1000000000001'], ['00002', null]]);
  assert.deepEqual(second.rows, [[null, null]]);
  assert.equal(decodeURIComponent(http.calls[0].url.pathname.split('/values/')[1]), "'Customer''s data'!B3:C4");
  assert.equal(decodeURIComponent(http.calls[1].url.pathname.split('/values/')[1]), "'Customer''s data'!B5:C5");
  assert.equal(http.calls[0].url.searchParams.get('valueRenderOption'), 'FORMATTED_VALUE');
  assert.equal(second.page.hasMore, false);
  assert.ok(first.warnings.some(value => value.includes('display precision')));
});

test('Google Sheets rejects unbounded configuration and oversized/misaligned ranges', async () => {
  const options = { ...identity, spreadsheetId: 'id', sheet: 'Sheet1', startRow: 1, endRow: 2, fields: [{ name: 'id', type: 'string' as const }] };
  assert.throws(() => googleSheetsConnector({ ...options, endRow: 100002 }), code('INVALID_CONFIG'));
  const http = transport([{ values: [['one', 'unexpected']] }]);
  await assert.rejects(googleSheetsConnector({ ...options, ...http }).read(), code('INVALID_RESPONSE'));
});

test('Product cursor storage is instance-local, expires, and is bounded to 32 states', async () => {
  const response = { data: { series: [[1, 2]], seriesLabels: ['all'], xValues: ['2026-10-01', '2026-10-02'] } };
  const http = transport(Array.from({ length: 34 }, () => response));
  const options = { id: 'amp', source: 'Analytics', ...http, credentials: () => ({ username: 'u', password: 'p' }) };
  const connector = amplitudeConnector(options);
  const query = { event: '_all', metric: 'totals' as const, startDate: '2026-10-01', endDate: '2026-10-02' };
  const first = await connector.read(query, { limit: 1 });
  await assert.rejects(amplitudeConnector(options).read(query, { cursor: first.page.nextCursor }), code('INVALID_CURSOR'));
  for (let index = 0; index < 32; index++) await connector.read(query, { limit: 1 });
  await assert.rejects(connector.read(query, { cursor: first.page.nextCursor }), code('INVALID_CURSOR'));
  const last = await connector.read(query, { limit: 1 });
  const now = Date.now;
  try { Date.now = () => now() + 300001; await assert.rejects(connector.read(query, { cursor: last.page.nextCursor }), code('INVALID_CURSOR')); }
  finally { Date.now = now; }
});

test('Product transports redact errors, reject unsafe origins and preserve abort signals', async () => {
  const http = transport([new Response('test-secret provider detail', { status: 429 })]);
  const connector = shopifyConnector({ ...identity, ...http, shop: 'demo', apiVersion: '2026-10' });
  await assert.rejects(connector.read({ resource: 'products' }), error => code('RATE_LIMITED')(error) && !String(error).includes('test-secret'));
  assert.equal(http.calls.length, 1);
  assert.throws(() => salesforceConnector({ ...identity, instanceUrl: 'https://user:secret@host.test', apiVersion: '66.0' }), code('INVALID_CONFIG'));
  let calls = 0, signal: AbortSignal | null | undefined;
  const pending = shopifyConnector({ ...identity, shop: 'demo', apiVersion: '2026-10', fetch: async (_input, init) => {
    calls++; signal = init?.signal;
    return new Promise<Response>((_resolve, reject) => signal?.addEventListener('abort', () => reject(new Error('test-secret'))));
  } });
  const controller = new AbortController();
  const read = pending.read({ resource: 'products' }, { signal: controller.signal });
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.abort();
  await assert.rejects(read, code('ABORTED'));
  assert.equal(signal?.aborted, true);
  await assert.rejects(pending.read({ resource: 'products' }, { signal: controller.signal }), code('ABORTED'));
  assert.equal(calls, 1);
});

test('Product HTTP cancellation closes stalled JSON and NDJSON response bodies', { timeout: 2000 }, async () => {
  for (const raw of [false, true]) {
    let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode(raw ? '{"event":' : '{"data":')); },
      // Reader cancellation must not wait for a broken custom transport's cleanup promise.
      cancel() { cancelled++; return new Promise(() => {}); },
    });
    const fetch: typeof globalThis.fetch = async () => new Response(body);
    const read = raw
      ? mixpanelConnector({ ...identity, fetch, projectId: '1', credentials: () => ({ username: 'u', password: 'p' }) }).read({ fromDate: '2026-10-01', toDate: '2026-10-01' }, { timeoutMs: 15 })
      : shopifyConnector({ ...identity, fetch, shop: 'demo', apiVersion: '2026-10' }).read({ resource: 'products' }, { timeoutMs: 15 });
    await assert.rejects(read, code('TIMEOUT'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(cancelled, 1);
    assert.equal(body.locked, false);
  }
});

test('Provider-specific authentication callbacks are captured without freezing token refresh', async () => {
  let token = 'fresh-one';
  const shopHttp = transport(Array.from({ length: 2 }, () => ({ data: { products: { edges: [], pageInfo: { hasNextPage: false } } } })));
  const shopOptions = { ...identity, ...shopHttp, shop: 'demo', apiVersion: '2026-10', token: () => token };
  const shop = shopifyConnector(shopOptions); shopOptions.token = () => 'wrong-account';
  await shop.read({ resource: 'products' }); token = 'fresh-two'; await shop.read({ resource: 'products' });
  assert.deepEqual(shopHttp.calls.map(call => call.headers.get('x-shopify-access-token')), ['fresh-one', 'fresh-two']);

  const segmentHttp = transport([{ traits: {}, cursor: { has_more: false } }]);
  const segmentOptions = { ...identity, ...segmentHttp, spaceId: 'space' };
  const segment = segmentConnector(segmentOptions); segmentOptions.token = () => 'wrong-account';
  await segment.read({ profile: 'user_id:1', resource: 'traits' });
  assert.equal(atob(segmentHttp.calls[0].headers.get('authorization')!.slice(6)), 'test-secret:');

  const mixHttp = transport([new Response('')]), ampHttp = transport([{ data: { series: [], seriesLabels: [], xValues: [] } }]);
  const basicOptions = { ...identity, projectId: '1', credentials: () => ({ username: 'u', password: 'p' }) };
  const mixOptions = { ...basicOptions, ...mixHttp }, ampOptions = { ...basicOptions, ...ampHttp };
  const mix = mixpanelConnector(mixOptions), amplitude = amplitudeConnector(ampOptions);
  mixOptions.credentials = ampOptions.credentials = () => ({ username: 'wrong', password: 'account' });
  await mix.read({ fromDate: '2026-10-01', toDate: '2026-10-01' });
  await amplitude.read({ event: '_all', metric: 'totals', startDate: '2026-10-01', endDate: '2026-10-01' });
  assert.equal(atob(mixHttp.calls[0].headers.get('authorization')!.slice(6)), 'u:p');
  assert.equal(atob(ampHttp.calls[0].headers.get('authorization')!.slice(6)), 'u:p');
});
