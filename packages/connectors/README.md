# Motif Connectors

Typed data adapters that connect Motif visualizations to application data, databases, and warehouses. The current implementation supplies a common table format, explicit pagination and truncation, source provenance, and an application gateway for registered operations.

**Motif is the working project name.** This package is an early, private workspace package named `motif-connectors`; it has not been published to npm, and the name is not a registry or trademark availability claim. The package carries the repository's MIT license. Public release and broad production certification remain separate work.

There are **13 implemented entries in a 39-entry catalog**, counting MySQL/MariaDB as one entry and including JSON and the application endpoint. “Implemented” means the adapter and its contract tests exist. It does not mean every provider feature is supported or a live account has been certified. The [packaged catalog](./dist/catalog.js) contains the maintained coverage list.

## Run it locally

Use Node.js 22.16 or later for the connectors package and its real SQLite example. From the repository root:

```sh
npm ci
npm --prefix packages/connectors run build
npx tsx --test tests/connector-*.test.ts
npm run demo:connectors
```

The connector demo runs at [http://127.0.0.1:5190](http://127.0.0.1:5190). It uses local SQLite and JSON fixtures through a registered application gateway; it does not require cloud credentials. Its fixture identity and authorization are demonstrations, not a production login system.

For a separate local application, build first and install the package by filesystem path, adjusting the path for your checkout:

```sh
npm install ../fivejs/packages/connectors
```

Do not use a registry installation command until an actual release is announced. Database drivers are caller-owned, optional integrations; this package does not install every database SDK.

## Browser and server boundaries

Import `motif-connectors` for browser-safe helpers: `jsonConnector`, `endpointConnector`, `mapRows`, `collectPages`, the table types, and the catalog. Import `motif-connectors/server` for database adapters, authenticated provider adapters, and `createConnectorGateway`.

```text
Visualization → registered application operation → authorized server adapter → source
                            ↓
                  DataPage + provenance
```

The browser sends an operation name and validated parameters. Database SQL, provider origins, credentials, base/table IDs, and tenant binding belong on the server. Native adapters reject browser construction; keeping server imports out of the browser bundle is still the application's responsibility.

## A common result that preserves meaning

Every adapter implements `read(query, options?)` and returns a `DataPage`:

```ts
{
  fields: [{ name: 'customer_id', type: 'string' }],
  rows: [['cus_123']],
  provenance: {
    connectorId: 'customers', provider: 'stripe', source: 'Billing customers',
    fetchedAt: '2026-01-01T00:00:00.000Z', mode: 'live'
  },
  page: { hasMore: false, truncated: false },
  warnings: []
}
```

Rows are positional arrays: duplicate column names and source order survive. Values can be null, booleans, finite numbers, strings, arrays, or JSON objects. Decimal, large-integer, and high-precision timestamp strings stay strings. `bigint` becomes an exact decimal string. Unsafe JavaScript integers and nonfinite numbers are rejected. Normalization cannot recover precision that a driver or upstream JSON producer has already lost.

Field types describe source meaning; an `integer` or `decimal` field may therefore contain a string. Do not indiscriminately call `Number()` on values for charting. Preserve exact values for identifiers, labels, joins, and calculations that require them, and make any approximate plotting conversion explicit. Units, currency, entity grain, and customer/product/session relationships remain application-owned mappings.

`fetchedAt` records retrieval time, not the age or completeness of the underlying source. `mode: 'fixture'` identifies synthetic/local demonstration data. A `live` label alone is not a validation claim.

```ts
import { jsonConnector, mapRows } from 'motif-connectors';

const customers = jsonConnector({
  id: 'customer-fixture', source: 'Synthetic customer outcomes', mode: 'fixture',
  fields: [
    { name: 'customer_id', type: 'string' },
    { name: 'sessions', type: 'integer' },
    { name: 'revenue_usd', type: 'decimal' },
  ],
  rows: [['cus_1', 12, '199.00'], ['cus_2', 3, '49.00']],
});

const page = await customers.read(undefined, { limit: 100 });
const entities = mapRows(page, get => ({
  id: get(0), sessions: get(1), revenueUsd: get(2),
}));
```

JSON snapshots copy the supplied fields and values at construction and copy returned pages. Mutating input records or a returned page does not change later reads. JSON here means an already parsed, typed snapshot; it is not an arbitrary URL fetcher or a CSV/Parquet parser.

## Put authorization and tenant binding in the gateway

The gateway requires an `authorize` callback and invokes it for every operation and continuation request. The application must authenticate the request, authorize that operation, and bind its tenant or other access scope. Parameter validation and cursor validation do not replace authorization.

This server example assumes your application supplies `readOnlyPgPool`, `authenticateSession`, and `canReadAnalytics`:

```ts
import { createConnectorGateway, postgresConnector } from 'motif-connectors/server';
import { readOnlyPgPool } from './database.js';
import { authenticateSession, canReadAnalytics } from './auth.js';

const activity = postgresConnector({
  id: 'customer-activity', source: 'Customer activity warehouse',
  client: readOnlyPgPool,
});

export const POST = createConnectorGateway({
  authorize: async (request, operation) => {
    const session = await authenticateSession(request);
    if (!session || !canReadAnalytics(session, operation)) return null;
    return { subject: session.userId, scope: { tenantId: session.tenantId } };
  },
  operations: {
    'customer.activity': {
      connector: activity,
      parameters: { days: { type: 'integer', min: 1, max: 90 } },
      maxPageSize: 500,
      query: ({ days }, access) => {
        const tenantId = access.scope?.tenantId;
        if (typeof tenantId !== 'string') throw new Error('Missing tenant scope');
        return {
          text: `SELECT customer_id, count(*) AS sessions
                 FROM analytics.customer_sessions
                 WHERE tenant_id = $1
                   AND started_at >= CURRENT_TIMESTAMP - ($2::integer * INTERVAL '1 day')
                 GROUP BY customer_id ORDER BY customer_id LIMIT 501`,
          values: [tenantId, days],
        };
      },
    },
  },
});
```

Mount the returned handler on your application's `/api/motif/data` POST route, with your usual session, origin/CSRF, rate-limit, and access policies. The extra result row in this example allows a 500-row read to report truncation. A truncated SQL snapshot requires a narrower registered query or an application-defined pagination operation.

```ts
// Browser: no database credentials, SQL, provider URL, or client-selected tenant.
import { endpointConnector } from 'motif-connectors';

const data = endpointConnector({
  id: 'application-data', source: 'Authorized customer activity',
  endpoint: '/api/motif/data',
});
const page = await data.read(
  { operation: 'customer.activity', parameters: { days: 30 } },
  { limit: 500 },
);
```

The endpoint client uses same-origin credentials by default. A deliberately cross-origin application endpoint needs an application-owned fetch/authentication and CORS arrangement. Provider tokens must never be supplied to browser code. The gateway accepts only registered operations and parameter keys; it is not a SQL or arbitrary HTTP proxy.

Database access must be constrained by **provider-side read-only roles**, views and row-level policies where appropriate. SQL text inspection or a `SELECT` regular expression cannot enforce read-only behavior. SQL adapters execute server-owned statements using native parameter binding; never concatenate browser input into SQL identifiers, filters, or statements. Tenant IDs in particular must come from validated access context, not a request parameter merely named `tenantId`.

## Implemented adapters and verification

“Protocol” below means local tests against mocked official-driver/API shapes, including failures and pagination where supported. No live cloud credentials were used. SQLite also has a real in-memory database test. DuckDB was additionally checked with a temporary real official Node API installation; that optional driver is not bundled in the default test suite.

| Source and official documentation | Export from `motif-connectors/server` unless noted | Implemented scope and key limits | Verification |
| --- | --- | --- | --- |
| [PostgreSQL](https://node-postgres.com/features/queries) | `postgresConnector` | Caller-owned `pg` client; positional result arrays and bound values; one result set; no continuation cursor. The driver may fetch the full result before the local cap is applied. | Protocol |
| [MySQL / MariaDB](https://sidorares.github.io/node-mysql2/docs) | `mysqlConnector` | Caller-owned `mysql2/promise` prepared `execute`; array rows; one result set; no continuation cursor. Set `provider: 'mariadb'` for provenance and disable `multipleStatements` on the client. | Protocol |
| [SQLite](https://nodejs.org/api/sqlite.html) | `sqliteConnector` | `node:sqlite` `DatabaseSync` on Node 22.16+; positional rows, BigInt reads, limit plus one lookahead; no continuation cursor. Synchronous execution cannot be interrupted by a JS timeout. | Protocol + real SQLite |
| [DuckDB](https://duckdb.org/docs/stable/clients/node_neo/overview) | `duckdbConnector` | Official `@duckdb/node-api` connection, bounded reader and exact JSON conversion; no continuation cursor. Vector chunks can exceed the requested read size. | Protocol + real-driver smoke check |
| [MongoDB](https://www.mongodb.com/docs/drivers/node/current/crud/query/cursor/) | `mongodbConnector` | One configured collection; `find`, projection, sort, limit plus one, `maxTimeMS`; canonical BSON Extended JSON; no aggregation pipeline or continuation cursor. | Protocol |
| [BigQuery](https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query) | `createBigQueryConnector` | Standard SQL, typed parameters, job completion polling, schema-aware nested values and result pages; optional `maximumBytesBilled`. | HTTP protocol |
| [Snowflake](https://docs.snowflake.com/en/developer-guide/sql-api) | `createSnowflakeConnector` | Single SQL API statement, typed bindings, polling and buffered partition pages; server-configured account origin and execution context. | HTTP protocol |
| [Databricks](https://docs.databricks.com/api/statement-execution/v1/statement-execution) | `createDatabricksConnector` | Statement Execution API, typed parameters, polling and inline `JSON_ARRAY` chunks. External result links are unsupported; whole-result truncation remains visible. | HTTP protocol |
| [Stripe](https://docs.stripe.com/api/pagination) | `stripeConnector` | Selected v1 list resources, optional API version/connected-account headers, `starting_after`; maximum 100 rows per request. Full record retained. | HTTP protocol |
| [HubSpot](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide) | `hubspotConnector` | Selected CRM v3 object lists, properties, archived flag, `after`; maximum 100 rows per request. Missing properties and null values stay distinct. | HTTP protocol |
| [Airtable](https://airtable.com/developers/web/api/list-records) | `airtableConnector` | One server-owned base/table, optional view and fields, opaque offset; maximum 100 records per request. | HTTP protocol |
| [JSON](https://www.rfc-editor.org/rfc/rfc8259) | `jsonConnector` from `motif-connectors` | Immutable typed positional snapshot; local pagination; no network access. | Local value, mutation and pagination tests |
| [Application endpoint](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) | `endpointConnector` from `motif-connectors`; `createConnectorGateway` on the server | Registered operations, required per-request authorization, constrained parameters, access-bound continuation handles, validated pages. | Local HTTP/gateway contract tests + fixture demo |

### Caller-owned database clients

The following are actual factory shapes. `pgPool`, `mysqlConnection`, `sqliteDatabase`, `duckdbConnection`, `collection`, and `BSON` come from your application's configured official drivers. Their connections, pools, authentication and shutdown remain application-owned.

```ts
import {
  postgresConnector, mysqlConnector, sqliteConnector,
  duckdbConnector, mongodbConnector,
} from 'motif-connectors/server';

const postgres = postgresConnector({ id: 'pg', source: 'Product warehouse', client: pgPool });
const mysql = mysqlConnector({ id: 'mysql', source: 'Commerce database', client: mysqlConnection });
const sqlite = sqliteConnector({ id: 'sqlite', source: 'Local research data', client: sqliteDatabase });
const duckdb = duckdbConnector({ id: 'duckdb', source: 'Local analytical data', client: duckdbConnection });
const mongo = mongodbConnector({
  id: 'mongo', source: 'Product documents', collection,
  serialize: (document, options) => BSON.EJSON.serialize(document, options),
  maxTimeMS: 5_000,
});

await postgres.read({ text: 'SELECT customer_id FROM approved_customers WHERE tenant_id = $1 LIMIT 101', values: [authorizedTenantId] }, { limit: 100 });
await mysql.read({ text: 'SELECT customer_id FROM approved_customers WHERE tenant_id = ? LIMIT 101', values: [authorizedTenantId] }, { limit: 100 });
await sqlite.read({ text: 'SELECT id FROM interviews WHERE study_id = ? LIMIT 101', values: [authorizedStudyId] }, { limit: 100 });
await duckdb.read({ text: 'SELECT id FROM sessions WHERE tenant_id = $1 LIMIT 101', values: [authorizedTenantId] }, { limit: 100 });
await mongo.read({ filter: { tenantId: authorizedTenantId }, projection: { customerId: 1 }, sort: { _id: 1 } }, { limit: 100 });
```

PostgreSQL and MySQL parser settings determine whether large integers, decimals and timestamps arrive intact. Configure exact types as strings before parsing, including high-precision timestamps when needed. MySQL's `supportBigNumbers`, `bigNumberStrings`, `dateStrings`, and decimal settings need deliberate application configuration. SQLite `REAL` and ordinary JavaScript numbers are binary floating-point. MongoDB needs the official BSON serializer with `relaxed: false`; its `$numberLong`, `$numberDecimal`, `$oid`, and date wrappers are intentional, not chart-ready scalars. DuckDB bindings in this adapter support null, booleans, numbers, bigints and strings.

### Warehouses with typed parameters

Each token callback is called afresh for every HTTP request. Your server owns token acquisition, rotation and OAuth lifecycle; callbacks may be asynchronous. Supply public source labels, never credential-bearing connection strings, as `source`.

```ts
import {
  createBigQueryConnector, createSnowflakeConnector, createDatabricksConnector,
} from 'motif-connectors/server';

const bigquery = createBigQueryConnector({
  id: 'bq', source: 'Customer analytics', projectId: 'your-project', location: 'US',
  maximumBytesBilled: '1000000000', token: () => credentials.googleAccessToken(),
});
await bigquery.read({
  text: 'SELECT customer_id FROM analytics.customers WHERE tenant_id = @tenant LIMIT 101',
  parameters: [{ name: 'tenant', parameterType: { type: 'STRING' }, parameterValue: { value: authorizedTenantId } }],
}, { limit: 100 });

const snowflake = createSnowflakeConnector({
  id: 'sf', source: 'Revenue warehouse', accountUrl: 'https://your-account.snowflakecomputing.com',
  warehouse: 'ANALYTICS_WH', database: 'ANALYTICS', schema: 'PUBLIC', role: 'MOTIF_READER',
  tokenType: 'OAUTH', token: () => credentials.snowflakeAccessToken(),
});
await snowflake.read({
  text: 'SELECT CUSTOMER_ID FROM APPROVED_CUSTOMERS WHERE TENANT_ID = ? LIMIT 101',
  bindings: { '1': { type: 'TEXT', value: authorizedTenantId } },
}, { limit: 100 });

const databricks = createDatabricksConnector({
  id: 'dbx', source: 'Product lakehouse', workspaceUrl: 'https://your-workspace.cloud.databricks.com',
  warehouseId: 'your-warehouse-id', catalog: 'analytics', schema: 'product',
  maxRows: 10_000, maxBytes: 4_000_000, token: () => credentials.databricksAccessToken(),
});
await databricks.read({
  text: 'SELECT customer_id FROM approved_customers WHERE tenant_id = :tenant LIMIT 101',
  parameters: [{ name: 'tenant', type: 'STRING', value: authorizedTenantId }],
}, { limit: 100 });
```

Snowflake also accepts `KEYPAIR_JWT` and `PROGRAMMATIC_ACCESS_TOKEN` token types. Account/workspace configuration must be an HTTPS origin without a path, embedded credentials, query or fragment. These are trusted server configuration values, not browser parameters. HTTP redirects are refused, and returned provider links are not blindly followed.

BigQuery `maximumBytesBilled` is a provider cost control; a page size alone is not. Snowflake submission sets a 60-second statement timeout. Databricks defaults to a whole-result cap of 100,000 rows and 8,000,000 bytes, with configurable maxima of 1,000,000 rows and 20,000,000 bytes. The shared HTTP response cap is separately 8 MiB; selecting a larger provider result cap does not remove that transport limit. A Databricks `truncated` result remains truncated even after all available chunks are read.

### Application APIs

```ts
import { stripeConnector, hubspotConnector, airtableConnector } from 'motif-connectors/server';

const billing = stripeConnector({
  id: 'billing', source: 'Billing customers', token: () => credentials.stripeSecret(),
  // Optional: apiVersion and connected-account ID in account.
});
const customers = await billing.read({ resource: 'customers' }, { limit: 100 });

const crm = hubspotConnector({
  id: 'crm', source: 'CRM contacts', token: () => credentials.hubspotAccessToken(),
});
await crm.read({ object: 'contacts', properties: ['email', 'lifecyclestage'], archived: false }, { limit: 100 });

const research = airtableConnector({
  id: 'research', source: 'Research interviews', baseId: 'appYourBaseId', tableId: 'tblYourTableId',
  token: () => credentials.airtableAccessToken(),
});
await research.read({ view: 'Approved interviews', fields: ['Customer ID', 'Interview ID'] }, { limit: 100 });

if (customers.page.nextCursor) {
  await billing.read({ resource: 'customers' }, { limit: 100, cursor: customers.page.nextCursor });
}
```

Stripe resources are `customers`, `products`, `prices`, `payment_intents`, `charges`, `invoices`, `subscriptions`, and `checkout_sessions`. Provider default filters apply; for example, the [default subscriptions list excludes canceled subscriptions](https://docs.stripe.com/api/subscriptions/list). The initial adapter does not expose arbitrary provider filters, search, writes, balance transactions, or webhooks. Pin an API version in server configuration when the application needs a fixed Stripe schema.

HubSpot objects are `contacts`, `companies`, `deals`, `tickets`, `products`, and `line_items`. Selected properties are preserved in a JSON object; properties missing from the response are not filled with fabricated nulls. Custom objects, search, associations, property history and write APIs are outside this initial adapter.

Airtable base/table IDs are fixed at construction. The query accepts only a view and selected fields. Airtable [omits empty fields, including false and empty arrays](https://support.airtable.com/articles/6292134965-getting-started-with-airtable-s-web-api); the connector preserves omission and reports this limitation. It cannot reconstruct which empty value the source omitted. A view or selected field list is not itself an authorization boundary: enforce allowed data in the registered operation and token permissions.

These APIs use native cursors and have a maximum of 100 records per request even if a larger page is requested. HubSpot/Airtable accept up to 100 distinct field names of at most 128 characters each, with an additional 12,000-character limit on the JSON-escaped source/query binding; excessively long selections are rejected before the request so every emitted cursor fits the 16,384-character continuation limit. Their fixed schemas include the full returned record as JSON, so field selection and optional properties do not silently change the table schema between pages. Provider lists can change while paging and are not guaranteed snapshots. Provider response bodies are withheld from surfaced errors; HTTP 429 responses are not automatically retried.

## Limits, continuation and cancellation

`ReadOptions` accepts `limit`, `cursor`, `signal`, and `timeoutMs`. Page sizes default to 1,000 and are bounded to 1–5,000; adapters can have lower limits. Read timeouts default to 30 seconds and are bounded to 1–120,000 milliseconds. The gateway can impose a lower operation-specific `maxPageSize`. Its request body limit is 16 KiB; endpoint/provider response limits are 8 MiB.

Always inspect `page.hasMore`, `page.nextCursor`, `page.truncated`, and `warnings` together. A page with more data and a cursor is an ordinary partial page. A truncated SQL or MongoDB snapshot can have `hasMore: true` without a continuation cursor; the adapter is not promising resumability. Never present either case as a complete dataset.

```ts
import { collectPages } from 'motif-connectors';

const result = await collectPages(billing, { resource: 'customers' }, {
  limit: 100, maxRows: 2_000, maxPages: 20, timeoutMs: 10_000,
});
// Inspect result.page.truncated before computing an all-customer KPI.
```

`collectPages` defaults to 10,000 rows and 10 pages; hard bounds are 100,000 rows and 100 pages. It stops on missing continuation, row/page budgets, repeated cursors, schema/source mismatch, or errors. Its timeout applies to each `read`, not the entire collection. It preserves the continuation when available and marks a budget-limited collection truncated. It does not make cross-page reads transactionally consistent.

Cursor state has deliberately limited scope:

| Cursor owner | Lifetime and storage | Binding |
| --- | --- | --- |
| BigQuery / Snowflake / Databricks adapter | Instance-local, 5-minute expiry, at most 32 stored states; oldest states can be evicted | Exact query and adapter instance |
| Application gateway | Instance-local, 15-minute expiry, at most 1,000 stored handles | Operation, authenticated subject, access scope and validated parameters |
| JSON snapshot | Connector instance lifetime; no time-based expiry | Snapshot instance and source identity |
| Stripe / HubSpot / Airtable | Stateless source/query envelopes around native continuation; provider validity rules apply | Connector/source identity and normalized resource/query configuration |

Cursors are continuation state, not authorization. Gateway authorization runs again on every page. Stored cursors do not survive process restarts and are not shared across workers; use affinity for this prototype or implement a durable shared cursor service before distributed deployment. Do not treat handles as permanent bookmarks.

The row limit bounds returned rows, not database work, bytes scanned, compute cost, or every driver's memory use. PostgreSQL/MySQL may materialize a larger query result before the local slice. SQLite stops iteration after a lookahead row but may still perform expensive sorting or scanning. DuckDB reads vector-sized chunks. Set provider statement budgets, constrain server-owned queries, and use approved aggregate views for large datasets.

Cancellation capabilities describe what the adapter can attempt. HTTP adapters and MongoDB forward abort signals; warehouse adapters stop HTTP requests/polling but do **not** submit native job-cancellation requests. Provider work can continue after a timeout. PostgreSQL/MySQL/DuckDB cancellation is cooperative in this initial implementation. Synchronous SQLite cannot observe a new JavaScript abort or timer while the statement blocks the event loop. The caller owns connection lifetime and provider cancellation policy.

## Planned coverage and explicit gaps

The remaining 26 [catalog entries](./dist/catalog.js) are planned: SQL Server, Oracle, ClickHouse, Elasticsearch/OpenSearch, Redis, DynamoDB, Neo4j, Firestore, native Supabase, Redshift, Athena, Trino, Salesforce, Shopify, GA4, Mixpanel, Amplitude, PostHog, Segment, Zendesk/Intercom, Google Sheets, Looker, Power BI, Tableau, dbt/Cube, and CSV/Parquet/Arrow. A PostgreSQL-compatible service may work through a configured `pg` client today; that does not imply its native service API is implemented.

PostHog is intentionally not shipped as a generic `/query` connector: its [official query guidance](https://posthog.com/docs/api/queries) directs third-party connectors toward supported exports. Supported exports or [named Endpoints](https://posthog.com/docs/endpoints) are the future integration direction. Loading exported records into `jsonConnector` is generic ingestion, not native PostHog support.

This release does not provide connection onboarding, secret storage, OAuth consent/refresh flows, schema discovery, migration management, incremental synchronization/CDC, background ingestion schedules, automatic retries/backoff, native warehouse cancellation, durable cursor storage, semantic metric definitions, or an entity-join engine. No provider write convenience APIs are implemented; server-owned SQL is executed as supplied and must be constrained by read-only privileges. Custom registrations can map source records to customers, products, interviews, sessions and checkouts, but the application must define those joins and access rules explicitly.

Before declaring an adapter production-ready, test it against the intended provider/account and driver version with representative data, exact numeric/timestamp cases, access scopes, quotas, failures and data volumes. The existing test suite establishes local contracts; it does not substitute for those live acceptance checks.
