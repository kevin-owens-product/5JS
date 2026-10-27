import { createChartLayer, type ChartBuilder } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export const PRODUCTS = Object.freeze([
  { name: 'Atlas', revenue: 480_000, margin: .36, growth: .18, color: '#80dcb2' },
  { name: 'Beacon', revenue: 310_000, margin: .22, growth: .08, color: '#81bff1' },
  { name: 'Cobalt', revenue: 240_000, margin: .48, growth: .04, color: '#b09bed' },
  { name: 'Delta', revenue: 180_000, margin: .12, growth: -.06, color: '#ee9d89' },
  { name: 'Ember', revenue: 125_000, margin: .55, growth: .25, color: '#f1cd7e' },
  { name: 'Folio', revenue: 90_000, margin: .30, growth: .12, color: '#e5a7d2' },
]);
export interface PortfolioInput { marketShift: number; priceChange: number; costInflation: number }
const cents = (value: number) => Math.round(value * 100) / 100;
export function calculateProductPortfolio(input: PortfolioInput) {
  if (!Object.values(input).every(Number.isFinite) || input.marketShift <= -.94 || input.priceChange <= -1 || input.costInflation < 0) throw new RangeError('Scenario factors must be finite and keep revenue and volume positive.');
  const rows = PRODUCTS.map(product => {
    const volumeFactor = 1 + product.growth + input.marketShift;
    const revenue = cents(product.revenue * volumeFactor * (1 + input.priceChange));
    const cost = cents(product.revenue * volumeFactor * (1 - product.margin) * (1 + input.costInflation));
    if (!Number.isFinite(revenue) || revenue <= 0 || !Number.isFinite(cost)) throw new RangeError('Rounded product revenue must remain positive and finite, and product cost must remain finite.');
    const grossProfit = cents(revenue - cost);
    const growth = revenue / product.revenue - 1, margin = grossProfit / revenue;
    if (![growth, margin].every(Number.isFinite)) throw new RangeError('Product growth and margin must remain finite.');
    return { ...product, baselineRevenue: product.revenue, revenue, cost, grossProfit, growth, margin };
  });
  const revenue = cents(rows.reduce((sum, row) => sum + row.revenue, 0));
  const grossProfit = cents(rows.reduce((sum, row) => sum + row.grossProfit, 0));
  if (!Number.isFinite(revenue) || !Number.isFinite(grossProfit)) throw new RangeError('Portfolio totals must remain finite.');
  const weightedMargin = grossProfit / revenue;
  if (!Number.isFinite(weightedMargin)) throw new RangeError('Portfolio margin must remain finite.');
  return { rows, revenue, grossProfit, weightedMargin };
}
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const example: ExampleDefinition = {
  id: 'product-portfolio', title: 'Product portfolio', category: 'Business',
  summary: 'Move a product constellation through growth, margin, and revenue space.',
  description: 'Six luminous product systems occupy fixed growth, margin, and revenue coordinates. Light trails connect each prior-period reference to its modeled position, making a portfolio-wide scenario shift visible. Holographic zero-growth and zero-margin planes keep the economic boundaries legible.',
  tags: ['Product constellation', 'Scenario trajectories', '3D data'], difficulty: 'Advanced', accent: '#b59fe8',
  camera: [8.4, 6.6, 11.6], target: [0, 2.1, 0], bloom: .5,
  dataNote: 'Synthetic annual product scenarios, USD. Volume factor = 1 + baseline growth + market shift. Revenue = baseline revenue × volume factor × (1+price change). Cost = baseline revenue × volume factor × (1−baseline margin) × (1+cost inflation). Amounts round to cents; margin = gross profit/revenue. Product spheres and halos have constant size; position alone encodes growth, margin, and revenue. Small reference points use prior-period revenue, baseline margin, and 0% growth. Curved trails connect references to scenarios; their interpolation and moving pulses are illustrative, not historical samples. Portfolio margin uses revenue weights.',
  setup(app) {
    let input: PortfolioInput = { marketShift: 0, priceChange: 0, costInflation: .05 };
    let model = calculateProductPortfolio(input);
    const px = (growth: number) => -4.5 + (growth + .3) * 9;
    const py = (margin: number) => (margin + .25) / .9 * 5;
    const pz = (revenue: number) => -2.5 + revenue / 800_000 * 5;
    function draw(chart: ChartBuilder) {
      chart.frame({ x: [-4.5, 4.5], y: [0, 5], z: [-2.5, 2.5],
        xTicks: [-.3, 0, .3, .7].map(value => ({ value: px(value), label: percent(value) })),
        yTicks: [-.2, 0, .3, .6].map(value => ({ value: py(value), label: percent(value) })),
        zTicks: [0, 400_000, 800_000].map(value => ({ value: pz(value), label: `$${value / 1_000}k` })),
        xLabel: 'Revenue growth', yLabel: 'Gross margin', zLabel: 'Annual USD' });
      const zeroX = px(0), zeroY = py(0);
      // Translucent economic boundaries occupy their exact numeric coordinates.
      chart.surface([[[zeroX, 0, -2.5], [zeroX, 0, 2.5]], [[zeroX, 5, -2.5], [zeroX, 5, 2.5]]], [['#314879', '#314879'], ['#314879', '#314879']], .1);
      chart.surface([[[-4.5, zeroY, -2.5], [4.5, zeroY, -2.5]], [[-4.5, zeroY, 2.5], [4.5, zeroY, 2.5]]], [['#7c3b66', '#7c3b66'], ['#7c3b66', '#7c3b66']], .08);
      chart.tube([[zeroX, zeroY, -2.5], [zeroX, zeroY, 2.5]], '#736ca7', .015, .5);
      chart.label('ZERO GROWTH', [zeroX, 5.45, -2.3], .19, '#87a6d3');
      chart.label('ZERO MARGIN', [4.4, zeroY + .2, -2.4], .17, '#bd8cae');
      // Fixed side gutters are deliberately separate from the numeric data coordinates.
      // The default camera's right/up basis spaces labels in its image plane.
      const right: [number, number, number] = [.8099, 0, -.5865];
      const up: [number, number, number] = [-.1758, .9539, -.2428];
      const labelSlots = [
        { side: -1, level: 2.3 }, { side: -1, level: 1.35 },
        { side: 1, level: 2.3 }, { side: -1, level: .4 },
        { side: 1, level: 1.35 }, { side: 1, level: .4 },
      ];
      model.rows.forEach((row, index) => {
        const baseline = PRODUCTS[index];
        const position: [number, number, number] = [px(row.growth), py(row.margin), pz(row.revenue)];
        const origin: [number, number, number] = [zeroX, py(baseline.margin), pz(baseline.revenue)];
        chart.point(origin, row.color, .045);
        chart.ring(origin, .1, row.color, .012, 'y');
        const distance = Math.hypot(...position.map((v, axis) => v - origin[axis]));
        const bend = Math.min(.5, distance * .22);
        const path: [number, number, number][] = [origin,
          [origin[0] + (position[0] - origin[0]) * .3, origin[1] + (position[1] - origin[1]) * .3 + bend, origin[2] + (position[2] - origin[2]) * .3 - bend],
          [origin[0] + (position[0] - origin[0]) * .75, origin[1] + (position[1] - origin[1]) * .75 + bend * .6, origin[2] + (position[2] - origin[2]) * .75 - bend * .6],
          position];
        if (distance > .0001) {
          chart.tube(path, row.color, .018, .55);
          chart.flow(path, { color: row.color, count: 180, speed: .16, size: .04, spread: .027, seed: 120 + index });
        }
        // Equal-sized orbital glyphs make six sparse records visible without inventing an extra value encoding.
        chart.glow(position, row.color, 1.05);
        chart.point(position, row.color, .16);
        chart.ring(position, .33, row.color, .018, 'y');
        chart.ring(position, .33, row.color, .014, index % 2 === 0 ? 'x' : 'z');
        const orbit: [number, number, number][] = Array.from({ length: 49 }, (_, i) => {
          const theta = i / 48 * Math.PI * 2;
          return [position[0] + Math.cos(theta) * .33, position[1], position[2] + Math.sin(theta) * .33];
        });
        chart.flow(orbit, { color: row.color, count: 72, speed: .1, size: .025, spread: .006, seed: 140 + index });
        chart.tube([[position[0], 0, position[2]], position], row.color, .009, .2);
        chart.ring([position[0], .015, position[2]], .19, row.color, .012, 'y');
        const slot = labelSlots[index];
        const lateral = slot.side < 0 ? -3.7 : 4;
        const labelPosition: [number, number, number] = [
          right[0] * lateral + up[0] * slot.level,
          2.1 + up[1] * slot.level,
          right[2] * lateral + up[2] * slot.level,
        ];
        const attach = labelPosition.map((value, axis) => value - right[axis] * slot.side * .58) as [number, number, number];
        const elbow = labelPosition.map((value, axis) => value - right[axis] * slot.side * 1.05) as [number, number, number];
        chart.line([position, elbow, attach], row.color, .45);
        chart.point(attach, row.color, .025);
        chart.label(row.name.toUpperCase(), labelPosition, .22, row.color);
      });
      chart.label('REFERENCE → MODELED PORTFOLIO', [0, -.55, 3.45], .23, '#91adc6');
    }
    const layer = createChartLayer(draw); app.add(layer);
    function change(patch: Partial<PortfolioInput>) { const next = { ...input, ...patch }; const result = calculateProductPortfolio(next); input = next; model = result; layer.redraw(draw); }
    return {
      controls: [
        { id: 'market-shift', label: 'Volume growth shift', min: -.15, max: .15, step: .01, value: 0, format: value => `${(value * 100).toFixed(0)} pp`, apply: value => change({ marketShift: value }) },
        { id: 'price-change', label: 'Price change', min: -.1, max: .2, step: .01, value: 0, format: percent, apply: value => change({ priceChange: value }) },
        { id: 'cost-inflation', label: 'Cost inflation', min: 0, max: .25, step: .01, value: .05, format: percent, apply: value => change({ costInflation: value }) },
      ],
      readout: () => ({
        metrics: [
          { label: 'Modeled annual revenue', value: usd(model.revenue), detail: 'Sum across six products' },
          { label: 'Gross profit', value: usd(model.grossProfit), detail: 'Revenue less modeled product cost' },
          { label: 'Portfolio margin', value: percent(model.weightedMargin), detail: 'Total gross profit ÷ total revenue; not an average of percentages' },
        ],
        legend: PRODUCTS.map(({ name, color }) => ({ label: name, color })),
        table: { caption: 'Synthetic annual USD; percentages displayed to two decimals. Product spheres and orbit halos have equal radius; the six positions are the modeled endpoints.', columns: ['Product', 'Baseline revenue USD', 'Modeled revenue USD', 'Revenue change %', 'Gross margin %', 'Gross profit USD'], rows: model.rows.map(row => [row.name, row.baselineRevenue, row.revenue, Number((row.growth * 100).toFixed(2)), Number((row.margin * 100).toFixed(2)), row.grossProfit]) },
      }),
    };
  },
};
export default example;
