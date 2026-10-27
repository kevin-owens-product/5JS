import { assertServerRuntime, ConnectorError, makePage, runRead, validateIdentity } from '../core.js';
import type { ConnectorIdentity, DataConnector, SqlQuery } from '../types.js';
import { driverFailure, fieldsFrom, namedSqlType, resultRows, sqlCapabilities, sqlInput } from './driver-support.js';

/** Node DatabaseSync on Node 22.16+ or an equivalent positional-row driver. */
export interface SqliteClient { prepare(sql: string): unknown }
interface SqliteStatement {
  columns(): { name: string; type?: string | null }[];
  setReturnArrays(enabled: boolean): void;
  setReadBigInts(enabled: boolean): void;
  iterate(...values: unknown[]): IterableIterator<unknown[]>;
}

export function sqliteConnector(options: ConnectorIdentity & { client: SqliteClient }): DataConnector<SqlQuery> {
  assertServerRuntime(); options = { ...options }; validateIdentity(options);
  return { id: options.id, provider: 'sqlite', capabilities: { ...sqlCapabilities },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      const input = sqlInput(query, cursor); signal.throwIfAborted();
      try {
        const statement = options.client.prepare(input.text) as Partial<SqliteStatement>;
        if (!statement || typeof statement.columns !== 'function' || typeof statement.setReturnArrays !== 'function' || typeof statement.setReadBigInts !== 'function' || typeof statement.iterate !== 'function') throw new ConnectorError('UNSUPPORTED_DRIVER', 'SQLite requires positional rows, field metadata, and BigInt reads (node:sqlite on Node 22.16 or newer).');
        statement.setReturnArrays(true); statement.setReadBigInts(true);
        const metadata = statement.columns(), rows: unknown[][] = [];
        // Breaking a for-of loop invokes iterator.return(), releasing the active statement execution.
        for (const row of statement.iterate(...(input.values ?? []))) {
          signal.throwIfAborted(); rows.push(row);
          if (rows.length > limit) break;
        }
        resultRows(rows);
        return makePage(options, 'sqlite', fieldsFrom(metadata.map(field => field.name), rows.slice(0, limit), metadata.map(field => field.type), namedSqlType), rows.slice(0, limit), {
          hasMore: rows.length > limit, truncated: rows.length > limit,
          warnings: ['SQLite runs synchronously: AbortSignal and JavaScript timeouts cannot interrupt a running statement. Use bounded server-owned queries and a read-only database connection. SQLite REAL values already use binary floating-point.'],
        });
      } catch (error) { return driverFailure(error); }
    }); },
  };
}
