import { assertServerRuntime, makePage, runRead, validateIdentity } from '../core.js';
import type { ConnectorIdentity, DataConnector, FieldType, SqlQuery } from '../types.js';
import { driverFailure, executionWarning, fieldsFrom, parserWarning, resultObject, resultRows, sqlCapabilities, sqlInput } from './driver-support.js';

/** mysql2/promise supports MySQL and MariaDB servers. Its caller-owned connection must disable multipleStatements. */
export interface MysqlClient {
  execute(config: { sql: string; values?: unknown[]; rowsAsArray: true }): Promise<unknown>;
}
const types: Record<string, FieldType> = { '0': 'decimal', '1': 'integer', '2': 'integer', '3': 'integer', '4': 'number', '5': 'number', '7': 'datetime', '8': 'integer', '9': 'integer', '10': 'date', '11': 'datetime', '12': 'datetime', '13': 'integer', '15': 'string', '16': 'binary', '245': 'json', '246': 'decimal', '247': 'string', '248': 'string', '253': 'string', '254': 'string' };

export function mysqlConnector(options: ConnectorIdentity & { client: MysqlClient; provider?: 'mysql' | 'mariadb' }): DataConnector<SqlQuery> {
  assertServerRuntime(); options = { ...options }; validateIdentity(options); const provider = options.provider ?? 'mysql';
  return { id: options.id, provider, capabilities: { ...sqlCapabilities },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      const input = sqlInput(query, cursor); signal.throwIfAborted();
      try {
        const result = await options.client.execute({ sql: input.text, values: input.values, rowsAsArray: true });
        signal.throwIfAborted();
        if (!Array.isArray(result) || result.length !== 2 || !Array.isArray(result[1])) throw new Error('Invalid MySQL result');
        const rows = resultRows(result[0]), fields = result[1].map(resultObject);
        const normalizedFields = fieldsFrom(fields.map(field => field.name), rows.slice(0, limit), fields.map(field => field.columnType), type => types[type] ?? 'unknown');
        for (let index = 0; index < fields.length; index++) {
          if ([249, 250, 251, 252].includes(Number(fields[index].columnType)) && fields[index].characterSet === 63) normalizedFields[index].type = 'binary';
        }
        return makePage(options, provider, normalizedFields, rows.slice(0, limit), {
          hasMore: rows.length > limit, truncated: rows.length > limit, warnings: [executionWarning, parserWarning],
        });
      } catch (error) { return driverFailure(error); }
    }); },
  };
}
