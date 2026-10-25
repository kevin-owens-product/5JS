import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';

export const CORRELATION_VARIABLES = ['Visits', 'Signups', 'Revenue $', 'Latency ms', 'Satisfaction', 'Uptime %'] as const;
export interface CorrelationObservation { date: string; values: number[] }
export interface CorrelationCell { a: number; b: number; coefficient: number | null; n: number }

export function createCorrelationData(): CorrelationObservation[] {
  return Array.from({ length: 36 }, (_, i) => {
    const visits = 800 + i * 17 + (i * 7 % 11) * 24;
    const signups = Math.round(visits * 0.065 + i % 4 * 3 - 4);
    const latency = 180 + visits * 0.13 + (i * 3 % 9) * 7;
    return { date: new Date(Date.UTC(2026, 4, 26 + i)).toISOString().slice(0, 10),
      values: [visits, signups, 2000 + signups * 35 + (i * 11 % 7) * 70, latency, Math.round(100 - latency / 9 + (i * 5 % 7) - 3), 99.9] };
  });
}

/** Pearson's product-moment r; undefined for n<2 or an exactly constant variable. */
export function pearson(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length) throw new RangeError('Paired samples must have equal lengths.');
  if (![...x, ...y].every(Number.isFinite)) throw new RangeError('Pearson samples must be finite.');
  if (x.length < 2 || x.every(value => value === x[0]) || y.every(value => value === y[0])) return null;
  // Scaling leaves Pearson r unchanged and avoids overflow/underflow in moments.
  const scaleX = x.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
  const scaleY = y.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
  const normalizedX = x.map(value => value / scaleX), normalizedY = y.map(value => value / scaleY);
  const meanX = normalizedX.reduce((sum, value) => sum + value, 0) / x.length;
  const meanY = normalizedY.reduce((sum, value) => sum + value, 0) / y.length;
  let xx = 0, yy = 0, xy = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = normalizedX[i] - meanX, dy = normalizedY[i] - meanY;
    xx += dx * dx; yy += dy * dy; xy += dx * dy;
  }
  const denominator = Math.sqrt(xx * yy);
  return denominator ? Math.max(-1, Math.min(1, xy / denominator)) : null;
}

/** Unique pairs, including the diagonal; the chart mirrors off-diagonal cells. */
export function correlationCells(data: readonly CorrelationObservation[], days: number, minimumMagnitude: number): CorrelationCell[] {
  const rows = data.slice(-days), result: CorrelationCell[] = [];
  for (let a = 0; a < CORRELATION_VARIABLES.length; a++) {
    for (let b = a; b < CORRELATION_VARIABLES.length; b++) {
      const coefficient = pearson(rows.map(row => row.values[a]), rows.map(row => row.values[b]));
      if (coefficient === null || Math.abs(coefficient) >= minimumMagnitude) result.push({ a, b, coefficient, n: rows.length });
    }
  }
  return result;
}

const example: ExampleDefinition = {
  id: 'correlation-matrix', title: 'Correlation matrix', category: 'Analytics',
  summary: 'Six variables, signed Pearson coefficients, and honest undefined cells.',
  description: 'Height is the magnitude of Pearson correlation; cyan is positive and coral is negative. Change the trailing window or hide weak coefficients. The constant uptime variable remains undefined, shown as flat gray tiles rather than fabricated zero correlations.',
  tags: ['Pearson r', 'Matrix', 'Undefined values'], difficulty: 'Intermediate', accent: '#77d1df',
  camera: [8, 7, 12], target: [0, 2, 0], bloom: 0.04,
  dataNote: 'Synthetic daily observations, May 26–June 30, 2026. Variables: visits, signups, USD revenue, mean latency in ms, a 0–100 satisfaction score, and constant 99.9% uptime. Each coefficient uses paired days from the selected trailing window. Correlation is descriptive, not causation or a significance test; the magnitude filter is not a p-value threshold.',
  setup(app) {
    const data = createCorrelationData();
    let days = 36, minimumMagnitude = 0;
    let cells = correlationCells(data, days, minimumMagnitude);
    const draw = (chart: ChartBuilder) => {
      chart.frame({ x: [-5, 5], y: [0, 4.5], z: [-3, 3],
        xTicks: ['Visits', 'Signups', 'Rev', 'Latency', 'Sat', 'Uptime'].map((label, i) => ({ value: -4 + i * 1.6, label })),
        zTicks: ['Visits', 'Signups', 'Rev', 'Latency', 'Sat', 'Uptime'].map((label, i) => ({ value: -2.4 + i * 0.96, label })),
        yTicks: [0, 0.5, 1].map(value => ({ value: value * 4.5, label: String(value) })),
        xLabel: 'Variable', yLabel: '|Pearson r|', zLabel: 'Paired variable',
      });
      for (const cell of cells) {
        for (const [a, b] of cell.a === cell.b ? [[cell.a, cell.b]] : [[cell.a, cell.b], [cell.b, cell.a]]) {
          const x = -4 + a * 1.6, z = -2.4 + b * 0.96;
          if (cell.coefficient === null) {
            chart.box({ x, y: 0.045, z, width: 1.08, height: 0.09, depth: 0.65, color: '#65717d' });
          } else {
            chart.bar({ x, z, value: Math.abs(cell.coefficient) * 4.5, width: 1.08, depth: 0.65, color: cell.coefficient >= 0 ? '#69ccd9' : '#ec9a83' });
            if (cell.coefficient === 0) chart.box({ x, y: 0.015, z, width: 1.08, height: 0.03, depth: 0.65, color: '#69ccd9' });
          }
        }
      }
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { cells = correlationCells(data, days, minimumMagnitude); layer.redraw(draw); };
    return {
      controls: [
        { id: 'window', label: 'Trailing window', min: 12, max: 36, step: 6, value: days, format: value => `${value} days`, apply(value) { days = value; refresh(); } },
        { id: 'magnitude', label: 'Minimum |r| shown', min: 0, max: 0.9, step: 0.1, value: minimumMagnitude, format: value => value.toFixed(1), apply(value) { minimumMagnitude = value; refresh(); } },
      ],
      readout() {
        const finitePairs = cells.filter(cell => cell.a !== cell.b && cell.coefficient !== null);
        const strongest = [...finitePairs].sort((a, b) => Math.abs(b.coefficient!) - Math.abs(a.coefficient!))[0];
        return {
          metrics: [
            { label: 'Paired observations', value: String(Math.min(days, data.length)), detail: `Daily rows, ${data[data.length - days].date} to ${data.at(-1)!.date}.` },
            { label: 'Numeric pairs shown', value: String(finitePairs.length), detail: 'Unique off-diagonal pairs after the magnitude filter.' },
            { label: 'Strongest displayed |r|', value: strongest ? Math.abs(strongest.coefficient!).toFixed(3) : 'Not defined', detail: strongest ? `${CORRELATION_VARIABLES[strongest.a]} / ${CORRELATION_VARIABLES[strongest.b]}` : 'No numeric off-diagonal pairs.' },
          ],
          legend: [{ label: 'Positive r', color: '#69ccd9' }, { label: 'Negative r', color: '#ec9a83' }, { label: 'Undefined: constant variable', color: '#65717d' }],
          table: { caption: 'Unique displayed matrix cells; off-diagonal cells are mirrored in the chart. Gray means undefined, never r=0. Table gives signed coefficients.', columns: ['Variable A', 'Variable B', 'Pearson r', 'Paired days'], rows: cells.map(cell => [CORRELATION_VARIABLES[cell.a], CORRELATION_VARIABLES[cell.b], cell.coefficient === null ? 'Undefined (constant)' : cell.coefficient.toFixed(4), cell.n]) },
        };
      },
    };
  },
};
export default example;
