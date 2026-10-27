import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { createConnectedData } from '../../../examples/connected/fixture.js';
import { jsonConnector } from '../src/index.js';
import { createConnectorGateway, sqliteConnector } from '../src/server.js';

// A local, entirely fictional fixture. Production applications must supply real authentication.
const data = createConnectedData(), database = new DatabaseSync(':memory:');
database.exec('CREATE TABLE customers(id TEXT, name TEXT, segment TEXT, annual_value INTEGER); CREATE TABLE checkouts(id TEXT, customer_id TEXT, amount INTEGER, status TEXT, blocker TEXT);');
const insertCustomer = database.prepare('INSERT INTO customers VALUES (?, ?, ?, ?)');
for (const row of data.customers) insertCustomer.run(row.id, row.name, row.segment, row.annualValue);
const insertCheckout = database.prepare('INSERT INTO checkouts VALUES (?, ?, ?, ?, ?)');
for (const row of data.checkouts) insertCheckout.run(row.id, data.sessions.find(session => session.id === row.sessionId)!.customerId, row.amount, row.status, row.blocker);
database.exec('PRAGMA query_only = ON');
const sql = sqliteConnector({ id: 'local-sqlite', source: 'Local SQLite demo database', mode: 'fixture', client: database });
const interviews = jsonConnector({ id: 'local-interviews', source: 'Fictional interview snapshot', mode: 'fixture', fields: [
  { name: 'id', type: 'string' }, { name: 'customer', type: 'string' }, { name: 'theme', type: 'string' }, { name: 'stance', type: 'string' }, { name: 'quote', type: 'string' },
], rows: data.interviews.map(row => [row.id, data.customers.find(customer => customer.id === row.customerId)!.name, row.theme, row.stance, row.quote]) });
const gateway = createConnectorGateway({
  // Public localhost fixture only. Do not reuse this authorization policy for private or live data.
  authorize: request => !request.headers.get('origin') || request.headers.get('origin') === 'http://127.0.0.1:5190' ? { subject: 'local-fixture', scope: { dataset: 'fictional' } } : null,
  operations: {
    'customer-exposure': { connector: sql, maxPageSize: 100, parameters: { segment: { type: 'string', values: ['all', 'Growth', 'Enterprise'] } }, query: params => ({
      text: `SELECT c.id, c.name AS customer, c.segment,
        SUM(CASE WHEN b.status = 'abandoned' THEN 1 ELSE 0 END) AS abandoned_checkouts,
        SUM(CASE WHEN b.status = 'abandoned' THEN b.amount ELSE 0 END) AS basket_exposure_usd,
        c.annual_value AS annual_customer_value_usd
        FROM customers c JOIN checkouts b ON b.customer_id = c.id
        WHERE (? = 'all' OR c.segment = ?) GROUP BY c.id ORDER BY basket_exposure_usd DESC`, values: [params.segment, params.segment],
    }) },
    'checkout-records': { connector: sql, maxPageSize: 100, parameters: { segment: { type: 'string', values: ['all', 'Growth', 'Enterprise'] } }, query: params => ({
      text: 'SELECT b.id, c.name AS customer, b.status, b.blocker, b.amount AS attempted_usd FROM checkouts b JOIN customers c ON c.id = b.customer_id WHERE (? = \'all\' OR c.segment = ?) ORDER BY b.amount DESC', values: [params.segment, params.segment],
    }) },
    'interview-evidence': { connector: interviews, maxPageSize: 100, parameters: {}, query: () => undefined },
  },
});
const publicRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const html = fileURLToPath(new URL('./index.html', import.meta.url));
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url ?? '/', 'http://127.0.0.1:5190');
    if (url.pathname === '/api/motif') {
      const controller = new AbortController(); incoming.once('aborted', () => controller.abort());
      const init: RequestInit & { duplex?: string } = { method: incoming.method, headers: incoming.headers as HeadersInit, signal: controller.signal };
      if (incoming.method !== 'GET' && incoming.method !== 'HEAD') { init.body = Readable.toWeb(incoming) as ReadableStream; init.duplex = 'half'; }
      const response = await gateway(new Request(url, init));
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text()); return;
    }
    if (incoming.method !== 'GET') { outgoing.writeHead(405); outgoing.end(); return; }
    if (url.pathname === '/') { outgoing.setHeader('content-type', 'text/html; charset=utf-8'); outgoing.end(await readFile(html)); return; }
    if (url.pathname.startsWith('/lib/')) {
      const path = resolve(publicRoot, url.pathname.slice(5));
      if (!path.startsWith(resolve(publicRoot) + sep) || !path.endsWith('.js')) { outgoing.writeHead(404); outgoing.end(); return; }
      outgoing.setHeader('content-type', 'text/javascript; charset=utf-8'); outgoing.end(await readFile(path)); return;
    }
    outgoing.writeHead(404); outgoing.end();
  } catch { outgoing.writeHead(500); outgoing.end('The local fixture could not be loaded.'); }
});
server.requestTimeout = 30000;
server.listen(5190, '127.0.0.1', () => console.log('Motif connector lab: http://127.0.0.1:5190 — real local SQLite, entirely fictional data.'));
function close() { server.close(() => { database.close(); process.exit(0); }); }
process.once('SIGINT', close); process.once('SIGTERM', close);
