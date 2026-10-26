import { ConnectorError, normalizeCell, runRead, validateIdentity } from './core.js';
import type { Cell, ConnectorIdentity, DataConnector, DataPage } from './types.js';

export interface OperationQuery { operation: string; parameters?: Record<string, string | number | boolean | null> }
export interface EndpointOptions extends ConnectorIdentity { endpoint: string; fetch?: typeof globalThis.fetch }
const fieldTypes = new Set(['string', 'number', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'binary', 'json', 'unknown']);

/** Validate the application boundary before a visualization receives network data. */
export function validateDataPage(value: unknown): DataPage {
  if (!value || typeof value !== 'object') throw new ConnectorError('INVALID_RESPONSE', 'The application returned an invalid data page.');
  const page = value as DataPage;
  if (!Array.isArray(page.fields) || Array.from(page.fields).some(field => !field || typeof field.name !== 'string' || !fieldTypes.has(field.type)) || !Array.isArray(page.rows) || page.rows.length > 5000 || Array.from(page.rows).some(row => !Array.isArray(row) || row.length !== page.fields.length) || !page.provenance || typeof page.provenance.provider !== 'string' || typeof page.provenance.fetchedAt !== 'string' || !Number.isFinite(Date.parse(page.provenance.fetchedAt)) || !['live', 'fixture'].includes(page.provenance.mode) || !page.page || typeof page.page.hasMore !== 'boolean' || typeof page.page.truncated !== 'boolean' || !Array.isArray(page.warnings) || Array.from(page.warnings).some(warning => typeof warning !== 'string')) throw new ConnectorError('INVALID_RESPONSE', 'The application returned an invalid data page.');
  validateIdentity({ id: page.provenance.connectorId, source: page.provenance.source, mode: page.provenance.mode });
  if (!page.provenance.provider.trim() || typeof page.provenance.fetchedAt !== 'string' || (page.provenance.queryId !== undefined && typeof page.provenance.queryId !== 'string')) throw new ConnectorError('INVALID_RESPONSE', 'The application returned invalid provenance.');
  if (page.page.nextCursor !== undefined && (typeof page.page.nextCursor !== 'string' || !page.page.nextCursor || page.page.nextCursor.length > 16384 || !page.page.hasMore)) throw new ConnectorError('INVALID_RESPONSE', 'The application returned an invalid continuation.');
  return { ...page, fields: page.fields.map(field => ({ ...field })), rows: page.rows.map(row => Array.from(row, cell => normalizeCell(cell))), provenance: { ...page.provenance }, page: { ...page.page }, warnings: [...page.warnings] };
}
export function endpointConnector(config: EndpointOptions): DataConnector<OperationQuery> {
  config = { ...config };
  validateIdentity(config);
  if (typeof config.endpoint !== 'string' || !config.endpoint || config.endpoint.includes('\\')) throw new ConnectorError('INVALID_CONFIG', 'Provide an application endpoint.');
  const relative = config.endpoint.startsWith('/') && !config.endpoint.startsWith('//');
  if (!relative) {
    let url: URL; try { url = new URL(config.endpoint); } catch { throw new ConnectorError('INVALID_CONFIG', 'Provide a relative application path or HTTPS endpoint.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) throw new ConnectorError('INVALID_CONFIG', 'Use an HTTPS application endpoint without credentials, fragments, or query parameters.');
  } else if (/[?#]/.test(config.endpoint)) throw new ConnectorError('INVALID_CONFIG', 'Application endpoint parameters belong in the request body.');
  const fetcher = config.fetch ?? globalThis.fetch;
  return { id: config.id, provider: 'application-endpoint', capabilities: { runtime: 'universal', pagination: 'cursor', cancellation: 'transport', queryLanguage: 'operation' },
    read(query, options) { return runRead(options, async scope => {
      if (!query || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(query.operation)) throw new ConnectorError('INVALID_QUERY', 'Choose a registered application operation.');
      const response = await fetcher(config.endpoint, { method: 'POST', credentials: 'same-origin', redirect: 'error', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ ...query, limit: scope.limit, cursor: scope.cursor }), signal: scope.signal });
      if (!response.ok) { await response.body?.cancel().catch(() => {}); throw new ConnectorError(response.status === 401 || response.status === 403 ? 'AUTHENTICATION' : 'APPLICATION_ERROR', `The application returned HTTP ${response.status}.`); }
      // Bound untrusted application responses as well as provider responses.
      const reader = response.body?.getReader(); if (!reader) throw new ConnectorError('INVALID_RESPONSE', 'The application returned an empty response.');
      const decoder = new TextDecoder(); let text = '', bytes = 0;
      try {
        for (;;) { const next = await reader.read(); if (next.done) break; bytes += next.value.byteLength; if (bytes > 8 * 1024 * 1024) throw new ConnectorError('RESPONSE_TOO_LARGE', 'The application response exceeded 8 MiB.'); text += decoder.decode(next.value, { stream: true }); }
        text += decoder.decode(); const page = validateDataPage(JSON.parse(text));
        if (page.rows.length > scope.limit) throw new ConnectorError('INVALID_RESPONSE', 'The application exceeded the requested page size.');
        return page;
      } catch (error) { await reader.cancel().catch(() => {}); if (error instanceof ConnectorError) throw error; throw new ConnectorError('INVALID_RESPONSE', 'The application returned an invalid data page.'); }
      finally { reader.releaseLock(); }
    }); },
  };
}

/** Explicit key mapping keeps connector tables independent of a particular customer schema. */
export function mapRows<T>(page: DataPage, mapper: (get: (column: number) => Cell, rowIndex: number) => T): T[] {
  return page.rows.map((row, index) => mapper(column => {
    if (!Number.isSafeInteger(column) || column < 0 || column >= page.fields.length) throw new ConnectorError('INVALID_MAPPING', 'A column index is outside the returned schema.');
    return row[column];
  }, index));
}
