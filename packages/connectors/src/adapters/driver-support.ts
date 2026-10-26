import { ConnectorError, inferFields } from '../core.js';
import type { ConnectorCapabilities, Field, FieldType, SqlQuery } from '../types.js';

export const sqlCapabilities: ConnectorCapabilities = { runtime: 'server', pagination: 'none', cancellation: 'cooperative', queryLanguage: 'sql' };
export const executionWarning = 'The row limit bounds returned data, not database work. Configure a least-privilege account, a provider statement timeout, and a bounded server-owned query.';
export const parserWarning = 'Precision depends on driver configuration. Request decimal, large-integer, and high-precision timestamp values as strings before the driver parses them.';

export function sqlInput(query: SqlQuery, cursor?: string): { text: string; values?: unknown[] } {
  if (cursor !== undefined) throw new ConnectorError('UNSUPPORTED_CURSOR', 'This driver adapter does not support continuation cursors.');
  if (!query || typeof query.text !== 'string' || !query.text.trim() || (query.values !== undefined && !Array.isArray(query.values))) throw new ConnectorError('INVALID_QUERY', 'A nonempty SQL statement and optional positional values are required.');
  return { text: query.text, ...(query.values && { values: [...query.values] }) };
}

export function resultObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorError('INVALID_RESULT', 'The driver did not return one tabular result.');
  return value as Record<string, unknown>;
}

export function resultRows(value: unknown): unknown[][] {
  if (!Array.isArray(value) || !value.every(Array.isArray)) throw new ConnectorError('INVALID_RESULT', 'The driver must return positional array rows.');
  return value;
}

export function fieldsFrom(names: unknown[], rows: unknown[][], nativeTypes: unknown[], resolve: (type: string) => FieldType): Field[] {
  if (!names.every(name => typeof name === 'string') || names.length !== nativeTypes.length) throw new ConnectorError('INVALID_RESULT', 'The driver returned invalid field metadata.');
  return inferFields(names as string[], rows).map((field, index) => {
    const nativeType = nativeTypes[index] == null ? undefined : String(nativeTypes[index]);
    const known = nativeType === undefined ? 'unknown' : resolve(nativeType);
    return { ...field, ...(known !== 'unknown' && { type: known }), ...(nativeType && { nativeType }) };
  });
}

export function namedSqlType(type: string): FieldType {
  const value = type.toUpperCase();
  if (/\[|\]|STRUCT|MAP|UNION|JSON|LIST|ARRAY/.test(value)) return 'json';
  if (/DECIMAL|NUMERIC/.test(value)) return 'decimal';
  if (/^(?:U?TINYINT|U?SMALLINT|U?INTEGER|U?BIGINT|U?HUGEINT|INT[248]?)$/.test(value)) return 'integer';
  if (/DOUBLE|REAL|FLOAT/.test(value)) return 'number';
  if (/BOOL/.test(value)) return 'boolean';
  if (/TIMESTAMP|DATETIME|TIME/.test(value)) return 'datetime';
  if (/DATE/.test(value)) return 'date';
  if (/BLOB|BINARY|BYTEA/.test(value)) return 'binary';
  if (/CHAR|TEXT|UUID|ENUM/.test(value)) return 'string';
  return 'unknown';
}

export function driverFailure(error: unknown): never {
  if (error instanceof ConnectorError) throw error;
  // Driver errors can include SQL, connection strings, hostnames, and secrets.
  throw new ConnectorError('PROVIDER_ERROR', 'The configured database driver could not complete the read.');
}
