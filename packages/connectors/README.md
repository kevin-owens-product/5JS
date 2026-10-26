# Motif Connectors

Typed data adapters that connect Motif visualizations to application data, databases, and warehouses. The current implementation supplies a common table format, explicit pagination and truncation, source provenance, and an application gateway for registered operations.

**Motif is the working project name.** This package is an early, private workspace package named `motif-connectors`; it has not been published to npm, and the name is not a registry or trademark availability claim. The package carries the repository's MIT license. Public release and broad production certification remain separate work.

All **39 catalog entries now have a constrained implementation**, including JSON and the application endpoint. Grouped entries have actual factories for their constituent tools: Elasticsearch/OpenSearch, Zendesk/Intercom, dbt/Cube, and CSV/Parquet/Arrow; MySQL/MariaDB share the `mysql2` adapter. “Implemented” means the adapter and its contract tests exist. It does not mean every provider feature is supported or a live account has been certified. The [packaged catalog](./dist/catalog.js) contains the maintained coverage list; the scope tables below describe the implemented boundaries.

## Run it locally

Use Node.js 22.16 or later for the connectors package and its real SQLite example. From the repository root:

```sh
npm ci
npm --prefix packages/connectors run build
npx tsx --test tests/connector-*.test.ts
npm run demo:connectors
```

The connector demo runs at [http://127.0.0.1:5190](http://127.0.0.1:5190). It uses local SQLite and JSON fixtures through a registered application gateway; it does not require cloud credentials. Its fixture identity and authorization are demonstrations, not a production login system.

For the main Motif site, run `npm run dev` and open the [decision lab](http://127.0.0.1:5185/#decision-lab). Its conversion, retention and product workflows connect seven fictional JSON source snapshots, including 36 accounts, sessions, checkouts, usage, support, interviews and features. Explore 3D evidence scenes, filter records, inspect exact source values and download an investigation brief. These workflows use real JSON connectors with synthetic records; they are not connected to live provider accounts. The original playground is at `/demo/playground.html`, and the example gallery remains at `/examples/`.

The [connector directory](http://127.0.0.1:5185/connectors/) provides **45 source-specific guides** at `/connectors/<slug>/`, covering 44 factories and all 39 catalog entries. MySQL and MariaDB have separate guides for their shared adapter. Each guide includes setup, exact TypeScript samples with copy/download controls, supported operations, runtime/limits, provider documentation and related source/outcome links. The static page text and code remain readable without JavaScript; browser enhancements do not execute samples or collect credentials.

In the full repository, `npm run dev` and `npm run build:demo` generate these pages from `connectors/content/*.ts` using `scripts/generate-connector-pages.ts`. Use `npm run prepare:connectors` after content edits for an explicit refresh. The source ZIP includes the authored guides, renderer, client and generator; generated HTML is ignored and recreated. The packed package artifact contains the adapter build and this reference, not the website source.

For a separate local application, build first and install the package by filesystem path, adjusting the path for your checkout:

```sh
npm install ../fivejs/packages/connectors
```

Do not use a registry installation command until an actual release is announced. Database drivers are caller-owned, optional integrations; this package does not install every database SDK.

## Browser and server boundaries

Import `motif-connectors` for browser-safe helpers: `jsonConnector`, `csvConnector`, `arrowConnector`, `parquetConnector`, `endpointConnector`, `mapRows`, `collectPages`, the table types, and the catalog. Import `motif-connectors/server` for database, warehouse, application and semantic adapters, plus `createConnectorGateway`. Arrow/Parquet readers are injected by the application; these factories do not bundle those SDKs.

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

Database access must be constrained by **provider-side read-only roles**, views and row-level policies where appropriate. SQL text inspection or a `SELECT` regular expression cannot enforce read-only behavior. Use each source's native parameter facility where supported; adapters without bindings require approved server-owned statements. Never concatenate browser input into SQL identifiers, filters, or statements. Tenant IDs in particular must come from validated access context, not a request parameter merely named `tenantId`.

## Implemented adapters and verification

“Protocol” means local tests against mocked official-driver/API shapes, including failures and pagination where supported. No live cloud credentials were used. SDK typechecks confirm structural compatibility, not successful production queries. Real checks are identified separately: in-memory SQLite, a temporary official DuckDB Node API installation, and an Arrow/Parquet roundtrip using `apache-arrow` 21.2.0 and `parquet-wasm` 0.9.0. Optional SDKs used for these checks were installed in a temporary directory, not added as runtime dependencies.

Unless identified as universal, factories below are exported from `motif-connectors/server`. “Snapshot” means a bounded preview with explicit truncation and no continuation cursor. Every listed factory has an implementation; broader features outside its stated scope remain future work.

### Databases — 14 catalog entries

| Source and official documentation | Factory | Implemented scope | Verification |
| --- | --- | --- | --- |
| [PostgreSQL](https://node-postgres.com/features/queries) | `postgresConnector` | Caller-owned `pg`, bound values, positional rows, one result set; snapshot; full driver result can materialize before slicing. | Protocol |
| [MySQL / MariaDB](https://sidorares.github.io/node-mysql2/docs) | `mysqlConnector` | `mysql2/promise` prepared execution and array rows; snapshot; `provider: 'mariadb'` selects provenance; disable multiple statements. | Protocol |
| [SQLite](https://nodejs.org/api/sqlite.html) | `sqliteConnector` | `DatabaseSync` 22.16+, exact integer reads, positional iterator and lookahead; synchronous snapshot. | Protocol + real SQLite |
| [DuckDB](https://duckdb.org/docs/stable/clients/node_neo/overview) | `duckdbConnector` | Official Node API bounded reader and exact JSON conversion; snapshot; vector-sized overfetch. | Protocol + real SDK smoke |
| [MongoDB](https://www.mongodb.com/docs/drivers/node/current/crud/query/cursor/) | `mongodbConnector` | Configured collection, find/filter/projection/sort, canonical EJSON, `maxTimeMS`; snapshot; no aggregation pipeline. | Protocol |
| [SQL Server](https://tediousjs.github.io/node-mssql/) | `sqlServerConnector` | Fresh caller-configured request per read, named typed parameters, positional single-result snapshot; request cancellation attempted. | Protocol + SDK types |
| [Oracle](https://node-oracledb.readthedocs.io/en/latest/) | `oracleConnector` | Bound execution, array-format ResultSet, metadata and lookahead; closes owned ResultSet; snapshot. | Protocol + SDK types |
| [ClickHouse](https://clickhouse.com/docs/integrations/javascript) | `clickHouseConnector` | Official client, typed query parameters, JSONCompact, exact decimal/64-bit string output requested; block-bounded snapshot. | Protocol + SDK types |
| [Elasticsearch](https://www.elastic.co/docs/reference/elasticsearch/clients/javascript) / [OpenSearch](https://docs.opensearch.org/latest/clients/javascript/) | `elasticsearchConnector`, `opensearchConnector` | Configured index, query/source/sort and exact total checks; reject timed-out/partial shards; snapshots without PIT or `search_after`. | Protocol + SDK types |
| [Redis](https://redis.io/docs/latest/develop/clients/nodejs/) | `redisConnector` | Explicit string-key `MGET`; raw strings/nulls; snapshot; no scans, key discovery or arbitrary commands. | Protocol + SDK types |
| [DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html) | `dynamoDBConnector` | Query on configured table/index, low-level AttributeValue values and `LastEvaluatedKey`; empty filtered pages can still continue. | Protocol + SDK types |
| [Neo4j](https://neo4j.com/docs/javascript-manual/current/) | `neo4jConnector` | Bound Cypher, owned READ session, explicit value serializer, iteration/lookahead; snapshot; no automatic graph flattening. | Protocol + SDK types |
| [Firestore](https://cloud.google.com/nodejs/docs/reference/firestore/latest) | `firestoreConnector` | Preconfigured official query with lookahead, document IDs/paths and serializer; snapshot; no client-selected collection/query. | Protocol + SDK types |
| [Supabase](https://supabase.com/docs/reference/javascript/introduction) | `supabaseConnector` | Native configured table/selection, equality/null filters, ordering and count-aware bounded read; snapshot; caller owns RLS/auth context. | Protocol + SDK types |

### Warehouses — 6 catalog entries

| Source and official documentation | Factory | Implemented scope | Verification |
| --- | --- | --- | --- |
| [BigQuery](https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query) | `createBigQueryConnector` | Standard SQL, native typed parameters, completion polling, nested schema and result pages; optional billing cap. | HTTP protocol |
| [Snowflake](https://docs.snowflake.com/en/developer-guide/sql-api) | `createSnowflakeConnector` | Single SQL API statement, typed bindings, polling and buffered partition pages; configured account/execution context. | HTTP protocol |
| [Databricks](https://docs.databricks.com/api/statement-execution/v1/statement-execution) | `createDatabricksConnector` | Statement Execution API, parameters, polling, inline JSON chunks; explicit whole-result row/byte truncation; no external links. | HTTP protocol |
| [Redshift](https://docs.aws.amazon.com/redshift-data/latest/APIReference/Welcome.html) | `redshiftConnector` | Data API execute/describe/get-result commands, native parameters, polling, buffered result pages; no resubmission during paging. | Protocol + SDK types |
| [Athena](https://docs.aws.amazon.com/athena/latest/APIReference/Welcome.html) | `athenaConnector` | Workgroup execution, native parameter strings, polling and DATA_ROWS pages; removes initial header once; missing cells become null. | Protocol + SDK types |
| [Trino](https://trino.io/docs/current/develop/client-protocol.html) | `trinoConnector` | Inline statement protocol, polling/buffered result pages and validated same-origin next URI; no spooling or session mutation. | HTTP protocol |

### Application and product tools — 12 catalog entries

| Source and official documentation | Factory | Implemented scope | Verification |
| --- | --- | --- | --- |
| [Stripe](https://docs.stripe.com/api/pagination) | `stripeConnector` | Selected v1 resource lists, optional API version/account, `starting_after`; 100 records/request; full returned record. | HTTP protocol |
| [HubSpot](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide) | `hubspotConnector` | Selected CRM v3 lists, properties/archive flag and `after`; 100 records/request; missing/null distinction retained. | HTTP protocol |
| [Airtable](https://airtable.com/developers/web/api/list-records) | `airtableConnector` | Configured base/table, view/field selection and native offset; 100 records/request; omission semantics reported. | HTTP protocol |
| [Salesforce](https://developer.salesforce.com/docs/platform/api-rest/guide/resources-query-more-results.html) | `salesforceConnector` | SOQL REST records with validated query-more paths and buffered batches; no Bulk API or expanded nested relationships. | HTTP protocol |
| [Shopify](https://shopify.dev/docs/api/admin-graphql/latest/queries/products) | `shopifyConnector` | Fixed Admin GraphQL product/customer/order selections, variable-bound search and native cursors; 250 records/request. | HTTP protocol |
| [GA4](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport) | `googleAnalyticsConnector` | Dimension/metric aggregates, absolute date range, stable dimension ordering and offset pages; threshold/grain warnings. | HTTP protocol |
| [Mixpanel](https://docs.mixpanel.com/reference/raw-event-export) | `mixpanelConnector` | Bounded NDJSON raw-event export; 31-day maximum interval; lookahead establishes truncation; no invented resume cursor. | HTTP protocol |
| [Amplitude](https://amplitude.com/docs/apis/analytics/dashboard-rest) | `amplitudeConnector` | Daily segmentation for one event and `uniques`/`totals`, up to 31 days; local paging over the fetched aggregate response. | HTTP protocol |
| [PostHog](https://posthog.com/docs/api/endpoints) | `posthogConnector` | Configured named SQL Endpoint, pinned version, scalar variables, native limit/offset; beta; no general `/query` export. | HTTP protocol |
| [Segment](https://www.twilio.com/docs/segment/unify/profile-api) | `segmentConnector` | Profile traits/events/external IDs for configured space/collection, native next cursor; 100 items/request; not a warehouse export. | HTTP protocol |
| [Zendesk](https://developer.zendesk.com/api-reference/introduction/pagination/) / [Intercom](https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/listcontacts) | `zendeskConnector`, `intercomConnector` | Zendesk ticket/user/organization lists, 100/request; Intercom contacts, 150/request; native cursors; no incremental ticket export or conversation history. | HTTP protocol |
| [Google Sheets](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get) | `googleSheetsConnector` | Fixed rectangle, explicit fields, 1–100 columns and at most 100,000 rows; bounded range pages and blank-cell semantics. | HTTP protocol |

### BI and semantic tools — 4 catalog entries

| Source and official documentation | Factory | Implemented scope | Verification |
| --- | --- | --- | --- |
| [Looker](https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/Query/run_inline_query) | `lookerConnector` | Explore query to CSV, selected fields/filters/sorts/timezone; snapshot; visualization formatting, pivots and table calculations disabled. | HTTP protocol |
| [Power BI](https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries) | `powerBiConnector` | Server-owned DAX table expression, exact field-key mapping, TOPN preview, nulls included; partial-error responses rejected. | HTTP protocol |
| [Tableau](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_workbooks_and_views.htm#query_view_data) | `tableauConnector` | Configured published-view summary CSV and filters; snapshot; cached, and only the first view for dashboards. | HTTP protocol |
| [dbt](https://docs.getdbt.com/docs/dbt-apis/sl-graphql) / [Cube](https://docs.cube.dev/reference/core-data-apis/rest-api) | `dbtSemanticConnector`, `cubeConnector` | dbt executes/polls metric queries and decodes Arrow result pages through a preview cap; Cube loads semantic members and preserves grain. Both expose snapshots. | HTTP protocol; shared Arrow reader checked separately |

### Files and application transport — 3 catalog entries

| Source | Universal factory | Implemented scope | Verification |
| --- | --- | --- | --- |
| [JSON](https://www.rfc-editor.org/rfc/rfc8259) | `jsonConnector` | Immutable positional snapshot; local pages; no network access. | Local values, mutation and pagination |
| [CSV](https://www.rfc-editor.org/rfc/rfc4180), [Parquet](https://kylebarron.dev/parquet-wasm/), [Arrow](https://arrow.apache.org/docs/js/) | `csvConnector`, `parquetConnector`, `arrowConnector` | Supplied bytes/text, bounded decoding and immutable local pages; caller-owned binary readers and exact-type decoders. | Parser/contracts + real Arrow/Parquet roundtrip |
| [Application endpoint](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) | `endpointConnector` | Registered operations and validated pages; server `createConnectorGateway` requires authorization and binds continuation to access context. | Local HTTP/gateway tests + fixture demos |

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

The additional native database factories use the same identity and read contract. These examples assume configured, authorized clients and the official driver constants; `serializeNeo4jValue` and `serializeFirestoreDocument` are application functions that preserve exact native values.

```ts
import {
  sqlServerConnector, oracleConnector, clickHouseConnector,
  elasticsearchConnector, opensearchConnector, redisConnector,
  neo4jConnector, firestoreConnector, supabaseConnector,
} from 'motif-connectors/server';

const sqlServer = sqlServerConnector({
  id: 'sql-server', source: 'Approved customer data', request: () => sqlPool.request(),
});
await sqlServer.read({
  text: 'SELECT TOP (101) customer_id FROM approved_customers WHERE tenant_id = @tenant',
  parameters: { tenant: { type: mssql.NVarChar, value: authorizedTenantId } },
}, { limit: 100 });

const oracle = oracleConnector({
  id: 'oracle', source: 'Approved customer data', client: oracleConnection,
  outFormatArray: oracledb.OUT_FORMAT_ARRAY, fetchTypeHandler: exactOracleTypes,
});
await oracle.read({
  text: 'SELECT customer_id FROM approved_customers WHERE tenant_id = :tenant FETCH FIRST 101 ROWS ONLY',
  binds: { tenant: authorizedTenantId },
}, { limit: 100 });

const clickhouse = clickHouseConnector({ id: 'clickhouse', source: 'Product events', client: clickhouseClient });
await clickhouse.read({
  text: 'SELECT customer_id FROM approved_events WHERE tenant_id = {tenant:String} LIMIT 101',
  parameters: { tenant: authorizedTenantId },
}, { limit: 100 });

const search = elasticsearchConnector({ id: 'search', source: 'Approved interviews', client: elasticClient, index: 'approved-interviews' });
const openSearch = opensearchConnector({ id: 'open-search', source: 'Approved interviews', client: openSearchClient, index: 'approved-interviews' });
await search.read({ query: { term: { tenant_id: authorizedTenantId } }, source: ['customer_id', 'interview_id'] }, { limit: 100 });
await openSearch.read({ query: { term: { tenant_id: authorizedTenantId } } }, { limit: 100 });

const redis = redisConnector({ id: 'redis', source: 'Approved customer state', client: redisClient });
await redis.read({ keys: authorizedCustomerKeys }, { limit: 100 });

const graph = neo4jConnector({
  id: 'neo4j', source: 'Customer relationships', driver: neo4jDriver, database: 'neo4j',
  serialize: serializeNeo4jValue, queryTimeoutMs: 5_000,
});
await graph.read({ text: 'MATCH (c:Customer {tenantId: $tenant}) RETURN c.id LIMIT 101', parameters: { tenant: authorizedTenantId } }, { limit: 100 });

const documents = firestoreConnector({
  id: 'firestore', source: 'Approved customer documents',
  query: firestore.collection('customers').where('tenantId', '==', authorizedTenantId),
  serialize: serializeFirestoreDocument,
});
await documents.read(undefined, { limit: 100 });

const supabase = supabaseConnector({
  id: 'supabase', source: 'Approved product usage', client: authorizedSupabaseClient,
  table: 'approved_usage', columns: 'customer_id,feature_id',
});
await supabase.read({ equals: { tenant_id: authorizedTenantId }, order: { column: 'customer_id' } }, { limit: 100 });
```

These nine factories return snapshots without continuation. SQL Server and some search/SDK responses can materialize more than the returned limit. Oracle closes its ResultSet, not the supplied connection; configure its fetch handler for exact `NUMBER` and timestamp text and use connection-level `callTimeout`. ClickHouse requests quoted decimal/64-bit output and a provider result-row cap, but its processing blocks can overfetch. Search adapters reject partial shard results and do not provide a point-in-time view. Redis accepts at most 100,000 explicit keys and reads only the requested prefix; cluster `MGET` requires compatible key slots. Neo4j READ routing is not a security boundary; its owned session is closed after reading, while the driver remains yours. Its `queryTimeoutMs` defaults to 30,000 and is bounded to 1–120,000. Firestore serializers should preserve timestamp seconds/nanoseconds; configure the official client with `useBigInt: true` for exact integers. Supabase's exact count detects provider row caps but adds query cost; service-role credentials may bypass RLS, so use the intended authorization context or approved views.

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

AWS integrations accept an official SDK client and small command-constructor functions. This keeps SDK versions, credentials, regions and retries under application control. The command names below are imported from the corresponding AWS SDK v3 package in your application.

```ts
import { dynamoDBConnector, redshiftConnector, athenaConnector, trinoConnector } from 'motif-connectors/server';

const dynamo = dynamoDBConnector({
  id: 'dynamo', source: 'Customer events', client: dynamoClient,
  queryCommand: input => new QueryCommand(input), tableName: 'customer-events',
});
await dynamo.read({
  keyConditionExpression: '#tenant = :tenant',
  expressionAttributeNames: { '#tenant': 'tenant_id' },
  expressionAttributeValues: { ':tenant': { S: authorizedTenantId } },
}, { limit: 100 });

const redshift = redshiftConnector({
  id: 'redshift', source: 'Revenue warehouse', client: redshiftDataClient,
  database: 'analytics', workgroupName: 'analytics-readers',
  commands: {
    execute: input => new ExecuteStatementCommand(input),
    describe: input => new DescribeStatementCommand(input),
    results: input => new GetStatementResultCommand(input),
  },
});
await redshift.read({ text: 'SELECT customer_id FROM approved_customers WHERE tenant_id = :tenant', parameters: [{ name: 'tenant', value: authorizedTenantId }] }, { limit: 100 });

const athena = athenaConnector({
  id: 'athena', source: 'Product lake', client: athenaClient,
  workGroup: 'motif-readers', database: 'analytics',
  commands: {
    start: input => new StartQueryExecutionCommand(input),
    execution: input => new GetQueryExecutionCommand(input),
    results: input => new GetQueryResultsCommand(input),
  },
});
await athena.read({ text: 'SELECT customer_id FROM approved_customers WHERE active = ?', executionParameters: ['true'] }, { limit: 100 });

const trino = trinoConnector({
  id: 'trino', source: 'Federated product data', baseUrl: 'https://trino.example.com',
  user: 'motif-reader', catalog: 'analytics', schema: 'approved',
  token: () => credentials.trinoAccessToken(),
});
await trino.read({ text: 'SELECT customer_id FROM customer_summary' }, { limit: 100 });
```

DynamoDB exposes **Query**, not Scan, using low-level AttributeValue maps; `N`/`NS` values remain decimal strings. Native limits count evaluated items before filtering, so an empty page can still have a continuation. Optional `indexName`, `consistentRead`, filters and projection retain AWS semantics; even strongly consistent pages are not a cross-page snapshot.

Redshift requires exactly one of `clusterIdentifier` or `workgroupName`; `dbUser` and `secretArn` are optional configured authentication context. It buffers native result pages because `GetStatementResult` does not accept a page-size limit. Project precision-sensitive numeric columns as `VARCHAR` before JSON decoding. Athena optionally accepts `catalog` and `outputLocation`; its `executionParameters` use Athena's SQL-literal semantics, not a generic parameter encoder, so build them server-side. Result cells remain strings/null, with native pages capped at 1,000 rows. Workgroup/S3 permissions and scan budgets remain application-owned. Trino accepts a complete server-owned statement, without parameter interpolation, prepared statements, session mutation or spooled results. Redshift/Trino reject individual native result pages above 100,000 rows. None of these adapters submits a native job-cancellation request after transport cancellation.

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

### CRM, commerce, support and profiles

All provider IDs, API versions, allowed queries and credential callbacks in these examples are application configuration. Version strings must match a provider version your application has validated: Salesforce uses forms such as `64.0`, Shopify uses quarterly forms such as `2026-10`, and Intercom uses forms such as `2.17`. The connector does not choose a currently supported version for you.

```ts
import {
  salesforceConnector, shopifyConnector, zendeskConnector,
  intercomConnector, segmentConnector, googleSheetsConnector,
} from 'motif-connectors/server';

const salesforce = salesforceConnector({
  id: 'salesforce', source: 'Approved CRM accounts',
  instanceUrl: salesforceInstanceOrigin, apiVersion: salesforceApiVersion,
  token: () => credentials.salesforceAccessToken(),
});
await salesforce.read({ soql: 'SELECT Id, Name FROM Account ORDER BY Id' }, { limit: 100 });

const shopify = shopifyConnector({
  id: 'shopify', source: 'Shop products', shop: 'your-shop', apiVersion: shopifyApiVersion,
  token: () => credentials.shopifyAdminToken(),
});
await shopify.read({ resource: 'products', search: 'status:active' }, { limit: 100 });

const zendesk = zendeskConnector({
  id: 'zendesk', source: 'Support tickets', subdomain: 'your-company',
  token: () => credentials.zendeskOAuthToken(),
});
await zendesk.read({ resource: 'tickets' }, { limit: 100 });

const intercom = intercomConnector({
  id: 'intercom', source: 'Support contacts', apiVersion: intercomApiVersion, region: 'US',
  token: () => credentials.intercomAccessToken(),
});
await intercom.read(undefined, { limit: 100 });

const segment = segmentConnector({
  id: 'segment', source: 'Authorized customer profile', spaceId: segmentSpaceId,
  collection: 'users', region: 'US', token: () => credentials.segmentProfileToken(),
});
await segment.read({ profile: authorizedProfileIdentifier, resource: 'traits' }, { limit: 100 });

const sheets = googleSheetsConnector({
  id: 'interviews-sheet', source: 'Approved research interviews',
  spreadsheetId: researchSpreadsheetId, sheet: 'Interviews', firstColumn: 1,
  startRow: 2, endRow: 101,
  fields: [{ name: 'customer_id', type: 'string' }, { name: 'interview_id', type: 'string' }],
  valueRenderOption: 'FORMATTED_VALUE', token: () => credentials.googleAccessToken(),
});
await sheets.read(undefined, { limit: 50 });
```

Salesforce executes server-owned SOQL through REST query/query-more and buffers native batches of up to 2,000 records. It does not invent a bind-parameter language for SOQL. Construct approved queries safely on the server; nested relationship result sets retain their own pagination metadata and are not expanded. Salesforce, Shopify, Zendesk and Intercom each return one `record` JSON cell per source record.

Shopify uses fixed GraphQL selections: product ID/title/handle/status/timestamps, customer ID/display name/timestamps, or order ID/name/timestamps/financial status/shop money. `search` is bound as a GraphQL variable but still follows Shopify search syntax. This is not a full shop export; granted scopes, protected customer access and order-history permissions constrain results. Zendesk supports `tickets`, `users` and `organizations`; Intercom supports contacts only, in US/EU/AU regions. Neither exposes incremental export or conversation history.

Segment supports `traits`, `events` and `external_ids` for a server-authorized profile in a fixed users/accounts collection. It uses the Profile API token as the Basic-auth username, with an empty password; the application still supplies a normal `token` callback. Traits have `trait` and `value` columns, preserving false/null/absent distinctions. US and EU regions are supported; this is not workspace-wide event ingestion.

Sheets reads a fixed inclusive row interval, with `fields` defining the column count and metadata. It includes configured blank rows and maps omitted trailing cells to null; it does not discover headers or parse declared types. `FORMATTED_VALUE` is the default and reflects locale/display precision. `UNFORMATTED_VALUE` inherits spreadsheet/JSON number precision; store exact identifiers/decimals as text. `FORMULA` returns formula text for formula cells. Ranges support at most 100 columns and 100,000 rows, with the final sheet row at or below 1,000,000.

### Product analytics

```ts
import {
  googleAnalyticsConnector, mixpanelConnector, amplitudeConnector, posthogConnector,
} from 'motif-connectors/server';

const ga4 = googleAnalyticsConnector({
  id: 'ga4', source: 'Website conversion aggregates', propertyId: ga4PropertyId,
  token: () => credentials.googleAccessToken(),
});
await ga4.read({ dimensions: ['date', 'deviceCategory'], metrics: ['sessions'], startDate: '2026-09-01', endDate: '2026-09-30' }, { limit: 100 });

const mixpanel = mixpanelConnector({
  id: 'mixpanel', source: 'Checkout events', projectId: mixpanelProjectId, region: 'US',
  credentials: () => ({ username: secrets.mixpanelServiceAccount, password: secrets.mixpanelServiceSecret }),
});
await mixpanel.read({ fromDate: '2026-09-01', toDate: '2026-09-07', events: ['Checkout completed'] }, { limit: 500 });

const amplitude = amplitudeConnector({
  id: 'amplitude', source: 'Daily activation', region: 'US',
  credentials: () => ({ username: secrets.amplitudeApiKey, password: secrets.amplitudeSecretKey }),
});
await amplitude.read({ event: 'Activated', metric: 'uniques', startDate: '2026-09-01', endDate: '2026-09-30' }, { limit: 100 });

const posthog = posthogConnector({
  id: 'posthog', source: 'Approved product decisions', host: posthogOrigin,
  projectId: posthogProjectId, endpoint: 'customer-retention', version: 1,
  token: () => credentials.posthogEndpointToken(),
});
await posthog.read({ variables: { tenant: authorizedTenantId } }, { limit: 100 });
```

GA4 accepts 1–9 dimensions, 1–10 metrics and an absolute `YYYY-MM-DD` date interval of at most 366 days. Metrics remain their source strings; rows represent aggregate dimension combinations, never individual sessions or users. Thresholding, sampling and “other” aggregation are reported through warnings. Unique-user/session metrics are not generally additive across dimensions or dates; offset pages can change as underlying reports change.

Mixpanel uses the supported NDJSON raw-event export with service-account credentials, up to 50 selected event names and an inclusive interval of at most 31 days. It requests one lookahead event to establish truncation and exposes no continuation. Narrow a truncated query or use an external export pipeline; export order is not a checkpoint. Amplitude uses Dashboard REST daily segmentation for one event and `uniques` or `totals`, also up to 31 days. Its cursor pages reuse one fetched aggregate response; this is not the ZIP raw-event export. Daily unique counts are nonadditive. Both support US/EU regions and the provider's project-timezone rules.

PostHog uses the **named SQL Endpoint API**, pinned to a configured endpoint/version with at most 100 scalar variables. Its supported scope is `/api/projects/{project}/endpoints/{name}/run/`, not a general `/query` proxy. The saved endpoint must define stable ordering, tenant access, grain and query budgets. The API is beta. A returned endpoint-version mismatch fails; an incomplete asynchronous result raises `QUERY_PENDING` without returning partial rows or automatically polling. Provider endpoint pagination does not make changing source data transactionally consistent.

### BI and semantic queries

```ts
import {
  lookerConnector, powerBiConnector, tableauConnector, cubeConnector, dbtSemanticConnector,
} from 'motif-connectors/server';

const looker = lookerConnector({ id: 'looker', source: 'Customer explore', baseUrl: lookerOrigin, token: () => credentials.lookerAccessToken() });
await looker.read({ model: 'commerce', view: 'orders', fields: ['orders.customer_id', 'orders.count'], filters: { 'orders.created_date': '30 days' } }, { limit: 100 });

const powerBi = powerBiConnector({ id: 'power-bi', source: 'Approved customer model', datasetId: powerBiDatasetId, token: () => credentials.powerBiAccessToken() });
await powerBi.read({
  tableExpression: 'SELECTCOLUMNS(ApprovedCustomers, "customer_id", ApprovedCustomers[customer_id])',
  fields: [{ name: '[customer_id]', type: 'string' }],
}, { limit: 100 });

const tableau = tableauConnector({
  id: 'tableau', source: 'Customer summary view', baseUrl: tableauOrigin,
  siteId: tableauSiteId, viewId: tableauViewId, apiVersion: tableauApiVersion,
  maxAgeMinutes: 1, token: () => credentials.tableauSessionToken(),
});
await tableau.read({ filters: { Region: 'West' } }, { limit: 100 });

const cube = cubeConnector({ id: 'cube', source: 'Product semantic model', baseUrl: cubeOrigin, token: () => credentials.cubeToken() });
await cube.read({ measures: ['Orders.count'], dimensions: ['Orders.customerId'], timezone: 'UTC' }, { limit: 100 });

const dbt = dbtSemanticConnector({
  id: 'dbt', source: 'Governed product metrics', baseUrl: dbtSemanticOrigin,
  environmentId: dbtEnvironmentId, token: () => credentials.dbtAccessToken(),
  tableFromIPC, decodeCell: decodeExactArrowCell,
});
await dbt.read({ metrics: [{ name: 'order_count' }], groupBy: [{ name: 'metric_time', grain: 'DAY' }] }, { limit: 100 });
```

These five factories return bounded snapshots, without public continuation. Looker accepts optional filters, sorts and timezone; CSV values remain strings, with pivots/totals/table calculations outside scope. Power BI accepts an optional `groupId` and a **table expression**, not a full `EVALUATE` statement; the adapter wraps it in `EVALUATE TOPN(limit + 1, …)`. Supply exact result keys, including square-bracket aliases, in `fields`; project exact decimals/large values as text in DAX. Partial-error responses fail rather than masquerading as complete data.

Tableau exports cached summary-level CSV from a configured view; dashboard exports contain only their first view, not underlying details or all sheets. Cube accepts measures, dimensions, segments, time dimensions, filters, ordering and timezone under a fixed `apiPath` (default `/cubejs-api/v1`). It polls “Continue wait” responses within the read timeout, preserves semantic member/time-grain names and retains exact numeric strings. dbt executes `createQuery`, polls completion and reads Arrow result pages only through the requested preview cap. Its metrics, dimensions and `where` SQL expressions are server-owned; an injected Arrow reader and exact decoder handle source types. This integration queries the Semantic Layer, not manifest metadata.

Authentication follows each native protocol: Looker `token`, Power BI/dbt bearer, Tableau `X-Tableau-Auth` session token, and Cube's raw authorization token. All still use a fresh server `token` callback. Semantic access policies, metric definitions, cache freshness and source-side cost controls remain owned by those systems and the application.

### Supplied CSV, Arrow and Parquet

```ts
import { csvConnector, arrowConnector, parquetConnector } from 'motif-connectors';
import { tableFromIPC } from 'apache-arrow'; // Optional application dependency.

const csv = csvConnector({
  id: 'csv', source: 'Uploaded research export',
  data: 'customer_id,interviews\ncus_1,2\ncus_2,0\n', maxRows: 10_000,
});
const arrow = arrowConnector({
  id: 'arrow', source: 'Supplied Arrow export', data: arrowBytes, tableFromIPC,
});
const parquet = parquetConnector({
  id: 'parquet', source: 'Supplied Parquet export', data: parquetBytes,
  tableFromIPC, readParquet, // From initialized parquet-wasm in your application.
});

const first = await csv.read(undefined, { limit: 1 });
const second = await csv.read(undefined, { limit: 1, cursor: first.page.nextCursor });
await arrow.read(undefined, { limit: 100 });
await parquet.read(undefined, { limit: 100 });
```

The factories read supplied text/bytes, without downloading URLs. Defaults are 8 MiB and 100,000 rows; configurable maxima are 32 MiB and 100,000 rows, with a hard cap of one million decoded cells and 1,000 columns. CSV supports UTF-8/BOM, quoted newlines, escaped quotes, duplicate headers, and `,`, `;`, tab or `|` delimiters. Supply `columns` for headerless data. All CSV values remain strings, including empty strings; null/type inference is intentionally application-owned.

Arrow/Parquet support primitives and dictionaries of supported primitives. For decimal, temporal or nested types, supply `decodeCell(vector, row, field)` that reads exact raw vector data **before** any lossy JavaScript conversion and returns a supported `Cell`. A wrapper around an already-rounded value cannot recover precision. Safe integral primitives and `bigint` are normalized without guessing timestamps or decimals. Parquet uses the initialized `parquet-wasm` reader, consumes its table into an Arrow IPC stream, then invokes `tableFromIPC`; the adapter owns freeing that temporary WASM table.

The application owns SDK loading, WASM initialization and file access. Decoding may materialize the whole supplied file and cannot interrupt a synchronous reader. Snapshot row-cap truncation persists on the final local page: following every cursor does not recover rows omitted during decoding. Real local Arrow/Parquet checks covered exact INT64, dictionary strings and truncation; other codecs, complex types and production-sized files require application acceptance tests.

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
| BigQuery / Snowflake / Databricks / DynamoDB / Redshift / Athena / Trino | Instance-local, 5-minute expiry, at most 32 stored states per connector; oldest states can be evicted | Exact query and adapter instance |
| Salesforce / Shopify / GA4 / Amplitude / PostHog / Segment / Zendesk / Intercom / Google Sheets | Instance-local, 5-minute expiry, at most 32 stored states per connector; native continuation or buffered rows | Exact query and adapter instance |
| Application gateway | Instance-local, 15-minute expiry, at most 1,000 stored handles | Operation, authenticated subject, access scope and validated parameters |
| JSON / CSV / Arrow / Parquet snapshot | Connector instance lifetime; no time-based expiry | Snapshot instance and source identity |
| Stripe / HubSpot / Airtable | Stateless source/query envelopes around native continuation; provider validity rules apply | Connector/source identity and normalized resource/query configuration |

Cursors are continuation state, not authorization. Gateway authorization runs again on every page. Stored cursors do not survive process restarts and are not shared across workers; use affinity for this prototype or implement a durable shared cursor service before distributed deployment. Do not treat handles as permanent bookmarks.

The row limit bounds returned rows, not database work, bytes scanned, compute cost, or every driver's memory use. PostgreSQL/MySQL/SQL Server may materialize a larger query result before the local slice. SQLite stops iteration after a lookahead row but may still perform expensive sorting or scanning. DuckDB and ClickHouse work in chunks/blocks; API adapters can buffer a native result page larger than the requested page. Set provider statement budgets, constrain server-owned queries, and use approved aggregate views for large datasets.

Cancellation capabilities describe what the adapter can attempt. HTTP adapters and MongoDB forward abort signals; AWS adapters pass SDK abort signals, and SQL Server attempts request cancellation. Warehouse and semantic adapters stop transport/polling but do **not** submit native job-cancellation requests. Provider work and billing can continue after a timeout. PostgreSQL/MySQL/DuckDB/Oracle/OpenSearch/Redis/Neo4j/Firestore cancellation is cooperative in this implementation. Synchronous SQLite and file readers cannot observe a new JavaScript abort or timer while blocking the event loop. The caller owns connection lifetime and provider cancellation policy.

## Coverage boundaries and production acceptance

All 39 entries in the [coverage catalog](./dist/catalog.js) have the implementations described above. This catalog is a selected source list, not a claim to support every leading service, every protocol feature or every deployment/version. Grouped entries and compatibility aliases do not imply full feature parity; the per-factory scope and warnings are the contract.

This release does not provide connection onboarding, secret storage, OAuth consent/refresh flows, schema discovery, migration management, incremental synchronization/CDC, background ingestion schedules, automatic retries/backoff, native warehouse cancellation, durable cursor storage, semantic metric definitions, or an entity-join engine. No provider write convenience APIs are implemented; server-owned SQL is executed as supplied and must be constrained by read-only privileges. Custom registrations can map source records to customers, products, interviews, sessions and checkouts, but the application must define those joins and access rules explicitly.

Before declaring an adapter production-ready, test it against the intended provider/account and driver version with representative data, exact numeric/timestamp cases, access scopes, quotas, failures and data volumes. The existing test suite establishes local contracts; it does not substitute for those live acceptance checks.
