import { ConnectorError } from '../core.js';
import { createHttpClient } from '../http.js';
import type { DataConnector, HttpOptions } from '../types.js';
import { basic, changingResults, configIdentifier, invalidProductResponse, nextNative, noQuery, productConnector, productHttp, productObject, productRecords, productString, queryObject, recordFields, secret } from './product-support.js';

export interface SalesforceOptions extends HttpOptions { instanceUrl: string; apiVersion: string }
export interface SalesforceQuery { soql: string }
/** REST SOQL query/query-more only; the application owns SOQL construction and authorization. */
export function salesforceConnector(options: SalesforceOptions): DataConnector<SalesforceQuery> {
  const version = configIdentifier(options.apiVersion, /^\d{2,3}\.0$/);
  const prefix = `/services/data/v${version}/query`;
  const continuation = new RegExp(`^/services/data/v${version.replace('.', '\\.')}/query/[A-Za-z0-9_-]+$`);
  const http = createHttpClient({ ...options, baseUrl: options.instanceUrl, headers: { 'Sforce-Query-Options': 'batchSize=2000' } });
  return productConnector(options, 'salesforce', query => {
    queryObject(query, ['soql']);
    if (!productString(query.soql, 20000)) throw new ConnectorError('INVALID_QUERY', 'Provide a bounded server-owned SOQL query.');
    return query;
  }, async (query, next, _limit, signal) => {
    const path = next === undefined ? `${prefix}?${new URLSearchParams({ q: query.soql })}` : String(next);
    if (next !== undefined && !continuation.test(path)) throw invalidProductResponse();
    const result = productObject(await http.request(path, { signal }));
    if (typeof result.done !== 'boolean') throw invalidProductResponse();
    const after = nextNative(result.nextRecordsUrl, !result.done, next);
    if (after && !continuation.test(after)) throw invalidProductResponse();
    return { fields: recordFields, rows: productRecords(result.records, 2000), next: after, warnings: [changingResults, 'Rows are SOQL result records; nested relationship subqueries retain their own pagination metadata and are not automatically expanded. SOQL parameters must be constructed safely by the server application.'] };
  });
}

export interface ShopifyOptions extends HttpOptions { shop: string; apiVersion: string }
export interface ShopifyQuery { resource: 'products' | 'customers' | 'orders'; search?: string }
const shopifyFields = {
  products: 'id title handle status createdAt updatedAt',
  customers: 'id displayName createdAt updatedAt',
  orders: 'id name createdAt updatedAt displayFinancialStatus totalPriceSet { shopMoney { amount currencyCode } }',
};
/** Fixed Admin GraphQL read selections; callers cannot submit GraphQL mutations or arbitrary documents. */
export function shopifyConnector(options: ShopifyOptions): DataConnector<ShopifyQuery> {
  options = { ...options };
  const shop = configIdentifier(options.shop, /^[a-z0-9][a-z0-9-]{0,62}$/), version = configIdentifier(options.apiVersion, /^20\d{2}-(01|04|07|10)$/);
  const http = productHttp({ ...options, origin: `https://${shop}.myshopify.com`, headers: async () => ({ 'x-shopify-access-token': secret(await options.token()) }) });
  return productConnector(options, 'shopify', query => {
    queryObject(query, ['resource', 'search']);
    if (!Object.hasOwn(shopifyFields, query.resource) || (query.search !== undefined && !productString(query.search, 2048))) throw new ConnectorError('INVALID_QUERY', 'Choose a supported Shopify resource and optional search expression.');
    return query;
  }, async (query, next, limit, signal) => {
    const size = Math.min(limit, 250);
    const document = `query MotifRead($first:Int!,$after:String,$query:String){${query.resource}(first:$first,after:$after,query:$query,sortKey:ID){edges{node{${shopifyFields[query.resource]}}}pageInfo{hasNextPage endCursor}}}`;
    const result = productObject(await http(`/admin/api/${version}/graphql.json`, signal, { query: document, variables: { first: size, after: next ?? null, query: query.search ?? null } }));
    if (result.errors !== undefined && (!Array.isArray(result.errors) || result.errors.length)) throw new ConnectorError('QUERY_FAILED', 'Shopify rejected the registered query. Provider messages are withheld.');
    const connection = productObject(productObject(result.data)[query.resource]), info = productObject(connection.pageInfo);
    if (!Array.isArray(connection.edges) || connection.edges.length > size) throw invalidProductResponse();
    const records = connection.edges.map((edge: unknown) => productObject(productObject(edge).node));
    return { fields: recordFields, rows: productRecords(records, size), next: nextNative(info.endCursor, info.hasNextPage, next), warnings: [changingResults, 'Records include the fixed selection only. Order history and customer fields depend on granted app scopes and protected-data access; this is not a full shop export.'] };
  });
}

export interface ZendeskOptions extends HttpOptions { subdomain: string }
export interface ZendeskQuery { resource: 'tickets' | 'users' | 'organizations' }
/** OAuth read access to selected Support lists; archive/incremental exports are separate APIs. */
export function zendeskConnector(options: ZendeskOptions): DataConnector<ZendeskQuery> {
  const domain = configIdentifier(options.subdomain, /^[a-z0-9][a-z0-9-]{0,62}$/);
  const http = createHttpClient({ ...options, baseUrl: `https://${domain}.zendesk.com` });
  return productConnector(options, 'zendesk', query => {
    queryObject(query, ['resource']);
    if (!['tickets', 'users', 'organizations'].includes(query.resource)) throw new ConnectorError('INVALID_QUERY', 'Choose a supported Zendesk list.');
    return query;
  }, async (query, next, limit, signal) => {
    const size = Math.min(limit, 100), params = new URLSearchParams({ 'page[size]': String(size) });
    if (query.resource === 'organizations') params.set('include_boundary_indicators', 'true');
    if (next !== undefined) params.set('page[after]', String(next));
    const result = productObject(await http.request(`/api/v2/${query.resource}.json?${params}`, { signal })), meta = productObject(result.meta);
    return { fields: recordFields, rows: productRecords(result[query.resource], size), next: nextNative(meta.after_cursor, meta.has_more, next), warnings: [changingResults, 'Zendesk list permissions and archive rules apply. This is not the incremental all-ticket export API.'] };
  });
}

export interface IntercomOptions extends HttpOptions { region?: 'US' | 'EU' | 'AU'; apiVersion: string }
export function intercomConnector(options: IntercomOptions): DataConnector<void> {
  const origins = { US: 'https://api.intercom.io', EU: 'https://api.eu.intercom.io', AU: 'https://api.au.intercom.io' };
  const region = options.region ?? 'US';
  if (!Object.hasOwn(origins, region)) throw new ConnectorError('INVALID_CONFIG', 'Choose a supported Intercom region.');
  const version = configIdentifier(options.apiVersion, /^2\.\d{1,2}$/);
  const http = createHttpClient({ ...options, baseUrl: origins[region], headers: { 'Intercom-Version': version } });
  return productConnector(options, 'intercom', noQuery, async (_query, next, limit, signal) => {
    const size = Math.min(limit, 150), params = new URLSearchParams({ per_page: String(size) });
    if (next !== undefined) params.set('starting_after', String(next));
    const result = productObject(await http.request(`/contacts?${params}`, { signal }));
    if (result.type !== 'list') throw invalidProductResponse();
    const pages = result.pages === null ? {} : productObject(result.pages);
    const after = pages.next == null ? undefined : nextNative(productObject(pages.next).starting_after, true, next);
    return { fields: recordFields, rows: productRecords(result.data, size), next: after, warnings: [changingResults, 'Contact list only; conversations, tickets and merged/deleted contact history are not included.'] };
  });
}

export interface SegmentOptions extends HttpOptions { spaceId: string; collection?: 'users' | 'accounts'; region?: 'US' | 'EU' }
export interface SegmentQuery { profile: string; resource: 'traits' | 'events' | 'external_ids' }
/** Segment Unify Profile API: per-profile records, not a workspace event warehouse export. */
export function segmentConnector(options: SegmentOptions): DataConnector<SegmentQuery> {
  options = { ...options };
  const space = configIdentifier(options.spaceId), collection = options.collection ?? 'users', region = options.region ?? 'US';
  if (!['users', 'accounts'].includes(collection) || !['US', 'EU'].includes(region)) throw new ConnectorError('INVALID_CONFIG', 'Choose a supported Segment collection and region.');
  const http = productHttp({ ...options, origin: region === 'EU' ? 'https://profiles.euw1.segment.com' : 'https://profiles.segment.com', headers: async () => ({ authorization: basic(secret(await options.token()), '') }) });
  return productConnector(options, 'segment', query => {
    queryObject(query, ['profile', 'resource']);
    if (!productString(query.profile, 512) || !['traits', 'events', 'external_ids'].includes(query.resource)) throw new ConnectorError('INVALID_QUERY', 'Provide a profile identifier and supported Profile API resource.');
    return query;
  }, async (query, next, limit, signal) => {
    const size = Math.min(limit, 100), params = new URLSearchParams({ limit: String(size) });
    if (next !== undefined) params.set('next', String(next));
    const path = `/v1/spaces/${space}/collections/${collection}/profiles/${encodeURIComponent(query.profile)}/${query.resource}?${params}`;
    const result = productObject(await http(path, signal)), cursor = productObject(result.cursor);
    const rows = query.resource === 'traits' ? Object.entries(productObject(result.traits)).map(([name, value]) => [name, value]) : productRecords(result.data, size);
    if (rows.length > size) throw invalidProductResponse();
    return { fields: query.resource === 'traits' ? [{ name: 'trait', type: 'string' }, { name: 'value', type: 'json' }] : recordFields, rows, next: nextNative(cursor.next, cursor.has_more, next), warnings: [changingResults, query.resource === 'traits' ? 'One row per returned profile trait; absent traits remain absent.' : 'One row per profile event or external identifier, subject to Profile API availability and retention.'] };
  });
}
