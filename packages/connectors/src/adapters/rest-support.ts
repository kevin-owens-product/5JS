import { ConnectorError } from '../core.js';
import type { ConnectorCapabilities, ConnectorIdentity } from '../types.js';

export const restCapabilities: ConnectorCapabilities = { runtime: 'server', pagination: 'cursor', cancellation: 'transport', queryLanguage: 'rest' };
export const changingListWarning = 'Provider lists can change between requests; pagination does not guarantee a consistent snapshot.';

export function objectResult(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorError('INVALID_RESPONSE', 'The source returned an invalid response shape.');
  return value as Record<string, unknown>;
}

export function recordList(value: unknown, limit: number): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > limit) throw new ConnectorError('INVALID_RESPONSE', 'The source returned an invalid or oversized page.');
  return value.map(objectResult);
}

export function nonemptyString(value: unknown, maxLength = 2048): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/.test(value);
}

/** Cursors are continuation state, never authorization; server operations must own allowed queries. */
export function boundCursor(identity: ConnectorIdentity, provider: string, query: unknown) {
  const binding = JSON.stringify([identity.id, identity.source, provider, query]);
  // Reserve space for a maximum-size (2,048 character) native cursor, including
  // JSON escaping, within runRead's 16,384-character cursor limit.
  if (JSON.stringify(binding).length > 12_000) throw new ConnectorError('INVALID_QUERY', 'The source and query exceed the continuation binding size limit. Select fewer or shorter fields.');
  return {
    encode(value: string | number): string { return JSON.stringify({ version: 1, binding, value }); },
    decode(cursor: string | undefined): string | number | undefined {
      if (cursor === undefined) return undefined;
      try {
        const parsed = objectResult(JSON.parse(cursor));
        if (parsed.version !== 1 || parsed.binding !== binding || !(typeof parsed.value === 'string' || typeof parsed.value === 'number')) throw new Error();
        return parsed.value;
      } catch { throw new ConnectorError('INVALID_CURSOR', 'The continuation cursor does not match this source and query.'); }
    },
  };
}

export function nativeCursor(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (!nonemptyString(value)) throw new ConnectorError('INVALID_CURSOR', 'Invalid provider continuation cursor.');
  return value;
}

export function selectedNames(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 100 || !value.every(name => nonemptyString(name, 128)) || new Set(value).size !== value.length) throw new ConnectorError('INVALID_QUERY', 'Select at most 100 distinct property or field names.');
  return [...value].sort();
}

export function checkContinuation(next: string | undefined, previous: string | undefined, rowCount: number): void {
  if (next !== undefined && (!nonemptyString(next) || next === previous || rowCount === 0)) throw new ConnectorError('INVALID_RESPONSE', 'The source returned a nonprogressing continuation cursor.');
}
