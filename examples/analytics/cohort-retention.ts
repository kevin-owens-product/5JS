import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';

export interface RetentionCohort { cohort: string; initialCustomers: number; retained: number[] }
export interface RetentionRow { cohort: string; cohortIndex: number; month: number; initialCustomers: number; retainedCustomers: number; rate: number }

/** Snapshot at June 30, 2026: future months are absent from each array. */
export function createRetentionData(): RetentionCohort[] {
  return [
    { cohort: '2026-01', initialCustomers: 240, retained: [240, 174, 146, 132, 121, 114] },
    { cohort: '2026-02', initialCustomers: 300, retained: [300, 225, 192, 171, 159] },
    { cohort: '2026-03', initialCustomers: 280, retained: [280, 218, 184, 170] },
    { cohort: '2026-04', initialCustomers: 360, retained: [360, 288, 245] },
    { cohort: '2026-05', initialCustomers: 320, retained: [320, 262] },
    { cohort: '2026-06', initialCustomers: 400, retained: [400] },
  ];
}

export function retentionRows(cohorts: readonly RetentionCohort[], firstCohort = 0): RetentionRow[] {
  return cohorts.flatMap((cohort, cohortIndex) => cohortIndex < firstCohort ? [] : cohort.retained.map((retainedCustomers, month) => {
    if (!Number.isInteger(cohort.initialCustomers) || cohort.initialCustomers <= 0 || !Number.isInteger(retainedCustomers) || retainedCustomers < 0 || retainedCustomers > cohort.initialCustomers) throw new RangeError('Retention requires positive cohort sizes and valid integer retained counts.');
    return { cohort: cohort.cohort, cohortIndex, month, initialCustomers: cohort.initialCustomers, retainedCustomers, rate: retainedCustomers / cohort.initialCustomers };
  }));
}

/** Each cohort enters the denominator only when the selected month is observed. */
export function weightedRetention(rows: readonly RetentionRow[], month: number) {
  const eligible = rows.filter(row => row.month === month);
  const retainedCustomers = eligible.reduce((sum, row) => sum + row.retainedCustomers, 0);
  const initialCustomers = eligible.reduce((sum, row) => sum + row.initialCustomers, 0);
  return { eligibleCohorts: eligible.length, retainedCustomers, initialCustomers, rate: initialCustomers ? retainedCustomers / initialCustomers : null };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const example: ExampleDefinition = {
  id: 'cohort-retention', title: 'Cohort retention', category: 'Analytics',
  summary: 'Slice six retention sails at their observed age frontier.',
  description: 'Six translucent sails carry cohorts through their observed lifetimes. Their crests preserve exact retention values; each sail ends where observations stop. Move the gold age cross-section to compare eligible cohorts, switch the height measure, or isolate more recent signups.',
  tags: ['Retention sails', 'Cross-section', 'Observed frontier'], difficulty: 'Advanced', accent: '#72dec9',
  camera: [8.8, 7.3, 10.8], target: [0, 2.15, 0], bloom: 0.3,
  dataNote: 'Synthetic monthly signup cohorts, January–June 2026; snapshot June 30. A retained customer was active in that calendar month. Month 0 is the signup month and is defined as 100%. Counts use the original cohort denominator. Future ages are unobserved and omitted; month metrics include only cohorts old enough to be observed. Sail crest height is the selected value at each monthly knot; constant width is layout, and connecting fabric is linear interpolation. Tracers show reading direction, not extra customers. The gold plane selects an age; it does not forecast beyond the observed frontier.',
  setup(app) {
    const data = createRetentionData();
    let firstCohort = 0, focusMonth = 2, measure = 0;
    let rows = retentionRows(data);
    const draw = (chart: ChartBuilder) => {
      const rateMode = measure === 0;
      const scale = rateMode ? 100 : 400;
      chart.frame({ x: [-5, 5], y: [0, 4.5], z: [-3, 3],
        xTicks: MONTHS.map((label, i) => ({ value: -4 + i * 1.6, label })),
        yTicks: [0, 0.25, 0.5, 0.75, 1].map(fraction => ({ value: fraction * 4.5, label: `${fraction * scale}${rateMode ? '%' : ''}` })),
        zTicks: [0, 2, 5].map(month => ({ value: -2.4 + month * 0.96, label: `M${month}` })),
        xLabel: 'Signup cohort · 2026', yLabel: rateMode ? 'Retained / original cohort' : 'Retained customers', zLabel: 'Cohort age',
      });
      type P = [number, number, number];
      const height = (row: RetentionRow) => rateMode ? row.rate * 4.5 : row.retainedCustomers / 400 * 4.5;
      const palette = ['#53d8c1', '#68d7e5', '#7bb9ee', '#9dacef', '#c2a2ea', '#e2b1dc'];
      const focusZ = -2.4 + focusMonth * .96;
      chart.surface([[[-4.85, 0, focusZ], [4.85, 0, focusZ]], [[-4.85, 4.5, focusZ], [4.85, 4.5, focusZ]]], [['#d79d39', '#d79d39'], ['#ffe4a1', '#ffe4a1']], .055);
      chart.line([[-4.85, 0, focusZ], [-4.85, 4.5, focusZ], [4.85, 4.5, focusZ], [4.85, 0, focusZ]], '#e8bc67', .5);
      const scan: P[] = [[-4.8, .025, focusZ], [-4.8, 4.45, focusZ], [4.8, 4.45, focusZ], [4.8, .025, focusZ]];
      for (let i = 1; i < scan.length; i++) chart.flow([scan[i - 1], scan[i]], { color: '#ffe5a2', count: 60, size: .025, spread: 0, speed: .09, seed: 12 + i });
      for (let cohort = firstCohort; cohort < data.length; cohort++) {
        const cells = rows.filter(row => row.cohortIndex === cohort);
        const centerX = -4 + cohort * 1.6, hue = palette[cohort];
        // A single observed month is a short cap, never an invented future age.
        const knots: P[] = cells.map(row => [centerX, height(row), -2.4 + row.month * .96]);
        const fabric = cells.length > 1 ? cells.map(row => [[centerX - .56, height(row), -2.4 + row.month * .96], [centerX + .56, height(row), -2.4 + row.month * .96]] as P[])
          : [[[centerX - .56, height(cells[0]), -2.47], [centerX + .56, height(cells[0]), -2.47]], [[centerX - .56, height(cells[0]), -2.33], [centerX + .56, height(cells[0]), -2.33]]] as P[][];
        chart.surface(fabric, fabric.map(() => [hue, hue]), .62);
        if (cells.length > 1) {
          chart.surface(cells.map(row => [[centerX - .56, 0, -2.4 + row.month * .96], [centerX - .56, height(row), -2.4 + row.month * .96]] as P[]), cells.map(() => ['#123442', hue]), .16);
          chart.line(knots, hue, .9);
          // Segmented paths retain the bounded quantitative crest at sharp knots.
          for (let i = 1; i < knots.length; i++) chart.flow([knots[i - 1], knots[i]], { color: hue, count: 34, speed: .16, size: .025, spread: 0, seed: cohort * 20 + i });
        }
        const end = cells.at(-1)!;
        chart.line([[centerX - .56, 0, -2.4 + end.month * .96], [centerX - .56, height(end), -2.4 + end.month * .96], [centerX + .56, height(end), -2.4 + end.month * .96], [centerX + .56, 0, -2.4 + end.month * .96]], hue, .5);
        for (const row of cells) {
          const z = -2.4 + row.month * .96, y = height(row), focused = row.month === focusMonth;
          chart.line([[centerX - .56, y, z], [centerX + .56, y, z]], focused ? '#ffe5a2' : hue, focused ? 1 : .35);
          if (focused) {
            chart.glow([centerX, y, z], '#ffe5a2', .5);
            chart.label(rateMode ? `${(row.rate * 100).toFixed(1)}%` : String(row.retainedCustomers), [centerX, y + .3, z], .2, '#ffe5a2');
          }
        }
        chart.label(`M${end.month} observed`, [centerX, .28, -2.4 + end.month * .96], .14, hue);
      }
      chart.label(`AGE CROSS-SECTION · M${focusMonth}`, [0, 4.95, focusZ], .23, '#ffe5a2');
      chart.label('EMPTY SPACE = NOT YET OBSERVED', [1.7, .18, 2.65], .19, '#8196ab');
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { rows = retentionRows(data, firstCohort); layer.redraw(draw); };
    return {
      controls: [
        { id: 'focus-month', label: 'Highlighted month', min: 0, max: 5, step: 1, value: focusMonth, format: value => `M${value}`, apply(value) { focusMonth = value; refresh(); } },
        { id: 'first-cohort', label: 'First cohort shown', min: 0, max: 4, step: 1, value: firstCohort, format: value => `${MONTHS[value]} 2026`, apply(value) { firstCohort = value; refresh(); } },
        { id: 'measure', label: 'Sail crest height', min: 0, max: 1, step: 1, value: measure, format: value => value === 0 ? 'Retention %' : 'Customer count', apply(value) { measure = value; refresh(); } },
      ],
      readout() {
        const summary = weightedRetention(rows, focusMonth);
        return {
          metrics: [
            { label: `M${focusMonth} weighted retention`, value: summary.rate === null ? 'Not observed' : `${(summary.rate * 100).toFixed(1)}%`, detail: 'Sum retained ÷ sum original customers, eligible cohorts only.' },
            { label: 'Eligible original customers', value: String(summary.initialCustomers), detail: `${summary.retainedCustomers} retained across ${summary.eligibleCohorts} observed cohorts.` },
            { label: 'Observed cells', value: String(rows.length), detail: 'Future cohort ages are absent, never zero-filled.' },
          ],
          legend: [{ label: `Age cross-section M${focusMonth}`, color: '#ffd278' }, { label: 'Observed cohort sails', color: '#60cab9' }],
          table: { caption: 'All displayed observed cells. Future periods are omitted. Monthly percentages use each row’s original cohort size.', columns: ['Cohort', 'Age', 'Original', 'Retained', 'Retention'], rows: rows.map(row => [row.cohort, `M${row.month}`, row.initialCustomers, row.retainedCustomers, `${(row.rate * 100).toFixed(2)}%`]) },
        };
      },
    };
  },
};
export default example;
