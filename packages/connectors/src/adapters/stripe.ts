import { ConnectorError, makePage, runRead } from '../core.js';
import { createHttpClient } from '../http.js';
import type { DataConnector, Field, HttpOptions } from '../types.js';
import { boundCursor, changingListWarning, checkContinuation, nativeCursor, nonemptyString, objectResult, recordList, restCapabilities } from './rest-support.js';

const paths = {
  customers: 'customers', products: 'products', prices: 'prices', payment_intents: 'payment_intents',
  charges: 'charges', invoices: 'invoices', subscriptions: 'subscriptions', checkout_sessions: 'checkout/sessions',
} as const;
export type StripeResource = keyof typeof paths;
export interface StripeQuery { resource: StripeResource }
export interface StripeOptions extends HttpOptions { apiVersion?: string; account?: string }
const fields: Field[] = [
  { name: 'id', type: 'string' }, { name: 'object', type: 'string' },
  { name: 'created', type: 'integer', nullable: true }, { name: 'record', type: 'json' },
];

/** Stripe v1 list resources only. The full record retains missing properties and exact string values. */
export function stripeConnector(options: StripeOptions): DataConnector<StripeQuery> {
  if ((options.apiVersion !== undefined && !/^\d{4}-\d{2}-\d{2}(?:\.[a-z]+)?$/.test(options.apiVersion)) || (options.account !== undefined && !/^acct_[A-Za-z0-9]+$/.test(options.account))) throw new ConnectorError('INVALID_CONFIG', 'Provide a valid Stripe API version and optional connected account ID.');
  const identity = { id: options.id, source: options.source, mode: options.mode };
  const version = options.apiVersion, account = options.account;
  const http = createHttpClient({ ...options, baseUrl: 'https://api.stripe.com', headers: { ...(version && { 'stripe-version': version }), ...(account && { 'stripe-account': account }) } });
  return { id: identity.id, provider: 'stripe', capabilities: { ...restCapabilities },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      if (!query || !Object.hasOwn(paths, query.resource) || Object.keys(query).some(key => key !== 'resource')) throw new ConnectorError('INVALID_QUERY', 'Choose a supported Stripe list resource.');
      const resource = query.resource, size = Math.min(limit, 100);
      const codec = boundCursor(identity, 'stripe', [resource, version ?? null, account ?? null]);
      const after = nativeCursor(codec.decode(cursor));
      const parameters = new URLSearchParams({ limit: String(size) });
      if (after) parameters.set('starting_after', after);
      const result = objectResult(await http.request(`/v1/${paths[resource]}?${parameters}`, { signal }));
      if (result.object !== 'list' || typeof result.has_more !== 'boolean') throw new ConnectorError('INVALID_RESPONSE', 'Stripe did not return a list response.');
      const records = recordList(result.data, size);
      if (records.some(record => !nonemptyString(record.id) || !nonemptyString(record.object) || (record.created != null && (typeof record.created !== 'number' || !Number.isSafeInteger(record.created))))) throw new ConnectorError('INVALID_RESPONSE', 'Stripe returned invalid record metadata.');
      const next = result.has_more ? records.at(-1)?.id as string | undefined : undefined;
      if (result.has_more && !next) throw new ConnectorError('INVALID_RESPONSE', 'Stripe returned an empty page with more results.');
      checkContinuation(next, after, records.length);
      return makePage(identity, 'stripe', fields, records.map(record => [record.id, record.object, record.created ?? null, record]), {
        hasMore: result.has_more, ...(next && { nextCursor: codec.encode(next) }), warnings: [changingListWarning],
      });
    }); },
  };
}
