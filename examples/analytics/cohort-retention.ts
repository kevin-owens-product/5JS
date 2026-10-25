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
  summary: 'An observed retention triangle with correctly weighted month totals.',
  description: 'Each column is one cohort at one observed age. Gold highlights the chosen month; cyan shows the remaining observed cells. Switch between retained customers and retention rates, and compare recent cohorts without treating future periods as zero.',
  tags: ['Cohorts', 'Weighted rates', 'Missing data'], difficulty: 'Intermediate', accent: '#72dec9',
  camera: [8, 7, 12], target: [0, 2, 0], bloom: 0.08,
  dataNote: 'Synthetic monthly signup cohorts, January–June 2026; snapshot June 30. A retained customer was active in that calendar month. Month 0 is the signup month and is defined as 100%. Counts use the original cohort denominator. Future ages are unobserved and omitted; month metrics include only cohorts old enough to be observed.',
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
      for (const row of rows) chart.bar({ x: -4 + row.cohortIndex * 1.6, z: -2.4 + row.month * 0.96,
        value: rateMode ? row.rate * 4.5 : row.retainedCustomers / 400 * 4.5,
        width: 1.04, depth: 0.64, color: row.month === focusMonth ? '#ffd278' : '#60cab9' });
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { rows = retentionRows(data, firstCohort); layer.redraw(draw); };
    return {
      controls: [
        { id: 'focus-month', label: 'Highlighted month', min: 0, max: 5, step: 1, value: focusMonth, format: value => `M${value}`, apply(value) { focusMonth = value; refresh(); } },
        { id: 'first-cohort', label: 'First cohort shown', min: 0, max: 4, step: 1, value: firstCohort, format: value => `${MONTHS[value]} 2026`, apply(value) { firstCohort = value; refresh(); } },
        { id: 'measure', label: 'Column height', min: 0, max: 1, step: 1, value: measure, format: value => value === 0 ? 'Retention %' : 'Customer count', apply(value) { measure = value; refresh(); } },
      ],
      readout() {
        const summary = weightedRetention(rows, focusMonth);
        return {
          metrics: [
            { label: `M${focusMonth} weighted retention`, value: summary.rate === null ? 'Not observed' : `${(summary.rate * 100).toFixed(1)}%`, detail: 'Sum retained ÷ sum original customers, eligible cohorts only.' },
            { label: 'Eligible original customers', value: String(summary.initialCustomers), detail: `${summary.retainedCustomers} retained across ${summary.eligibleCohorts} observed cohorts.` },
            { label: 'Observed cells', value: String(rows.length), detail: 'Future cohort ages are absent, never zero-filled.' },
          ],
          legend: [{ label: `Highlighted M${focusMonth}`, color: '#ffd278' }, { label: 'Other observed months', color: '#60cab9' }],
          table: { caption: 'All displayed observed cells. Future periods are omitted. Monthly percentages use each row’s original cohort size.', columns: ['Cohort', 'Age', 'Original', 'Retained', 'Retention'], rows: rows.map(row => [row.cohort, `M${row.month}`, row.initialCustomers, row.retainedCustomers, `${(row.rate * 100).toFixed(2)}%`]) },
        };
      },
    };
  },
};
export default example;
