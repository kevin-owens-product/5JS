import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder, Position } from '../shared/chart.js';

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

const PAIRS = CORRELATION_VARIABLES.flatMap((_, a) =>
  CORRELATION_VARIABLES.slice(a + 1).map((_, offset) => [a, a + offset + 1] as const));
const SHORT_NAMES = ['Visits', 'Signups', 'Revenue', 'Latency', 'Satisfaction', 'Uptime'];
const POSITIVE = '#70dfdc', NEGATIVE = '#f49b83', UNDEFINED = '#67778b', FOCUS = '#efffae';

const example: ExampleDefinition = {
  id: 'correlation-matrix', title: 'Correlation matrix', category: 'Analytics',
  summary: 'A relationship observatory: signed strands, six variable towers, and paired observations.',
  description: 'Explore six variables as a spatial relationship network. Cyan strands are positive correlations; coral strands are negative. Select a pair to illuminate its connection and open the underlying daily observations on the right. The floor matrix mirrors the network filter.',
  tags: ['Relationship observatory', 'Pearson r', 'Linked views'], difficulty: 'Advanced', accent: '#77d1df',
  camera: [1.3, 5, 9], target: [0, 1.8, 0], bloom: 0.32,
  dataNote: 'Synthetic daily observations, May 26–June 30, 2026. Variables: visits, signups, USD revenue, mean latency in ms, a 0–100 satisfaction score, and constant 99.9% uptime. Strand width and matrix lightness encode |r|; upper/lower arcs distinguish positive/negative signs, with categorical node positions. Tower traces normalize each variable within its own window, so heights cannot compare units. The observation chamber uses raw units on X/Y and day order in depth. Traveling light guides the eye and does not represent changing data. The focused pair remains inspectable below the network magnitude filter. Gray means undefined, never zero. Correlation is descriptive, not causation or a significance test.',
  setup(app) {
    const data = createCorrelationData();
    let days = 36, minimumMagnitude = 0, selectedPair = 0;
    let cells = correlationCells(data, days, minimumMagnitude);
    const draw = (chart: ChartBuilder) => {
      const rows = data.slice(-days);
      const [focusA, focusB] = PAIRS[selectedPair];
      const focusR = pearson(rows.map(row => row.values[focusA]), rows.map(row => row.values[focusB]));
      const nodes: Position[] = CORRELATION_VARIABLES.map((_, i) => {
        const angle = Math.PI * 2 * i / 6 - Math.PI / 2;
        return [-1.9 + Math.cos(angle) * 2.35, 1.3, Math.sin(angle) * 1.9];
      });
      // The matrix is a second view of exactly the same coefficients, without a height encoding.
      chart.box({ x: -1.9, y: 0.05, z: 0, width: 2.55, height: 0.06, depth: 2.1, color: '#13212e', opacity: 0.8 });
      for (const cell of cells) {
        for (const [a, b] of cell.a === cell.b ? [[cell.a, cell.b]] : [[cell.a, cell.b], [cell.b, cell.a]]) {
          const selected = (a === focusA && b === focusB) || (a === focusB && b === focusA);
          const color = cell.coefficient === null ? UNDEFINED : cell.coefficient >= 0 ? POSITIVE : NEGATIVE;
          chart.box({ x: -2.9 + a * 0.4, y: selected ? 0.16 : 0.105, z: -0.825 + b * 0.33,
            width: 0.34, height: selected ? 0.12 : 0.04, depth: 0.27, color,
            opacity: cell.coefficient === null ? 0.35 : 0.12 + Math.abs(cell.coefficient) * 0.75 });
          if (selected) {
            const x = -2.9 + a * 0.4, z = -0.825 + b * 0.33;
            chart.line([[x - 0.18, 0.23, z - 0.145], [x + 0.18, 0.23, z - 0.145],
              [x + 0.18, 0.23, z + 0.145], [x - 0.18, 0.23, z + 0.145], [x - 0.18, 0.23, z - 0.145]], FOCUS);
          }
        }
      }
      chart.label('SIGNED MATRIX', [-1.9, 0.1, 1.4], 0.12, '#819bb0');
      for (let i = 0; i < 6; i++) {
        chart.label(String(i + 1), [-2.9 + i * 0.4, 0.1, 1.05], 0.09, '#819bb0');
        chart.label(String(i + 1), [-3.25, 0.1, -0.825 + i * 0.33], 0.09, '#819bb0');
      }
      chart.label('RELATIONSHIP OBSERVATORY', [-1.9, 4.1, -0.4], 0.18, '#bcdde1');
      // Categorical placement. Curvature separates signs; only width expresses magnitude.
      for (const cell of cells.filter(cell => cell.a !== cell.b && cell.coefficient !== null)) {
        const start = nodes[cell.a], end = nodes[cell.b], r = cell.coefficient!;
        const focused = cell.a === focusA && cell.b === focusB;
        const path: Position[] = Array.from({ length: 41 }, (_, i) => {
          const t = i / 40, arch = Math.sin(Math.PI * t);
          return [start[0] * (1 - t) + end[0] * t,
            1.3 + arch * (r >= 0 ? 1.45 + (cell.a + cell.b) * 0.055 : -0.86),
            start[2] * (1 - t) + end[2] * t];
        });
        chart.tube(path, focused ? FOCUS : r >= 0 ? POSITIVE : NEGATIVE, 0.008 + Math.abs(r) * 0.025, focused ? 1 : 0.38);
        chart.flow(path, { color: focused ? FOCUS : r >= 0 ? POSITIVE : NEGATIVE,
          count: focused ? 16 : 5, speed: 0.1, size: focused ? 0.055 : 0.027, seed: cell.a * 7 + cell.b });
      }
      nodes.forEach((node, variable) => {
        const focused = variable === focusA || variable === focusB;
        const values = rows.map(row => row.values[variable]);
        const low = Math.min(...values), high = Math.max(...values);
        const color = focused ? FOCUS : variable === 5 ? UNDEFINED : POSITIVE;
        chart.tube([[node[0], 0.15, node[2]], node], color, 0.018, 0.7);
        chart.ring([node[0], 0.15, node[2]], 0.24, color, 0.009);
        chart.point(node, color, focused ? 0.11 : 0.075);
        chart.glow(node, color, focused ? 0.6 : 0.3);
        const trace: Position[] = values.map((value, i) => [node[0] - 0.24 + i / (values.length - 1) * 0.48,
          1.55 + (high === low ? 0.35 : (value - low) / (high - low) * 0.7), node[2]]);
        chart.line([[node[0] - 0.27, 1.5, node[2]], [node[0] + 0.27, 1.5, node[2]]], '#344a5c');
        chart.tube(trace, color, 0.01, 0.8);
        chart.label(`${variable + 1} ${SHORT_NAMES[variable]}`, [node[0], 2.48, node[2]], 0.17, color);
        if (variable === 5) chart.label('CONSTANT / r UNDEFINED', [node[0], 2.75, node[2]], 0.09, UNDEFINED);
      });
      // Raw paired values, with a time axis in depth. No regression or invented uncertainty.
      const xValues = rows.map(row => row.values[focusA]), yValues = rows.map(row => row.values[focusB]);
      const xMin = Math.min(...xValues), xMax = Math.max(...xValues), yMin = Math.min(...yValues), yMax = Math.max(...yValues);
      const project = (value: number, low: number, high: number, start: number, size: number) =>
        start + (high === low ? 0.5 : (value - low) / (high - low)) * size;
      const x0 = 1.45, x1 = 4.55, y0 = 0.65, y1 = 3.15, z0 = -1.3, z1 = 1.45;
      const corners: Position[][] = [
        [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0]],
        [[x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0]],
        [[x0, y0, z1], [x0, y1, z1]], [[x1, y0, z1], [x1, y1, z1]],
      ];
      corners.forEach(path => chart.line(path, '#527286', 0.6));
      for (let i = 1; i < 5; i++) {
        const x = x0 + (x1 - x0) * i / 5, y = y0 + (y1 - y0) * i / 5;
        chart.line([[x, y0, z0], [x, y1, z0]], '#263c4b', 0.5);
        chart.line([[x0, y, z0], [x1, y, z0]], '#263c4b', 0.5);
      }
      const observations: Position[] = rows.map((row, i) => [project(row.values[focusA], xMin, xMax, x0 + 0.08, x1 - x0 - 0.16),
        project(row.values[focusB], yMin, yMax, y0 + 0.08, y1 - y0 - 0.16), z0 + 0.08 + i / (rows.length - 1) * (z1 - z0 - 0.16)]);
      observations.forEach((point, i) => {
        const color = i === rows.length - 1 ? FOCUS : focusR === null ? UNDEFINED : focusR >= 0 ? POSITIVE : NEGATIVE;
        chart.point(point, color, i === rows.length - 1 ? 0.065 : 0.037);
        chart.line([point, [point[0], y0, point[2]]], color, 0.1);
        chart.point([point[0], y0, point[2]], color, 0.016);
      });
      chart.line(observations, focusR === null ? UNDEFINED : FOCUS, 0.25);
      chart.flow(observations, { color: FOCUS, count: 2, speed: 0.065, size: 0.05, seed: 25 });
      const fmt = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
      chart.label(`${SHORT_NAMES[focusA]} × ${SHORT_NAMES[focusB]}`, [3, 4.15, -0.15], 0.19, FOCUS);
      chart.label(focusR === null ? 'r UNDEFINED · CONSTANT VARIABLE' : `r ${focusR >= 0 ? '+' : ''}${focusR.toFixed(4)} · ${rows.length} PAIRED DAYS`, [3, 3.85, -0.15], 0.12, '#aac1ce');
      chart.label(`${CORRELATION_VARIABLES[focusA]}   ${fmt(xMin)} → ${fmt(xMax)}`, [3, 0.3, z1], 0.13, '#a8becb');
      chart.label(`${CORRELATION_VARIABLES[focusB]}   ${fmt(yMin)} → ${fmt(yMax)}`, [3, y1 + 0.2, z0], 0.12, '#a8becb');
      chart.label('DAILY OBSERVATIONS / TIME IN DEPTH', [3, 0.15, z1 + 0.3], 0.1, '#6f899b');
      chart.label('OLDEST', [x0, y0 - 0.2, z0], 0.09, '#6f899b');
      chart.label('LATEST', [x1, y0 - 0.2, z1], 0.09, FOCUS);
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { cells = correlationCells(data, days, minimumMagnitude); layer.redraw(draw); };
    return {
      controls: [
        { id: 'pair', label: 'Explore a pair', min: 0, max: PAIRS.length - 1, step: 1, value: selectedPair,
          format: value => PAIRS[value].map(index => SHORT_NAMES[index]).join(' × '), apply(value) { selectedPair = value; refresh(); } },
        { id: 'window', label: 'Trailing window', min: 12, max: 36, step: 6, value: days, format: value => `${value} days`, apply(value) { days = value; refresh(); } },
        { id: 'magnitude', label: 'Minimum network |r|', min: 0, max: 0.9, step: 0.1, value: minimumMagnitude, format: value => value.toFixed(1), apply(value) { minimumMagnitude = value; refresh(); } },
      ],
      readout() {
        const finitePairs = cells.filter(cell => cell.a !== cell.b && cell.coefficient !== null);
        const [a, b] = PAIRS[selectedPair], rows = data.slice(-days);
        const focused = pearson(rows.map(row => row.values[a]), rows.map(row => row.values[b]));
        return {
          metrics: [
            { label: 'Focused Pearson r', value: focused === null ? 'Undefined' : `${focused >= 0 ? '+' : ''}${focused.toFixed(4)}`, detail: `${CORRELATION_VARIABLES[a]} × ${CORRELATION_VARIABLES[b]}. ${focused === null ? 'A constant variable has no defined correlation.' : 'Descriptive association, not a causal claim.'}` },
            { label: 'Paired observations', value: String(rows.length), detail: `Daily rows, ${rows[0].date} to ${rows.at(-1)!.date}.` },
            { label: 'Network pairs shown', value: String(finitePairs.length), detail: 'Unique off-diagonal pairs after the magnitude filter. Focused observations remain available.' },
          ],
          legend: [{ label: 'Positive r / upper strands', color: POSITIVE }, { label: 'Negative r / lower strands', color: NEGATIVE }, { label: 'Focused pair / latest day', color: FOCUS }, { label: 'Undefined: constant variable', color: UNDEFINED }],
          table: { caption: 'Unique displayed matrix cells; off-diagonal cells are mirrored on the floor. Strand width and tile lightness encode |r|; the table gives exact signed coefficients. Gray means undefined, never r=0.', columns: ['Variable A', 'Variable B', 'Pearson r', 'Paired days'], rows: cells.map(cell => [CORRELATION_VARIABLES[cell.a], CORRELATION_VARIABLES[cell.b], cell.coefficient === null ? 'Undefined (constant)' : cell.coefficient.toFixed(4), cell.n]) },
        };
      },
    };
  },
};
export default example;
