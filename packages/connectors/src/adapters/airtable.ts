import { ConnectorError, makePage, runRead } from '../core.js';
import { createHttpClient } from '../http.js';
import type { DataConnector, Field, HttpOptions } from '../types.js';
import { boundCursor, changingListWarning, checkContinuation, nativeCursor, nonemptyString, objectResult, recordList, restCapabilities, selectedNames } from './rest-support.js';

export interface AirtableOptions extends HttpOptions { baseId: string; tableId: string }
export interface AirtableQuery { view?: string; fields?: string[] }
const fields: Field[] = [{ name: 'id', type: 'string' }, { name: 'createdTime', type: 'datetime' }, { name: 'fields', type: 'json' }, { name: 'record', type: 'json' }];
const omittedFieldsWarning = 'Airtable omits empty fields, including false and empty arrays. Missing properties are preserved; their original empty value cannot be recovered from this API.';

/** Read records from one server-owned base/table, retaining Airtable's field omission semantics. */
export function airtableConnector(options: AirtableOptions): DataConnector<AirtableQuery> {
  if (!/^app[A-Za-z0-9]+$/.test(options.baseId) || !/^tbl[A-Za-z0-9]+$/.test(options.tableId)) throw new ConnectorError('INVALID_CONFIG', 'Provide Airtable base and table IDs, not names or URLs.');
  const identity = { id: options.id, source: options.source, mode: options.mode };
  const baseId = options.baseId, tableId = options.tableId;
  const http = createHttpClient({ ...options, baseUrl: 'https://api.airtable.com' });
  return { id: identity.id, provider: 'airtable', capabilities: { ...restCapabilities },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      if (!query || (query.view !== undefined && !nonemptyString(query.view, 128)) || Object.keys(query).some(key => !['view', 'fields'].includes(key))) throw new ConnectorError('INVALID_QUERY', 'Provide Airtable list options with an optional view and selected fields.');
      const selected = selectedNames(query.fields), view = query.view, size = Math.min(limit, 100);
      const codec = boundCursor(identity, 'airtable', [baseId, tableId, view ?? null, selected ?? null]);
      const offset = nativeCursor(codec.decode(cursor));
      const parameters = new URLSearchParams({ pageSize: String(size) });
      if (view) parameters.set('view', view);
      for (const field of selected ?? []) parameters.append('fields[]', field);
      if (offset) parameters.set('offset', offset);
      const result = objectResult(await http.request(`/v0/${baseId}/${tableId}?${parameters}`, { signal }));
      const records = recordList(result.records, size);
      for (const record of records) {
        if (!nonemptyString(record.id) || !nonemptyString(record.createdTime)) throw new ConnectorError('INVALID_RESPONSE', 'Airtable returned invalid record metadata.');
        objectResult(record.fields);
      }
      const next = result.offset;
      if (next !== undefined && !nonemptyString(next)) throw new ConnectorError('INVALID_RESPONSE', 'Airtable returned an invalid continuation cursor.');
      checkContinuation(next as string | undefined, offset, records.length);
      return makePage(identity, 'airtable', fields, records.map(record => [record.id, record.createdTime, record.fields, record]), {
        hasMore: next !== undefined, ...(typeof next === 'string' && { nextCursor: codec.encode(next) }), warnings: [changingListWarning, omittedFieldsWarning],
      });
    }); },
  };
}
