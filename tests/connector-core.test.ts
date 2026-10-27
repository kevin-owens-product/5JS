import assert from 'node:assert/strict';
import test from 'node:test';
import { collectPages, ConnectorError, inferFields, makePage, normalizeCell, runRead, validateIdentity } from '../packages/connectors/src/core.js';
import { endpointConnector, mapRows, validateDataPage } from '../packages/connectors/src/browser.js';
import { createHttpClient } from '../packages/connectors/src/http.js';
import { createConnectorGateway } from '../packages/connectors/src/gateway.js';
import { jsonConnector } from '../packages/connectors/src/adapters/json.js';
import { connectorCatalog } from '../packages/connectors/src/catalog.js';
const identity = { id: 'test', source: 'Test fixture', mode: 'fixture' as const };
const fields = [{ name: 'id', type: 'integer' as const }, { name: 'id', type: 'string' as const }];
const snapshot = () => jsonConnector({ ...identity, fields, rows: [[1n, 'one'], [2n, 'two'], [3n, 'three']] });
const fetchJson = (value: unknown) => (async () => Response.json(value)) as typeof fetch;

test('connector normalization preserves exact values, positional aliases, binary data, and nulls', () => {
  const page = makePage(identity, 'test', fields, [[9007199254740993n, '1.000000000000000001']]);
  assert.deepEqual(page.rows, [['9007199254740993', '1.000000000000000001']]);
  assert.deepEqual(page.fields.map(field => field.name), ['id', 'id']);
  assert.equal(normalizeCell(new Uint8Array([0, 255])), '0x00ff');
  assert.equal(normalizeCell(new Date('2026-10-01T01:02:03Z')), '2026-10-01T01:02:03.000Z');
  assert.equal(normalizeCell(null), null);
  assert.equal(inferFields(['number', 'flag'], [[1, true], [1.5, null]])[0].type, 'number');
  assert.equal(mapRows(page, get => get(1))[0], '1.000000000000000001');
  assert.throws(() => mapRows(page, get => get(2)), /column index/);
});

test('connector normalization rejects lossy values, unsupported objects, circular and sparse arrays', () => {
  for (const value of [Infinity, NaN, 9007199254740992, undefined, new Map(), new Date('bad'), [undefined], Array(1), { nested: Array(1) }]) assert.throws(() => normalizeCell(value), ConnectorError);
  const cycle: any = {}; cycle.self = cycle; assert.throws(() => normalizeCell(cycle), /circular/);
  const poisoned = normalizeCell(JSON.parse('{"__proto__":{"polluted":true}}'));
  assert.equal(Object.getPrototypeOf(poisoned), null); assert.equal(({} as any).polluted, undefined);
  assert.throws(() => makePage(identity, 'test', fields, [[1]]), /do not match/);
  assert.throws(() => makePage(identity, 'test', fields, [Array(2)]), /unsupported/);
});

test('collection follows bounded pages and marks row/page-limited results incomplete', async () => {
  const connector = snapshot();
  const full = await collectPages(connector, undefined, { limit: 1 });
  assert.equal(full.rows.length, 3); assert.equal(full.page.truncated, false);
  const partial = await collectPages(connector, undefined, { limit: 1, maxPages: 2 });
  assert.equal(partial.rows.length, 2); assert.equal(partial.page.truncated, true); assert.ok(partial.page.nextCursor);
  const rest = await connector.read(undefined, { limit: 2, cursor: partial.page.nextCursor }); assert.deepEqual(rest.rows, [['3', 'three']]);
  const capped = await collectPages(connector, undefined, { maxRows: 1 }); assert.equal(capped.rows.length, 1); assert.equal(capped.page.truncated, true);
});

test('collection rejects schema drift and repeated cursors', async () => {
  let calls = 0; const base = snapshot();
  const drift = { ...base, async read() { const p = await base.read(undefined, { limit: 1 }); if (++calls > 1) p.fields[0].name = 'changed'; return p; } };
  await assert.rejects(collectPages(drift, undefined), /schema or source changed/);
  const same = await base.read(undefined, { limit: 1 });
  await assert.rejects(collectPages({ ...base, async read() { return same; } }, undefined), /repeated/);
});

test('collection enforces each requested page size and retains earlier truncation through the final page', async () => {
  const base = snapshot(), first = await base.read(undefined, { limit: 1 }), second = await base.read(undefined, { limit: 1, cursor: first.page.nextCursor });
  const oversized = { ...base, async read(_query: void, options?: { limit?: number }) {
    assert.equal(options?.limit, 1);
    return { ...first, rows: [...first.rows, ...second.rows], page: { hasMore: false, truncated: false } };
  } };
  await assert.rejects(collectPages(oversized, undefined, { limit: 1, maxRows: 10 }), (error: ConnectorError) => error.code === 'INVALID_RESULT');
  let calls = 0;
  const truncated = { ...base, async read() {
    return ++calls === 1
      ? { ...first, page: { ...first.page, truncated: true }, warnings: ['The source omitted rows.'] }
      : { ...second, page: { hasMore: false, truncated: false } };
  } };
  const result = await collectPages(truncated, undefined, { limit: 1 });
  assert.equal(calls, 2); assert.deepEqual(result.rows, [...first.rows, ...second.rows]);
  assert.equal(result.page.hasMore, false); assert.equal(result.page.truncated, true);
  assert.equal(result.page.nextCursor, undefined); assert.ok(result.warnings.includes('The source omitted rows.'));
});

test('collection rejects changes to provider or fixture/live provenance during pagination', async () => {
  const base = snapshot(), first = await base.read(undefined, { limit: 1 });
  for (const change of [{ provider: 'other-provider' }, { mode: 'live' as const }]) {
    let calls = 0;
    const connector = { ...base, async read() {
      return ++calls === 1 ? first : { ...first, provenance: { ...first.provenance, ...change }, page: { hasMore: false, truncated: false } };
    } };
    await assert.rejects(collectPages(connector, undefined), (error: ConnectorError) => error.code === 'SCHEMA_CHANGED');
    assert.equal(calls, 2);
  }
});

test('timeouts and pre-aborted reads are bounded without exposing provider errors', async () => {
  const aborted = new AbortController(); aborted.abort(); let invoked = false;
  await assert.rejects(runRead({ signal: aborted.signal }, async () => { invoked = true; return snapshot().read(); }), (error: ConnectorError) => error.code === 'ABORTED');
  assert.equal(invoked, false);
  await assert.rejects(runRead({ timeoutMs: 2 }, () => new Promise(() => {})), (error: ConnectorError) => error.code === 'TIMEOUT');
  await assert.rejects(runRead({}, async () => { throw Error('password=private-token'); }), error => !String(error).includes('private-token'));
  await assert.rejects(runRead({ limit: 0 }, async () => snapshot().read()), /Page size/);
});

test('HTTP tokens refresh per request; redirects and foreign-origin paths cannot forward credentials', async () => {
  const seen: RequestInit[] = []; let token = 0;
  const http = createHttpClient({ ...identity, baseUrl: 'https://example.test', token: () => `private-${++token}`, fetch: (async (_url, init) => { seen.push(init!); return Response.json({ ok: true }); }) as typeof fetch });
  await http.request('/api/data'); await http.request('/api/data');
  assert.equal(new Headers(seen[0].headers).get('authorization'), 'Bearer private-1');
  assert.equal(new Headers(seen[1].headers).get('authorization'), 'Bearer private-2');
  assert.equal(seen[0].redirect, 'error');
  for (const path of ['https://evil.test', '//evil.test/x', '/\\evil.test/x']) await assert.rejects(http.request(path), ConnectorError);
  for (const baseUrl of ['http://example.test', 'https://user:pass@example.test', 'https://example.test?token=x', 'https://example.test/path']) assert.throws(() => createHttpClient({ ...identity, baseUrl, token: () => 'x' }), ConnectorError);
});

test('HTTP errors withhold response bodies and enforce the streamed byte limit', async () => {
  const http = (fetch: typeof globalThis.fetch) => createHttpClient({ ...identity, baseUrl: 'https://example.test', token: () => 'private-token', fetch, maxResponseBytes: 1024 });
  await assert.rejects(http((async () => new Response('password=private-token', { status: 403 })) as typeof fetch).request('/'), (error: ConnectorError) => error.code === 'AUTHENTICATION' && !error.message.includes('private-token'));
  await assert.rejects(http(fetchJson({ content: 'a'.repeat(1025) })).request('/'), (error: ConnectorError) => error.code === 'RESPONSE_TOO_LARGE');
  await assert.rejects(http((async () => new Response('<html>private</html>')) as typeof fetch).request('/'), (error: ConnectorError) => error.code === 'INVALID_RESPONSE' && !error.message.includes('private'));
});

function setupGateway() {
  const connector = snapshot(); let authorizations = 0;
  const seen: unknown[] = [];
  const gateway = createConnectorGateway({ authorize(request) { authorizations++; const user = request.headers.get('x-test-subject'); return user ? { subject: user, scope: { tenant: user } } : null; }, operations: {
    customers: { connector, parameters: { segment: { type: 'string', values: ['all', 'Growth'] } }, maxPageSize: 2, query(parameters, access) { seen.push([parameters.segment, access.scope?.tenant]); return undefined; } },
  } });
  const request = (payload: unknown, user = 'alice') => gateway(new Request('https://app.test/api/motif', { method: 'POST', headers: { 'content-type': 'application/json', ...(user && { 'x-test-subject': user }) }, body: JSON.stringify(payload) }));
  return { gateway, request, seen, authorizations: () => authorizations };
}

test('gateway requires authorization and rejects arbitrary SQL, source URLs, and unregistered parameters', async () => {
  const { request, seen } = setupGateway();
  assert.equal((await request({ operation: 'customers', parameters: { segment: 'all' } }, '')).status, 403);
  assert.equal((await request({ operation: 'customers', sql: 'DROP TABLE customers' })).status, 400);
  assert.equal((await request({ operation: 'customers', parameters: { segment: 'all', url: 'https://evil.test' } })).status, 400);
  assert.equal((await request({ operation: 'customers', parameters: { segment: 'other' } })).status, 400);
  assert.equal((await request({ operation: '__proto__' })).status, 404);
  assert.equal((await request({ operation: 'customers', parameters: { segment: 'all' }, limit: 3 })).status, 400);
  assert.equal(seen.length, 0);
  assert.throws(() => createConnectorGateway({ operations: {}, authorize: undefined as any }), /authorization/);
});

test('gateway binds continuation to authorized subject, operation and validated parameters', async () => {
  const { request, seen, authorizations } = setupGateway();
  const query = { operation: 'customers', parameters: { segment: 'all' }, limit: 1 };
  const first = await (await request(query)).json();
  assert.ok(first.page.nextCursor); assert.doesNotMatch(first.page.nextCursor, /binding|alice|source/);
  assert.equal((await request({ ...query, cursor: first.page.nextCursor }, 'bob')).status, 400);
  assert.equal((await request({ ...query, parameters: { segment: 'Growth' }, cursor: first.page.nextCursor })).status, 400);
  const second = await (await request({ ...query, cursor: first.page.nextCursor })).json();
  assert.deepEqual(second.rows, [['2', 'two']]); assert.deepEqual(seen, [['all', 'alice'], ['all', 'alice']]); assert.equal(authorizations(), 4);
});

test('browser endpoint and server gateway execute the same registered operation end to end', async () => {
  const { gateway } = setupGateway();
  const client = endpointConnector({ ...identity, endpoint: '/api/motif', fetch: (async (_url, init) => { const headers = new Headers(init?.headers); headers.set('x-test-subject', 'alice'); return gateway(new Request('https://app.test/api/motif', { ...init, headers })); }) as typeof fetch });
  const result = await collectPages(client, { operation: 'customers', parameters: { segment: 'all' } }, { limit: 1 });
  assert.equal(result.rows.length, 3); assert.equal(result.page.truncated, false); assert.equal(result.provenance.mode, 'fixture');
  assert.throws(() => endpointConnector({ ...identity, endpoint: 'https://user:pass@example.test' }), /without credentials/);
});

test('browser boundary rejects malformed schemas and never includes application error text', async () => {
  const page = await snapshot().read();
  assert.throws(() => validateDataPage({ ...page, rows: [[null]] }), /invalid data page/);
  assert.throws(() => validateDataPage({ ...page, page: { hasMore: false, truncated: false, nextCursor: 'unexpected' } }), /continuation/);
  const connector = endpointConnector({ ...identity, endpoint: '/api/motif', fetch: (async () => new Response('private database password', { status: 500 })) as typeof fetch });
  await assert.rejects(connector.read({ operation: 'customers' }), error => !String(error).includes('password'));
});

test('identities and returned provenance reject nonstring identifiers instead of coercing them', async () => {
  const page = await snapshot().read();
  for (const id of [undefined, null, 123, true, { toString: () => 'valid-looking-id' }]) {
    assert.throws(() => validateIdentity({ ...identity, id: id as never }), ConnectorError);
    assert.throws(() => validateDataPage({ ...page, provenance: { ...page.provenance, connectorId: id } }), ConnectorError);
  }
  for (const queryId of [null, 123, true, {}]) {
    assert.throws(() => validateDataPage({ ...page, provenance: { ...page.provenance, queryId } }), ConnectorError);
  }
});

test('browser validation rejects sparse fields, rows, cells, nested cells, and warnings', async () => {
  const page = await snapshot().read();
  for (const malformed of [
    { ...page, fields: Array(2) },
    { ...page, rows: Array(1) },
    { ...page, rows: [Array(2)] },
    { ...page, rows: [[Array(1), 'nested sparse array']] },
    { ...page, warnings: Array(1) },
  ]) assert.throws(() => validateDataPage(malformed), ConnectorError);
});

test('browser endpoint rejects a valid data page that exceeds the caller requested limit', async () => {
  const page = await snapshot().read(undefined, { limit: 2 });
  const connector = endpointConnector({ ...identity, endpoint: '/api/motif', fetch: (async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).limit, 1);
    return Response.json(page);
  }) as typeof fetch });
  await assert.rejects(connector.read({ operation: 'customers' }, { limit: 1 }), (error: ConnectorError) => error.code === 'INVALID_RESPONSE');
});

test('gateway rejects oversized bodies and keeps server query failures out of client responses', async () => {
  const { request } = setupGateway();
  assert.equal((await request({ operation: 'customers', parameters: { segment: 'x'.repeat(17000) } })).status, 400);
  const connector = snapshot();
  const gateway = createConnectorGateway({ authorize: () => ({ subject: 'test' }), operations: { broken: { connector, parameters: {}, query() { throw Error('secret-token-in-query'); } } } });
  const response = await gateway(new Request('https://app.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"operation":"broken"}' }));
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /secret-token/);
});

test('gateway deadline covers stalled authorization and prevents later authorization from executing a query', { timeout: 2000 }, async () => {
  let authorizeCalls = 0, connectorCalls = 0;
  let finishAuthorization!: (access: { subject: string }) => void;
  const pendingAuthorization = new Promise<{ subject: string }>(resolve => { finishAuthorization = resolve; });
  const base = snapshot(), connector = { ...base, async read() { connectorCalls++; return base.read(); } };
  const gateway = createConnectorGateway({ timeoutMs: 15, authorize() { authorizeCalls++; return pendingAuthorization; }, operations: {
    customers: { connector, parameters: {}, query: () => undefined },
  } });
  const response = await gateway(new Request('https://app.test/api/motif', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"operation":"customers"}' }));
  assert.equal(response.status, 504); assert.equal((await response.json()).error.code, 'TIMEOUT');
  assert.equal(authorizeCalls, 1); assert.equal(connectorCalls, 0);
  finishAuthorization({ subject: 'late-user' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(connectorCalls, 0, 'expired authorization must not start provider work');
});

test('gateway deadline cancels a stalled request body before authorization or provider work', { timeout: 2000 }, async () => {
  let bodyCancelled = false, authorizeCalls = 0, connectorCalls = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode('{"operation":')); },
    cancel() { bodyCancelled = true; },
  });
  const base = snapshot(), connector = { ...base, async read() { connectorCalls++; return base.read(); } };
  const gateway = createConnectorGateway({ timeoutMs: 15, authorize() { authorizeCalls++; return { subject: 'test' }; }, operations: {
    customers: { connector, parameters: {}, query: () => undefined },
  } });
  const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit & { duplex: 'half' };
  const response = await gateway(new Request('https://app.test/api/motif', init));
  assert.equal(response.status, 504); assert.equal((await response.json()).error.code, 'TIMEOUT');
  assert.equal(bodyCancelled, true); assert.equal(authorizeCalls, 0); assert.equal(connectorCalls, 0);
});

test('pre-aborted gateway requests invoke neither authorization nor the connector', async () => {
  let authorizeCalls = 0, connectorCalls = 0;
  const base = snapshot(), connector = { ...base, async read() { connectorCalls++; return base.read(); } };
  const gateway = createConnectorGateway({ authorize() { authorizeCalls++; return { subject: 'test' }; }, operations: {
    customers: { connector, parameters: {}, query: () => undefined },
  } });
  const controller = new AbortController(); controller.abort();
  const response = await gateway(new Request('https://app.test/api/motif', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"operation":"customers"}', signal: controller.signal }));
  assert.equal(response.status, 499); assert.equal((await response.json()).error.code, 'ABORTED');
  assert.equal(authorizeCalls, 0); assert.equal(connectorCalls, 0);
});

test('coverage catalog lists all 39 implemented providers with concrete factories', () => {
  assert.equal(new Set(connectorCatalog.map(item => item.name)).size, connectorCatalog.length);
  assert.equal(connectorCatalog.length, 39);
  assert.equal(connectorCatalog.filter(item => item.status === 'implemented').length, 39);
  assert.ok(connectorCatalog.every(item => Array.isArray(item.factories) && item.factories.length > 0 && item.factories.every(name => typeof name === 'string' && name.endsWith('Connector'))));
  assert.equal(connectorCatalog.find(item => item.name === 'PostHog')?.status, 'implemented');
});

test('HTTP cancellation skips authentication when pre-aborted and skips fetch after late authentication', async () => {
  let tokens = 0, calls = 0, finishToken!: (token: string) => void;
  const options = { ...identity, baseUrl: 'https://example.test', token: () => { tokens++; return new Promise<string>(resolve => { finishToken = resolve; }); }, fetch: (async () => { calls++; return Response.json({}); }) as typeof fetch };
  const http = createHttpClient(options), preAborted = new AbortController(); preAborted.abort();
  await assert.rejects(http.request('/', { signal: preAborted.signal }), (error: ConnectorError) => error.code === 'ABORTED');
  assert.equal(tokens, 0); assert.equal(calls, 0);
  const controller = new AbortController(), pending = http.request('/', { signal: controller.signal });
  controller.abort(); finishToken('private-token');
  await assert.rejects(pending, (error: ConnectorError) => error.code === 'ABORTED');
  assert.equal(tokens, 1); assert.equal(calls, 0);
});

test('server HTTP and browser endpoint release stalled response readers on cancellation', { timeout: 2000 }, async () => {
  for (const browser of [false, true]) {
    let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode('{"partial":')); },
      cancel() { cancelled++; return new Promise(() => {}); },
    });
    const fetch: typeof globalThis.fetch = async () => new Response(body);
    if (browser) {
      const endpoint = endpointConnector({ ...identity, endpoint: '/api/motif', fetch });
      await assert.rejects(endpoint.read({ operation: 'customers' }, { timeoutMs: 15 }), (error: ConnectorError) => error.code === 'TIMEOUT');
    } else {
      const controller = new AbortController();
      const pending = createHttpClient({ ...identity, baseUrl: 'https://example.test', token: () => 'token', fetch }).request('/', { signal: controller.signal });
      await new Promise(resolve => setImmediate(resolve)); controller.abort();
      await assert.rejects(pending, (error: ConnectorError) => error.code === 'ABORTED');
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(cancelled, 1); assert.equal(body.locked, false);
  }
});
