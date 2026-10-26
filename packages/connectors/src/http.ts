import { assertServerRuntime, ConnectorError, validateIdentity } from './core.js';
import type { HttpOptions } from './types.js';

export function createHttpClient(config: HttpOptions & { baseUrl: string; headers?: Record<string, string>; maxResponseBytes?: number }) {
  assertServerRuntime(); validateIdentity(config);
  let base: URL;
  try { base = new URL(config.baseUrl); } catch { throw new ConnectorError('INVALID_CONFIG', 'A valid HTTPS source origin is required.'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || (base.pathname !== '/' && base.pathname !== '')) throw new ConnectorError('INVALID_CONFIG', 'Use an HTTPS source origin without a path, query, or embedded credentials.');
  const maxBytes = config.maxResponseBytes ?? 8 * 1024 * 1024;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1024 || maxBytes > 32 * 1024 * 1024) throw new ConnectorError('INVALID_CONFIG', 'Response size limit must be between 1 KiB and 32 MiB.');
  const fetcher = config.fetch ?? globalThis.fetch;
  if (typeof fetcher !== 'function' || typeof config.token !== 'function') throw new ConnectorError('INVALID_CONFIG', 'Provide a fetch implementation and a server-side token callback.');
  return { async request(path: string, options: { method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal } = {}): Promise<any> {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new ConnectorError('INVALID_URL', 'Source requests must use a relative API path.');
    const url = new URL(path, base);
    if (url.origin !== base.origin || url.username || url.password || url.hash) throw new ConnectorError('INVALID_URL', 'Source requests must remain on the configured origin.');
    let response: Response;
    try {
      const token = await config.token();
      if (!token || /[\r\n]/.test(token)) throw new ConnectorError('AUTHENTICATION', 'The source token is missing or invalid.');
      const headers = new Headers({ accept: 'application/json', ...config.headers, ...options.headers });
      headers.set('authorization', `Bearer ${token}`);
      if (options.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');
      response = await fetcher(url.toString(), { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : typeof options.body === 'string' ? options.body : JSON.stringify(options.body), redirect: 'error', signal: options.signal });
    } catch (error) {
      if (error instanceof ConnectorError) throw error;
      throw new ConnectorError(options.signal?.aborted ? 'ABORTED' : 'NETWORK_ERROR', 'The source request could not be completed.');
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new ConnectorError(response.status === 401 || response.status === 403 ? 'AUTHENTICATION' : response.status === 429 ? 'RATE_LIMITED' : 'PROVIDER_ERROR', `The source returned HTTP ${response.status}. Provider response text is withheld.`);
    }
    if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel().catch(() => {}); throw new ConnectorError('RESPONSE_TOO_LARGE', 'The source response exceeded the byte limit.'); }
    const reader = response.body?.getReader();
    if (!reader) throw new ConnectorError('INVALID_RESPONSE', 'The source returned an empty response.');
    const decoder = new TextDecoder(); let total = 0, text = '';
    try {
      for (;;) {
        const chunk = await reader.read(); if (chunk.done) break;
        total += chunk.value.byteLength;
        if (total > maxBytes) throw new ConnectorError('RESPONSE_TOO_LARGE', 'The source response exceeded the byte limit.');
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
      return JSON.parse(text);
    } catch (error) {
      await reader.cancel().catch(() => {});
      if (error instanceof ConnectorError) throw error;
      throw new ConnectorError('INVALID_RESPONSE', 'The source did not return a valid JSON response.');
    } finally { reader.releaseLock(); }
  } };
}
