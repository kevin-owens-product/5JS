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
  summary: 'Weave ranked revenue into a rising concentration spine.',
  description: 'A descending revenue ridge and a rising cumulative spine are joined by one luminous ribbon per product. Their opposing shapes expose concentration at a glance. Slide the coverage plane to locate the first ranked prefix meeting your target; hiding the tail keeps the full denominator intact.',
  tags: ['Concentration weave', 'Ranked contributions', 'Coverage slice'], difficulty: 'Advanced', accent: '#b6a2ed',
  camera: [7.8, 6.7, 11.8], target: [0, 2.45, 0], bloom: .3,
  dataNote: 'Synthetic one-period product revenue in USD. Products are ranked descending within the selected segment. Share = product revenue / total selected-segment revenue; cumulative share sums that ranking. Hidden products remain in the denominator and full table. The chosen percentage is a reference threshold, not an assumed 80/20 law. Back ridge height uses the fixed left $0–$150,000 axis; front spine height uses the right 0–100% axis. Rank slots stay 1–12. Constant-width ribbons connect these two different measures; their interior height and animated tracers carry no additional metric or transaction meaning.',
  setup(app) {
    const settings: ParetoSettings = { topN: 8, segment: 0, threshold: 80 };
    let state = calculatePareto(settings);
    const x = (rank: number) => -4.4 + (rank - 1) * 0.8;
    const draw = (chart: ChartBuilder) => {
      type P = [number, number, number];
      chart.frame({ x: [-5, 5], y: [0, 5], z: [-2.2, 1.8], xLabel: 'Revenue rank in segment', yLabel: 'Back ridge · product USD',
        xTicks: Array.from({ length: 12 }, (_, i) => ({ value: x(i + 1), label: String(i + 1) })),
        yTicks: [0, 50000, 100000, 150000].map(value => ({ value: value / 30000, label: `$${value / 1000}k` })) });
      chart.line([[5, 0, 1.8], [5, 5, 1.8]], '#79d8c1');
      for (const percentage of [0, 25, 50, 75, 100]) chart.label(`${percentage}%`, [5.45, percentage / 20, 1.8], 0.21, '#79d8c1');
      chart.label('Front spine · cumulative share', [3.7, 5.55, 1.8], 0.25, '#79d8c1');
      const thresholdY = settings.threshold / 20;
      chart.surface([[[-4.95, thresholdY, .9], [4.95, thresholdY, .9]], [[-4.95, thresholdY, 2.25], [4.95, thresholdY, 2.25]]], [['#c69542', '#c69542'], ['#ffe3a0', '#ffe3a0']], .08);
      chart.line([[-4.95, thresholdY, 2.25], [4.95, thresholdY, 2.25]], '#edbd78', .8);
      chart.flow([[-4.9, thresholdY, 2.25], [4.9, thresholdY, 2.25]], { color: '#ffe5a6', count: 180, size: .03, speed: .08, spread: .015, seed: 18 });
      chart.label(`${settings.threshold}% COVERAGE`, [-3.5, thresholdY + .27, 2.3], .21, '#f5d18a');
      for (const row of state.displayed) {
        const selected = row.rank === state.countToThreshold, hue = selected ? '#f7d48f' : '#b6a2ed';
        const y0 = row.revenue / 30000, y1 = row.cumulativeShare * 5;
        const center: P[] = [], fabric: P[][] = [];
        for (let i = 0; i <= 24; i++) {
          const t = i / 24, blend = t * t * (3 - 2 * t), y = y0 + (y1 - y0) * blend;
          center.push([x(row.rank), y, -2.05 + t * 3.85]);
          fabric.push([[x(row.rank) - .27, y, -2.05 + t * 3.85], [x(row.rank) + .27, y, -2.05 + t * 3.85]]);
        }
        chart.surface(fabric, fabric.map((_, i) => { const shade = selected ? '#dfbc72' : i < 10 ? '#9d7ad1' : i > 16 ? '#59bca8' : '#5f78b9'; return [shade, shade]; }), selected ? .7 : .48);
        chart.line(center, hue, .7);
        chart.flow(center, { color: selected ? '#ffe8ad' : '#c3c6fc', count: 100, size: .028, speed: .12, spread: .025, seed: row.rank * 7 });
        chart.line([[x(row.rank), 0, -2.05], [x(row.rank), y0, -2.05]], '#806aab', .22);
        chart.point([x(row.rank), y0, -2.05], '#cfb8ff', .05);
        chart.point([x(row.rank), y1, 1.8], selected ? '#ffe8ad' : '#79d8c1', selected ? .085 : .055);
        chart.label(row.product, [x(row.rank), -.3, -2.05], .15, '#beaacf');
        if (selected) {
          chart.glow([x(row.rank), y1, 1.8], '#ffe8ad', .55);
          chart.label(`TOP ${row.rank} · ${(row.cumulativeShare * 100).toFixed(1)}%`, [x(row.rank), y1 + .42, 1.8], .22, '#ffe8ad');
        }
      }
      const spine: P[] = state.displayed.map(row => [x(row.rank), row.cumulativeShare * 5, 1.8]);
      chart.tube(spine, '#79d8c1', .035);
      chart.flow(spine, { color: '#b3ffdf', count: 200, size: .035, speed: .09, spread: .02, seed: 41 });
      chart.tube(state.displayed.map(row => [x(row.rank), row.revenue / 30000, -2.05]), '#b6a2ed', .025, .85);
      if (state.countToThreshold > state.displayed.length) chart.label('TARGET LIES IN THE HIDDEN TAIL', [1.4, 5.55, 0], .22, '#f0c889');
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
        legend: [{ label: 'Back ridge · revenue / left axis', color: '#b6a2ed' }, { label: 'Front spine · cumulative / right axis', color: '#79d8c1' }, { label: `${settings.threshold}% coverage plane`, color: '#edbd78' }],
        table: { caption: 'Full selected segment, including hidden products. Percentages use the full segment denominator.', columns: ['Rank', 'Product', 'Segment', 'Revenue USD', 'Share %', 'Cumulative %', 'Displayed'], rows: state.rows.map(row => [row.rank, row.product, row.segment, row.revenue, Number((row.share * 100).toFixed(4)), Number((row.cumulativeShare * 100).toFixed(4)), row.shown ? 'Yes' : 'No']) },
      }),
    };
  },
};
export default example;
