import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'packages/connectors');
const typescript = createRequire(import.meta.url)('typescript');
const temporary = await mkdtemp(join(tmpdir(), 'motif-connectors-package-check-'));
const consumer = join(temporary, 'consumer');
const npmCommand = process.env.npm_execpath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const npmPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : [];

function npm(args, cwd, capture = false) {
  return execFileSync(npmCommand, [...npmPrefix, ...args], {
    cwd, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    timeout: 60_000, maxBuffer: 10 * 1024 * 1024,
  });
}

function inside(directory, path) {
  const result = relative(directory, path);
  return result !== '..' && !result.startsWith(`..${sep}`) && !isAbsolute(result);
}

async function verifyReadme(directory) {
  const markdown = (await readFile(join(directory, 'README.md'), 'utf8')).replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
  assert.match(markdown, /Motif Connectors/);
  let checked = 0;
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["'][^\n]*?["'])?\)/g)) {
    const link = match[1] ?? match[2];
    if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('//') || link.startsWith('#')) continue;
    const path = decodeURIComponent(link.split('#')[0].split('?')[0]);
    const destination = resolve(directory, path);
    assert.ok(!isAbsolute(path) && inside(directory, destination), `Packaged README links outside its artifact: ${link}`);
    assert.ok(await stat(destination).then(item => item.isFile()).catch(() => false), `Packaged README has a missing target: ${link}`);
    checked++;
  }
  return checked;
}

async function verifyBrowserGraph(installed) {
  const visited = new Set();
  const allowed = new Set(['dist/index.js', 'dist/browser.js', 'dist/core.js', 'dist/catalog.js', 'dist/adapters/json.js', 'dist/adapters/rest-support.js', 'dist/adapters/files.js']);
  async function visit(path) {
    if (visited.has(path)) return;
    visited.add(path);
    const name = relative(installed, path).split(sep).join('/');
    assert.ok(allowed.has(name), `The browser entry reaches a server or unexpected module: ${name}`);
    const sourceFile = typescript.createSourceFile(path, await readFile(path, 'utf8'), typescript.ScriptTarget.ES2022, true, typescript.ScriptKind.JS);
    const specifiers = [];
    function inspect(node) {
      if ((typescript.isImportDeclaration(node) || typescript.isExportDeclaration(node)) && node.moduleSpecifier) {
        assert.ok(typescript.isStringLiteral(node.moduleSpecifier), `Nonliteral module import in ${name}`);
        specifiers.push(node.moduleSpecifier.text);
      }
      if (typescript.isCallExpression(node) && (node.expression.kind === typescript.SyntaxKind.ImportKeyword || (typescript.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        assert.fail(`The browser entry must not hide runtime module loading in ${name}`);
      }
      typescript.forEachChild(node, inspect);
    }
    inspect(sourceFile);
    for (const specifier of specifiers) {
      assert.ok(specifier.startsWith('./') || specifier.startsWith('../'), `Browser entry depends on an external runtime: ${specifier}`);
      const destination = resolve(dirname(path), specifier);
      assert.ok(inside(installed, destination), 'A browser import escapes the installed package.');
      await visit(destination);
    }
  }
  await visit(join(installed, 'dist/index.js'));
  return visited.size;
}

try {
  const demo = await readFile(join(source, 'examples/index.html'), 'utf8');
  const modules = [...demo.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  assert.equal(modules.length, 1, 'The local demo must expose its browser module for syntax validation.');
  execFileSync(process.execPath, ['--input-type=module', '--check'], { input: modules[0][1], encoding: 'utf8', timeout: 10000 });
  const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
  for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies']) assert.equal(Object.keys(manifest[key] ?? {}).length, 0, `Connectors unexpectedly require ${key}.`);
  // The caller builds first. Packing and installation remain offline and cannot
  // execute package lifecycle hooks or fetch a driver to mask a missing boundary.
  const packed = JSON.parse(npm(['pack', '--ignore-scripts', '--offline', '--json', '--pack-destination', temporary], source, true));
  assert.equal(packed.length, 1, 'Expected one connector tarball.');
  assert.equal(packed[0].name, manifest.name);
  assert.ok(packed[0].files.every(file => ['package.json', 'README.md', 'LICENSE'].includes(file.path) || file.path.startsWith('dist/')), 'Tarball contains files outside the public package.');
  const tarball = join(temporary, packed[0].filename);
  assert.ok(inside(temporary, tarball), 'Invalid tarball path.');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'motif-connectors-external-consumer-check', version: '0.0.0', private: true, type: 'module' }));
  npm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', tarball], consumer);
  const installed = join(consumer, 'node_modules', ...manifest.name.split('/'));
  const actual = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(actual.name, manifest.name); assert.equal(actual.version, manifest.version);
  assert.equal(actual.type, 'module'); assert.equal(actual.license, 'MIT');
  assert.deepEqual(Object.keys(actual.exports).sort(), ['.', './server']);
  assert.deepEqual(actual.exports['.'], { types: './dist/index.d.ts', import: './dist/index.js' });
  assert.deepEqual(actual.exports['./server'], { types: './dist/server.d.ts', import: './dist/server.js' });
  for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies']) assert.equal(Object.keys(actual[key] ?? {}).length, 0);
  assert.deepEqual((await readdir(join(consumer, 'node_modules'))).filter(name => !name.startsWith('.')).sort(), [manifest.name.split('/')[0]], 'Installation pulled in an undeclared runtime package.');
  for (const name of ['README.md', 'LICENSE', 'dist/index.js', 'dist/index.d.ts', 'dist/server.js', 'dist/server.d.ts', 'dist/types.d.ts', 'dist/gateway.js', 'dist/adapters/postgres.d.ts', 'dist/adapters/warehouses.d.ts', 'dist/adapters/databases.d.ts', 'dist/adapters/aws-warehouses.d.ts', 'dist/adapters/product-tools.d.ts', 'dist/adapters/product-analytics.d.ts', 'dist/adapters/google-sheets.d.ts', 'dist/adapters/semantic.d.ts', 'dist/adapters/files.d.ts']) assert.ok((await stat(join(installed, name))).size > 0, `Tarball is missing ${name}.`);
  assert.equal(await readFile(join(installed, 'LICENSE'), 'utf8'), await readFile(join(root, 'LICENSE'), 'utf8'), 'The connector artifact must carry the repository license.');
  const checkedLinks = await verifyReadme(installed);
  const browserModules = await verifyBrowserGraph(installed);
  console.log(`PASS · connector tarball contents, MIT license, ${checkedLinks} documentation links, and ${browserModules} browser modules`);

  const packageName = JSON.stringify(manifest.name), serverName = JSON.stringify(`${manifest.name}/server`);
  await writeFile(join(consumer, 'consumer.mts'), `
import {
  collectPages, endpointConnector, jsonConnector, mapRows, csvConnector, arrowConnector, parquetConnector,
  type Cell, type ConnectorIdentity, type DataConnector, type DataPage,
  type Field, type JsonOptions, type OperationQuery, type ReadOptions, type SqlQuery,
  type CsvOptions, type ArrowOptions, type ParquetOptions, type ConnectorCatalogEntry,
} from ${packageName};
import {
  createConnectorGateway, postgresConnector, mysqlConnector, sqliteConnector, duckdbConnector, mongodbConnector,
  createBigQueryConnector, createSnowflakeConnector, createDatabricksConnector, stripeConnector, hubspotConnector, airtableConnector,
  type AccessContext, type GatewayOptions, type RegisteredOperation,
  type PostgresClient, type MysqlClient, type SqliteClient, type DuckDBClient, type DuckDBBindValue, type MongoOptions,
  type BigQueryParameter, type BigQueryOptions, type SnowflakeOptions, type DatabricksOptions,
  type StripeOptions, type StripeQuery, type HubSpotQuery, type AirtableOptions,
  sqlServerConnector, oracleConnector, clickHouseConnector, elasticsearchConnector, opensearchConnector,
  redisConnector, neo4jConnector, firestoreConnector, supabaseConnector,
  dynamoDBConnector, redshiftConnector, athenaConnector, trinoConnector,
  type SqlServerOptions, type OracleOptions, type ClickHouseClient, type SearchOptions, type RedisClient,
  type Neo4jOptions, type FirestoreOptions, type SupabaseOptions,
  type DynamoDBOptions, type RedshiftOptions, type AthenaOptions, type TrinoOptions,
  salesforceConnector, shopifyConnector, zendeskConnector, intercomConnector, segmentConnector,
  googleAnalyticsConnector, mixpanelConnector, amplitudeConnector, posthogConnector, googleSheetsConnector,
  type SalesforceOptions, type ShopifyOptions, type ZendeskOptions, type IntercomOptions, type SegmentOptions,
  type GoogleAnalyticsOptions, type MixpanelOptions, type AmplitudeOptions, type PostHogOptions, type GoogleSheetsOptions,
  lookerConnector, powerBiConnector, tableauConnector, cubeConnector, dbtSemanticConnector,
  type LookerOptions, type PowerBiOptions, type TableauOptions, type CubeOptions, type DbtSemanticOptions,
} from ${serverName};
// @ts-expect-error Server factories must not leak into the browser entry.
import { postgresConnector as forbiddenBrowserExport } from ${packageName};
// @ts-expect-error Internal files are not exported package entry points.
import { createHttpClient } from ${JSON.stringify(`${manifest.name}/dist/http.js`)};

const identity: ConnectorIdentity = { id: 'consumer', source: 'Consumer fixture', mode: 'fixture' };
const fields: Field[] = [{ name: 'id', type: 'integer' }, { name: 'id', type: 'string' }];
const snapshotOptions: JsonOptions = { ...identity, fields, rows: [[9007199254740993n, 'customer']] };
const snapshot: DataConnector<void> = jsonConnector(snapshotOptions);
const options: ReadOptions = { limit: 1, timeoutMs: 1000 };
const page: DataPage = await collectPages(snapshot, undefined, options);
const values: Cell[] = mapRows(page, get => get(0));
const operation: RegisteredOperation<void> = { connector: snapshot, parameters: {}, query: () => undefined };
const access: AccessContext = { subject: 'consumer', scope: { tenantId: 'fixture' } };
const gatewayOptions: GatewayOptions = { operations: { customers: operation }, authorize: () => access };
const gateway: (request: Request) => Promise<Response> = createConnectorGateway(gatewayOptions);
const browser: DataConnector<OperationQuery> = endpointConnector({ ...identity, endpoint: '/api/data' });
const csv: CsvOptions = { ...identity, data: 'id,revenue\\n1,10.00' };
await csvConnector(csv).read(undefined, options);
declare const arrow: ArrowOptions, parquet: ParquetOptions, catalogEntry: ConnectorCatalogEntry;
await arrowConnector(arrow).read(undefined, options);
await parquetConnector(parquet).read(undefined, options);
const declaredFactories: readonly string[] = catalogEntry.factories;

declare const pg: PostgresClient, mysql: MysqlClient, sqlite: SqliteClient, duckdb: DuckDBClient;
declare const mongo: MongoOptions, bq: BigQueryOptions, snowflake: SnowflakeOptions, databricks: DatabricksOptions;
declare const stripe: StripeOptions, airtable: AirtableOptions;
const sql: SqlQuery = { text: 'select $1', values: ['safe binding'] };
const duckValue: DuckDBBindValue = 9007199254740993n;
const parameter: BigQueryParameter = { name: 'tenant', parameterType: { type: 'STRING' }, parameterValue: { value: 'fixture' } };
const stripeQuery: StripeQuery = { resource: 'customers' };
const hubspotQuery: HubSpotQuery = { object: 'contacts', properties: ['email'] };
await postgresConnector({ ...identity, client: pg }).read(sql, options);
await mysqlConnector({ ...identity, client: mysql, provider: 'mariadb' }).read(sql);
await sqliteConnector({ ...identity, client: sqlite }).read(sql);
await duckdbConnector({ ...identity, client: duckdb }).read({ text: 'select $1', values: [duckValue] });
await mongodbConnector(mongo).read({ filter: { tenant: 'fixture' } });
await createBigQueryConnector(bq).read({ text: 'select @tenant', parameters: [parameter] });
await createSnowflakeConnector(snowflake).read({ text: 'select ?', bindings: { '1': { type: 'TEXT', value: 'fixture' } } });
await createDatabricksConnector(databricks).read({ text: 'select :tenant', parameters: [{ name: 'tenant', type: 'STRING', value: 'fixture' }] });
await stripeConnector(stripe).read(stripeQuery);
await hubspotConnector({ ...identity, token: () => 'fixture' }).read(hubspotQuery);
await airtableConnector(airtable).read({ fields: ['Name'] });
declare const sqlServer: SqlServerOptions, oracle: OracleOptions, clickHouse: ClickHouseClient, search: SearchOptions, redis: RedisClient;
declare const neo4j: Neo4jOptions, firestore: FirestoreOptions, supabase: SupabaseOptions;
declare const dynamo: DynamoDBOptions, redshift: RedshiftOptions, athena: AthenaOptions, trino: TrinoOptions;
await sqlServerConnector(sqlServer).read({ text: 'SELECT @tenant', parameters: { tenant: { value: 'fixture' } } });
await oracleConnector(oracle).read({ text: 'SELECT :tenant FROM dual', binds: { tenant: 'fixture' } });
await clickHouseConnector({ ...identity, client: clickHouse }).read({ text: 'SELECT {tenant:String}', parameters: { tenant: 'fixture' } });
await elasticsearchConnector(search).read({ query: { term: { tenant: 'fixture' } } });
await opensearchConnector(search).read({ source: ['customer_id'] });
await redisConnector({ ...identity, client: redis }).read({ keys: ['customer:1'] });
await neo4jConnector(neo4j).read({ text: 'MATCH (n) WHERE n.tenant = $tenant RETURN n.id', parameters: { tenant: 'fixture' } });
await firestoreConnector(firestore).read(undefined);
await supabaseConnector(supabase).read({ equals: { tenant: 'fixture', deleted: null }, order: { column: 'id' } });
await dynamoDBConnector(dynamo).read({ keyConditionExpression: '#tenant = :tenant', expressionAttributeNames: { '#tenant': 'tenant' }, expressionAttributeValues: { ':tenant': { S: 'fixture' } } });
await redshiftConnector(redshift).read({ text: 'SELECT :tenant', parameters: [{ name: 'tenant', value: 'fixture' }] });
await athenaConnector(athena).read({ text: 'SELECT id FROM customers WHERE tenant = ?', executionParameters: ["'fixture'"] });
await trinoConnector(trino).read({ text: 'SELECT id FROM approved_customers' });
declare const salesforce: SalesforceOptions, shopify: ShopifyOptions, zendesk: ZendeskOptions, intercom: IntercomOptions, segment: SegmentOptions;
declare const analytics: GoogleAnalyticsOptions, mixpanel: MixpanelOptions, amplitude: AmplitudeOptions, posthog: PostHogOptions, sheets: GoogleSheetsOptions;
await salesforceConnector(salesforce).read({ soql: 'SELECT Id FROM Account' });
await shopifyConnector(shopify).read({ resource: 'orders' });
await zendeskConnector(zendesk).read({ resource: 'tickets' });
await intercomConnector(intercom).read(undefined);
await segmentConnector(segment).read({ profile: 'user_id:fixture', resource: 'traits' });
await googleAnalyticsConnector(analytics).read({ dimensions: ['date'], metrics: ['sessions'], startDate: '2026-01-01', endDate: '2026-01-31' });
await mixpanelConnector(mixpanel).read({ fromDate: '2026-01-01', toDate: '2026-01-02', events: ['checkout'] });
await amplitudeConnector(amplitude).read({ event: 'checkout', metric: 'uniques', startDate: '20260101', endDate: '20260102' });
await posthogConnector(posthog).read({ variables: { tenant: 'fixture' } });
await googleSheetsConnector(sheets).read(undefined);
declare const looker: LookerOptions, powerBi: PowerBiOptions, tableau: TableauOptions, cube: CubeOptions, dbt: DbtSemanticOptions;
await lookerConnector(looker).read({ model: 'analytics', view: 'customers', fields: ['customers.id'] });
await powerBiConnector(powerBi).read({ tableExpression: 'Customers', fields: [{ name: 'Customers[id]', type: 'string' }] });
await tableauConnector(tableau).read({ filters: { Region: 'West' } });
await cubeConnector(cube).read({ measures: ['Orders.count'], dimensions: ['Orders.status'] });
await dbtSemanticConnector(dbt).read({ metrics: [{ name: 'revenue' }], groupBy: [{ name: 'metric_time', grain: 'MONTH' }] });
void [gateway, browser, values, declaredFactories];
`);
  await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], strict: true, noEmit: true, types: [], skipLibCheck: false }, files: ['consumer.mts'] }));
  // TypeScript is only a build tool from this checkout. Module/type resolution
  // starts at the separate consumer and its tarball, with no ambient Node types.
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--project', join(consumer, 'tsconfig.json')], { cwd: consumer, stdio: 'inherit', timeout: 60_000 });
  console.log('PASS · isolated consumer declarations, public adapter types, and package export restrictions');

  await writeFile(join(consumer, 'runtime.mjs'), `
import assert from 'node:assert/strict';
globalThis.fetch = async () => { throw new Error('Package verification must not use a network.'); };
globalThis.window = {};
const motif = await import(${packageName});
assert.deepEqual(Object.keys(motif).sort(), ['ConnectorError', 'collectPages', 'connectorCatalog', 'endpointConnector', 'inferFields', 'jsonConnector', 'makePage', 'mapRows', 'normalizeCell', 'validateDataPage', 'csvConnector', 'arrowConnector', 'parquetConnector'].sort());
const rows = [[9007199254740993n, 'first'], [2n, 'second'], [3n, 'third']];
const snapshot = motif.jsonConnector({ id: 'customer-fixture', source: 'Installed package fixture', mode: 'fixture', fields: [{ name: 'id', type: 'integer' }, { name: 'id', type: 'string' }], rows });
rows[0][1] = 'mutated input';
const first = await snapshot.read(undefined, { limit: 1 });
assert.deepEqual(first.rows, [['9007199254740993', 'first']]);
assert.deepEqual(first.fields.map(field => field.name), ['id', 'id']);
assert.equal(first.page.hasMore, true); assert.ok(first.page.nextCursor);
assert.deepEqual((await snapshot.read(undefined, { limit: 1, cursor: first.page.nextCursor })).rows, [['2', 'second']]);
const full = await motif.collectPages(snapshot, undefined, { limit: 1 });
assert.equal(full.rows.length, 3); assert.equal(full.page.truncated, false);
assert.equal((await motif.collectPages(snapshot, undefined, { limit: 1, maxPages: 2 })).page.truncated, true);
const csv = motif.csvConnector({ id: 'csv-fixture', source: 'Installed CSV fixture', mode: 'fixture', data: ${JSON.stringify('id,id,notes\r\n9223372036854775807,0001,"line one\nline two"\r\n2,02,plain\r\n')} });
const csvPage = await motif.collectPages(csv, undefined, { limit: 1 });
assert.deepEqual(csvPage.fields.map(field => field.name), ['id', 'id', 'notes']);
assert.deepEqual(csvPage.rows, [['9223372036854775807', '0001', 'line one\\nline two'], ['2', '02', 'plain']]);
assert.equal(csvPage.page.truncated, false);
assert.equal((await motif.collectPages(csv, undefined, { limit: 1, maxRows: 1 })).page.truncated, true);
const server = await import(${serverName});
assert.deepEqual(Object.keys(server).sort(), ['createConnectorGateway', 'postgresConnector', 'mysqlConnector', 'sqliteConnector', 'duckdbConnector', 'mongodbConnector', 'createBigQueryConnector', 'createSnowflakeConnector', 'createDatabricksConnector', 'stripeConnector', 'hubspotConnector', 'airtableConnector', 'sqlServerConnector', 'oracleConnector', 'clickHouseConnector', 'elasticsearchConnector', 'opensearchConnector', 'redisConnector', 'neo4jConnector', 'firestoreConnector', 'supabaseConnector', 'dynamoDBConnector', 'redshiftConnector', 'athenaConnector', 'trinoConnector', 'salesforceConnector', 'shopifyConnector', 'zendeskConnector', 'intercomConnector', 'segmentConnector', 'googleAnalyticsConnector', 'mixpanelConnector', 'amplitudeConnector', 'posthogConnector', 'googleSheetsConnector', 'lookerConnector', 'powerBiConnector', 'tableauConnector', 'cubeConnector', 'dbtSemanticConnector'].sort());
const implementations = { ...motif, ...server };
assert.equal(motif.connectorCatalog.length, 39);
for (const entry of motif.connectorCatalog) {
  assert.equal(entry.status, 'implemented'); assert.ok(entry.factories.length > 0);
  for (const factory of entry.factories) assert.equal(typeof implementations[factory], 'function', entry.name + ' advertises an unavailable factory: ' + factory);
}
assert.throws(() => server.createConnectorGateway({ operations: {}, authorize: () => null }), error => error.code === 'SERVER_ONLY');
assert.throws(() => server.postgresConnector({ id: 'pg', source: 'Fixture', client: {} }), error => error.code === 'SERVER_ONLY');
await assert.rejects(import(${JSON.stringify(`${manifest.name}/dist/http.js`)}), error => error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
delete globalThis.window;
let authorized = 0, executed = 0;
const gateway = server.createConnectorGateway({
  authorize(request) { authorized++; const subject = request.headers.get('x-test-subject'); return subject ? { subject, scope: { tenant: subject } } : null; },
  operations: { customers: { connector: snapshot, parameters: { cohort: { type: 'string', values: ['retained'] } }, maxPageSize: 1,
    query(parameters, access) { executed++; assert.equal(parameters.cohort, 'retained'); assert.equal(access.scope.tenant, 'alice'); return undefined; },
  } },
});
const requests = [];
const endpoint = motif.endpointConnector({ id: 'application', source: 'Authorized fixture', endpoint: '/api/motif/data',
  async fetch(url, init) {
    assert.equal(url, '/api/motif/data'); assert.equal(init.credentials, 'same-origin'); assert.equal(init.redirect, 'error');
    const payload = JSON.parse(init.body); requests.push(payload); assert.equal(payload.operation, 'customers'); assert.equal(payload.sql, undefined);
    const headers = new Headers(init.headers); headers.set('x-test-subject', 'alice');
    return gateway(new Request('https://app.invalid/api/motif/data', { ...init, headers }));
  },
});
const result = await motif.collectPages(endpoint, { operation: 'customers', parameters: { cohort: 'retained' } }, { limit: 1 });
assert.deepEqual(result.rows, full.rows); assert.equal(result.provenance.mode, 'fixture'); assert.equal(result.page.truncated, false);
assert.equal(authorized, 3); assert.equal(executed, 3); assert.ok(requests[1].cursor); assert.notEqual(requests[1].cursor, first.page.nextCursor);
const request = (body, subject) => new Request('https://app.invalid/api/motif/data', { method: 'POST', headers: { 'content-type': 'application/json', ...(subject && { 'x-test-subject': subject }) }, body: JSON.stringify(body) });
assert.equal((await gateway(request(requests[0]))).status, 403);
assert.equal((await gateway(request(requests[1], 'bob'))).status, 400);
assert.equal((await gateway(request({ ...requests[0], sql: 'select unregistered_data' }, 'alice'))).status, 400);
assert.equal(executed, 3);
console.log('PASS · all 39 catalog entries resolve to installed factories; browser/server exports, JSON/CSV pagination and authorized gateway work without network access');
`);
  execFileSync(process.execPath, ['runtime.mjs'], { cwd: consumer, stdio: 'inherit', timeout: 60_000 });
  console.log(`PASS · ${packed[0].filename} installs and runs in an isolated consumer with no runtime dependencies.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
