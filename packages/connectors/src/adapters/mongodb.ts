import { assertServerRuntime, ConnectorError, makePage, runRead, validateIdentity } from '../core.js';
import type { ConnectorIdentity, DataConnector } from '../types.js';
import { driverFailure } from './driver-support.js';

export interface MongoCursor { toArray(): Promise<unknown[]>; close(): Promise<void> }
export interface MongoCollection {
  find(filter: Record<string, unknown>, options: { projection?: Record<string, 0 | 1>; sort?: Record<string, 1 | -1>; limit: number; maxTimeMS: number; signal: AbortSignal; promoteLongs: false }): MongoCursor;
}
export interface MongoQuery { filter?: Record<string, unknown>; projection?: Record<string, 0 | 1>; sort?: Record<string, 1 | -1> }
export interface MongoOptions extends ConnectorIdentity {
  collection: MongoCollection;
  /** Pass BSON.EJSON.serialize from the official mongodb/bson package. */
  serialize(document: unknown, options: { relaxed: false }): unknown;
  /** Provider execution budget, in addition to the caller's transport timeout. */
  maxTimeMS?: number;
}

export function mongodbConnector(options: MongoOptions): DataConnector<MongoQuery> {
  assertServerRuntime(); options = { ...options }; validateIdentity(options); const maxTimeMS = options.maxTimeMS ?? 30_000;
  if (!Number.isInteger(maxTimeMS) || maxTimeMS < 1 || maxTimeMS > 120_000 || typeof options.serialize !== 'function') throw new ConnectorError('INVALID_CONFIG', 'MongoDB requires a BSON serializer and a maxTimeMS between 1 and 120000.');
  return { id: options.id, provider: 'mongodb', capabilities: { runtime: 'server', pagination: 'none', cancellation: 'transport', queryLanguage: 'document' },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      if (cursor !== undefined) throw new ConnectorError('UNSUPPORTED_CURSOR', 'The MongoDB snapshot adapter does not expose continuation cursors.');
      if (!query || typeof query !== 'object' || Array.isArray(query) || (query.filter !== undefined && (!query.filter || typeof query.filter !== 'object' || Array.isArray(query.filter)))) throw new ConnectorError('INVALID_QUERY', 'MongoDB requires a document filter.');
      let result: MongoCursor | undefined;
      try {
        signal.throwIfAborted();
        result = options.collection.find(query.filter ?? {}, { projection: query.projection, sort: query.sort, limit: limit + 1, maxTimeMS, signal, promoteLongs: false });
        const documents = await result.toArray(); signal.throwIfAborted();
        if (!Array.isArray(documents)) throw new Error('Invalid MongoDB result');
        return makePage(options, 'mongodb', [{ name: 'document', type: 'json', nativeType: 'BSON Extended JSON (canonical)' }], documents.slice(0, limit).map(document => [options.serialize(document, { relaxed: false })]), {
          hasMore: documents.length > limit, truncated: documents.length > limit,
          warnings: ['Documents use canonical Extended JSON so ObjectId, Decimal128, Int64, and dates retain their BSON meaning. Map fields explicitly for visualizations. A truncated snapshot requires a narrower query; no stable continuation is implied.'],
        });
      } catch (error) { return driverFailure(error); }
      finally { if (result) { try { await result.close(); } catch { /* Preserve the read outcome; the caller owns the client. */ } } }
    }); },
  };
}
