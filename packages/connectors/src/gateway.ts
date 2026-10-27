import { assertServerRuntime, ConnectorError, runRead } from './core.js';
import { validateDataPage } from './browser.js';
import type { Cell, DataConnector } from './types.js';

export type Parameter = string | number | boolean | null;
export interface ParameterRule { type: 'string' | 'number' | 'integer' | 'boolean'; required?: boolean; min?: number; max?: number; maxLength?: number; values?: readonly Parameter[] }
export interface AccessContext { subject: string; scope?: Record<string, Cell> }
export interface RegisteredOperation<Query = any> {
  connector: DataConnector<Query>;
  parameters: Record<string, ParameterRule>;
  /** Server-owned query, with authorization context available for tenant binding. */
  query(parameters: Record<string, Parameter>, access: AccessContext): Query;
  maxPageSize?: number;
}
export interface GatewayOptions {
  operations: Record<string, RegisteredOperation>;
  /** Authenticate and authorize every operation/page. Return null to deny access. */
  authorize(request: Request, operation: string): Promise<AccessContext | null> | AccessContext | null;
  timeoutMs?: number;
}
function parameters(input: unknown, rules: Record<string, ParameterRule>): Record<string, Parameter> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ConnectorError('INVALID_PARAMETERS', 'Parameters must be an object.');
  for (const key of Object.keys(input)) if (!Object.hasOwn(rules, key)) throw new ConnectorError('INVALID_PARAMETERS', 'An unregistered parameter was supplied.');
  const result: Record<string, Parameter> = Object.create(null);
  for (const [key, rule] of Object.entries(rules)) {
    const value = (input as Record<string, unknown>)[key];
    if (value === undefined) { if (rule.required !== false) throw new ConnectorError('INVALID_PARAMETERS', 'A required parameter is missing.'); continue; }
    const valid = rule.type === 'string' ? typeof value === 'string' && value.length <= (rule.maxLength ?? 1000) : rule.type === 'boolean' ? typeof value === 'boolean' : typeof value === 'number' && Number.isFinite(value) && (rule.type !== 'integer' || Number.isSafeInteger(value)) && (rule.min === undefined || value >= rule.min) && (rule.max === undefined || value <= rule.max);
    if (!valid || (rule.values && !rule.values.includes(value as Parameter))) throw new ConnectorError('INVALID_PARAMETERS', 'A parameter does not match its registered constraints.');
    result[key] = value as Parameter;
  }
  return result;
}
async function body(request: Request, signal: AbortSignal): Promise<any> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new ConnectorError('INVALID_REQUEST', 'Requests require JSON.');
  const reader = request.body?.getReader(); if (!reader) throw new ConnectorError('INVALID_REQUEST', 'A request body is required.');
  let length = 0, text = ''; const decoder = new TextDecoder();
  const cancel = () => { void reader.cancel().catch(() => {}); }; signal.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.byteLength; if (length > 16384) throw new ConnectorError('INVALID_REQUEST', 'Request body is too large.'); text += decoder.decode(next.value, { stream: true }); }
    signal.throwIfAborted(); text += decoder.decode(); return JSON.parse(text);
  } catch (error) { await reader.cancel().catch(() => {}); if (error instanceof ConnectorError) throw error; throw new ConnectorError('INVALID_REQUEST', 'Invalid JSON request.'); }
  finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });

/** Application adapter, not a public query proxy. Authentication is mandatory and application-owned. */
export function createConnectorGateway(config: GatewayOptions): (request: Request) => Promise<Response> {
  assertServerRuntime();
  if (typeof config.authorize !== 'function') throw new ConnectorError('INVALID_CONFIG', 'A gateway requires an authorization callback.');
  const operations = new Map(Object.entries(config.operations));
  for (const [id, operation] of operations) if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(id) || !operation.connector || typeof operation.query !== 'function' || !Number.isSafeInteger(operation.maxPageSize ?? 1000) || (operation.maxPageSize ?? 1000) < 1 || (operation.maxPageSize ?? 1000) > 5000) throw new ConnectorError('INVALID_CONFIG', 'Invalid registered operation.');
  const cursors = new Map<string, { binding: string; native: string; expires: number }>();
  return async request => {
    if (request.method !== 'POST') return reply({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, 405);
    try {
      return await runRead({ timeoutMs: config.timeoutMs ?? 30000, signal: request.signal }, async scope => {
      const input = await body(request, scope.signal);
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['operation', 'parameters', 'limit', 'cursor'].includes(key)) || typeof input.operation !== 'string') throw new ConnectorError('INVALID_REQUEST', 'Invalid operation request.');
      const operation = operations.get(input.operation);
      if (!operation) return reply({ error: { code: 'UNKNOWN_OPERATION', message: 'Unknown operation.' } }, 404);
      const access = await config.authorize(request, input.operation);
      scope.signal.throwIfAborted();
      if (!access || typeof access.subject !== 'string' || !access.subject) return reply({ error: { code: 'FORBIDDEN', message: 'Access denied.' } }, 403);
      const values = parameters(input.parameters ?? {}, operation.parameters);
      const limit = input.limit ?? operation.maxPageSize ?? 1000;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > (operation.maxPageSize ?? 1000)) throw new ConnectorError('INVALID_LIMIT', 'The page size exceeds the registered operation limit.');
      const binding = JSON.stringify([input.operation, access.subject, access.scope ?? null, values]);
      let cursor: string | undefined;
      if (input.cursor !== undefined) {
        const saved = typeof input.cursor === 'string' ? cursors.get(input.cursor) : undefined;
        if (!saved || saved.expires < Date.now() || saved.binding !== binding) throw new ConnectorError('INVALID_CURSOR', 'The continuation is expired or belongs to another request.');
        cursor = saved.native;
      }
      const page = validateDataPage(await operation.connector.read(operation.query(values, access), { limit, cursor, timeoutMs: config.timeoutMs ?? 30000, signal: scope.signal }));
      if (page.rows.length > limit) throw new ConnectorError('INVALID_RESULT', 'The connector exceeded its page size.');
      if (page.page.nextCursor) {
        for (const [key, value] of cursors) if (value.expires < Date.now()) cursors.delete(key);
        while (cursors.size >= 1000) cursors.delete(cursors.keys().next().value!);
        const token = crypto.randomUUID(); cursors.set(token, { binding, native: page.page.nextCursor, expires: Date.now() + 15 * 60 * 1000 });
        page.page.nextCursor = token;
      }
      return reply(page);
      });
    } catch (error) {
      const code = error instanceof ConnectorError && /^[A-Z_]{1,40}$/.test(error.code) ? error.code : 'APPLICATION_ERROR';
      const status = code.startsWith('INVALID_') ? 400 : code === 'TIMEOUT' ? 504 : code === 'ABORTED' ? 499 : 502;
      return reply({ error: { code, message: 'The data request could not be completed. Check the operation, access, and server configuration.' } }, status);
    }
  };
}
