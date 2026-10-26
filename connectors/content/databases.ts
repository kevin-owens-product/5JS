import type { ConnectorGuide } from './types.js';

const snapshotOutput = `  if (page.page.truncated || page.page.hasMore) {
    throw new Error('Incomplete snapshot: narrow the approved query.');
  }
  // Keep positional rows aligned with fields; exact decimals stay strings.
  console.log(page.fields, page.provenance, page.warnings);
  console.table(page.rows);`;

const server = 'Node.js 22.16+ on your server. Build the private motif-connectors workspace package and install it by local path; install the named SDK separately. No npm release is implied. Keep credentials and authorization on the server.';
const snapshot = 'One bounded snapshot, without a continuation cursor. If hasMore or truncated is true, narrow the query before treating the result as complete.';
const sqlLimit = 'Returned-row limits do not cap scans, sorting, execution cost, or driver memory. Use approved queries, read-only privileges, and provider execution budgets.';

export const databaseGuides: ConnectorGuide[] = [
  {
    slug: 'postgresql', catalogName: 'PostgreSQL', name: 'PostgreSQL', factory: 'postgresConnector', monogram: 'PG', accent: '#8bbce8', runtime: 'server',
    headline: 'Follow a failed checkout back to its account.',
    description: 'Read a scoped PostgreSQL result with bound parameters, column metadata, and source provenance. Keep exact identifiers and monetary values intact for linked investigations.',
    outcome: 'conversion',
    prerequisites: [server, 'Install pg and its TypeScript declarations. Set DATABASE_URL for a read-only role with verified TLS configured for your deployment.', 'Create an approved_checkout_attempts view with tenant_id, attempt_id, account_id, status, and amount. The tenant value below is an example server-authorized scope.'],
    capabilities: [
      { title: 'Bound SQL values', body: 'Use PostgreSQL $1 placeholders while keeping the statement in your application.' },
      { title: 'Positional records', body: 'Column order and duplicate names survive the read; fields include available native type metadata.' },
      { title: 'Traceable snapshots', body: 'Rows carry a public source label, fetch time, warnings, and explicit completeness.' },
    ],
    limitations: [snapshot, sqlLimit, 'The pg result may fully materialize before slicing. Timeout is cooperative and does not cancel the server query; configure statement_timeout. Driver parsing can already have rounded values; cast exact numbers and timestamps to text or configure parsers.'],
    sample: { title: 'Read payment failures for an approved tenant', filename: 'postgres-checkouts.ts', description: 'SQL returns up to one lookahead row. The sample casts identifiers and amount to text before they reach JavaScript.', code: `import { Pool } from 'pg';
import { postgresConnector } from 'motif-connectors/server';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL.');
const pool = new Pool({ connectionString: url, statement_timeout: 5_000 });
try {
  const connector = postgresConnector({
    id: 'checkout-ledger', source: 'Approved checkout attempts', client: pool,
  });
  const page = await connector.read({
    text: \`SELECT attempt_id::text, account_id::text, amount::text
      FROM approved_checkout_attempts
      WHERE tenant_id = $1 AND status = $2
      ORDER BY attempt_id LIMIT 101\`,
    values: ['tenant-demo', 'payment_timeout'],
  }, { limit: 100, timeoutMs: 6_000 });
${snapshotOutput}
} finally {
  await pool.end();
}` },
    workflow: { question: 'Which accounts have repeated payment-timeout attempts?', join: 'Join attempt_id to web-session events and account_id to CRM context; preserve one row per attempt.', action: 'Review retry behavior and propose a resumable-checkout experiment for the affected cohort.', measure: 'Compare completed/started attempts in a fixed experiment window, with duplicate-charge and refund guardrails.' },
    docs: [{ label: 'node-postgres queries', url: 'https://node-postgres.com/features/queries' }, { label: 'PostgreSQL statement timeouts', url: 'https://www.postgresql.org/docs/current/runtime-config-client.html' }],
  },
  {
    slug: 'mysql', catalogName: 'MySQL / MariaDB', name: 'MySQL', factory: 'mysqlConnector', monogram: 'MY', accent: '#f1bf8d', runtime: 'server',
    headline: 'Connect order friction to the buying journey.',
    description: 'Read MySQL through the mysql2 promise driver, using prepared execution and array rows. Bring order-state evidence into a conversion review without collapsing exact values.',
    outcome: 'conversion',
    prerequisites: [server, 'Install mysql2. Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE for a read-only account; configure verified TLS when required by your deployment.', 'Provide an approved_orders view with tenant_id, order_id, customer_id, total, and status. Replace tenant-demo with a scope authorized by your server.'],
    capabilities: [
      { title: 'Prepared execution', body: 'Bind values through ? placeholders with the mysql2 execute API.' },
      { title: 'Exact-value options', body: 'Use big-number strings, decimal strings, and date strings in the caller-owned client.' },
      { title: 'Stable column order', body: 'Array rows retain duplicate aliases alongside field metadata.' },
    ],
    limitations: [snapshot, sqlLimit, 'Use mysql2/promise and disable multipleStatements. Results can materialize before slicing; cooperative timeout does not stop server work. Precision lost by a driver parser cannot be recovered.'],
    sample: { title: 'Inspect orders awaiting payment', filename: 'mysql-orders.ts', description: 'This one-shot server script owns the connection. Long-running applications can inject their configured pool instead.', code: `import mysql from 'mysql2/promise';
import { mysqlConnector } from 'motif-connectors/server';

const { MYSQL_HOST: host, MYSQL_USER: user, MYSQL_PASSWORD: password,
  MYSQL_DATABASE: database } = process.env;
if (!host || !user || !password || !database) throw new Error('Set MySQL connection variables.');
const client = await mysql.createConnection({
  host, user, password, database, multipleStatements: false,
  supportBigNumbers: true, bigNumberStrings: true,
  decimalNumbers: false, dateStrings: true,
});
try {
  const connector = mysqlConnector({ id: 'orders', source: 'Approved orders', client });
  const page = await connector.read({
    text: \`SELECT CAST(order_id AS CHAR), CAST(customer_id AS CHAR), total
      FROM approved_orders WHERE tenant_id = ? AND status = ?
      ORDER BY order_id LIMIT 101\`,
    values: ['tenant-demo', 'awaiting_payment'],
  }, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput}
} finally {
  await client.end();
}` },
    workflow: { question: 'Where do otherwise active customers leave orders awaiting payment?', join: 'Link order_id to checkout attempts and customer_id to session history; distinguish an order from its retries.', action: 'Inspect the payment step with customers before selecting a recovery experiment.', measure: 'Track completion per started order, payment errors, and duplicate charges in a defined test window.' },
    docs: [{ label: 'mysql2 documentation', url: 'https://sidorares.github.io/node-mysql2/docs' }, { label: 'Prepared statements', url: 'https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements' }],
  },
  {
    slug: 'mariadb', catalogName: 'MySQL / MariaDB', name: 'MariaDB', factory: 'mysqlConnector', monogram: 'MA', accent: '#9dd6cf', runtime: 'server',
    headline: 'Turn subscription records into a renewal review.',
    description: 'Use the mysql2 adapter against a compatible MariaDB server, with MariaDB provenance. Explore renewal context alongside usage and support signals.',
    outcome: 'retention',
    prerequisites: [server, 'Install mysql2; this adapter does not accept the separate mariadb driver. Set MARIADB_HOST, MARIADB_USER, MARIADB_PASSWORD, and MARIADB_DATABASE, with deployment-appropriate verified TLS.', 'Grant a read-only account access to approved_renewals(account_id, tenant_id, renewal_days, annual_value). Server authorization must determine the tenant.'],
    capabilities: [
      { title: 'MariaDB provenance', body: "Set provider: 'mariadb' while retaining the shared typed read contract." },
      { title: 'Bound renewal scopes', body: 'Use prepared values for an approved tenant and renewal window.' },
      { title: 'Exact contract amounts', body: 'Keep DECIMAL values as strings rather than approximate chart numbers.' },
    ],
    limitations: [snapshot, sqlLimit, 'Compatibility depends on your MariaDB server and mysql2 configuration. Disable multiple statements; the adapter supplies no MariaDB-specific SQL translation, streaming, or native query cancellation.'],
    sample: { title: 'Read upcoming renewals', filename: 'mariadb-renewals.ts', description: 'Contract value is context for review, not a prediction of churn or recovered revenue.', code: `import mysql from 'mysql2/promise';
import { mysqlConnector } from 'motif-connectors/server';

const { MARIADB_HOST: host, MARIADB_USER: user, MARIADB_PASSWORD: password,
  MARIADB_DATABASE: database } = process.env;
if (!host || !user || !password || !database) throw new Error('Set MariaDB connection variables.');
const client = await mysql.createConnection({
  host, user, password, database, multipleStatements: false,
  supportBigNumbers: true, bigNumberStrings: true,
  decimalNumbers: false, dateStrings: true,
});
try {
  const connector = mysqlConnector({
    id: 'renewals', source: 'Approved renewal ledger', provider: 'mariadb', client,
  });
  const page = await connector.read({
    text: \`SELECT CAST(account_id AS CHAR), renewal_days, annual_value
      FROM approved_renewals WHERE tenant_id = ? AND renewal_days <= ?
      ORDER BY renewal_days, account_id LIMIT 101\`,
    values: ['tenant-demo', 30],
  }, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput}
} finally {
  await client.end();
}` },
    workflow: { question: 'Which upcoming renewals also show falling usage and unresolved support?', join: 'Join one renewal record per account to comparable usage windows and open support conversations.', action: 'Prepare an owner-reviewed outreach queue after checking each account’s context.', measure: 'Measure review coverage and subsequent usage; evaluate renewal outcomes separately from the review signal.' },
    docs: [{ label: 'mysql2 driver', url: 'https://sidorares.github.io/node-mysql2/docs' }, { label: 'MariaDB SELECT reference', url: 'https://mariadb.com/docs/server/reference/sql-statements/data-manipulation/selecting-data/select' }],
  },
  {
    slug: 'sqlite', catalogName: 'SQLite', name: 'SQLite', factory: 'sqliteConnector', monogram: 'SQ', accent: '#9ecdf1', runtime: 'server',
    headline: 'Explore a local product snapshot with exact integers.',
    description: 'Use Node’s built-in SQLite driver for a local, inspectable analysis. Positional iteration and one-row lookahead make completeness visible without loading every returned row.',
    outcome: 'product',
    prerequisites: [server, 'Use node:sqlite DatabaseSync on Node 22.16 or newer; no separate SQLite SDK is needed.', 'Set SQLITE_PATH to an approved existing database containing feature_usage(account_id, feature_id, sessions). Open the file read-only and authorize access through your application.'],
    capabilities: [
      { title: 'Exact integer reads', body: 'The adapter enables BigInt reads and normalizes them to decimal strings.' },
      { title: 'Bounded iteration', body: 'Read until the row limit plus a lookahead row, then release the active iterator.' },
      { title: 'Portable local evidence', body: 'A source-labeled file can support reproducible prototype and research reviews.' },
    ],
    limitations: [snapshot, 'SQLite runs synchronously. A JavaScript timeout or new abort event cannot interrupt a statement blocking the event loop; sorting and scans can still be expensive.', 'SQLite REAL is binary floating-point. Store exact monetary amounts as integer minor units or text; the connector cannot reconstruct lost decimal precision.'],
    sample: { title: 'Read feature adoption from a local snapshot', filename: 'sqlite-feature-usage.ts', description: 'The application owns the read-only file and closes it after the read.', code: `import { DatabaseSync } from 'node:sqlite';
import { sqliteConnector } from 'motif-connectors/server';

const path = process.env.SQLITE_PATH;
if (!path) throw new Error('Set SQLITE_PATH.');
const client = new DatabaseSync(path, { readOnly: true });
try {
  const connector = sqliteConnector({
    id: 'feature-usage', source: 'Approved local feature snapshot', client,
  });
  const page = await connector.read({
    text: \`SELECT account_id, feature_id, sessions
      FROM feature_usage WHERE feature_id = ?
      ORDER BY account_id LIMIT 101\`,
    values: ['guided-workspace'],
  }, { limit: 100 });
${snapshotOutput}
} finally {
  client.close();
}` },
    workflow: { question: 'Which accounts tried a feature but did not repeat the behavior?', join: 'Join account_id and feature_id to interview evidence, keeping the usage observation window explicit.', action: 'Choose a balanced interview sample and test a specific usability hypothesis.', measure: 'Track repeat use and task success with the same eligibility rules before and after a prototype test.' },
    docs: [{ label: 'Node SQLite API', url: 'https://nodejs.org/api/sqlite.html' }],
  },
  {
    slug: 'duckdb', catalogName: 'DuckDB', name: 'DuckDB', factory: 'duckdbConnector', monogram: 'DU', accent: '#eddf8a', runtime: 'server',
    headline: 'Ask product questions of a local analytical dataset.',
    description: 'Read analytical SQL through the official DuckDB Node API. Exact JSON conversion keeps DECIMAL, BIGINT, and high-precision time values available for deliberate mapping.',
    outcome: 'product',
    prerequisites: [server, 'Install @duckdb/node-api, the official Neo API; the older callback-based duckdb package is not supported.', 'Set DUCKDB_PATH to an approved existing database with feature_summary(feature_id, account_count, interview_count). The sample opens it read-only.'],
    capabilities: [
      { title: 'Analytical SQL', body: 'Execute application-owned SQL with positional parameter values.' },
      { title: 'Lossless JSON conversion', body: 'Use the official reader’s JSON representations for exact numeric and temporal types.' },
      { title: 'Reader ownership', body: 'The adapter releases its result reader when supported, while your application owns the connection.' },
    ],
    limitations: [snapshot, 'DuckDB reads vector-sized chunks and can overfetch. A returned-row cap does not limit query processing or memory used for joins and aggregates.', 'Cancellation is cooperative and does not interrupt a shared connection. Bindings support null, booleans, numbers, bigints, and strings; complex bindings need an application-owned operation.'],
    sample: { title: 'Compare adoption and research coverage', filename: 'duckdb-feature-summary.ts', description: 'The source view defines the account and interview grains; their counts should not be treated as equivalent evidence.', code: `import { DuckDBInstance } from '@duckdb/node-api';
import { duckdbConnector } from 'motif-connectors/server';

const path = process.env.DUCKDB_PATH;
if (!path) throw new Error('Set DUCKDB_PATH.');
const instance = await DuckDBInstance.create(path, { access_mode: 'READ_ONLY' });
const client = await instance.connect();
try {
  const connector = duckdbConnector({
    id: 'feature-summary', source: 'Approved feature summary', client,
  });
  const page = await connector.read({
    text: \`SELECT feature_id, account_count, interview_count
      FROM feature_summary WHERE account_count >= $1
      ORDER BY feature_id LIMIT 101\`,
    values: [10],
  }, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput}
} finally {
  client.closeSync();
  instance.closeSync();
}` },
    workflow: { question: 'Which widely used features have little qualitative research coverage?', join: 'Join feature_id to a research catalog and deduplicate interviewed accounts separately from interview records.', action: 'Prioritize unanswered questions for a research round rather than ranking features by request counts alone.', measure: 'Track recruited account coverage, task success, and contradictory findings before committing delivery capacity.' },
    docs: [{ label: 'DuckDB Node Neo API', url: 'https://duckdb.org/docs/stable/clients/node_neo/overview' }],
  },
  {
    slug: 'mongodb', catalogName: 'MongoDB', name: 'MongoDB', factory: 'mongodbConnector', monogram: 'MO', accent: '#a9d88e', runtime: 'server',
    headline: 'Bring document evidence into a retention review.',
    description: 'Read a configured MongoDB collection using filters, projections, and sort order. Canonical BSON Extended JSON retains the meaning of IDs, decimals, integers, and dates.',
    outcome: 'retention',
    prerequisites: [server, 'Install mongodb. Set MONGODB_URI for an authorized read-only database user; the example uses database product and collection account_health.', 'Documents should contain tenantId, accountId, renewalDays, and lastSeenAt. Approve the projection and tenant filter on your server.'],
    capabilities: [
      { title: 'Scoped document reads', body: 'Find documents in a configured collection with explicit projection and ordering.' },
      { title: 'BSON semantics retained', body: 'Canonical EJSON keeps ObjectId, Decimal128, Int64, and date wrappers.' },
      { title: 'Execution budget', body: 'Forward an abort signal and maxTimeMS, then close the owned find cursor.' },
    ],
    limitations: [snapshot, 'This adapter supports find, not aggregation pipelines, change streams, or writes. Canonical EJSON documents need explicit mapping before visualization.', 'Provider indexing and query shape still determine execution cost. A returned document is one record, not automatically one distinct customer.'],
    sample: { title: 'Inspect accounts approaching renewal', filename: 'mongodb-account-health.ts', description: 'The wrapper values are intentional. Do not flatten exact BSON numbers into JavaScript numbers without a precision policy.', code: `import { BSON, MongoClient } from 'mongodb';
import { mongodbConnector } from 'motif-connectors/server';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Set MONGODB_URI.');
const client = new MongoClient(uri);
await client.connect();
try {
  const connector = mongodbConnector({
    id: 'account-health', source: 'Approved account health documents',
    collection: client.db('product').collection('account_health'),
    serialize: BSON.EJSON.serialize, maxTimeMS: 5_000,
  });
  const page = await connector.read({
    filter: { tenantId: 'tenant-demo', renewalDays: { $lte: 30 } },
    projection: { accountId: 1, renewalDays: 1, lastSeenAt: 1 },
    sort: { renewalDays: 1, _id: 1 },
  }, { limit: 100, timeoutMs: 6_000 });
${snapshotOutput}
} finally {
  await client.close();
}` },
    workflow: { question: 'Which near-renewal accounts need their usage context reviewed?', join: 'Map accountId from each document to CRM owners and open support conversations, with a documented deduplication rule.', action: 'Prepare a contextual account review before proposing outreach.', measure: 'Monitor review coverage, subsequent usage, and customer feedback; do not label the filter a churn prediction.' },
    docs: [{ label: 'MongoDB Node cursor guide', url: 'https://www.mongodb.com/docs/drivers/node/current/crud/query/cursor/' }, { label: 'Extended JSON', url: 'https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/' }],
  },
  {
    slug: 'sql-server', catalogName: 'SQL Server', name: 'SQL Server', factory: 'sqlServerConnector', monogram: 'MS', accent: '#eaa7ad', runtime: 'server',
    headline: 'Link enterprise account signals to a concrete review.',
    description: 'Read a single SQL Server result set through fresh mssql requests, typed named parameters, and positional rows. Connect operational records to a defensible renewal workflow.',
    outcome: 'retention',
    prerequisites: [server, 'Install mssql and its TypeScript declarations. Set MSSQL_CONNECTION_STRING with read-only access, encryption, and certificate validation appropriate to your server.', 'Provide dbo.approved_account_usage with tenant_id, account_id, sessions_7d, and renewal_days. Configure a server-authorized tenant scope.'],
    capabilities: [
      { title: 'Typed named parameters', body: 'Bind @tenant using an explicit mssql type when your schema requires it.' },
      { title: 'Request-level cancellation', body: 'Create a fresh request for each read; the adapter attempts to cancel that request on abort.' },
      { title: 'Single-result metadata', body: 'Preserve field order and native metadata from one positional result set.' },
    ],
    limitations: [snapshot, sqlLimit, 'The driver can materialize the full result before slicing. Use one result set; multiple result sets are rejected. Cast large integers, exact decimals, and precise timestamps to text before a lossy driver conversion.'],
    sample: { title: 'Read renewal usage signals', filename: 'sql-server-account-usage.ts', description: 'The request factory returns a new object for each read; the application retains the connection pool.', code: `import sql from 'mssql';
import { sqlServerConnector } from 'motif-connectors/server';

const connectionString = process.env.MSSQL_CONNECTION_STRING;
if (!connectionString) throw new Error('Set MSSQL_CONNECTION_STRING.');
const pool = await new sql.ConnectionPool(connectionString).connect();
try {
  const connector = sqlServerConnector({
    id: 'account-usage', source: 'Approved account usage',
    request: () => pool.request(),
  });
  const page = await connector.read({
    text: \`SELECT TOP (101) CAST(account_id AS varchar(100)) AS account_id,
      CAST(sessions_7d AS varchar(30)) AS sessions_7d, renewal_days
      FROM dbo.approved_account_usage WHERE tenant_id = @tenant
      ORDER BY renewal_days, account_id\`,
    parameters: { tenant: { type: sql.NVarChar(100), value: 'tenant-demo' } },
  }, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput}
} finally {
  await pool.close();
}` },
    workflow: { question: 'Which renewing accounts have a meaningful usage decline?', join: 'Join account_id to equal-length prior usage windows, renewal ownership, and unresolved tickets.', action: 'Ask account owners to review the evidence and confirm whether intervention is appropriate.', measure: 'Track confirmed review findings and next-period usage, with outreach burden as a guardrail.' },
    docs: [{ label: 'node-mssql API', url: 'https://tediousjs.github.io/node-mssql/' }, { label: 'SQL Server Node drivers', url: 'https://learn.microsoft.com/en-us/sql/connect/node-js/node-js-driver-for-sql-server' }],
  },
  {
    slug: 'oracle', catalogName: 'Oracle', name: 'Oracle', factory: 'oracleConnector', monogram: 'OR', accent: '#efaa99', runtime: 'server',
    headline: 'Bring billing evidence into the customer conversation.',
    description: 'Use node-oracledb ResultSets for bound SQL snapshots with lookahead and explicit cleanup. Preserve financial precision before values enter your analysis.',
    outcome: 'retention',
    prerequisites: [server, 'Install oracledb and its TypeScript declarations. Set ORACLE_USER, ORACLE_PASSWORD, and ORACLE_CONNECT_STRING for a read-only account.', 'Provide approved_billing_issues(tenant_id, account_id, invoice_id, balance). The sample expects Oracle 12c+ row limiting and converts NUMBER values to text in SQL.'],
    capabilities: [
      { title: 'Bound SQL', body: 'Use named or positional Oracle binds with array-format ResultSets.' },
      { title: 'Controlled result reading', body: 'Fetch up to the requested limit plus one row and close the owned ResultSet.' },
      { title: 'Caller-defined precision', body: 'Use fetchTypeHandler or explicit SQL conversion for exact NUMBER and timestamp values.' },
    ],
    limitations: [snapshot, sqlLimit, 'Configure connection.callTimeout. Cooperative cancellation does not call break() on your shared connection. Oracle numeric/date conversion must happen before precision is lost; the sample uses TO_CHAR for numeric values.'],
    sample: { title: 'Inspect unresolved billing context', filename: 'oracle-billing-issues.ts', description: 'The NLS clause makes the amount’s decimal separator explicit. Currency and scale remain part of your source schema.', code: `import oracledb from 'oracledb';
import { oracleConnector } from 'motif-connectors/server';

const { ORACLE_USER: user, ORACLE_PASSWORD: password,
  ORACLE_CONNECT_STRING: connectString } = process.env;
if (!user || !password || !connectString) throw new Error('Set Oracle connection variables.');
const client = await oracledb.getConnection({ user, password, connectString });
client.callTimeout = 5_000;
try {
  const connector = oracleConnector({
    id: 'billing-issues', source: 'Approved billing issues', client,
    outFormatArray: oracledb.OUT_FORMAT_ARRAY,
  });
  const page = await connector.read({
    text: \`SELECT TO_CHAR(account_id) AS account_id, TO_CHAR(invoice_id) AS invoice_id,
      TO_CHAR(balance, 'TM9', 'NLS_NUMERIC_CHARACTERS=''.,''') AS balance
      FROM approved_billing_issues WHERE tenant_id = :tenant
      ORDER BY invoice_id FETCH FIRST 101 ROWS ONLY\`,
    binds: { tenant: 'tenant-demo' },
  }, { limit: 100, timeoutMs: 6_000 });
${snapshotOutput}
} finally {
  await client.close();
}` },
    workflow: { question: 'Which renewal conversations need unresolved billing context?', join: 'Join account_id to renewals and invoice_id to support cases without counting invoices as distinct accounts.', action: 'Prepare a billing and customer-success review to resolve the underlying issue.', measure: 'Track issue resolution time and recurrence; keep outstanding balances separate from any retention forecast.' },
    docs: [{ label: 'node-oracledb SQL execution', url: 'https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html' }, { label: 'Oracle type conversion', url: 'https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#fetch-type-handlers' }],
  },
  {
    slug: 'clickhouse', catalogName: 'ClickHouse', name: 'ClickHouse', factory: 'clickHouseConnector', monogram: 'CH', accent: '#e9df8f', runtime: 'server',
    headline: 'Turn event aggregates into a focused conversion question.',
    description: 'Run typed, parameterized ClickHouse SQL through the official client. Compact positional results and quoted exact numbers support inspectable event summaries.',
    outcome: 'conversion',
    prerequisites: [server, 'Install @clickhouse/client. Set CLICKHOUSE_URL, CLICKHOUSE_USERNAME, and CLICKHOUSE_PASSWORD for a read-only user with provider execution budgets.', 'Provide checkout_events(tenant_id, session_id, event_name). Define how duplicate events and session eligibility are handled before interpreting aggregates.'],
    capabilities: [
      { title: 'Typed query parameters', body: 'Use ClickHouse placeholders such as {tenant:String} with a separate parameter map.' },
      { title: 'Exact compact output', body: 'Request JSONCompact with quoted DECIMAL and 64-bit integer values.' },
      { title: 'Provider row cap', body: 'Request a result-row limit with block-aware truncation and transport abort support.' },
    ],
    limitations: [snapshot, 'ClickHouse enforces result limits at block boundaries and can overfetch a block. Rows returned do not cap scanned data or aggregate cost.', 'Aborting HTTP does not guarantee immediate query cancellation. SQL defines the grain; counts of events are not automatically counts of attempts, sessions, or customers.'],
    sample: { title: 'Count checkout events by session', filename: 'clickhouse-checkout-events.ts', description: 'The sample exposes event counts for investigation; it does not call an event ratio a conversion rate.', code: `import { createClient } from '@clickhouse/client';
import { clickHouseConnector } from 'motif-connectors/server';

const { CLICKHOUSE_URL: url, CLICKHOUSE_USERNAME: username,
  CLICKHOUSE_PASSWORD: password } = process.env;
if (!url || !username || !password) throw new Error('Set ClickHouse connection variables.');
const client = createClient({ url, username, password, request_timeout: 6_000 });
try {
  const connector = clickHouseConnector({
    id: 'checkout-events', source: 'Approved checkout events', client,
  });
  const page = await connector.read({
    text: \`SELECT session_id,
      countIf(event_name = 'checkout_started') AS start_events,
      countIf(event_name = 'payment_timeout') AS timeout_events
      FROM checkout_events WHERE tenant_id = {tenant:String}
      GROUP BY session_id ORDER BY session_id LIMIT 101\`,
    parameters: { tenant: 'tenant-demo' },
  }, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput}
} finally {
  await client.close();
}` },
    workflow: { question: 'Which sessions show repeated checkout starts and payment timeouts?', join: 'Join session_id to the authoritative attempt ledger and customer context, deduplicating event retries.', action: 'Inspect affected sessions and define a retry-state instrumentation or product experiment.', measure: 'Use completed/started attempts from the ledger, with payment error and duplicate-charge guardrails.' },
    docs: [{ label: 'ClickHouse JavaScript client', url: 'https://clickhouse.com/docs/integrations/javascript' }, { label: 'Query parameters', url: 'https://clickhouse.com/docs/sql-reference/syntax#defining-and-using-query-parameters' }],
  },
  {
    slug: 'elasticsearch', catalogName: 'Elasticsearch / OpenSearch', name: 'Elasticsearch', factory: 'elasticsearchConnector', monogram: 'ES', accent: '#91d5df', runtime: 'server',
    headline: 'Find the service evidence behind a customer problem.',
    description: 'Search a configured Elasticsearch index and retain hit IDs, source documents, and completeness. Partial search results are rejected instead of appearing as a complete operational picture.',
    outcome: 'retention',
    prerequisites: [server, 'Install @elastic/elasticsearch. Set ELASTICSEARCH_URL and ELASTICSEARCH_API_KEY for a key restricted to the approved index.', 'Provide an account-service-errors index with account_id as a keyword field, observed_at as a date, and service_id and error_code in _source.'],
    capabilities: [
      { title: 'Configured-index search', body: 'Supply Query DSL, source projection, and sort order within the server-selected index.' },
      { title: 'Partial-result checks', body: 'Reject timeouts, failed shards, and skipped or incomplete remote clusters.' },
      { title: 'Traceable hits', body: 'Keep each hit’s index and ID so operational evidence can be followed back to its source.' },
    ],
    limitations: [snapshot, 'No point-in-time search, search_after pagination, aggregation API, or live subscription is exposed. A bounded hit set cannot establish complete incident prevalence.', 'Store exact large identifiers and decimals as strings in source JSON. The adapter cannot repair precision already lost before or during JSON parsing.'],
    sample: { title: 'Read recent errors for a reviewed account', filename: 'elasticsearch-account-errors.ts', description: 'The account scope must be approved by your server. A hit list is evidence to investigate, not a churn score.', code: `import { Client } from '@elastic/elasticsearch';
import { elasticsearchConnector } from 'motif-connectors/server';

const node = process.env.ELASTICSEARCH_URL, apiKey = process.env.ELASTICSEARCH_API_KEY;
if (!node || !apiKey) throw new Error('Set Elasticsearch connection variables.');
const client = new Client({ node, auth: { apiKey }, requestTimeout: 6_000 });
try {
  const connector = elasticsearchConnector({
    id: 'service-errors', source: 'Approved service errors',
    client, index: 'account-service-errors',
  });
  const page = await connector.read({
    query: { bool: { filter: [
      { term: { account_id: 'acct-demo' } },
      { range: { observed_at: { gte: '2026-06-01', lt: '2026-06-08' } } },
    ] } },
    source: ['account_id', 'service_id', 'error_code', 'observed_at'],
    sort: [{ observed_at: 'asc' }],
  }, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput}
} finally {
  await client.close();
}` },
    workflow: { question: 'Did unresolved service errors overlap an account’s usage decline?', join: 'Join account_id and service_id to usage windows and support tickets, retaining hit IDs as evidence.', action: 'Prepare a service-owner review to distinguish an incident from other account context.', measure: 'Track recurring errors, incident resolution, and subsequent usage without assuming causation from overlap.' },
    docs: [{ label: 'Elasticsearch JavaScript client', url: 'https://www.elastic.co/docs/reference/elasticsearch/clients/javascript' }, { label: 'Search pagination limits', url: 'https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results' }],
  },
  {
    slug: 'opensearch', catalogName: 'Elasticsearch / OpenSearch', name: 'OpenSearch', factory: 'opensearchConnector', monogram: 'OS', accent: '#9bc0ef', runtime: 'server',
    headline: 'Connect search evidence to a better product question.',
    description: 'Use the official OpenSearch client against a configured index. Inspect bounded search hits with source projection and explicit checks for incomplete searches.',
    outcome: 'product',
    prerequisites: [server, 'Install @opensearch-project/opensearch. Set OPENSEARCH_URL, OPENSEARCH_USERNAME, and OPENSEARCH_PASSWORD for a verified-TLS endpoint with a read-only index role.', 'The sample uses basic authentication, not Amazon OpenSearch IAM signing. Provide search-feedback with feature_id as a keyword field, observed_at as a date, and account_id and feedback in _source.'],
    capabilities: [
      { title: 'Native response support', body: 'Handle the official OpenSearch client’s response wrapper through the shared page contract.' },
      { title: 'Projected evidence', body: 'Select the source fields needed for an investigation and preserve hit identity.' },
      { title: 'Completeness checks', body: 'Reject timed-out or partial searches and flag results with additional matches.' },
    ],
    limitations: [snapshot, 'No PIT, search_after, aggregation, or automatic IAM credential setup is provided. Configure your own signed client if your deployment requires it.', 'Cancellation is cooperative and transport cancellation belongs to your client. Source numbers may already be rounded; keep exact identifiers and decimals as strings.'],
    sample: { title: 'Inspect feedback on one feature', filename: 'opensearch-feature-feedback.ts', description: 'Retrieved comments need qualitative review and account deduplication before they inform a roadmap discussion.', code: `import { Client } from '@opensearch-project/opensearch';
import { opensearchConnector } from 'motif-connectors/server';

const { OPENSEARCH_URL: node, OPENSEARCH_USERNAME: username,
  OPENSEARCH_PASSWORD: password } = process.env;
if (!node || !username || !password) throw new Error('Set OpenSearch connection variables.');
const client = new Client({ node, auth: { username, password }, requestTimeout: 6_000 });
try {
  const connector = opensearchConnector({
    id: 'feature-feedback', source: 'Approved indexed feedback',
    client, index: 'search-feedback',
  });
  const page = await connector.read({
    query: { bool: { filter: [
      { term: { feature_id: 'guided-workspace' } },
      { range: { observed_at: { gte: '2026-06-01', lt: '2026-07-01' } } },
    ] } },
    source: ['account_id', 'feature_id', 'feedback', 'observed_at'],
    sort: [{ observed_at: 'asc' }],
  }, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput}
} finally {
  await client.close();
}` },
    workflow: { question: 'What conflicting feedback surrounds the next onboarding change?', join: 'Join account_id and feature_id to interview records and adoption context; separate comments from distinct accounts.', action: 'Recruit a balanced follow-up sample and test a specific prototype task.', measure: 'Measure task success, evidence coverage, and contradictory findings rather than treating search volume as impact.' },
    docs: [{ label: 'OpenSearch JavaScript client', url: 'https://docs.opensearch.org/latest/clients/javascript/' }, { label: 'Search API', url: 'https://docs.opensearch.org/latest/api-reference/search-apis/search/' }],
  },
  {
    slug: 'redis', catalogName: 'Redis', name: 'Redis', factory: 'redisConnector', monogram: 'RE', accent: '#efa59c', runtime: 'server',
    headline: 'Inspect a known set of checkout states.',
    description: 'Read explicit Redis string keys through MGET. Keep raw values and missing entries visible while you compare cached state with authoritative transaction evidence.',
    outcome: 'conversion',
    prerequisites: [server, 'Install redis. Set REDIS_URL for an authorized client with MGET access; use verified TLS for remote deployments.', 'Your server must supply the approved key list. The sample keys use a shared {tenant-demo} hash tag for compatible Redis Cluster slots and contain string values.'],
    capabilities: [
      { title: 'Explicit key access', body: 'Read only application-selected keys; no key discovery or arbitrary command interface is exposed.' },
      { title: 'Raw-value fidelity', body: 'Return strings without automatically parsing JSON or converting counters to approximate numbers.' },
      { title: 'Missing-state visibility', body: 'Keep key/value pairs in input order, including null entries.' },
    ],
    limitations: [snapshot, 'MGET covers string keys only; missing keys and non-string values both return null. It does not distinguish expiration from an unsupported value type.', 'At most 100,000 keys may be supplied; only the requested prefix is read. Cluster keys must share a slot. Cancellation is cooperative and does not disconnect your client.'],
    sample: { title: 'Compare known checkout cache entries', filename: 'redis-checkout-state.ts', description: 'A null cache entry is not proof that a checkout failed. Reconcile it with the ledger before drawing conclusions.', code: `import { createClient } from 'redis';
import { redisConnector } from 'motif-connectors/server';

const url = process.env.REDIS_URL;
if (!url) throw new Error('Set REDIS_URL.');
const client = createClient({ url });
client.on('error', () => console.error('Redis connection error.'));
await client.connect();
try {
  const connector = redisConnector({
    id: 'checkout-cache', source: 'Approved checkout cache keys', client,
  });
  const page = await connector.read({ keys: [
    'checkout:{tenant-demo}:attempt-001',
    'checkout:{tenant-demo}:attempt-002',
  ] }, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput}
} finally {
  await client.close();
}` },
    workflow: { question: 'Do cached checkout states disagree with the authoritative ledger?', join: 'Map the server-owned key list to attempt IDs and join them to durable payment records and sessions.', action: 'Investigate state-expiry or retry-handling discrepancies before changing the customer flow.', measure: 'Track reconciled state mismatches and payment errors; do not use cache misses as a conversion denominator.' },
    docs: [{ label: 'Redis Node client', url: 'https://redis.io/docs/latest/develop/clients/nodejs/' }, { label: 'MGET semantics', url: 'https://redis.io/docs/latest/commands/mget/' }],
  },
  {
    slug: 'dynamodb', catalogName: 'DynamoDB', name: 'DynamoDB', factory: 'dynamoDBConnector', monogram: 'DY', accent: '#baa8ed', runtime: 'server',
    headline: 'Follow a customer’s events across native result pages.',
    description: 'Query one configured DynamoDB table or index with the low-level AWS SDK. Native continuation and exact AttributeValue numbers support a bounded, inspectable event history.',
    outcome: 'retention',
    prerequisites: [server, 'Install @aws-sdk/client-dynamodb. Configure AWS_REGION and the standard AWS credential chain with dynamodb:Query permission scoped to the table or index.', 'Provide account_events with partition key account_id (String) and sort key event_time (String, ordered ISO timestamps). Authorize the account before binding it.'],
    capabilities: [
      { title: 'Native Query continuation', body: 'Follow LastEvaluatedKey through an opaque cursor bound to the same connector and query.' },
      { title: 'Exact AttributeValues', body: 'Keep N and NS values as decimal strings instead of unmarshalling them into JavaScript numbers.' },
      { title: 'Bounded collection', body: 'Combine pages with explicit maximum row and page budgets, retaining truncation status.' },
    ],
    limitations: ['Query only: no Scan, writes, or automatic cross-partition discovery. Limits count evaluated items before filtering, so an empty page can still have a continuation.', 'Even strongly consistent pages are not a cross-page snapshot. Global secondary indexes do not support strongly consistent reads.', 'Cursors live in this adapter instance for five minutes, with at most 32 stored states. Keep the instance alive; persist application checkpoints separately if required. Read limits do not cap total read capacity cost.'],
    sample: { title: 'Collect a bounded account event window', filename: 'dynamodb-account-events.ts', description: 'collectPages follows continuation even when a filtered page is empty, and reports when its own budgets stop collection.', code: `import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { collectPages } from 'motif-connectors';
import { dynamoDBConnector } from 'motif-connectors/server';

const region = process.env.AWS_REGION;
if (!region) throw new Error('Set AWS_REGION and configure AWS credentials.');
const client = new DynamoDBClient({ region });
try {
  const connector = dynamoDBConnector({
    id: 'account-events', source: 'Approved account event history',
    client, tableName: 'account_events',
    queryCommand: input => new QueryCommand(input),
  });
  const page = await collectPages(connector, {
    keyConditionExpression: '#account = :account AND #time BETWEEN :start AND :end',
    expressionAttributeNames: { '#account': 'account_id', '#time': 'event_time' },
    expressionAttributeValues: {
      ':account': { S: 'acct-demo' }, ':start': { S: '2026-06-01T00:00:00Z' },
      ':end': { S: '2026-06-07T23:59:59Z' },
    },
    scanIndexForward: true,
  }, { limit: 100, maxRows: 500, maxPages: 10, timeoutMs: 10_000 });
${snapshotOutput}
} finally {
  client.destroy();
}` },
    workflow: { question: 'What happened before a reviewed account stopped returning?', join: 'Map low-level event fields to a documented schema and join account_id to support history; retain event IDs and timestamps.', action: 'Build a timeline for an owner review and identify an unanswered activation or service question.', measure: 'Track subsequent eligible activity and confirmed issue resolution; temporal order alone does not establish cause.' },
    docs: [{ label: 'DynamoDB Query API', url: 'https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html' }, { label: 'Query pagination', url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html' }],
  },
  {
    slug: 'neo4j', catalogName: 'Neo4j', name: 'Neo4j', factory: 'neo4jConnector', monogram: 'NE', accent: '#91d2b2', runtime: 'server',
    headline: 'Trace product evidence through real relationships.',
    description: 'Run bound Cypher in an owned READ session and map the projected values explicitly. Keep account coverage distinct from the volume of connected interview records.',
    outcome: 'product',
    prerequisites: [server, 'Install neo4j-driver. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD for a read-only role; the sample selects database neo4j.', 'Provide Account, Interview, and Feature nodes with (Account)-[:GAVE]->(Interview)-[:ABOUT]->(Feature). Feature.id is a string. The included serializer supports only the scalar projection shown.'],
    capabilities: [
      { title: 'Bound Cypher', body: 'Bind an initiative ID while the relationship traversal stays application-owned.' },
      { title: 'Explicit exact values', body: 'Serialize official Integer values to strings without disabling lossless integer handling.' },
      { title: 'Owned read session', body: 'Iterate with lookahead and a query timeout, then close the session without closing your driver.' },
    ],
    limitations: [snapshot, 'READ routing is not an authorization boundary; database privileges must restrict writes. Query execution and traversal cost can exceed the returned-row limit.', 'No automatic graph flattening is provided. Extend your serializer deliberately for nodes, relationships, temporal or spatial values; the sample rejects them. Cancellation is cooperative.'],
    sample: { title: 'Separate interviewed accounts from interviews', filename: 'neo4j-feature-evidence.ts', description: 'The sample returns scalar fields only and defines its serializer locally. It does not silently turn graph objects into chart rows.', code: `import neo4j from 'neo4j-driver';
import { neo4jConnector } from 'motif-connectors/server';

const { NEO4J_URI: uri, NEO4J_USERNAME: username, NEO4J_PASSWORD: password } = process.env;
if (!uri || !username || !password) throw new Error('Set Neo4j connection variables.');
const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
function serialize(value: unknown): unknown {
  if (neo4j.isInt(value)) return value.toString();
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  throw new Error('Expected an Integer or a primitive from the approved projection.');
}
try {
  const connector = neo4jConnector({
    id: 'feature-evidence', source: 'Approved interview relationships',
    driver, database: 'neo4j', serialize, queryTimeoutMs: 5_000,
  });
  const page = await connector.read({
    text: \`MATCH (a:Account)-[:GAVE]->(i:Interview)-[:ABOUT]->(f:Feature)
      WHERE f.id = $feature
      RETURN f.id AS feature_id, count(DISTINCT a) AS accounts,
        count(DISTINCT i) AS interviews\`,
    parameters: { feature: 'guided-workspace' },
  }, { limit: 100, timeoutMs: 6_000 });
${snapshotOutput}
} finally {
  await driver.close();
}` },
    workflow: { question: 'Does an initiative have broad account evidence or repeated testimony from a few accounts?', join: 'Follow explicit Account–Interview–Feature relationships and inspect supporting and contradictory records separately.', action: 'Fill evidence gaps with targeted research before prioritizing a delivery commitment.', measure: 'Track distinct-account coverage, contradictory findings, and prototype task success; relationship counts do not predict business impact.' },
    docs: [{ label: 'Neo4j JavaScript driver', url: 'https://neo4j.com/docs/javascript-manual/current/' }, { label: 'Data type mapping', url: 'https://neo4j.com/docs/javascript-manual/current/data-types/' }],
  },
  {
    slug: 'firestore', catalogName: 'Firestore', name: 'Firestore', factory: 'firestoreConnector', monogram: 'FI', accent: '#f0c68d', runtime: 'server',
    headline: 'Bring account activity documents into a product review.',
    description: 'Supply a preconfigured server-side Firestore query, then read document IDs, paths, and explicitly serialized data. Preserve integer and timestamp precision at the boundary.',
    outcome: 'product',
    prerequisites: [server, 'Install @google-cloud/firestore. Configure Google Application Default Credentials and GOOGLE_CLOUD_PROJECT with narrowly scoped IAM access; server libraries use IAM rather than client Security Rules.', 'Provide account_usage documents with tenantId, accountId (string), sessions (integer), and updatedAt (Timestamp), plus any required query index. The local serializer covers exactly that projection.'],
    capabilities: [
      { title: 'Server-owned query scope', body: 'Choose the collection, filters, projection, and ordering before constructing the connector.' },
      { title: 'Document traceability', body: 'Return both document ID and reference path alongside the serialized document.' },
      { title: 'Explicit native types', body: 'Enable useBigInt and serialize timestamp seconds/nanoseconds without reducing them to millisecond dates.' },
    ],
    limitations: [snapshot, 'The read method accepts undefined; it does not accept a browser-selected collection or arbitrary query. The adapter does not expose Firestore cursor pagination or listeners.', 'A local timeout does not cancel provider work or billing. Extend the serializer for any additional Timestamp, GeoPoint, DocumentReference, byte, or nested values you select.'],
    sample: { title: 'Read an approved activity projection', filename: 'firestore-account-usage.ts', description: 'The serializer validates this specific schema and retains timestamp nanoseconds. Additional document fields require an explicit mapping.', code: `import { Firestore, Timestamp } from '@google-cloud/firestore';
import { firestoreConnector } from 'motif-connectors/server';

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) throw new Error('Set GOOGLE_CLOUD_PROJECT and configure credentials.');
const client = new Firestore({ projectId, useBigInt: true });
function serialize(value: unknown): unknown {
  if (!value || typeof value !== 'object') throw new Error('Expected a document.');
  const row = value as Record<string, unknown>;
  if (typeof row.accountId !== 'string' || typeof row.sessions !== 'bigint'
      || !(row.updatedAt instanceof Timestamp)) throw new Error('Unexpected document schema.');
  return { accountId: row.accountId, sessions: row.sessions.toString(),
    updatedAt: { seconds: String(row.updatedAt.seconds), nanoseconds: row.updatedAt.nanoseconds } };
}
try {
  const connector = firestoreConnector({
    id: 'account-usage', source: 'Approved account activity documents', serialize,
    query: client.collection('account_usage').where('tenantId', '==', 'tenant-demo')
      .select('accountId', 'sessions', 'updatedAt').orderBy('accountId'),
  });
  const page = await connector.read(undefined, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput}
} finally {
  await client.terminate();
}` },
    workflow: { question: 'Which accounts need follow-up research after low feature activity?', join: 'Join accountId to an explicitly dated usage window, feature eligibility, and interview recruitment records.', action: 'Recruit eligible low-activity and active accounts to test an onboarding hypothesis.', measure: 'Compare task success and repeat activity using consistent windows; low activity by itself does not explain intent.' },
    docs: [{ label: 'Firestore Node client', url: 'https://cloud.google.com/nodejs/docs/reference/firestore/latest' }, { label: 'Firestore server security', url: 'https://firebase.google.com/docs/firestore/security/overview' }],
  },
  {
    slug: 'supabase', catalogName: 'Supabase', name: 'Supabase', factory: 'supabaseConnector', monogram: 'SU', accent: '#96d6b0', runtime: 'server',
    headline: 'Explore product evidence within the intended access policy.',
    description: 'Read a configured Supabase table or view using equality filters, ordering, and exact-count completeness checks. Keep the caller’s authorization context explicit.',
    outcome: 'conversion',
    prerequisites: [server, 'Install @supabase/supabase-js. Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and an authorized SUPABASE_USER_ACCESS_TOKEN for this one-shot server script.', 'Provide approved_checkout_attempts with attempt_id, account_id, status, and amount_text. Apply RLS or an equivalent reviewed access policy; expose exact numeric values as text in the view.'],
    capabilities: [
      { title: 'Configured selection', body: 'Pin the table or view and selected columns when creating the connector.' },
      { title: 'Simple native filters', body: 'Apply equality or null filters and one ordering column without introducing a SQL proxy.' },
      { title: 'Count-aware completeness', body: 'Request exact count to detect both local limits and provider row caps.' },
    ],
    limitations: [snapshot, 'This adapter exposes selected table reads, not arbitrary SQL, RPCs, joins, writes, or Realtime subscriptions. Exact counts add query cost.', 'Authorization follows your configured credentials. Service-role credentials can bypass RLS; security-definer views need particular review. JSON numeric rounding must be prevented in the source projection.'],
    sample: { title: 'Read payment failures with a user access context', filename: 'supabase-checkout-attempts.ts', description: 'The sample passes a server-held user token and disables session persistence. Your application owns token validation, refresh, and policy review.', code: `import { createClient } from '@supabase/supabase-js';
import { supabaseConnector } from 'motif-connectors/server';

const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key,
  SUPABASE_USER_ACCESS_TOKEN: token } = process.env;
if (!url || !key || !token) throw new Error('Set Supabase connection variables.');
const client = createClient(url, key, {
  global: { headers: { Authorization: 'Bearer ' + token } },
  auth: { persistSession: false, autoRefreshToken: false },
});
const connector = supabaseConnector({
  id: 'checkout-attempts', source: 'Approved checkout view', client,
  table: 'approved_checkout_attempts',
  columns: 'attempt_id,account_id,status,amount_text',
});
const page = await connector.read({
  equals: { status: 'payment_timeout' },
  order: { column: 'attempt_id', ascending: true },
}, { limit: 100, timeoutMs: 5_000 });
${snapshotOutput.trimStart()}` },
    workflow: { question: 'Which authorized accounts encountered payment timeouts?', join: 'Join attempt_id to web sessions and account_id to permitted CRM context; preserve one row per attempt.', action: 'Review affected journeys and propose a measured checkout recovery experiment.', measure: 'Track completed/started attempts, payment errors, and duplicate charges without presenting attempted basket value as lost revenue.' },
    docs: [{ label: 'Supabase JavaScript client', url: 'https://supabase.com/docs/reference/javascript/introduction' }, { label: 'Supabase row-level security', url: 'https://supabase.com/docs/guides/database/postgres/row-level-security' }],
  },
];
