import { assertServerRuntime, ConnectorError, makePage, runRead, validateIdentity } from '../core.js';
import type { ConnectorIdentity, DataConnector, Field } from '../types.js';

export const invalidProductResponse = () => new ConnectorError('INVALID_RESPONSE', 'The source returned an invalid response.');
export const changingResults = 'Source records can change between pages; this read does not establish a transactionally consistent snapshot.';
export function productObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidProductResponse();
  return value as Record<string, any>;
}
export function productString(value: unknown, maximum = 4096): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value);
}
export function configIdentifier(value: unknown, pattern = /^[A-Za-z0-9_-]{1,128}$/): string {
  if (typeof value !== 'string' || !pattern.test(value)) throw new ConnectorError('INVALID_CONFIG', 'Provide valid source identifiers in server configuration.');
  return value;
}
export function queryObject(value: unknown, keys: string[]): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new ConnectorError('INVALID_QUERY', 'Unsupported query options.');
  return value as Record<string, any>;
}
export function noQuery(value: unknown): undefined {
  if (value !== undefined) throw new ConnectorError('INVALID_QUERY', 'This source uses a server-configured query.');
  return undefined;
}
export function dateWindow(start: unknown, end: unknown, maximumDays = 31): void {
  const parse = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ConnectorError('INVALID_QUERY', 'Use absolute dates in YYYY-MM-DD format.');
    const timestamp = Date.parse(value + 'T00:00:00Z');
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) throw new ConnectorError('INVALID_QUERY', 'Invalid calendar date.');
    return timestamp;
  };
  const difference = (parse(end) - parse(start)) / 86_400_000;
  if (difference < 0 || difference >= maximumDays) throw new ConnectorError('INVALID_QUERY', 'The date interval exceeds this adapter’s bounded query window.');
}
export function productRecords(value: unknown, maximum = 5000): unknown[][] {
  if (!Array.isArray(value) || value.length > maximum) throw invalidProductResponse();
  return value.map(record => [productObject(record)]);
}
export const recordFields: Field[] = [{ name: 'record', type: 'json' }];
export function nextNative(value: unknown, hasMore: unknown, previous?: string | number): string | undefined {
  if (typeof hasMore !== 'boolean') throw invalidProductResponse();
  if (!hasMore) return undefined;
  if (!productString(value) || value === previous) throw invalidProductResponse();
  return value;
}

export interface ProductHttpOptions extends ConnectorIdentity {
  fetch?: typeof globalThis.fetch;
  origin: string;
  headers(): Promise<Record<string, string>> | Record<string, string>;
}
/** Shared server transport for protocols using Basic or a provider-specific token header. */
export function productHttp(options: ProductHttpOptions) {
  options = { ...options };
  assertServerRuntime(); validateIdentity(options);
  let origin: URL;
  try { origin = new URL(options.origin); } catch { throw new ConnectorError('INVALID_CONFIG', 'Use a valid HTTPS source origin.'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new ConnectorError('INVALID_CONFIG', 'Use an HTTPS origin without credentials, path, query or fragment.');
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof fetcher !== 'function' || typeof options.headers !== 'function') throw new ConnectorError('INVALID_CONFIG', 'Provide a fetch implementation and server-side authentication callback.');
  return async (path: string, signal: AbortSignal, body?: unknown, raw = false): Promise<any> => {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new ConnectorError('INVALID_URL', 'Invalid source request path.');
    const url = new URL(path, origin);
    if (url.origin !== origin.origin || url.hash || url.username || url.password) throw new ConnectorError('INVALID_URL', 'Source requests must remain on the configured origin.');
    let response: Response;
    try {
      if (signal.aborted) throw new ConnectorError('ABORTED', 'The source request was cancelled.');
      const authentication = await options.headers();
      if (signal.aborted) throw new ConnectorError('ABORTED', 'The source request was cancelled.');
      const headers = new Headers({ accept: raw ? 'text/plain' : 'application/json', ...authentication });
      if (body !== undefined) headers.set('content-type', 'application/json');
      response = await fetcher(url.href, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), signal, redirect: 'error' });
    } catch (error) {
      if (error instanceof ConnectorError) throw error;
      throw new ConnectorError(signal.aborted ? 'ABORTED' : 'NETWORK_ERROR', 'The source request could not be completed.');
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new ConnectorError(response.status === 429 ? 'RATE_LIMITED' : response.status === 401 || response.status === 403 ? 'AUTHENTICATION' : 'PROVIDER_ERROR', `The source returned HTTP ${response.status}. Response text is withheld.`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw invalidProductResponse();
    const cancel = () => { void reader.cancel().catch(() => {}); };
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    let size = 0, text = ''; const decoder = new TextDecoder('utf-8', { fatal: true });
    try {
      for (;;) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 8 * 1024 * 1024) throw new ConnectorError('RESPONSE_TOO_LARGE', 'The source response exceeded 8 MiB. Narrow the query.');
        text += decoder.decode(chunk.value, { stream: true });
      }
      if (signal.aborted) throw new ConnectorError('ABORTED', 'The source request was cancelled.');
      text += decoder.decode();
      return raw ? text : JSON.parse(text);
    } catch (error) {
      cancel();
      if (signal.aborted) throw new ConnectorError('ABORTED', 'The source request was cancelled.');
      if (error instanceof ConnectorError) throw error;
      throw invalidProductResponse();
    } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
  };
}
export function secret(value: unknown): string {
  if (!productString(value, 8192)) throw new ConnectorError('AUTHENTICATION', 'The source credential is missing or invalid.');
  return value;
}
export function basic(username: string, password: string): string {
  if (username.includes(':') || /[\r\n]/.test(username + password) || username.length + password.length > 8192) throw new ConnectorError('AUTHENTICATION', 'Invalid Basic credentials.');
  return 'Basic ' + btoa(Array.from(new TextEncoder().encode(username + ':' + password), byte => String.fromCharCode(byte)).join(''));
}
export type BasicCredentials = () => { username: string; password: string } | Promise<{ username: string; password: string }>;
export async function basicHeader(credentials: BasicCredentials): Promise<Record<string, string>> {
  const values = await credentials();
  return { authorization: basic(secret(values.username), secret(values.password)) };
}

export interface ProductResult {
  fields: Field[];
  rows: unknown[][];
  next?: string | number;
  truncated?: boolean;
  warnings?: string[];
}
interface Stored { key: string; result: ProductResult; offset: number; expires: number }
/** Opaque, instance-local continuation: 32 states, five-minute TTL, no SQL/PII in tokens. */
export function productConnector<Q>(identity: ConnectorIdentity, provider: string, validate: (query: Q) => Q,
  fetchPage: (query: Q, next: string | number | undefined, limit: number, signal: AbortSignal) => Promise<ProductResult>,
  pagination: 'cursor' | 'none' = 'cursor'): DataConnector<Q> {
  assertServerRuntime(); validateIdentity(identity);
  identity = { ...identity };
  const states = new Map<string, Stored>();
  return { id: identity.id, provider, capabilities: { runtime: 'server', pagination, cancellation: 'transport', queryLanguage: 'rest' },
    read(query, options) { return runRead(options, async ({ limit, cursor, signal }) => {
      const checked = validate(query);
      let serialized: string | undefined;
      try { serialized = JSON.stringify(checked); } catch { throw new ConnectorError('INVALID_QUERY', 'Queries must be JSON serializable.'); }
      const key = serialized ?? 'undefined';
      if (key.length > 32768) throw new ConnectorError('INVALID_QUERY', 'The query exceeds the supported size.');
      const snapshot: Q = serialized === undefined ? checked : JSON.parse(serialized);
      for (const [token, state] of states) if (state.expires <= Date.now()) states.delete(token);
      let state: Stored;
      if (cursor) {
        if (pagination === 'none') throw new ConnectorError('UNSUPPORTED_CURSOR', 'This bounded source snapshot does not support continuation.');
        const stored = states.get(cursor);
        if (!stored || stored.key !== key) throw new ConnectorError('INVALID_CURSOR', 'The cursor is expired or belongs to another query or connector.');
        state = { ...stored };
        if (state.offset >= state.result.rows.length && state.result.next !== undefined) state = { key, result: await fetchPage(snapshot, state.result.next, limit, signal), offset: 0, expires: 0 };
      } else state = { key, result: await fetchPage(snapshot, undefined, limit, signal), offset: 0, expires: 0 };
      if (signal.aborted) throw new ConnectorError('ABORTED', 'The source request was cancelled.');
      const result = state.result, end = Math.min(state.offset + limit, result.rows.length);
      if (result.rows.length > 10000 || (result.next !== undefined && result.rows.length === 0)) throw invalidProductResponse();
      const hasMore = end < result.rows.length || result.next !== undefined;
      let nextCursor: string | undefined;
      if (hasMore && pagination === 'cursor') {
        while (states.size >= 32) states.delete(states.keys().next().value!);
        nextCursor = crypto.randomUUID();
        states.set(nextCursor, { key, result, offset: end, expires: Date.now() + 300_000 });
      }
      return makePage(identity, provider, result.fields, result.rows.slice(state.offset, end), {
        hasMore, nextCursor, truncated: result.truncated || (hasMore && pagination === 'none'), warnings: result.warnings,
      });
    }); },
  };
}
