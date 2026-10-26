import type { ConnectorGuide } from './types.js';

const localPackage = 'Build Motif Connectors in the checkout, then install that directory in your application by filesystem path. motif-connectors is a private, unpublished package; these imports refer to that local installation.';
const serverAccess = 'Run this module on your application server. Derive tenant scope from authenticated access and obtain fresh provider credentials through the token callback; never send either to the visualization.';
const pageContract = 'This sample returns a DataPage. Inspect its warnings, hasMore, nextCursor and truncated flags before treating the result as a complete population.';
const filePrecision = 'The sample accepts primitive Arrow fields and dictionaries of supported primitives. Export decimals, timestamps and nested values as exact strings upstream, or provide an application-tested lossless decodeCell that reads raw vectors before any lossy conversion. Number() cannot restore precision.';

export const platformGuides: ConnectorGuide[] = [
  {
    slug: 'bigquery', catalogName: 'BigQuery', name: 'BigQuery', factory: 'createBigQueryConnector', monogram: 'BQ', accent: '#85bbff', runtime: 'server',
    headline: 'Follow the checkout attempt through the warehouse.',
    description: 'Bring governed BigQuery results into a visual investigation with typed parameters, exact identifiers and the query job attached to each page.', outcome: 'conversion',
    prerequisites: [localPackage, serverAccess, 'Supply an OAuth access-token callback with BigQuery job and data-read permissions. Replace the approved_checkout_attempts view with a server-owned view in the configured project and location.', pageContract],
    capabilities: [
      { title: 'Native query jobs', body: 'Submit SQL once, poll incomplete jobs, and carry the project, location and job identifier through result pagination.' },
      { title: 'Typed parameters', body: 'Use BigQuery parameterType and parameterValue objects instead of interpolating tenant or customer values into SQL.' },
      { title: 'Exact result evidence', body: 'Preserve integer and decimal strings, ordered fields and nested records alongside source provenance and a query ID.' },
    ],
    limitations: ['A page limit does not bound bytes scanned. Use maximumBytesBilled and provider-side controls as well as an approved query.', 'Opaque cursors belong to one adapter instance and query; they expire after five minutes and the registry retains at most 32 states.', 'Cancellation stops transport and polling; it does not submit a BigQuery job cancellation. The adapter is protocol-tested, not certified against your live project.'],
    sample: { title: 'Read tenant-scoped checkout attempts', filename: 'bigquery-checkouts.ts', description: 'The authorized tenant is supplied by server authentication. The view has one row per attempt; monetary values remain exact strings.', code: `import { createBigQueryConnector, type BigQueryOptions } from 'motif-connectors/server';

export async function readCheckoutAttempts(
  access: Pick<BigQueryOptions, 'projectId' | 'token'>,
  authorizedTenantId: string,
) {
  const source = createBigQueryConnector({
    ...access, id: 'checkout-warehouse', source: 'Approved checkout attempts',
    location: 'US', maximumBytesBilled: '1000000000',
  });
  return source.read({
    text: 'SELECT attempt_id, customer_id, session_id, status, CAST(amount_usd AS STRING) AS amount_usd FROM analytics.approved_checkout_attempts WHERE tenant_id = @tenant ORDER BY attempt_id',
    parameterMode: 'NAMED',
    parameters: [{ name: 'tenant', parameterType: { type: 'STRING' }, parameterValue: { value: authorizedTenantId } }],
  }, { limit: 200, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which recorded checkout failures deserve investigation before changing the payment flow?', join: 'Join attempt_id to the checkout ledger, session_id to session evidence and customer_id to CRM accounts. Keep attempts distinct when an account retries.', action: 'Inspect failed attempts and support context, then propose a resumable-checkout experiment for the affected segment.', measure: 'Completed attempts / started attempts in a fixed observation window, with duplicate charges and payment errors as guardrails; a recovery scenario is not a causal estimate.' },
    docs: [{ label: 'BigQuery jobs.query', url: 'https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query' }, { label: 'Parameterized queries', url: 'https://cloud.google.com/bigquery/docs/parameterized-queries' }],
  },
  {
    slug: 'snowflake', catalogName: 'Snowflake', name: 'Snowflake', factory: 'createSnowflakeConnector', monogram: 'SF', accent: '#83d7e8', runtime: 'server',
    headline: 'Connect account health to the records behind it.',
    description: 'Read a governed Snowflake result through its statement lifecycle, retaining exact values while slicing native partitions into visual pages.', outcome: 'retention',
    prerequisites: [localPackage, serverAccess, 'Provide the HTTPS account origin, an authorized token callback and a role/warehouse with read access to the illustrative APPROVED_ACCOUNT_WEEKS view. Match the sample OAuth token type to your authentication.', pageContract],
    capabilities: [
      { title: 'Bound SQL statements', body: 'Pass numbered native bindings while the application owns SQL, database, schema, role and warehouse selection.' },
      { title: 'Partition-aware paging', body: 'Buffer and slice native SQL API partitions so a smaller requested page does not drop the remaining partition rows.' },
      { title: 'Traceable values', body: 'Keep positional metadata, exact decimal/integer strings and the statement handle across pages.' },
    ],
    limitations: ['SQL API access is server-only. Roles, row-access policies, warehouse budgets and statement timeouts remain application/provider responsibilities.', 'Cursors are instance-local, query-bound, limited to 32 states and expire after five minutes; they are not durable export checkpoints.', 'Transport cancellation does not cancel the Snowflake statement. Native partitions may contain more rows than the visualization requested.'],
    sample: { title: 'Read the account-week grain', filename: 'snowflake-retention.ts', description: 'A positional TEXT binding scopes the view to the authorized tenant. No account-health score or churn prediction is invented.', code: `import { createSnowflakeConnector, type SnowflakeOptions } from 'motif-connectors/server';

export async function readAccountWeeks(
  access: Pick<SnowflakeOptions, 'accountUrl' | 'token'>,
  authorizedTenantId: string,
) {
  const source = createSnowflakeConnector({
    ...access, id: 'account-weeks', source: 'Governed account-week usage',
    tokenType: 'OAUTH', warehouse: 'ANALYTICS_WH', database: 'ANALYTICS',
    schema: 'APPROVED', role: 'MOTIF_READER',
  });
  return source.read({
    text: 'SELECT ACCOUNT_ID, OBSERVATION_WEEK, ACTIVE_SESSIONS, RENEWAL_DATE FROM APPROVED_ACCOUNT_WEEKS WHERE TENANT_ID = ? ORDER BY ACCOUNT_ID, OBSERVATION_WEEK',
    bindings: { '1': { type: 'TEXT', value: authorizedTenantId } },
  }, { limit: 200, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which upcoming renewals have an observed usage decline and unresolved support context?', join: 'Join account-week observations to CRM renewal records by account_id; keep support conversations in a separate linked collection to avoid multiplying usage rows.', action: 'Build a human review queue, ordered by renewal date, and inspect the underlying usage and ticket records with each owner.', measure: 'Review completion and next-period account activity. Contract value supplies context; it is not predicted churn or recovered revenue.' },
    docs: [{ label: 'Snowflake SQL API', url: 'https://docs.snowflake.com/en/developer-guide/sql-api' }],
  },
  {
    slug: 'databricks', catalogName: 'Databricks', name: 'Databricks', factory: 'createDatabricksConnector', monogram: 'DB', accent: '#ffb2a2', runtime: 'server',
    headline: 'Make product adoption inspectable.',
    description: 'Bring approved lakehouse observations into the same decision view as customers, interviews and rollout context, with explicit inline-result limits.', outcome: 'product',
    prerequisites: [localPackage, serverAccess, 'Supply a workspace HTTPS origin, SQL warehouse ID and token authorized for the sample catalog/schema/view. Configure the approved view at one account-feature-week per row.', pageContract],
    capabilities: [
      { title: 'Named parameters', body: 'Use Statement Execution API parameters with explicit SQL types and server-owned query text.' },
      { title: 'Bounded inline results', body: 'Configure whole-result row and byte caps and read inline JSON chunks with native statement context.' },
      { title: 'Explicit incompleteness', body: 'Retain provider truncation, source fields and statement provenance instead of presenting a capped result as a full population.' },
    ],
    limitations: ['This adapter supports bounded INLINE JSON results; external result links and arbitrary storage downloads are outside scope.', 'Whole-result caps can omit rows permanently for that statement; following every available cursor does not undo provider truncation.', 'A read timeout stops local transport/polling, not server execution. Configure warehouse permissions, budgets and query limits separately.'],
    sample: { title: 'Read feature adoption observations', filename: 'databricks-adoption.ts', description: 'The server supplies the warehouse and tenant. The result cap is independent of the requested page size.', code: `import { createDatabricksConnector, type DatabricksOptions } from 'motif-connectors/server';

export async function readFeatureAdoption(
  access: Pick<DatabricksOptions, 'workspaceUrl' | 'warehouseId' | 'token'>,
  authorizedTenantId: string,
) {
  const source = createDatabricksConnector({
    ...access, id: 'feature-adoption', source: 'Approved feature adoption',
    catalog: 'analytics', schema: 'approved', maxRows: 1000, maxBytes: 4000000,
  });
  return source.read({
    text: 'SELECT account_id, feature_id, observation_week, active_users FROM feature_adoption WHERE tenant_id = :tenant ORDER BY account_id, feature_id, observation_week',
    parameters: [{ name: 'tenant', value: authorizedTenantId, type: 'STRING' }],
  }, { limit: 200, timeoutMs: 30000 });
}` },
    workflow: { question: 'Where is feature adoption weak, and what customer evidence explains the gap?', join: 'Join account_id and feature_id to rollout eligibility, account context and interview links; preserve the account-feature-week grain and eligible-population denominator.', action: 'Inspect adoption patterns and contradictory interviews, then define a targeted discovery or rollout experiment.', measure: 'Activation among eligible exposed accounts, plus repeat use in a fixed window; compare groups with an explicit experimental or observational design.' },
    docs: [{ label: 'Statement Execution API', url: 'https://docs.databricks.com/api/statement-execution/v1/statement-execution' }],
  },
  {
    slug: 'redshift', catalogName: 'Amazon Redshift', name: 'Amazon Redshift', factory: 'redshiftConnector', monogram: 'RS', accent: '#bdabff', runtime: 'server',
    headline: 'Turn repeat-purchase data into a reviewable retention view.',
    description: 'Use your configured AWS SDK client to run a bound Redshift statement, inspect its job and page through its native results without resubmitting SQL.', outcome: 'retention',
    prerequisites: [localPackage, 'Install @aws-sdk/client-redshift-data in the server application. Pass a RedshiftDataClient configured with the intended region, credentials and IAM permissions; Motif does not create or own that client.', 'The sample uses a Redshift Serverless workgroup and a read-authorized customer_retention view. Configure database authentication in the client/account or supply the adapter’s supported dbUser/secretArn options as appropriate.', pageContract],
    capabilities: [
      { title: 'Caller-owned AWS access', body: 'Inject the real execute, describe and result command constructors into a configured SDK v3 client.' },
      { title: 'Buffered native pages', body: 'Slice a native result page into smaller DataPages, retaining remaining rows and the statement ID.' },
      { title: 'Consistency checks', body: 'Reject changed result schemas, repeated continuation tokens and inconsistent declared row totals.' },
    ],
    limitations: ['GetStatementResult controls native page size; Motif buffers a page and rejects a native page above 100,000 rows.', 'Cast precision-sensitive integers and decimals to VARCHAR before JSON parsing; already-rounded SDK numbers cannot be repaired.', 'Exactly one clusterIdentifier or workgroupName is required. Aborting the SDK transport/poll loop does not call CancelStatement.'],
    sample: { title: 'Use official AWS command factories', filename: 'redshift-retention.ts', description: 'Pass an already configured SDK client and a tenant derived from server authorization.', code: `import { RedshiftDataClient, ExecuteStatementCommand, DescribeStatementCommand, GetStatementResultCommand } from '@aws-sdk/client-redshift-data';
import { redshiftConnector } from 'motif-connectors/server';

export async function readRepeatPurchases(client: RedshiftDataClient, workgroupName: string, authorizedTenantId: string) {
  const source = redshiftConnector({
    id: 'repeat-purchases', source: 'Approved customer retention',
    client, workgroupName, database: 'analytics',
    commands: {
      execute: input => new ExecuteStatementCommand(input),
      describe: input => new DescribeStatementCommand(input),
      results: input => new GetStatementResultCommand(input),
    },
  });
  return source.read({
    text: 'SELECT customer_id, cohort_month, CAST(repeat_orders AS VARCHAR) AS repeat_orders FROM approved.customer_retention WHERE tenant_id = :tenant ORDER BY customer_id, cohort_month',
    parameters: [{ name: 'tenant', value: authorizedTenantId }],
  }, { limit: 200, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which mature customer cohorts show weaker repeat purchasing?', join: 'Join customer_id to CRM and support records; aggregate repeat orders at the stated customer-cohort grain before adding one-to-many conversations.', action: 'Inspect affected cohorts and propose a service or onboarding intervention with a defined comparison group.', measure: 'Repeat-purchase rate among customers with a complete follow-up window, with refunds and contact burden as guardrails.' },
    docs: [{ label: 'Redshift GetStatementResult', url: 'https://docs.aws.amazon.com/redshift-data/latest/APIReference/API_GetStatementResult.html' }],
  },
  {
    slug: 'athena', catalogName: 'Amazon Athena', name: 'Amazon Athena', factory: 'athenaConnector', monogram: 'AT', accent: '#f5b18a', runtime: 'server',
    headline: 'Inspect the session evidence already in your data lake.',
    description: 'Query an approved Athena view through your workgroup and AWS client, retaining string-valued results and the native execution identifier.', outcome: 'conversion',
    prerequisites: [localPackage, 'Install @aws-sdk/client-athena and provide a configured AthenaClient. The workgroup must enforce the intended access, result location and scan budget.', 'Grant the required Athena and result-bucket S3 access. The approved_session_outcomes view must restrict the application’s authorized population; the sample does not accept SQL or storage paths from a browser.', pageContract],
    capabilities: [
      { title: 'Workgroup execution', body: 'Submit an application-owned statement, poll its execution state and fetch DATA_ROWS through official SDK commands.' },
      { title: 'Header-aware paging', body: 'Remove only the initial column header and retain subsequent rows even when a value happens to equal a column name.' },
      { title: 'Exact lexical cells', body: 'Keep VarCharValue strings and explicit nulls, ordered field metadata and execution provenance across pages.' },
    ],
    limitations: ['Athena result pages contain at most 1,000 rows, including the first page’s header. A requested larger DataPage can therefore be shorter.', 'ExecutionParameters use Athena SQL-literal semantics, not a generic value encoder. The sample uses a fixed authorized view and no dynamic parameters.', 'S3 access can independently expose query results. Provider access policies, scanned-byte limits and native job cancellation remain application-owned.'],
    sample: { title: 'Read an approved session-outcome view', filename: 'athena-sessions.ts', description: 'The application supplies the workgroup and SDK client. Athena’s workgroup supplies the result location.', code: `import { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } from '@aws-sdk/client-athena';
import { athenaConnector } from 'motif-connectors/server';

export async function readSessionOutcomes(client: AthenaClient, workGroup: string) {
  const source = athenaConnector({
    id: 'session-outcomes', source: 'Approved session outcomes',
    client, workGroup, database: 'analytics',
    commands: {
      start: input => new StartQueryExecutionCommand(input),
      execution: input => new GetQueryExecutionCommand(input),
      results: input => new GetQueryResultsCommand(input),
    },
  });
  return source.read({
    text: 'SELECT session_id, customer_id, checkout_started, checkout_completed FROM approved_session_outcomes ORDER BY session_id',
  }, { limit: 200, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which session paths end in an incomplete checkout, and is the instrumentation trustworthy?', join: 'Join session_id to the checkout attempt ledger and customer_id to account context. Deduplicate event retries before computing session-level outcomes.', action: 'Inspect representative session and checkout records, fix instrumentation gaps, then select a flow to test.', measure: 'Completed checkout sessions / eligible checkout-start sessions in a fixed window, alongside event coverage and duplicate-event rates.' },
    docs: [{ label: 'Athena GetQueryResults', url: 'https://docs.aws.amazon.com/athena/latest/APIReference/API_GetQueryResults.html' }],
  },
  {
    slug: 'trino', catalogName: 'Trino', name: 'Trino', factory: 'trinoConnector', monogram: 'TR', accent: '#e8a9dc', runtime: 'server',
    headline: 'Follow a customer question across governed sources.',
    description: 'Read a server-owned Trino statement through validated coordinator result URLs while keeping source query context and exact string projections.', outcome: 'retention',
    prerequisites: [localPackage, serverAccess, 'Provide an HTTPS coordinator origin and token authorized for the configured user/catalog/schema. The approved_account_review view must apply the intended tenant and data-access policies.', pageContract],
    capabilities: [
      { title: 'Statement lifecycle', body: 'Submit one SQL statement, wait for result pages and continue through the coordinator’s native nextUri responses.' },
      { title: 'Origin-bound continuation', body: 'Only follow HTTPS continuation URLs under the configured origin’s statement path; foreign URLs and external spooling are rejected.' },
      { title: 'Ordered result rows', body: 'Preserve duplicate column aliases, native types and exact text projections while buffering native pages for smaller reads.' },
    ],
    limitations: ['The adapter accepts complete server-owned SQL, without parameter interpolation, prepared statements or session-mutation support.', 'Only inline tabular results are supported; spooled external-storage results and update statements are rejected.', 'Native pages above 100,000 rows fail. Read cancellation does not issue DELETE to cancel the Trino query; exact large numeric values should be projected as VARCHAR.'],
    sample: { title: 'Read a fixed governed view', filename: 'trino-account-review.ts', description: 'The view encapsulates the approved cross-source joins and access scope. The browser never supplies the statement.', code: `import { trinoConnector, type TrinoOptions } from 'motif-connectors/server';

export async function readAccountReview(access: Pick<TrinoOptions, 'baseUrl' | 'user' | 'token'>) {
  const source = trinoConnector({
    ...access, id: 'account-review', source: 'Governed account review',
    catalog: 'analytics', schema: 'approved',
  });
  return source.read({
    text: 'SELECT account_id, renewal_date, CAST(active_sessions AS VARCHAR) AS active_sessions, open_ticket_count FROM approved_account_review ORDER BY renewal_date, account_id',
  }, { limit: 100, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which renewal conversations need product-usage and service context together?', join: 'Use an approved account-grain view that aggregates usage and support counts independently before joining by account_id; link the underlying records separately.', action: 'Create a review list with the account owner and inspect the linked evidence before recommending outreach.', measure: 'Reviewed accounts and next-period usage, with a complete observation window; avoid treating a joined signal as a churn probability.' },
    docs: [{ label: 'Trino client REST protocol', url: 'https://trino.io/docs/current/develop/client-protocol.html' }],
  },
  {
    slug: 'looker', catalogName: 'Looker', name: 'Looker', factory: 'lookerConnector', monogram: 'LK', accent: '#93afff', runtime: 'server',
    headline: 'Explore outcomes using the measures your team already governs.',
    description: 'Run a bounded Looker Explore query with explicit fields, filters and sorting, then inspect the returned grain alongside linked customer evidence.', outcome: 'conversion',
    prerequisites: [localPackage, serverAccess, 'Provide the Looker HTTPS origin and an API access-token callback. Replace the commerce/orders Explore and its fields with modeled fields your token can access.', pageContract],
    capabilities: [
      { title: 'Explicit Explore grain', body: 'Select a model, view, fields, filters, sorts and timezone rather than reproducing metric logic in visualization code.' },
      { title: 'Unformatted CSV values', body: 'Request CSV without visualization/value formatting and retain lexical values and positional columns.' },
      { title: 'Bounded snapshots', body: 'Request a lookahead row and report truncation when the selected Explore result exceeds the preview limit.' },
    ],
    limitations: ['Pivots, totals, table calculations and visualization formatting are not implemented by this adapter.', 'CSV fields remain strings; units, display labels and nonadditive measure rules belong to the Looker model and your mapping.', 'There is no public continuation cursor. Narrow the Explore query when truncated; token access and source-side execution cost still apply.'],
    sample: { title: 'Read customer-level order evidence', filename: 'looker-orders.ts', description: 'The sample fixes a date window and customer grain in a modeled Explore. Filters use Looker filter-expression syntax.', code: `import { lookerConnector, type LookerOptions } from 'motif-connectors/server';

export async function readCustomerOrders(access: Pick<LookerOptions, 'baseUrl' | 'token'>) {
  const source = lookerConnector({ ...access, id: 'customer-orders', source: 'Governed customer order Explore' });
  return source.read({
    model: 'commerce', view: 'orders',
    fields: ['orders.customer_id', 'orders.count'],
    filters: { 'orders.created_date': '2026-06-01 to 2026-06-30' },
    sorts: ['orders.customer_id asc'], timezone: 'UTC',
  }, { limit: 100, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which customer segments need a closer look at purchase behavior?', join: 'Link modeled customer_id results to CRM and interviews at customer grain. Keep segment totals separate from customer-level rows to prevent double counting.', action: 'Inspect differences with the relevant customer evidence, then define a follow-up experiment rather than inferring intent from a chart.', measure: 'Use the governed completed/started checkout measures with matching filters and denominators; order count alone is not a conversion rate.' },
    docs: [{ label: 'Run an inline Looker query', url: 'https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/Query/run_inline_query' }],
  },
  {
    slug: 'power-bi', catalogName: 'Power BI', name: 'Power BI', factory: 'powerBiConnector', monogram: 'BI', accent: '#e5d77d', runtime: 'server',
    headline: 'Carry semantic-model evidence into a product decision.',
    description: 'Read one authorized DAX table expression with explicit result keys, while refusing partial API errors and preserving values projected as text.', outcome: 'product',
    prerequisites: [localPackage, serverAccess, 'Enable and authorize the Execute Queries API for the dataset. Supply the dataset ID and token; add groupId when using a workspace-scoped endpoint. RLS/service-principal restrictions remain Power BI configuration.', 'The sample expects a governed ApprovedProductEvidence table with text product_id and exact evidence_count_text columns. Replace the table/fields with your semantic model.', pageContract],
    capabilities: [
      { title: 'Semantic table expressions', body: 'Wrap a server-owned DAX table expression in an EVALUATE TOPN preview with one lookahead row.' },
      { title: 'Explicit result schema', body: 'Map exact returned object keys, including square-bracket aliases, into ordered typed fields.' },
      { title: 'Partial-error rejection', body: 'Reject errors at the response, execution or table level, including error-bearing HTTP 200 responses.' },
    ],
    limitations: ['One query and one result table are supported. Pass a table expression, not a complete EVALUATE statement.', 'TOPN previews have no stable continuation; DAX ties and provider limits can affect result size. Inspect truncation before using the full population.', 'Source JSON can lose numeric precision. Project exact decimals/large integers as text in the model or DAX; declaring a decimal field does not repair rounded values.'],
    sample: { title: 'Read explicit DAX aliases', filename: 'power-bi-product-evidence.ts', description: 'String-backed measures remain exact. Field names match the executeQueries aliases, including brackets.', code: `import { powerBiConnector, type PowerBiOptions } from 'motif-connectors/server';

export async function readProductEvidence(access: Pick<PowerBiOptions, 'datasetId' | 'token'>) {
  const source = powerBiConnector({ ...access, id: 'product-evidence', source: 'Approved semantic-model evidence' });
  return source.read({
    tableExpression: 'SELECTCOLUMNS(ApprovedProductEvidence, "product_id", ApprovedProductEvidence[product_id], "evidence_count", ApprovedProductEvidence[evidence_count_text])',
    fields: [{ name: '[product_id]', type: 'string' }, { name: '[evidence_count]', type: 'integer' }],
  }, { limit: 100, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which product hypotheses have sufficient evidence to investigate next?', join: 'Link product_id to feature ownership, eligible-account usage and interview records; maintain the semantic model’s evidence-count definition.', action: 'Review supporting and contradicting evidence, then choose a falsifiable prototype task with an owner.', measure: 'Task success and activation among eligible users; evidence volume is coverage, not predicted impact.' },
    docs: [{ label: 'Power BI Execute Queries', url: 'https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries' }],
  },
  {
    slug: 'tableau', catalogName: 'Tableau', name: 'Tableau', factory: 'tableauConnector', monogram: 'TB', accent: '#9dcbef', runtime: 'server',
    headline: 'Give a published summary an inspectable next step.',
    description: 'Read a configured Tableau view’s cached summary CSV and connect its dimensions to the customer and service evidence needed for a retention decision.', outcome: 'retention',
    prerequisites: [localPackage, serverAccess, 'Supply the Tableau HTTPS origin, site/view IDs, a supported REST API version and a fresh signed-in Tableau session token. The view must permit data export to that identity.', 'Use a single worksheet whose summary grain and date filters are understood. The sample Region filter must exist on that view.', pageContract],
    capabilities: [
      { title: 'Configured view scope', body: 'Keep site and view identifiers on the server and apply named view filters through the native Query View Data API.' },
      { title: 'Lexical CSV evidence', body: 'Preserve exported values, headers and column order without assuming that summary cells are raw customer records.' },
      { title: 'Cache-aware preview', body: 'Configure a positive maxAgeMinutes and mark a bounded summary result as truncated when more rows are present.' },
    ],
    limitations: ['This is cached summary data, not underlying-detail extraction. A dashboard export contains its first view only.', 'No public continuation cursor exists. Large exports can exceed the bounded response budget; narrow the published view or filters.', 'Formatting, units and freshness follow the published view and cache. Retrieval time is not the observation time or a freshness guarantee.'],
    sample: { title: 'Read a filtered published view', filename: 'tableau-retention-summary.ts', description: 'Use a supported version supplied by server configuration. The token callback returns a Tableau session token, not an arbitrary browser credential.', code: `import { tableauConnector, type TableauOptions } from 'motif-connectors/server';

export async function readRetentionSummary(
  access: Pick<TableauOptions, 'baseUrl' | 'siteId' | 'viewId' | 'apiVersion' | 'token'>,
) {
  const source = tableauConnector({
    ...access, id: 'retention-summary', source: 'Published retention worksheet',
    maxAgeMinutes: 1,
  });
  return source.read({ filters: { Region: 'West' } }, { limit: 100, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which cohort or service segment warrants a retention investigation?', join: 'Link exported cohort/segment keys to separately authorized account lists. Do not join summary totals onto each account and sum them again.', action: 'Open the relevant account and support evidence for a selected segment, then propose a focused review.', measure: 'Use the worksheet’s documented cohort retention definition and mature follow-up window; compare its cache/observation period before attributing a change.' },
    docs: [{ label: 'Tableau view data REST reference', url: 'https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_workbooks_and_views.htm' }],
  },
  {
    slug: 'dbt', catalogName: 'dbt / Cube', name: 'dbt Semantic Layer', factory: 'dbtSemanticConnector', monogram: 'dbt', accent: '#f4a895', runtime: 'server',
    headline: 'Explore a governed metric without rebuilding its meaning.',
    description: 'Execute real dbt Semantic Layer queries, poll their jobs and decode bounded Arrow result pages with an application-owned exact-value reader.', outcome: 'conversion',
    prerequisites: [localPackage, serverAccess, 'Install apache-arrow in the server application. Supply the Semantic Layer HTTPS origin, numeric environment ID and token with semantic query access.', 'The sample assumes an order_count metric and customer__customer_id grouping dimension defined in your semantic model. Supply an application-tested ArrowCellDecoder for your returned native types.', pageContract],
    capabilities: [
      { title: 'Semantic execution', body: 'Call createQuery with metric and grouping definitions, then poll the returned query ID; this is execution, not manifest inspection.' },
      { title: 'Bounded Arrow pages', body: 'Collect native Arrow result pages only through the requested preview plus lookahead and check schema consistency between pages.' },
      { title: 'Explicit value decoding', body: 'Inject Apache Arrow tableFromIPC and, where needed, a lossless raw-vector decoder rather than guessing decimal or timestamp conversions.' },
    ],
    limitations: ['The public result is a bounded snapshot without a continuation cursor, even though native result pages are fetched internally.', 'Metric names, grouping grain and optional where SQL expressions are server-owned and must follow your Semantic Layer definitions and access rules.', 'Complex Arrow values require a correct application decoder. Query timeouts stop polling/transport; they do not cancel warehouse work or guarantee cache freshness.'],
    sample: { title: 'Query governed customer-level order counts', filename: 'dbt-order-evidence.ts', description: 'decodeExactCell is a required application dependency: preserve raw decimal/temporal/nested values before calling any lossy getter or Number().', code: `import { tableFromIPC } from 'apache-arrow';
import type { ArrowCellDecoder } from 'motif-connectors';
import { dbtSemanticConnector, type DbtSemanticOptions } from 'motif-connectors/server';

export async function readGovernedOrderCounts(
  access: Pick<DbtSemanticOptions, 'baseUrl' | 'environmentId' | 'token'>,
  decodeExactCell: ArrowCellDecoder,
) {
  const source = dbtSemanticConnector({
    ...access, id: 'governed-orders', source: 'Semantic customer order metric',
    tableFromIPC, decodeCell: decodeExactCell,
  });
  return source.read({
    metrics: [{ name: 'order_count' }],
    groupBy: [{ name: 'customer__customer_id' }],
  }, { limit: 100, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which customer segments need a closer look at the governed purchase metric?', join: 'Link the returned customer grouping key to CRM and checkout evidence. Retain semantic time and entity grain; do not sum unique-customer or ratio metrics across incompatible groups.', action: 'Inspect the underlying customer context and use the same governed definitions in a proposed checkout experiment.', measure: 'Governed conversion numerator and eligible denominator over the same window, with payment failures and duplicate charges as guardrails.' },
    docs: [{ label: 'dbt Semantic Layer GraphQL API', url: 'https://docs.getdbt.com/docs/dbt-apis/sl-graphql' }, { label: 'Apache Arrow JavaScript', url: 'https://arrow.apache.org/docs/js/' }],
  },
  {
    slug: 'cube', catalogName: 'dbt / Cube', name: 'Cube', factory: 'cubeConnector', monogram: 'CU', accent: '#c1a9f4', runtime: 'server',
    headline: 'Keep the semantic grain attached to the visual.',
    description: 'Load Cube measures and dimensions with their member names and time grain intact, so a retention view remains aligned with the governed model.', outcome: 'retention',
    prerequisites: [localPackage, serverAccess, 'Supply the Cube HTTPS origin and an authorization-token callback whose security context enforces the intended tenant. The sample Orders members must exist in your model.', pageContract],
    capabilities: [
      { title: 'Modeled dimensions and measures', body: 'Select Cube members, time dimensions, filters, ordering and timezone through its REST load API.' },
      { title: 'Continue-wait handling', body: 'Poll the documented Continue wait response within the read timeout using one request identifier.' },
      { title: 'Native semantic names', body: 'Retain member/time-grain names and exact numeric strings, with metadata derived from the returned annotations.' },
    ],
    limitations: ['This supports a single load-result snapshot, without public offset pagination, multi-result execution or SQL API support.', 'Cube cache freshness, pre-aggregations and security context remain provider/application responsibilities; fetchedAt is retrieval time.', 'Numeric strings remain strings. Ratios and distinct counts may be nonadditive across customer or time dimensions.'],
    sample: { title: 'Read monthly customer order evidence', filename: 'cube-customer-orders.ts', description: 'The token carries the authorized security context. Member names and the month grain are preserved in the returned schema.', code: `import { cubeConnector, type CubeOptions } from 'motif-connectors/server';

export async function readMonthlyOrders(access: Pick<CubeOptions, 'baseUrl' | 'token'>) {
  const source = cubeConnector({ ...access, id: 'monthly-orders', source: 'Cube customer order model' });
  return source.read({
    measures: ['Orders.count'], dimensions: ['Orders.customerId'],
    timeDimensions: [{ dimension: 'Orders.createdAt', granularity: 'month', dateRange: ['2026-01-01', '2026-06-30'] }],
    order: [['Orders.customerId', 'asc']], timezone: 'UTC',
  }, { limit: 100, timeoutMs: 30000 });
}` },
    workflow: { question: 'Which customer cohorts have fewer repeat purchases after a complete follow-up window?', join: 'Join customerId and the explicit month grain to cohort membership and service records. Keep semantic aggregates separate from one-to-many ticket links.', action: 'Inspect mature cohorts and customer evidence, then choose a retention intervention to evaluate.', measure: 'Repeat-purchase rate for a defined eligible cohort and follow-up period; monthly order count is evidence, not a retention probability.' },
    docs: [{ label: 'Cube REST API reference', url: 'https://docs.cube.dev/reference/core-data-apis/rest-api/reference' }],
  },
  {
    slug: 'json', catalogName: 'JSON', name: 'JSON snapshots', factory: 'jsonConnector', monogram: '{}', accent: '#bbe897', runtime: 'universal',
    headline: 'Start with records you can fully inspect.',
    description: 'Use an immutable typed snapshot for a deterministic local demonstration, a supplied export or an application-approved table, without pretending it is a live integration.', outcome: 'product',
    prerequisites: [localPackage, 'Supply fields and positional rows from an authorized source. The sample is entirely fictional and marks its provenance mode as fixture.', 'Keep IDs and precision-sensitive decimal values as strings; bigint input becomes an exact decimal string. Field types describe meaning rather than coercing values.', pageContract],
    capabilities: [
      { title: 'Explicit table contract', body: 'Define field names, types and positional rows, including duplicate aliases, without an implicit object-to-column mapping.' },
      { title: 'Immutable snapshot', body: 'Read a captured source table with local continuation; later mutations of the caller’s inputs do not rewrite the snapshot.' },
      { title: 'Honest provenance', body: 'Label synthetic fixtures separately from live data and carry the source identity and completeness on every page.' },
    ],
    limitations: ['This is an in-memory table snapshot, not a JSON URL fetcher, streaming parser or automatic refresh mechanism.', 'A fixture label does not provide real customer evidence. Joins, units, entity grain and source authorization remain your application’s responsibility.', 'Unsafe integers, nonfinite values and unsupported objects are rejected. Existing JSON rounding cannot be reversed by changing the declared field type.'],
    sample: { title: 'Create a fictional interview-evidence table', filename: 'json-interviews.ts', description: 'Two interviews can belong to the same account. The data contract preserves interview grain so a later view can count distinct accounts deliberately.', code: `import { jsonConnector } from 'motif-connectors';

export async function readInterviewFixture() {
  const source = jsonConnector({
    id: 'interview-fixture', source: 'Fictional product interviews', mode: 'fixture',
    fields: [
      { name: 'interview_id', type: 'string' }, { name: 'account_id', type: 'string' },
      { name: 'feature_id', type: 'string' }, { name: 'stance', type: 'string' },
    ],
    rows: [
      ['int-001', 'acct-001', 'guided-setup', 'supports'],
      ['int-002', 'acct-001', 'guided-setup', 'mixed'],
      ['int-003', 'acct-002', 'guided-setup', 'contradicts'],
    ],
  });
  return source.read(undefined, { limit: 100 });
}` },
    workflow: { question: 'Does the evidence justify a discovery study for guided setup?', join: 'Join interview_id to the source quote, account_id to account context and feature_id to the initiative. Count interviews and distinct accounts separately.', action: 'Keep contradictory testimony visible and recruit beyond the existing sample before selecting a prototype task.', measure: 'Observed task success in the follow-up study, with setup time and accessibility as guardrails; interview volume is not predicted demand.' },
    docs: [{ label: 'JSON format', url: 'https://www.rfc-editor.org/rfc/rfc8259' }],
  },
  {
    slug: 'csv', catalogName: 'CSV / Parquet / Arrow', name: 'CSV', factory: 'csvConnector', monogram: 'CSV', accent: '#a7dfb4', runtime: 'universal',
    headline: 'Turn an interview export into linked evidence.',
    description: 'Read supplied CSV bytes with explicit boundaries and lexical values, then connect interview rows to accounts and product hypotheses.', outcome: 'product',
    prerequisites: [localPackage, 'For this browser sample, pass a File selected by the user. The file must be UTF-8 CSV with a header and agreed interview_id/account_id/feature_id/stance columns.', 'No reader SDK is required. Empty strings stay empty strings; your mapping must explicitly decide nulls, dates, units and numeric parsing.', pageContract],
    capabilities: [
      { title: 'Real CSV structure', body: 'Parse quoted newlines, escaped quotes, UTF-8 BOM and duplicate headers; reject inconsistent record widths.' },
      { title: 'Explicit dialect', body: 'Support comma, semicolon, tab and pipe delimiters, or supplied columns for a headerless export.' },
      { title: 'Bounded local pages', body: 'Apply file and decoded-row budgets, then page through a stable snapshot without losing the original truncation flag.' },
    ],
    limitations: ['The connector reads supplied text/bytes. File selection, access permissions and any remote download belong to the application.', 'All CSV cells remain strings; a type or unit must not be inferred silently from an ID such as 00001.', 'Defaults are 8 MiB/100,000 rows; configurable maxima are 32 MiB/100,000 rows, with one million decoded cells and 1,000 columns. Synchronous parsing cannot be interrupted mid-call.'],
    sample: { title: 'Read a user-selected CSV safely', filename: 'csv-interview-upload.ts', description: 'Check the upload size before allocating its bytes. The sample keeps a 10,000-row snapshot cap and returns one page.', code: `import { csvConnector } from 'motif-connectors';

export async function readInterviewCsv(file: File) {
  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error('Choose a CSV no larger than 8 MiB.');
  const source = csvConnector({
    id: 'interview-upload', source: 'Selected interview CSV',
    data: new Uint8Array(await file.arrayBuffer()),
    delimiter: ',', maxBytes, maxRows: 10000,
  });
  return source.read(undefined, { limit: 100 });
}` },
    workflow: { question: 'Which product questions have support, disagreement or missing research coverage?', join: 'Map the actual CSV columns by position, then join interview_id, account_id and feature_id to their source records. Do not treat repeated interviews as independent customers.', action: 'Inspect exact testimony and prepare a balanced recruitment list for the next study.', measure: 'Coverage across eligible account segments and subsequent prototype-task success; preserve negative findings and do not treat quotes as a demand forecast.' },
    docs: [{ label: 'CSV format', url: 'https://www.rfc-editor.org/rfc/rfc4180' }],
  },
  {
    slug: 'parquet', catalogName: 'CSV / Parquet / Arrow', name: 'Parquet', factory: 'parquetConnector', monogram: 'PQ', accent: '#e8c790', runtime: 'universal',
    headline: 'Inspect a columnar export without a warehouse round trip.',
    description: 'Use an initialized official Parquet reader and Arrow decoder on supplied bytes, preserving exact primitive values and explicit snapshot limits.', outcome: 'retention',
    prerequisites: [localPackage, 'Install apache-arrow and parquet-wasm in the consuming application. This browser sample uses parquet-wasm/esm and a same-origin URL for the application-served parquet_wasm_bg.wasm asset.', 'Pass a user-selected File plus the trusted WASM asset URL. The export should contain authorized account-week records; SDK initialization and file access remain application-owned.', filePrecision, pageContract],
    capabilities: [
      { title: 'Official reader injection', body: 'Call parquet-wasm readParquet with a row lookahead and feed its IPC stream to Apache Arrow tableFromIPC.' },
      { title: 'Owned temporary resources', body: 'Consume the temporary WASM table into IPC and free it on conversion failure without closing application-owned runtimes.' },
      { title: 'Exact snapshot evidence', body: 'Preserve primitive INT64 values as exact strings and retain row-cap truncation across all local continuation pages.' },
    ],
    limitations: ['This is supplied-file reading, without object-store credentials, directory datasets, remote row-group range requests or automatic downloads.', 'Decimal, temporal and nested fields require an explicit lossless decoder or exact string projection upstream; the default rejects those types.', 'Decoding may materialize the file and synchronous WASM work cannot be interrupted. The byte/row/cell budgets apply independently of the requested page size.'],
    sample: { title: 'Read a browser-selected Parquet export', filename: 'parquet-account-weeks.ts', description: 'Serve the package’s ESM WASM asset from your application. The sample intentionally accepts only the default supported primitive field types.', code: `import initWasm, { readParquet } from 'parquet-wasm/esm';
import { tableFromIPC } from 'apache-arrow';
import { parquetConnector } from 'motif-connectors';

export async function readAccountWeekParquet(file: File, wasmAssetUrl: URL) {
  if (wasmAssetUrl.origin !== location.origin) throw new Error('Use the application-served WASM asset.');
  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error('Choose a Parquet file no larger than 8 MiB.');
  await initWasm({ module_or_path: wasmAssetUrl });
  const source = parquetConnector({
    id: 'account-week-export', source: 'Selected account-week Parquet',
    data: new Uint8Array(await file.arrayBuffer()),
    tableFromIPC, readParquet, maxBytes, maxRows: 10000,
  });
  return source.read(undefined, { limit: 100 });
}` },
    workflow: { question: 'Which accounts show an observed decline before renewal?', join: 'Map account_id and observation_week from the export to CRM renewals and support evidence; verify exactly one observation per account/week and complete cohort windows.', action: 'Review the affected accounts with their owners and inspect the original observations before planning outreach.', measure: 'Review completion and next-period activity, with no claim that a flag predicts churn or that contract value will be recovered.' },
    docs: [{ label: 'parquet-wasm reader', url: 'https://kylebarron.dev/parquet-wasm/' }, { label: 'Apache Arrow JavaScript', url: 'https://arrow.apache.org/docs/js/' }],
  },
  {
    slug: 'arrow', catalogName: 'CSV / Parquet / Arrow', name: 'Apache Arrow', factory: 'arrowConnector', monogram: 'AR', accent: '#dba7ab', runtime: 'universal',
    headline: 'Keep the analytical table intact as it reaches the browser.',
    description: 'Read an application-supplied Arrow IPC table with ordered fields, exact primitive integers and explicit decoding policy.', outcome: 'conversion',
    prerequisites: [localPackage, 'Install apache-arrow in the consuming application and pass a user-selected Arrow IPC file. This sample does not accept an arbitrary URL or include an object-store client.', filePrecision, pageContract],
    capabilities: [
      { title: 'Ordered Arrow fields', body: 'Read vectors by position so duplicate names and source column order survive the conversion to DataPage.' },
      { title: 'Lossless primitive handling', body: 'Normalize supported primitive and dictionary values, including bigint to decimal strings, without approximate ID conversion.' },
      { title: 'Stable local continuation', body: 'Decode a bounded snapshot and read its local pages while keeping source identity and completeness attached.' },
    ],
    limitations: ['Arrow IPC is the supported input; this is not Arrow Flight, a streaming subscription or a remote-storage adapter.', 'The decoder may materialize the complete input. Defaults are 8 MiB/100,000 rows, with explicit byte, row and cell ceilings.', 'Custom native values must be decoded before lossy getters. A string produced after rounding is still inaccurate; default unsupported types fail rather than guessing.'],
    sample: { title: 'Read an Arrow IPC checkout table', filename: 'arrow-checkout-export.ts', description: 'Keep IDs as strings or Arrow INT64 and export monetary values as exact strings unless you supply a tested raw-vector decoder.', code: `import { tableFromIPC } from 'apache-arrow';
import { arrowConnector } from 'motif-connectors';

export async function readCheckoutArrow(file: File) {
  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error('Choose an Arrow IPC file no larger than 8 MiB.');
  const source = arrowConnector({
    id: 'checkout-export', source: 'Selected checkout Arrow IPC',
    data: new Uint8Array(await file.arrayBuffer()), tableFromIPC,
    maxBytes, maxRows: 10000,
  });
  return source.read(undefined, { limit: 100 });
}` },
    workflow: { question: 'Where do checkout attempts stop, and which source records explain the pattern?', join: 'Join attempt_id to session_id and customer_id using exact values. Preserve attempt grain and retain repeated attempts rather than collapsing them into customers.', action: 'Inspect representative failures and propose a clearly labeled recovery scenario, then test a specific change.', measure: 'Completed / started attempts in a fixed window, with duplicate charges and errors as guardrails; animation and modeled recovery are not observed improvement.' },
    docs: [{ label: 'Apache Arrow JavaScript', url: 'https://arrow.apache.org/docs/js/' }],
  },
  {
    slug: 'application-endpoint', catalogName: 'Application endpoint', name: 'Application endpoint', factory: 'endpointConnector', monogram: 'API', accent: '#c8f58c', runtime: 'browser',
    headline: 'Let the visualization request a decision, not a database query.',
    description: 'Read a named, authorized operation from your application and receive typed records with provenance, limits and an opaque continuation.', outcome: 'retention',
    prerequisites: [localPackage, 'Mount createConnectorGateway from motif-connectors/server at /api/motif. Register retention.accounts with a server-owned connector/query and a required string segment parameter restricted to Growth, Scale or Enterprise.', 'Implement authorize(request, operation) using your actual session and data-access rules; bind tenant scope in the registered server query. A demo authorize callback is not production authentication.', 'Set the operation maxPageSize to at least 100. Use a same-origin authenticated application session; this browser client sends credentials: same-origin and never carries a provider token.', pageContract],
    capabilities: [
      { title: 'Registered operations', body: 'Send an operation name and validated business parameters instead of browser-controlled SQL, provider URLs or credentials.' },
      { title: 'Authorization on each page', body: 'The companion server gateway checks access on every request and binds opaque continuation handles to the authorized subject, operation, scope and parameters.' },
      { title: 'Validated data boundary', body: 'Validate returned schema, values, provenance, completeness and requested page size before a visualization receives the data.' },
    ],
    limitations: ['The endpoint client does not create a server, authentication system or source mapping. Mount and secure the companion gateway before using this sample.', 'Gateway cursors are short-lived, process-local handles; underlying provider cursors can expire sooner. Keep operation parameters identical while continuing.', 'A timeout aborts browser transport; source-side cancellation depends on the registered adapter. Returned completeness must still be checked before drawing population-wide conclusions.'],
    sample: { title: 'Read an authenticated review operation', filename: 'application-retention.ts', description: 'The operation and permitted segment values must match your server registration. Call the exported function from the application after authentication.', code: `import { endpointConnector } from 'motif-connectors';

const source = endpointConnector({
  id: 'account-review-api', source: 'Authorized account review',
  endpoint: '/api/motif',
});

export async function readAccountReview(
  segment: 'Growth' | 'Scale' | 'Enterprise',
  signal?: AbortSignal,
  cursor?: string,
) {
  return source.read({
    operation: 'retention.accounts', parameters: { segment },
  }, { limit: 100, timeoutMs: 15000, signal, cursor });
}` },
    workflow: { question: 'Which accounts should the current authorized user review before renewal?', join: 'The registered operation maps account IDs to usage observations and support links within the authenticated scope. The browser follows those returned IDs without choosing a tenant or database.', action: 'Build an inspectable review queue with an owner and proposed next step; exporting a brief does not contact customers or update a source system.', measure: 'Review completion and subsequent account activity in a defined window, with outreach burden as a guardrail; observed risk signals are not churn predictions.' },
    docs: [{ label: 'Fetch API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API' }],
  },
];
