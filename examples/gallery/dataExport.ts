/** RFC-style CSV quoting, plus neutralization of formula-like text for spreadsheet viewers. */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map(row => row.map(value => {
    let text = String(value);
    if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n') + '\r\n';
}
import type { ExampleReadout } from '../types.js';


/** Keep exports rectangular while retaining the period, assumptions and selected controls. */
export function dataCsv(table: ExampleReadout['table'], context: { example: string; notes: string; controls: string }): string {
  const metadata = [context.example, context.notes, table.caption, context.controls];
  return toCsv([['Example', 'Data notes', 'View', 'Controls', ...table.columns], ...table.rows.map(row => [...metadata, ...row])]);
}
