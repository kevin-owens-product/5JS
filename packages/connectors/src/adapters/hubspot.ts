import { ConnectorError, makePage, runRead } from '../core.js';
import { createHttpClient } from '../http.js';
import type { DataConnector, Field, HttpOptions } from '../types.js';
import { boundCursor, changingListWarning, checkContinuation, nativeCursor, nonemptyString, objectResult, recordList, restCapabilities, selectedNames } from './rest-support.js';

const objects = ['contacts', 'companies', 'deals', 'tickets', 'products', 'line_items'] as const;
export type HubSpotObject = typeof objects[number];
export interface HubSpotQuery { object: HubSpotObject; properties?: string[]; archived?: boolean }
const fields: Field[] = [
  { name: 'id', type: 'string' }, { name: 'properties', type: 'json' },
  { name: 'createdAt', type: 'datetime' }, { name: 'updatedAt', type: 'datetime' },
  { name: 'archived', type: 'boolean' }, { name: 'record', type: 'json' },
];

/** CRM v3 list API; properties remain an object so absent values are distinct from null. */
export function hubspotConnector(options: HttpOptions): DataConnector<HubSpotQuery> {
  const identity = { id: options.id, source: options.source, mode: options.mode };
  const http = createHttpClient({ ...options, baseUrl: 'https://api.hubapi.com' });
  return { id: identity.id, provider: 'hubspot', capabilities: { ...restCapabilities },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      if (!query || !objects.includes(query.object) || (query.archived !== undefined && typeof query.archived !== 'boolean') || Object.keys(query).some(key => !['object', 'properties', 'archived'].includes(key))) throw new ConnectorError('INVALID_QUERY', 'Choose a supported HubSpot object and list options.');
      const properties = selectedNames(query.properties);
      if (properties?.some(property => property.includes(','))) throw new ConnectorError('INVALID_QUERY', 'HubSpot property names cannot include commas.');
      const object = query.object, archived = query.archived ?? false, size = Math.min(limit, 100);
      const codec = boundCursor(identity, 'hubspot', [object, archived, properties ?? null]);
      const after = nativeCursor(codec.decode(cursor));
      const parameters = new URLSearchParams({ limit: String(size), archived: String(archived) });
      if (properties?.length) parameters.set('properties', properties.join(','));
      if (after) parameters.set('after', after);
      const result = objectResult(await http.request(`/crm/v3/objects/${object}?${parameters}`, { signal }));
      const records = recordList(result.results, size);
      for (const record of records) {
        if (!nonemptyString(record.id) || !nonemptyString(record.createdAt) || !nonemptyString(record.updatedAt) || typeof record.archived !== 'boolean') throw new ConnectorError('INVALID_RESPONSE', 'HubSpot returned invalid record metadata.');
        objectResult(record.properties);
      }
      let next: string | undefined;
      if (result.paging !== undefined) {
        const paging = objectResult(result.paging);
        if (paging.next !== undefined) {
          const nextPage = objectResult(paging.next);
          if (!nonemptyString(nextPage.after)) throw new ConnectorError('INVALID_RESPONSE', 'HubSpot returned an invalid continuation cursor.');
          next = nextPage.after;
        }
      }
      checkContinuation(next, after, records.length);
      return makePage(identity, 'hubspot', fields, records.map(record => [record.id, record.properties, record.createdAt, record.updatedAt, record.archived, record]), {
        hasMore: next !== undefined, ...(next && { nextCursor: codec.encode(next) }), warnings: [changingListWarning],
      });
    }); },
  };
}
