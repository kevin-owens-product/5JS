import { assertServerRuntime, makePage, runRead, validateIdentity } from '../core.js';
import type { ConnectorIdentity, DataConnector, FieldType, SqlQuery } from '../types.js';
import { driverFailure, executionWarning, fieldsFrom, parserWarning, resultObject, resultRows, sqlCapabilities, sqlInput } from './driver-support.js';

/** Structural subset of pg's Promise API; the caller owns authentication and pool lifetime. */
export interface PostgresClient {
  query(config: { text: string; values?: unknown[]; rowMode: 'array' }): Promise<unknown>;
}
const types: Record<string, FieldType> = { '16': 'boolean', '17': 'binary', '20': 'integer', '21': 'integer', '23': 'integer', '25': 'string', '700': 'number', '701': 'number', '1042': 'string', '1043': 'string', '1082': 'date', '1083': 'datetime', '1114': 'datetime', '1184': 'datetime', '1266': 'datetime', '1700': 'decimal', '114': 'json', '3802': 'json', '2950': 'string' };

export function postgresConnector(options: ConnectorIdentity & { client: PostgresClient }): DataConnector<SqlQuery> {
  assertServerRuntime(); options = { ...options }; validateIdentity(options);
  return { id: options.id, provider: 'postgresql', capabilities: { ...sqlCapabilities },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      const input = sqlInput(query, cursor); signal.throwIfAborted();
      try {
        const result = resultObject(await options.client.query({ ...input, rowMode: 'array' }));
        signal.throwIfAborted();
        const rows = resultRows(result.rows), metadata = result.fields;
        if (!Array.isArray(metadata)) throw new Error('Invalid field metadata');
        const fields = metadata.map(resultObject);
        return makePage(options, 'postgresql', fieldsFrom(fields.map(field => field.name), rows.slice(0, limit), fields.map(field => field.dataTypeID), type => types[type] ?? 'unknown'), rows.slice(0, limit), {
          hasMore: rows.length > limit, truncated: rows.length > limit, warnings: [executionWarning, parserWarning],
        });
      } catch (error) { return driverFailure(error); }
    }); },
  };
}
