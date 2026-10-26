import type { ConnectorGuide } from './types.js';

const serverPrerequisites = [
  'Build and install the private motif-connectors package from your checkout; run the sample with your ESM TypeScript runner on Node.js 22.16+. Include Node typings for type checking. It is not a registry installation claim.',
  'Populate the named process.env values in your server environment. The sample includes its own environment helper; your application owns credential refresh, authorization and tenant binding before exposing registered operations to a browser.',
];

function serverSample(factory: string, filename: string, title: string, description: string, body: string): ConnectorGuide['sample'] {
  return {
    title, filename, description,
    code: `import { ${factory} } from 'motif-connectors/server';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing server environment variable: ' + name);
  return value;
}

${body.trim()}

// This is one bounded page, not an all-source KPI.
if (page.page.hasMore || page.page.truncated) {
  console.warn('Partial preview: inspect continuation and warnings.', page.page);
}
console.log(JSON.stringify(page, null, 2));
`,
  };
}

export const applicationGuides: ConnectorGuide[] = [
  {
    slug: 'stripe', catalogName: 'Stripe', name: 'Stripe', factory: 'stripeConnector',
    monogram: 'St', accent: '#a89aff', runtime: 'server', outcome: 'retention',
    headline: 'Put billing evidence beside the customer relationship.',
    description: 'Read selected Stripe v1 lists as typed pages, retaining each returned object for account-level investigation.',
    prerequisites: [...serverPrerequisites, 'Set STRIPE_SECRET_KEY to an authorized secret or restricted key with access to invoices. The sample uses the account’s configured Stripe API version; optionally pin apiVersion and a connected account ID in server configuration.'],
    capabilities: [
      { title: 'Selected billing lists', body: 'Read customers, products, prices, payment intents, charges, invoices, subscriptions or checkout sessions.' },
      { title: 'Inspectable source records', body: 'Rows contain id, object, created and the full record JSON; absent properties remain absent.' },
      { title: 'Native continuation', body: 'Uses starting_after with at most 100 records per request; the cursor is bound to source and resource configuration.' },
    ],
    limitations: ['This adapter exposes lists, not search, arbitrary filters, writes or webhooks. Default provider filters apply; the default subscription list excludes canceled subscriptions.', 'A list can change during paging. Preserve page metadata and currency units; invoice amounts are not automatically converted or summed across currencies.', 'HTTP abort stops transport, not source-side work. API protocol tests do not constitute live Stripe account certification.'],
    sample: serverSample('stripeConnector', 'stripe-invoices.ts', 'Inspect one page of invoice evidence', 'The fourth column contains the returned invoice object. Keep customer identifiers and currency beside any later account-level mapping.', `const connector = stripeConnector({
  id: 'stripe-invoices', source: 'Authorized billing invoices',
  token: () => env('STRIPE_SECRET_KEY'),
});
const page = await connector.read({ resource: 'invoices' }, {
  limit: 100, timeoutMs: 15_000,
});`),
    workflow: { question: 'Which accounts need a billing-context review before their next renewal?', join: 'Map an invoice record’s customer ID to your authorized CRM billing-customer key; retain invoice ID, status, currency and observation date.', action: 'Ask the account owner to inspect unresolved billing evidence alongside support history before proposing an intervention.', measure: 'Track reviewed eligible accounts and subsequent invoice status over a fixed window; do not label invoice exposure as predicted churn or recovered revenue.' },
    docs: [{ label: 'Stripe pagination', url: 'https://docs.stripe.com/api/pagination' }, { label: 'List invoices', url: 'https://docs.stripe.com/api/invoices/list' }],
  },
  {
    slug: 'hubspot', catalogName: 'HubSpot', name: 'HubSpot', factory: 'hubspotConnector',
    monogram: 'Hs', accent: '#ffaf8b', runtime: 'server', outcome: 'conversion',
    headline: 'Connect lifecycle stages to the evidence behind them.',
    description: 'Read selected CRM v3 object lists with explicit properties, source timestamps and bounded continuation.',
    prerequisites: [...serverPrerequisites, 'Set HUBSPOT_ACCESS_TOKEN to an OAuth or private-app token with the required CRM read scope. Confirm that the requested contact properties exist and are permitted.'],
    capabilities: [
      { title: 'Six CRM object types', body: 'Read contacts, companies, deals, tickets, products and line items, with an explicit archived flag.' },
      { title: 'Properties stay intact', body: 'Rows expose id, properties, createdAt, updatedAt, archived and record. Missing properties are distinct from null.' },
      { title: 'Bounded list pages', body: 'At most 100 objects per request, with native after continuation and stable table fields.' },
    ],
    limitations: ['No CRM search, associations, custom objects, property history or write APIs are exposed.', 'Property selection allows up to 100 distinct names, subject to bounded name and serialized-query sizes. Lists can change across pages.', 'The sample does not resolve identities from email or obtain historical stage transitions. Live account acceptance and scope checks remain required.'],
    sample: serverSample('hubspotConnector', 'hubspot-contact-stages.ts', 'Read contact lifecycle properties', 'Inspect the properties JSON column without filling missing CRM values with assumed defaults.', `const connector = hubspotConnector({
  id: 'hubspot-contacts', source: 'Authorized CRM lifecycle snapshot',
  token: () => env('HUBSPOT_ACCESS_TOKEN'),
});
const page = await connector.read({
  object: 'contacts', properties: ['email', 'lifecyclestage'], archived: false,
}, { limit: 100, timeoutMs: 15_000 });`),
    workflow: { question: 'Which lifecycle-stage cohorts need a closer look at their activation journey?', join: 'Use an application-owned CRM-contact-to-product-user mapping; do not infer a reliable identity join from email alone.', action: 'Compare a defined cohort with authorized session evidence and ask its owner to investigate a specific activation blocker.', measure: 'Measure milestone completion for an explicitly eligible cohort and fixed observation window; a current contact snapshot alone cannot establish stage-transition conversion.' },
    docs: [{ label: 'HubSpot contacts API', url: 'https://developers.hubspot.com/docs/api-reference/crm-contacts-v3/guide' }],
  },
  {
    slug: 'airtable', catalogName: 'Airtable', name: 'Airtable', factory: 'airtableConnector',
    monogram: 'At', accent: '#f7cb76', runtime: 'server', outcome: 'product',
    headline: 'Bring research records into the product decision.',
    description: 'Read a configured base and table with selected fields, preserving record IDs and Airtable’s omission semantics.',
    prerequisites: [...serverPrerequisites, 'Set AIRTABLE_TOKEN, AIRTABLE_BASE_ID (app…) and AIRTABLE_TABLE_ID (tbl…). Grant records-read access to the intended base.', 'Create or adapt the sample’s Approved interviews view and Customer ID, Initiative ID and Stance fields. Their names are application-owned schema assumptions, not built-in Airtable fields.'],
    capabilities: [
      { title: 'A fixed source boundary', body: 'Base and table IDs belong to server configuration; read queries select only a view and fields.' },
      { title: 'Source-level inspection', body: 'Rows contain id, createdTime, fields JSON and the full record, retaining exact returned field values.' },
      { title: 'Offset pagination', body: 'Native offsets provide continuation through pages of at most 100 records.' },
    ],
    limitations: ['Airtable omits empty fields, including false and empty arrays. The connector preserves missing properties and cannot reconstruct their original empty values.', 'Views and selected fields are not authorization boundaries. There is no arbitrary formula filter, schema discovery or write API.', 'Lists can change while paging; 429 responses are not automatically retried. Protocol tests have not certified a live base.'],
    sample: serverSample('airtableConnector', 'airtable-interviews.ts', 'Read an approved interview view', 'Replace the explicit view and field names with your reviewed research-table contract.', `const connector = airtableConnector({
  id: 'airtable-interviews', source: 'Approved research interviews',
  baseId: env('AIRTABLE_BASE_ID'), tableId: env('AIRTABLE_TABLE_ID'),
  token: () => env('AIRTABLE_TOKEN'),
});
const page = await connector.read({
  view: 'Approved interviews', fields: ['Customer ID', 'Initiative ID', 'Stance'],
}, { limit: 100, timeoutMs: 15_000 });`),
    workflow: { question: 'Which initiative has enough diverse evidence to justify a focused discovery test?', join: 'Map the explicitly maintained Customer ID and Initiative ID fields to authorized account and product catalogs; keep Airtable record IDs as evidence references.', action: 'Review supporting, mixed and contradicting records before designing a prototype task with an owner.', measure: 'Track distinct interviewed accounts and task success in a new balanced sample; interview volume is evidence coverage, not predicted product impact.' },
    docs: [{ label: 'List Airtable records', url: 'https://airtable.com/developers/web/api/list-records' }],
  },
  {
    slug: 'salesforce', catalogName: 'Salesforce', name: 'Salesforce', factory: 'salesforceConnector',
    monogram: 'Sf', accent: '#8fcaff', runtime: 'server', outcome: 'retention',
    headline: 'Give account reviews a traceable CRM starting point.',
    description: 'Execute approved SOQL through REST query and query-more, with native batches buffered into bounded Motif pages.',
    prerequisites: [...serverPrerequisites, 'Set SALESFORCE_INSTANCE_URL to your HTTPS instance origin without a path, and SALESFORCE_ACCESS_TOKEN to an authorized OAuth token. The sample pins REST API 66.0.', 'Authorize Account and the Id, Name and OwnerId fields. The example assumes the token may read this approved account set; replace the fixed statement with an appropriately scoped server-owned query.'],
    capabilities: [
      { title: 'Server-owned SOQL', body: 'Read the selected fields and preserve each returned SOQL record in one record JSON column.' },
      { title: 'Buffered native batches', body: 'Requests batches up to 2,000 records, then slices them to the requested page size without skipping rows.' },
      { title: 'Validated query-more', body: 'Continuation accepts only the expected same-instance query-more path and is bound to the connector/query.' },
    ],
    limitations: ['No Bulk API, schema discovery, writes or automatic expansion of nested relationship result sets. Nested relationships retain their own pagination metadata.', 'The adapter does not invent SOQL parameter binding. Never concatenate untrusted browser input into a statement; enforce object, field and row permissions.', 'Instance-local cursor states expire after five minutes and are capped at 32. Native batches may exceed the requested page in memory; live-account validation remains separate.'],
    sample: serverSample('salesforceConnector', 'salesforce-account-review.ts', 'Read a stable account selection', 'The query is a fixed server statement. Returned record cells contain Id, Name and OwnerId as authorized by Salesforce.', `const connector = salesforceConnector({
  id: 'salesforce-accounts', source: 'Approved account review population',
  instanceUrl: env('SALESFORCE_INSTANCE_URL'), apiVersion: '66.0',
  token: () => env('SALESFORCE_ACCESS_TOKEN'),
});
const page = await connector.read({
  soql: 'SELECT Id, Name, OwnerId FROM Account ORDER BY Id',
}, { limit: 100, timeoutMs: 15_000 });`),
    workflow: { question: 'Which account owners should review a verified usage decline before renewal?', join: 'Join Account.Id through an explicit CRM-to-product-account mapping; use OwnerId for internal ownership and an independently authorized renewal source.', action: 'Prepare an owner review with usage observations and support context, preserving contrary evidence.', measure: 'Track review completion and subsequent eligible-account usage over a defined window; the CRM account list does not predict churn.' },
    docs: [{ label: 'Salesforce REST query', url: 'https://developer.salesforce.com/docs/platform/api-rest/guide/resources-query.html' }, { label: 'Query-more results', url: 'https://developer.salesforce.com/docs/platform/api-rest/guide/resources-query-more-results.html' }],
  },
  {
    slug: 'shopify', catalogName: 'Shopify', name: 'Shopify', factory: 'shopifyConnector',
    monogram: 'Sh', accent: '#b9e58c', runtime: 'server', outcome: 'product',
    headline: 'Link the product catalog to observed shopping friction.',
    description: 'Read fixed Admin GraphQL selections for products, customers or orders with variable-bound search and native cursors.',
    prerequisites: [...serverPrerequisites, 'Set SHOPIFY_SHOP to the shop subdomain only and SHOPIFY_ADMIN_TOKEN to an authorized Admin API token with product-read access. The sample pins API 2026-10.', 'Maintain an explicit mapping between Shopify global product IDs and product IDs in your web/session instrumentation before joining the sources.'],
    capabilities: [
      { title: 'Fixed selections', body: 'Products include ID, title, handle, status and timestamps. Customers and orders have their own fixed, documented selections.' },
      { title: 'Bound search values', body: 'The adapter passes search as a GraphQL variable and uses ID ordering, without accepting arbitrary GraphQL documents.' },
      { title: 'Native connection pages', body: 'Returns one record JSON cell per node, with a maximum of 250 records per provider request.' },
    ],
    limitations: ['No variants, line items, inventory or arbitrary nested fields are returned by these fixed selections. This is not a full shop export.', 'Customer data and order history depend on granted scopes and protected-data access. The product sample requires neither customer nor order records.', 'GraphQL errors fail the read, including partial responses. The list can change during pagination, and protocol tests do not certify your shop.'],
    sample: serverSample('shopifyConnector', 'shopify-active-products.ts', 'Read the active product catalog', 'Product records preserve Shopify global IDs for an application-defined join to browsing evidence.', `const connector = shopifyConnector({
  id: 'shopify-products', source: 'Authorized active product catalog',
  shop: env('SHOPIFY_SHOP'), apiVersion: '2026-10',
  token: () => env('SHOPIFY_ADMIN_TOKEN'),
});
const page = await connector.read({
  resource: 'products', search: 'status:active',
}, { limit: 100, timeoutMs: 15_000 });`),
    workflow: { question: 'Which active products merit a usability review of their detail-to-checkout journey?', join: 'Join record.id to your explicitly instrumented product ID mapping; obtain product views and checkout attempts from a separate authorized behavioral source.', action: 'Review sessions and interview evidence for one product cohort before proposing a product-page test.', measure: 'Measure eligible product-view-to-checkout completion in a defined experiment, keeping refunds and support contacts as guardrails; catalog records alone supply no conversion denominator.' },
    docs: [{ label: 'Shopify products, API 2026-10', url: 'https://shopify.dev/docs/api/admin-graphql/2026-10/queries/products' }, { label: 'API versioning', url: 'https://shopify.dev/docs/api/usage/versioning' }],
  },
  {
    slug: 'google-analytics', catalogName: 'Google Analytics 4', name: 'Google Analytics 4', factory: 'googleAnalyticsConnector',
    monogram: 'Ga', accent: '#f6bf79', runtime: 'server', outcome: 'conversion',
    headline: 'Use aggregate traffic evidence to choose the next investigation.',
    description: 'Run GA4 dimension/metric reports with source string values, ordered offset pages and explicit aggregate-grain warnings.',
    prerequisites: [...serverPrerequisites, 'Set GA4_PROPERTY_ID to the numeric property ID and GOOGLE_ACCESS_TOKEN to a token with Analytics read access to that property.', 'The example uses compatible date/deviceCategory dimensions and the sessions metric. Choose a reviewed absolute date interval and respect property quotas and disclosure rules.'],
    capabilities: [
      { title: 'Defined report grain', body: 'Each row is a dimension combination followed by metrics, preserving the requested header order.' },
      { title: 'Exact source strings', body: 'GA4 metric strings remain strings; field metadata records integer or decimal meaning without forcing Number conversion.' },
      { title: 'Transparent report limits', body: 'Supports 1–9 dimensions, 1–10 metrics and up to 366 days, with warnings for thresholding, sampling and other-row data loss.' },
    ],
    limitations: ['This is aggregate reporting, not raw events, session records or identifiable users. It cannot join an aggregate row to an individual customer.', 'Unique-user and session metrics are not generally additive across arbitrary dimensions or dates. Inspect GA4 warnings before comparing segments.', 'Offset pages can change as reports update. A local row cap is not a property-quota budget, and no live property has been certified.'],
    sample: serverSample('googleAnalyticsConnector', 'ga4-device-sessions.ts', 'Inspect daily sessions by device', 'Rows contain date, deviceCategory and sessions, with sessions preserved as a source string.', `const connector = googleAnalyticsConnector({
  id: 'ga4-device-sessions', source: 'Authorized website session aggregates',
  propertyId: env('GA4_PROPERTY_ID'), token: () => env('GOOGLE_ACCESS_TOKEN'),
});
const page = await connector.read({
  dimensions: ['date', 'deviceCategory'], metrics: ['sessions'],
  startDate: '2026-10-01', endDate: '2026-10-07',
}, { limit: 100, timeoutMs: 15_000 });`),
    workflow: { question: 'Which device cohort warrants a closer conversion-friction investigation?', join: 'Compare at matching date/device grain with an independently authorized checkout aggregate; align timezone, eligibility and session definitions rather than attempting a person-level join.', action: 'Inspect instrumentation and a consented research sample for the chosen device cohort, then define a testable checkout hypothesis.', measure: 'Use an agreed completed-attempt denominator and fixed experiment window; this sessions-only report does not measure checkout conversion by itself.' },
    docs: [{ label: 'GA4 runReport', url: 'https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport' }, { label: 'GA4 dimensions and metrics', url: 'https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema' }],
  },
  {
    slug: 'mixpanel', catalogName: 'Mixpanel', name: 'Mixpanel', factory: 'mixpanelConnector',
    monogram: 'Mx', accent: '#c1a0ff', runtime: 'server', outcome: 'conversion',
    headline: 'Inspect the raw events behind a checkout question.',
    description: 'Read a bounded NDJSON event export without inventing an offset cursor or claiming a complete ingestion pipeline.',
    prerequisites: [...serverPrerequisites, 'Set MIXPANEL_PROJECT_ID, MIXPANEL_SERVICE_USERNAME and MIXPANEL_SERVICE_SECRET for an authorized service account. Select US or EU to match the project.', 'Replace Checkout Started and Checkout Completed with your instrumented event names. Define event deduplication, identity and attempt semantics before using the records for metrics.'],
    capabilities: [
      { title: 'Supported event export', body: 'Calls the raw-event export endpoint and retains each event and properties object inside the record JSON column.' },
      { title: 'Bounded date selection', body: 'Accepts an inclusive interval up to 31 days and up to 50 named events.' },
      { title: 'Honest truncation', body: 'Requests one lookahead record to detect a capped result; an incomplete export has no fabricated continuation.' },
    ],
    limitations: ['No resume cursor, incremental checkpoint or background synchronization is provided. Narrow a truncated query or use an external export pipeline.', 'Date boundaries follow the project’s provider/timezone rules. Event names and properties are application instrumentation, not universal schemas.', 'The HTTP response cap is 8 MiB, numeric precision already lost upstream cannot be recovered, and the integration has protocol rather than live-project verification.'],
    sample: serverSample('mixpanelConnector', 'mixpanel-checkout-events.ts', 'Inspect a short checkout event window', 'Read at most 500 returned events; truncated results require a narrower query before all-attempt analysis.', `const connector = mixpanelConnector({
  id: 'mixpanel-checkouts', source: 'Authorized checkout event export',
  projectId: env('MIXPANEL_PROJECT_ID'), region: 'US',
  credentials: () => ({
    username: env('MIXPANEL_SERVICE_USERNAME'), password: env('MIXPANEL_SERVICE_SECRET'),
  }),
});
const page = await connector.read({
  fromDate: '2026-10-01', toDate: '2026-10-02',
  events: ['Checkout Started', 'Checkout Completed'],
}, { limit: 500, timeoutMs: 15_000 });`),
    workflow: { question: 'Where do instrumented checkout attempts lose their completion event?', join: 'Use your explicit attempt ID and authorized distinct-ID/account mapping from event properties; deduplicate source events before comparing starts and completions.', action: 'Review unmatched attempts and instrumentation gaps, then propose a resumable-checkout experiment for a defined cohort.', measure: 'Measure completed eligible attempts within a fixed window, with duplicate-charge and error-rate guardrails; missing completion events are not automatically confirmed abandonment.' },
    docs: [{ label: 'Mixpanel raw-event export', url: 'https://docs.mixpanel.com/reference/raw-event-export' }],
  },
  {
    slug: 'amplitude', catalogName: 'Amplitude', name: 'Amplitude', factory: 'amplitudeConnector',
    monogram: 'Am', accent: '#9cb4ff', runtime: 'server', outcome: 'product',
    headline: 'Keep activation trends tied to their reporting grain.',
    description: 'Read daily event-segmentation aggregates for one event, with a deliberate choice between unique users and total events.',
    prerequisites: [...serverPrerequisites, 'Set AMPLITUDE_API_KEY and AMPLITUDE_SECRET_KEY for the authorized project, and choose its US or EU region.', 'Replace Activated with your validated activation event. Its event definition, timezone and eligible population belong to your application.'],
    capabilities: [
      { title: 'Daily segmentation', body: 'Uses Dashboard REST event segmentation for one event and either uniques or totals, over at most 31 days.' },
      { title: 'Explicit series values', body: 'Rows contain date, series and the selected metric, preserving nulls and source values.' },
      { title: 'Local response paging', body: 'Continuation reuses the fetched aggregate response, rather than rerunning the report for every local page.' },
    ],
    limitations: ['This adapter is not the ZIP raw-event export and does not expose group-by segmentation or user-level records.', 'Daily unique-user counts are nonadditive; summing them does not produce unique users for the whole interval.', 'Project timezone and source numeric precision apply. Local cursors expire after five minutes; protocol tests do not certify a live Amplitude account.'],
    sample: serverSample('amplitudeConnector', 'amplitude-daily-activation.ts', 'Read daily activation uniques', 'The metric column is named uniques. Keep each day separate when comparing activation activity.', `const connector = amplitudeConnector({
  id: 'amplitude-activation', source: 'Authorized daily activation aggregates',
  region: 'US',
  credentials: () => ({
    username: env('AMPLITUDE_API_KEY'), password: env('AMPLITUDE_SECRET_KEY'),
  }),
});
const page = await connector.read({
  event: 'Activated', metric: 'uniques',
  startDate: '2026-10-01', endDate: '2026-10-07',
}, { limit: 100, timeoutMs: 15_000 });`),
    workflow: { question: 'Does an activation change justify a deeper onboarding investigation?', join: 'Compare daily aggregates with a release calendar and separately defined eligible-signup counts at the same timezone/grain; individual customer joins are unavailable here.', action: 'Inspect the activation event definition and recruit a balanced onboarding research sample before proposing a change.', measure: 'Measure activation within an explicit signup-cohort window using an appropriate denominator; daily event uniques alone are not an activation rate or causal effect.' },
    docs: [{ label: 'Amplitude Dashboard REST API', url: 'https://amplitude.com/docs/apis/analytics/dashboard-rest' }],
  },
  {
    slug: 'posthog', catalogName: 'PostHog', name: 'PostHog', factory: 'posthogConnector',
    monogram: 'Ph', accent: '#f4bd82', runtime: 'server', outcome: 'retention',
    headline: 'Explore the output of an approved product-data endpoint.',
    description: 'Run a pinned, named SQL Endpoint with scalar variables, source-defined columns and native limit/offset pagination.',
    prerequisites: [...serverPrerequisites, 'Set POSTHOG_ORIGIN, POSTHOG_PROJECT_ID, POSTHOG_ENDPOINT and POSTHOG_API_KEY for an authorized named SQL Endpoint. The token needs the relevant endpoint access.', 'Create and approve endpoint version 1 with an account_id column and stable ordering. The sample sends no variables; define source grain, authorization and query budgets inside that saved endpoint before use.'],
    capabilities: [
      { title: 'A registered source query', body: 'Calls only the configured named Endpoint run API, pinned to a positive version; it never exposes a general /query proxy.' },
      { title: 'Source columns preserved', body: 'Returned columns determine positional fields, with source values retained and no invented metric schema.' },
      { title: 'Versioned pagination', body: 'Passes limit and offset; optional variables accept up to 100 bounded scalar values. A returned version mismatch fails the read.' },
    ],
    limitations: ['The named Endpoint API is beta. Stable ordering, tenant access, query cost and semantic grain depend on the saved endpoint.', 'Incomplete asynchronous results raise QUERY_PENDING; no partial rows, automatic async polling or native job cancellation are provided.', 'The sample’s account_id is an explicit endpoint contract, not a guaranteed PostHog column. Results and pagination require live endpoint acceptance beyond protocol tests.'],
    sample: serverSample('posthogConnector', 'posthog-retention-endpoint.ts', 'Run a reviewed retention endpoint', 'Use an existing version-1 endpoint whose server-owned query returns the reviewed account-level evidence.', `const connector = posthogConnector({
  id: 'posthog-retention', source: 'Approved retention endpoint',
  host: env('POSTHOG_ORIGIN'), projectId: env('POSTHOG_PROJECT_ID'),
  endpoint: env('POSTHOG_ENDPOINT'), version: 1,
  token: () => env('POSTHOG_API_KEY'),
});
const page = await connector.read({ variables: {} }, {
  limit: 100, timeoutMs: 15_000,
});`),
    workflow: { question: 'Which accounts merit review when observed usage declines near renewal?', join: 'Require the saved endpoint to return your approved account_id and observation grain, then join through an authorized CRM and support mapping.', action: 'Inspect source observations and counterexamples with the account owner before proposing a review queue.', measure: 'Track review completion and next-window eligible-account activity; a decline flag is not a churn probability or predicted revenue loss.' },
    docs: [{ label: 'PostHog named Endpoints API', url: 'https://posthog.com/docs/api/endpoints' }, { label: 'Endpoint API surface', url: 'https://posthog.com/docs/endpoints/surfaces/api' }],
  },
  {
    slug: 'segment', catalogName: 'Segment', name: 'Segment', factory: 'segmentConnector',
    monogram: 'Sg', accent: '#8dd9b2', runtime: 'server', outcome: 'retention',
    headline: 'Inspect one authorized profile before choosing an action.',
    description: 'Read Profile API traits, events or external identifiers for a configured space and users/accounts collection.',
    prerequisites: [...serverPrerequisites, 'Set SEGMENT_SPACE_ID, SEGMENT_PROFILE_TOKEN and SEGMENT_PROFILE_ID to an authorized profile lookup such as user_id:your-id. Select US or EU for the space.', 'The application must authorize the requested profile before reading it. The adapter formats the token as the Basic-auth username with an empty password; do not base64-encode it yourself.'],
    capabilities: [
      { title: 'Profile-specific reads', body: 'Supports traits, events and external_ids for a fixed space and users or accounts collection.' },
      { title: 'Trait semantics retained', body: 'Traits become trait/value rows; false, null and absent properties retain their distinct meanings.' },
      { title: 'Native profile cursors', body: 'Uses the provider’s next cursor with at most 100 returned items per request.' },
    ],
    limitations: ['This is not a warehouse-wide event export, profile search engine or incremental synchronization service.', 'Available fields/events and retention follow the Profile API and source configuration. An external identifier is not automatic authorization to link a person.', 'The adapter does not change traits or trigger audiences/messages. Live profile acceptance remains separate from mocked protocol validation.'],
    sample: serverSample('segmentConnector', 'segment-profile-traits.ts', 'Read an approved profile’s traits', 'The profile identifier comes from trusted server configuration here; a multi-user application must bind it to authenticated access.', `const connector = segmentConnector({
  id: 'segment-profile', source: 'Authorized customer profile traits',
  spaceId: env('SEGMENT_SPACE_ID'), collection: 'users', region: 'US',
  token: () => env('SEGMENT_PROFILE_TOKEN'),
});
const page = await connector.read({
  profile: env('SEGMENT_PROFILE_ID'), resource: 'traits',
}, { limit: 100, timeoutMs: 15_000 });`),
    workflow: { question: 'What verified profile context should an account owner review before renewal outreach?', join: 'Use approved identity-resolution rules and tenant access to link returned profile identifiers to the account; retain missing traits rather than guessing them.', action: 'Prepare a human review combining the profile with recent support and usage evidence; request explicit authorization before contacting anyone.', measure: 'Track reviewed eligible accounts and follow-up outcomes with consent and complaint guardrails; trait presence does not establish intent or churn risk.' },
    docs: [{ label: 'Segment Profile API', url: 'https://www.twilio.com/docs/segment/unify/profile-api' }],
  },
  {
    slug: 'zendesk', catalogName: 'Zendesk / Intercom', name: 'Zendesk', factory: 'zendeskConnector',
    monogram: 'Zd', accent: '#94d9ca', runtime: 'server', outcome: 'retention',
    headline: 'Bring support history into an accountable review.',
    description: 'Read selected Zendesk Support lists with native cursor pagination and inspectable record JSON.',
    prerequisites: [...serverPrerequisites, 'Set ZENDESK_SUBDOMAIN to the account subdomain only and ZENDESK_OAUTH_TOKEN to a token with the required Support read access.', 'Maintain an authorized mapping from Zendesk organization/requester IDs to your account model. Ticket access follows the token’s permissions.'],
    capabilities: [
      { title: 'Support resource lists', body: 'Read tickets, users or organizations; each row contains one full returned record.' },
      { title: 'Cursor-based pages', body: 'Uses page[size]/page[after] with at most 100 records; organization reads request boundary indicators.' },
      { title: 'Evidence references', body: 'Keep ticket and related source IDs available for an application-defined join and inspection workflow.' },
    ],
    limitations: ['List permissions and archive rules apply. This is not the incremental all-ticket export, ticket-comments or conversation-history API.', 'No arbitrary ticket search, time filter, write or messaging operation is exposed. A list page is not a full support workload.', 'The adapter does not infer account identity or classify sentiment. Live account and permission validation remain application work.'],
    sample: serverSample('zendeskConnector', 'zendesk-support-tickets.ts', 'Inspect one support-ticket page', 'The record column preserves the returned ticket fields; associations must be mapped with explicit permissions.', `const connector = zendeskConnector({
  id: 'zendesk-tickets', source: 'Authorized support ticket list',
  subdomain: env('ZENDESK_SUBDOMAIN'),
  token: () => env('ZENDESK_OAUTH_TOKEN'),
});
const page = await connector.read({ resource: 'tickets' }, {
  limit: 100, timeoutMs: 15_000,
});`),
    workflow: { question: 'Which upcoming renewals need context from unresolved support work?', join: 'Map ticket organization_id or requester_id through an authorized identity table to CRM accounts, and bring renewal dates from a separate approved source.', action: 'Ask the account and support owners to review specific unresolved records and confirm the customer’s current situation.', measure: 'Track eligible-account review completion and subsequent resolution status over a fixed window; ticket counts alone are not churn likelihood.' },
    docs: [{ label: 'Zendesk pagination', url: 'https://developer.zendesk.com/api-reference/introduction/pagination/' }, { label: 'Zendesk tickets', url: 'https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/' }],
  },
  {
    slug: 'intercom', catalogName: 'Zendesk / Intercom', name: 'Intercom', factory: 'intercomConnector',
    monogram: 'Ic', accent: '#a2beff', runtime: 'server', outcome: 'product',
    headline: 'Find the contact context for a research question.',
    description: 'Read Intercom contacts with an explicit API version and regional endpoint, preserving returned source records.',
    prerequisites: [...serverPrerequisites, 'Set INTERCOM_ACCESS_TOKEN to an authorized contacts-read token and choose the workspace’s US, EU or AU region. The sample pins API 2.17.', 'Define an approved mapping from Intercom external_id or contact ID to your account/research population; do not treat a contact list as research consent.'],
    capabilities: [
      { title: 'Pinned contact reads', body: 'Uses the /contacts list and sends the configured Intercom-Version header.' },
      { title: 'Source records retained', body: 'Each row contains a record JSON cell, keeping returned IDs and contact context available for explicit mapping.' },
      { title: 'Native continuation', body: 'Uses starting_after with at most 150 contacts per provider request; final pages may have null pagination metadata.' },
    ],
    limitations: ['No conversations, tickets, message bodies, merged/deleted history or contact writes are included.', 'Contacts are not automatically account-level entities, active users or consenting interview participants. Source coverage follows workspace access.', 'Lists may change during paging; local cursors are short-lived, and protocol checks are not live workspace certification.'],
    sample: serverSample('intercomConnector', 'intercom-research-contacts.ts', 'Read an authorized contact preview', 'This contact-only sample does not send messages or fetch conversations.', `const connector = intercomConnector({
  id: 'intercom-contacts', source: 'Authorized contact context',
  apiVersion: '2.17', region: 'US',
  token: () => env('INTERCOM_ACCESS_TOKEN'),
});
const page = await connector.read(undefined, {
  limit: 100, timeoutMs: 15_000,
});`),
    workflow: { question: 'Which eligible customer perspectives are missing from a product research sample?', join: 'Map approved contact IDs to the account segment and consented research roster using a separately maintained identity contract.', action: 'Prepare a balanced recruitment proposal for a research owner; obtain permission before any outreach.', measure: 'Track distinct eligible accounts represented by segment and confirmed consent, rather than equating contact count with evidence strength.' },
    docs: [{ label: 'Intercom list contacts, v2.17', url: 'https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/listcontacts' }],
  },
  {
    slug: 'google-sheets', catalogName: 'Google Sheets', name: 'Google Sheets', factory: 'googleSheetsConnector',
    monogram: 'Gs', accent: '#9bdfa5', runtime: 'server', outcome: 'product',
    headline: 'Make the research sheet an inspectable source contract.',
    description: 'Read one configured rectangle with explicit field metadata, stable sheet-row paging and honest blank-value semantics.',
    prerequisites: [...serverPrerequisites, 'Set GOOGLE_SPREADSHEET_ID and GOOGLE_ACCESS_TOKEN with read access to that spreadsheet.', 'The sample assumes a Research sheet with Customer ID, Initiative ID and Stance in columns A–C, headers in row 1 and data in rows 2–101. These names and bounds are your reviewed schema, not discovered automatically.'],
    capabilities: [
      { title: 'A fixed rectangle', body: 'Configure spreadsheet, sheet, first column, inclusive row range and fields on the server.' },
      { title: 'Explicit rendering policy', body: 'Choose FORMATTED_VALUE, UNFORMATTED_VALUE or FORMULA. Supplied field types describe meaning without coercing the source cells.' },
      { title: 'Blank rows preserved', body: 'Returns one row per configured sheet row; omitted trailing cells become null, keeping positional alignment through continuation.' },
    ],
    limitations: ['Supports 1–100 columns and at most 100,000 rows, with the last row at or below 1,000,000. No spreadsheet discovery, editing or automatic header inference.', 'Formatted values reflect locale and display precision. Unformatted values inherit spreadsheet/JSON numeric precision; store exact IDs and decimals as text.', 'Configured blank rows count toward the result and need explicit filtering for analysis. Paging is not a frozen sheet snapshot, and live-file acceptance remains required.'],
    sample: serverSample('googleSheetsConnector', 'sheets-research-evidence.ts', 'Read the reviewed research rectangle', 'This page includes rows 2–51, including blanks. The cursor continues within the fixed rows 2–101 range.', `const connector = googleSheetsConnector({
  id: 'sheets-research', source: 'Authorized research evidence sheet',
  spreadsheetId: env('GOOGLE_SPREADSHEET_ID'), sheet: 'Research',
  firstColumn: 1, startRow: 2, endRow: 101,
  fields: [
    { name: 'customer_id', type: 'string' },
    { name: 'initiative_id', type: 'string' },
    { name: 'stance', type: 'string' },
  ],
  valueRenderOption: 'FORMATTED_VALUE',
  token: () => env('GOOGLE_ACCESS_TOKEN'),
});
const page = await connector.read(undefined, {
  limit: 50, timeoutMs: 15_000,
});`),
    workflow: { question: 'Which initiative needs more contradictory or underrepresented customer evidence?', join: 'Validate customer_id and initiative_id against approved catalogs, reject broken joins and distinguish blank rows from missing testimony.', action: 'Review the stance coding with a research owner and plan a targeted follow-up study before committing delivery capacity.', measure: 'Track distinct represented accounts, retained counter-evidence and a predefined prototype-task outcome; spreadsheet row counts alone are not validated product demand.' },
    docs: [{ label: 'Sheets Values get API', url: 'https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get' }, { label: 'Value rendering options', url: 'https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueRenderOption' }],
  },
];
