import test from 'node:test';
import assert from 'node:assert/strict';
import { arrowConnector, csvConnector, parquetConnector } from '../packages/connectors/src/adapters/files.js';
import type { ArrowTable } from '../packages/connectors/src/adapters/files.js';
import { collectPages, ConnectorError } from '../packages/connectors/src/core.js';

const identity = { id: 'file-test', source: 'Supplied table', mode: 'fixture' as const };
const code = (expected: string) => (error: unknown) => error instanceof ConnectorError && error.code === expected;
function table(names: string[], types: string[], rows: unknown[][]): ArrowTable {
  return { numRows: rows.length, schema: { fields: names.map((name, index) => ({ name, type: { toString: () => types[index] }, nullable: true })) }, getChildAt: column => ({ get: row => rows[row][column] }) };
}

test('CSV parses RFC quoting, BOM, embedded CRLF, duplicate names, empty values, and exact numeric strings', async () => {
  const connector = csvConnector({ ...identity, data: '\uFEFFid,id,note,empty\r\n9007199254740993,0.123456789123456789,"line 1\r\nline ""2"", comma",\r\n2,3," spaced ",""\r\n' });
  const result = await collectPages(connector, undefined, { limit: 1 });
  assert.deepEqual(result.fields.map(field => field.name), ['id', 'id', 'note', 'empty']);
  assert.deepEqual(result.rows, [['9007199254740993', '0.123456789123456789', 'line 1\r\nline "2", comma', ''], ['2', '3', ' spaced ', '']]);
  assert.equal(result.provenance.provider, 'csv'); assert.equal(result.provenance.mode, 'fixture'); assert.equal(result.page.truncated, false);
});

test('CSV explicit columns, delimiter, immutable snapshot and row caps have truthful continuation', async () => {
  const input = new TextEncoder().encode('one\t1\ntwo\t2\nthree\t3');
  const config = { ...identity, data: input, delimiter: '\t' as const, columns: ['name', 'value'], maxRows: 2 };
  const connector = csvConnector(config); input.fill(0); config.source = 'Changed'; config.columns[0] = 'Changed';
  const result = await collectPages(connector, undefined, { limit: 1 });
  assert.deepEqual(result.rows, [['one', '1'], ['two', '2']]); assert.equal(result.fields[0].name, 'name');
  assert.equal(result.provenance.source, identity.source); assert.equal(result.page.truncated, true); assert.equal(result.page.hasMore, false);
  assert.match(result.warnings.join(' '), /cannot recover/);
  const first = await connector.read(undefined, { limit: 1 });
  await assert.rejects(csvConnector({ ...identity, data: 'a\nx\ny' }).read(undefined, { cursor: first.page.nextCursor }), code('INVALID_CURSOR'));
});

test('CSV rejects malformed quoting, inconsistent widths, invalid UTF-8, invalid limits, and oversized inputs', () => {
  for (const data of ['a,b\n1', 'a\n"unterminated', 'a\nun"quoted', 'a\n"quoted"tail', 'a\nx\0y', '']) assert.throws(() => csvConnector({ ...identity, data }), code('INVALID_FILE'));
  assert.throws(() => csvConnector({ ...identity, data: new Uint8Array([0xff]) }), code('INVALID_FILE'));
  assert.throws(() => csvConnector({ ...identity, data: 'a\n1234', maxBytes: 3 }), code('FILE_TOO_LARGE'));
  assert.throws(() => csvConnector({ ...identity, data: 'a', maxRows: 0 }), code('INVALID_CONFIG'));
  assert.throws(() => csvConnector({ ...identity, data: 'a', columns: Array(1) }), code('INVALID_FILE'));
});

test('Arrow reads positional official table vectors once and preserves INT64, binary, null and duplicate columns', async () => {
  let calls = 0;
  const source = table(['same', 'same', 'binary'], ['Int64', 'Utf8', 'Binary'], [[9007199254740993n, 'one', new Uint8Array([0, 255])], [2n, null, new Uint8Array()]]);
  const data = new Uint8Array([1, 2]);
  const connector = arrowConnector({ ...identity, data, tableFromIPC(bytes) { calls++; assert.deepEqual([...bytes], [1, 2]); return source; } });
  data.fill(0);
  const result = await collectPages(connector, undefined, { limit: 1 });
  assert.deepEqual(result.rows, [['9007199254740993', 'one', '0x00ff'], ['2', null, '0x']]); assert.equal(calls, 1);
  assert.deepEqual(result.fields.map(field => field.name), ['same', 'same', 'binary']); assert.equal(result.provenance.provider, 'arrow');
});

test('Arrow never guesses lossless temporal/decimal conversion and permits caller decoding from raw vectors', async () => {
  const source = table(['at', 'amount'], ['Timestamp<NANOSECOND>', 'Decimal[38e+18]'], [[1712345678123456789n, 123456789123456789n]]);
  const options = { ...identity, data: new Uint8Array(), tableFromIPC: () => source };
  await assert.rejects(arrowConnector(options).read(), code('UNSUPPORTED_TYPE'));
  const result = await arrowConnector({ ...options, decodeCell(vector, row, field) { const raw = vector.get(row) as bigint; return field.name === 'at' ? raw.toString() : `0.${raw}`; } }).read();
  assert.deepEqual(result.rows, [['1712345678123456789', '0.123456789123456789']]);
  assert.deepEqual(result.fields.map(field => field.type), ['datetime', 'decimal']);
  await assert.rejects(arrowConnector({ ...options, decodeCell: () => Number.MAX_SAFE_INTEGER + 1 }).read(), code('PRECISION_LOSS'));
});

test('Arrow supports dictionary-encoded primitive values and caps retained rows without hiding truncation', async () => {
  const source = table(['name'], ['Dictionary<Int32, Utf8>'], [['one'], ['two']]);
  source.schema.fields[0].type.dictionary = { toString: () => 'Utf8' };
  const result = await arrowConnector({ ...identity, data: new Uint8Array(), maxRows: 1, tableFromIPC: () => source }).read();
  assert.deepEqual(result.rows, [['one']]); assert.equal(result.fields[0].type, 'string'); assert.equal(result.page.truncated, true);
});

test('Parquet uses bounded parquet-wasm decoding, consumes its owned table exactly once, and preserves Arrow results', async () => {
  let freed = 0, consumed = 0, calls = 0;
  const connector = parquetConnector({ ...identity, data: new Uint8Array([80, 65, 82, 49]), maxRows: 1,
    readParquet(bytes, options) { calls++; assert.deepEqual([...bytes], [80, 65, 82, 49]); assert.equal(options.limit, 2); return { intoIPCStream() { consumed++; return new Uint8Array([9]); }, free() { freed++; } }; },
    tableFromIPC(bytes) { assert.equal(bytes[0], 9); return table(['id'], ['Int64'], [[9007199254740993n], [2n]]); },
  });
  const result = await connector.read();
  assert.deepEqual(result.rows, [['9007199254740993']]); assert.equal(result.provenance.provider, 'parquet'); assert.equal(result.page.truncated, true);
  assert.equal(calls, 1); assert.equal(consumed, 1); assert.equal(freed, 0, 'intoIPCStream already frees the wasm table');
});

test('file readers sanitize failures, free failed wasm conversion, and never start on pre-abort', async () => {
  let freed = 0, calls = 0;
  await assert.rejects(parquetConnector({ ...identity, data: new Uint8Array(), readParquet: () => ({ intoIPCStream() { throw Error('private file content'); }, free() { freed++; } }), tableFromIPC: () => table(['id'], ['Int64'], []) }).read(), error => code('INVALID_FILE')(error) && !String(error).includes('private'));
  assert.equal(freed, 1);
  const connector = arrowConnector({ ...identity, data: new Uint8Array(), tableFromIPC() { calls++; return table(['id'], ['Int64'], []); } });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(connector.read(undefined, { signal: controller.signal }), code('ABORTED')); assert.equal(calls, 0);
  await assert.rejects(arrowConnector({ ...identity, data: new Uint8Array(), tableFromIPC: () => new Promise(() => {}) }).read(undefined, { timeoutMs: 5 }), code('TIMEOUT'));
});

test('wide Arrow results are rejected before materializing more than one million normalized cells', async () => {
  let readCells = 0;
  const source: ArrowTable = { numRows: 100_000, schema: { fields: Array.from({ length: 11 }, (_, index) => ({ name: `field-${index}`, type: { toString: () => 'Int32' } })) }, getChildAt: () => ({ get() { readCells++; return 0; } }) };
  await assert.rejects(arrowConnector({ ...identity, data: new Uint8Array(), tableFromIPC: () => source }).read(), code('FILE_TOO_LARGE'));
  assert.equal(readCells, 0);
});
