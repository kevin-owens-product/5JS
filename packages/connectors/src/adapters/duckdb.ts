import { assertServerRuntime, ConnectorError, makePage, runRead, validateIdentity } from '../core.js';
import type { ConnectorIdentity, DataConnector, SqlQuery } from '../types.js';
import { driverFailure, executionWarning, fieldsFrom, namedSqlType, resultRows, sqlCapabilities, sqlInput } from './driver-support.js';

export interface DuckDBReader {
  columnNames(): string[];
  columnTypes(): { toString(): string }[];
  getRowsJson(): unknown[][];
  readonly done: boolean;
  /** Releases this result without closing the caller-owned connection. */
  closeSync?(): void;
}
/** Official @duckdb/node-api (Neo), not the older callback-based duckdb package. */
export type DuckDBBindValue = null | boolean | number | bigint | string;
export interface DuckDBClient {
  runAndReadUntil(sql: string, targetRowCount: number, values?: DuckDBBindValue[]): Promise<DuckDBReader>;
}

export function duckdbConnector(options: ConnectorIdentity & { client: DuckDBClient }): DataConnector<SqlQuery> {
  assertServerRuntime(); options = { ...options }; validateIdentity(options);
  return { id: options.id, provider: 'duckdb', capabilities: { ...sqlCapabilities },
    read(query, readOptions) { return runRead(readOptions, async ({ limit, cursor, signal }) => {
      const input = sqlInput(query, cursor); signal.throwIfAborted();
      if (input.values?.some(value => value !== null && !['boolean', 'number', 'bigint', 'string'].includes(typeof value))) throw new ConnectorError('INVALID_QUERY', 'DuckDB connector bindings support null, boolean, number, bigint, and string values. Bind complex values through an application-owned operation.');
      let reader: DuckDBReader | undefined;
      try {
        reader = await options.client.runAndReadUntil(input.text, limit + 1, input.values as DuckDBBindValue[] | undefined);
        signal.throwIfAborted();
        // DuckDB's JSON conversion keeps DECIMAL, BIGINT and high-precision time values as strings.
        const rows = resultRows(reader.getRowsJson()), truncated = rows.length > limit || !reader.done;
        return makePage(options, 'duckdb', fieldsFrom(reader.columnNames(), rows.slice(0, limit), reader.columnTypes().map(type => type.toString()), namedSqlType), rows.slice(0, limit), {
          hasMore: truncated, truncated, warnings: [executionWarning, 'DuckDB reads in vector-sized chunks and may retrieve more rows than requested. The caller owns the connection; this adapter does not interrupt shared work or close it.'],
        });
      } catch (error) { return driverFailure(error); }
      finally { if (reader?.closeSync) { try { reader.closeSync(); } catch { /* Preserve the read outcome; never close the caller's connection. */ } } }
    }); },
  };
}
