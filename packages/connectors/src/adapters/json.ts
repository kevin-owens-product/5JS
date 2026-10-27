import { ConnectorError, makePage, normalizeCell, runRead, validateIdentity } from '../core.js';
import type { ConnectorIdentity, DataConnector, Field } from '../types.js';
import { boundCursor } from './rest-support.js';

export interface JsonOptions extends ConnectorIdentity { fields: readonly Field[]; rows: readonly (readonly unknown[])[] }

/** Browser-safe immutable snapshot. Cursors are scoped to this connector instance's lifetime. */
export function jsonConnector(options: JsonOptions): DataConnector<void> {
  const identity = { id: options.id, source: options.source, mode: options.mode };
  validateIdentity(identity);
  if (!Array.isArray(options.fields) || options.fields.some(field => !field || typeof field.name !== 'string' || !['string', 'number', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'binary', 'json', 'unknown'].includes(field.type)) || !Array.isArray(options.rows) || options.rows.some(row => !Array.isArray(row) || row.length !== options.fields.length)) throw new ConnectorError('INVALID_CONFIG', 'Provide field metadata and matching positional rows for the JSON snapshot.');
  const fields = options.fields.map(field => ({ ...field }));
  const rows = Array.from(options.rows, (row: readonly unknown[]) => Array.from(row, value => normalizeCell(value)));
  const codec = boundCursor(identity, 'json', crypto.randomUUID());
  return { id: identity.id, provider: 'json', capabilities: { runtime: 'universal', pagination: 'cursor', cancellation: 'cooperative', queryLanguage: 'operation' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      if (query !== undefined) throw new ConnectorError('INVALID_QUERY', 'A JSON snapshot does not accept a query.');
      const offset = codec.decode(cursor) ?? 0;
      if (typeof offset !== 'number' || !Number.isSafeInteger(offset) || offset < 0 || offset > rows.length) throw new ConnectorError('INVALID_CURSOR', 'Invalid JSON snapshot offset.');
      signal.throwIfAborted();
      const end = Math.min(offset + limit, rows.length), hasMore = end < rows.length;
      return makePage(identity, 'json', fields, rows.slice(offset, end), { hasMore, ...(hasMore && { nextCursor: codec.encode(end) }) });
    }); },
  };
}
