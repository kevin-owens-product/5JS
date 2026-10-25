import type { ExampleDefinition } from '../types.js';
import { createChartLayer, type ChartBuilder } from '../shared/chart.js';

export const PARETO_PRODUCTS = [
  { product: 'Orbit', segment: 'Core', revenue: 125000 }, { product: 'Relay', segment: 'Core', revenue: 92000 },
  { product: 'Prism', segment: 'Core', revenue: 67000 }, { product: 'Echo', segment: 'Core', revenue: 44000 },
  { product: 'Arc', segment: 'Core', revenue: 36000 }, { product: 'Loop', segment: 'Core', revenue: 28000 },
  { product: 'Case', segment: 'Accessories', revenue: 22000 }, { product: 'Dock', segment: 'Accessories', revenue: 16000 },
  { product: 'Cable', segment: 'Accessories', revenue: 12000 }, { product: 'Stand', segment: 'Accessories', revenue: 9000 },
  { product: 'Clip', segment: 'Accessories', revenue: 6000 }, { product: 'Strap', segment: 'Accessories', revenue: 3000 },
] as const;
export interface ParetoSettings { topN: number; segment: number; threshold: number }
const SEGMENTS = ['All products', 'Core', 'Accessories'];
const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function calculatePareto(settings: ParetoSettings = { topN: 8, segment: 0, threshold: 80 }) {
  if (!Number.isInteger(settings.topN) || settings.topN < 1 || settings.topN > 12 || !Number.isInteger(settings.segment) || settings.segment < 0 || settings.segment > 2 || !Number.isFinite(settings.threshold) || settings.threshold <= 0 || settings.threshold > 100) throw new RangeError('Invalid Pareto selection.');
  const selected = PARETO_PRODUCTS.filter(row => settings.segment === 0 || row.segment === SEGMENTS[settings.segment]).sort((a, b) => b.revenue - a.revenue || a.product.localeCompare(b.product));
  const total = selected.reduce((sum, row) => sum + row.revenue, 0);
  let cumulative = 0;
  const rows = selected.map((row, index) => {
    cumulative += row.revenue;
    return { ...row, rank: index + 1, cumulative, share: row.revenue / total, cumulativeShare: cumulative / total, shown: index < settings.topN };
  });
  const displayed = rows.filter(row => row.shown);
  return { rows, displayed, total, shownShare: displayed.reduce((sum, row) => sum + row.revenue, 0) / total, countToThreshold: rows.find(row => row.cumulativeShare * 100 >= settings.threshold)?.rank ?? rows.length };
}

const example: ExampleDefinition = {
  id: 'pareto-analysis', title: 'Pareto analysis', category: 'Analytics',
  summary: 'Rank product revenue and inspect cumulative concentration.',
  description: 'Revenue bars use the left USD axis; the cumulative curve uses the right 0–100% axis. Top N hides the tail without changing the denominator. Segment filters recompute ranking within that segment, while both axis domains stay fixed.',
  tags: ['Concentration', 'Ranking', 'Cumulative share'], difficulty: 'Intermediate', accent: '#b6a2ed',
  camera: [7.5, 6.5, 12], target: [0, 2.1, 0], bloom: 0,
  dataNote: 'Synthetic one-period product revenue in USD. Products are ranked descending within the selected segment. Share = product revenue / total selected-segment revenue; cumulative share sums that ranking. Hidden products remain in the denominator and full table. The chosen percentage is a reference threshold, not an assumed 80/20 law. Left axis stays $0–$150,000, right axis 0–100%, rank slots 1–12.',
  setup(app) {
    const settings: ParetoSettings = { topN: 8, segment: 0, threshold: 80 };
    let state = calculatePareto(settings);
    const x = (rank: number) => -4.4 + (rank - 1) * 0.8;
    const draw = (chart: ChartBuilder) => {
      chart.frame({ x: [-5, 5], y: [0, 5], z: [-0.6, 0.85], xLabel: 'Revenue rank in segment', yLabel: 'Product revenue (USD)',
        xTicks: Array.from({ length: 12 }, (_, i) => ({ value: x(i + 1), label: String(i + 1) })),
        yTicks: [0, 50000, 100000, 150000].map(value => ({ value: value / 30000, label: `$${value / 1000}k` })) });
      chart.line([[5, 0, 0.85], [5, 5, 0.85]], '#79d8c1');
      for (const percentage of [0, 25, 50, 75, 100]) chart.label(`${percentage}%`, [5.45, percentage / 20, 0.85], 0.21, '#79d8c1');
      chart.label('Cumulative share', [4.9, 5.55, 0.85], 0.25, '#79d8c1');
      chart.line([[-5, settings.threshold / 20, 0.7], [5, settings.threshold / 20, 0.7]], '#edbd78', 0.55);
      for (const row of state.displayed) {
        chart.bar({ x: x(row.rank), z: 0, value: row.revenue / 30000, width: 0.52, depth: 0.55, color: '#b6a2ed' });
        chart.point([x(row.rank), row.cumulativeShare * 5, 0.82], '#79d8c1', 0.055);
      }
      chart.line(state.displayed.map(row => [x(row.rank), row.cumulativeShare * 5, 0.82]), '#79d8c1');
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { state = calculatePareto(settings); layer.redraw(draw); };
    return {
      controls: [
        { id: 'top-n', label: 'Top products shown', min: 3, max: 12, step: 1, value: 8, format: value => `Top ${value}`, apply: value => { settings.topN = value; refresh(); } },
        { id: 'segment', label: 'Product segment', min: 0, max: 2, step: 1, value: 0, format: value => SEGMENTS[value], apply: value => { settings.segment = value; refresh(); } },
        { id: 'threshold', label: 'Coverage reference', min: 50, max: 95, step: 5, value: 80, format: value => `${value}%`, apply: value => { settings.threshold = value; refresh(); } },
      ],
      readout: () => ({
        metrics: [
          { label: 'Segment revenue', value: usd(state.total), detail: `${state.rows.length} products, including hidden tail` },
          { label: 'Shown revenue share', value: `${(state.shownShare * 100).toFixed(1)}%`, detail: `${state.displayed.length} displayed products` },
          { label: `Products to ${settings.threshold}%`, value: String(state.countToThreshold), detail: 'Minimum ranked prefix meeting the reference' },
        ],
        legend: [{ label: 'Revenue · left axis', color: '#b6a2ed' }, { label: 'Cumulative share · right axis', color: '#79d8c1' }, { label: `${settings.threshold}% reference`, color: '#edbd78' }],
        table: { caption: 'Full selected segment, including hidden products. Percentages use the full segment denominator.', columns: ['Rank', 'Product', 'Segment', 'Revenue USD', 'Share %', 'Cumulative %', 'Displayed'], rows: state.rows.map(row => [row.rank, row.product, row.segment, row.revenue, Number((row.share * 100).toFixed(4)), Number((row.cumulativeShare * 100).toFixed(4)), row.shown ? 'Yes' : 'No']) },
      }),
    };
  },
};
export default example;
