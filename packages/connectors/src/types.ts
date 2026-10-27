export type Cell = null | boolean | number | string | Cell[] | { [key: string]: Cell };
export type FieldType = 'string' | 'number' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'binary' | 'json' | 'unknown';
export interface Field { name: string; type: FieldType; nativeType?: string; nullable?: boolean }
export interface Provenance {
  connectorId: string;
  provider: string;
  /** A public source label, never a URL containing credentials or raw query text. */
  source: string;
  fetchedAt: string;
  mode: 'live' | 'fixture';
  queryId?: string;
}
export interface DataPage {
  fields: Field[];
  /** Positional rows preserve duplicate field names and exact column order. */
  rows: Cell[][];
  provenance: Provenance;
  page: { hasMore: boolean; nextCursor?: string; truncated: boolean };
  warnings: string[];
}
export interface ReadOptions {
  /** Result rows per page; this does not necessarily bound provider execution cost. */
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}
export interface ConnectorCapabilities {
  runtime: 'server' | 'universal';
  pagination: 'cursor' | 'none';
  cancellation: 'transport' | 'cooperative';
  queryLanguage: 'sql' | 'document' | 'rest' | 'operation';
}
export interface DataConnector<Query> {
  readonly id: string;
  readonly provider: string;
  readonly capabilities: ConnectorCapabilities;
  read(query: Query, options?: ReadOptions): Promise<DataPage>;
}
export interface ConnectorIdentity { id: string; source: string; mode?: 'live' | 'fixture' }
export interface SqlQuery { text: string; values?: readonly unknown[] }
export type AccessToken = () => string | Promise<string>;
export interface HttpOptions extends ConnectorIdentity {
  token: AccessToken;
  fetch?: typeof globalThis.fetch;
}
