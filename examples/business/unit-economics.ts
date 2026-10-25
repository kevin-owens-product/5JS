import { createChartLayer, type ChartBuilder } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export interface UnitEconomicsInput { volume: number; price: number; unitCost: number; fixedCost?: number }
export function calculateUnitEconomics(input: UnitEconomicsInput) {
  const { volume, price, unitCost, fixedCost = 25_000 } = input;
  if (![volume, price, unitCost, fixedCost].every(value => Number.isFinite(value) && value >= 0) || !Number.isInteger(volume)) {
    throw new RangeError('Volume must be a nonnegative integer; prices and costs must be finite and nonnegative.');
  }
  const revenue = volume * price, variableCost = volume * unitCost;
  const contribution = revenue - variableCost, profit = contribution - fixedCost;
  const unitContribution = price - unitCost;
  return {
    volume, price, unitCost, fixedCost, revenue, variableCost, contribution, profit, unitContribution,
    margin: revenue > 0 ? profit / revenue : null,
    breakEvenUnits: fixedCost === 0 ? 0 : unitContribution > 0 ? Math.ceil(fixedCost / unitContribution) : null,
    waterfall: [
      { label: 'Revenue', role: 'Starting total', value: revenue, base: 0, end: revenue },
      { label: 'Variable cost', role: 'Expense', value: -variableCost, base: revenue, end: contribution },
      { label: 'Fixed cost', role: 'Expense', value: -fixedCost, base: contribution, end: profit },
      { label: 'Operating result', role: 'Ending total', value: profit, base: 0, end: profit },
    ],
  };
}
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const example: ExampleDefinition = {
  id: 'unit-economics', title: 'Unit economics', category: 'Business',
  summary: 'A luminous profit engine routes revenue into costs and retained earnings.',
  description: 'Follow revenue through a spatial profit engine. Cyan enters the core; coral branches pay variable and fixed costs; green carries the remaining operating profit. Tube cross-sectional area encodes monthly USD. In a loss scenario a magenta funding-gap stream balances the expense outflows.',
  tags: ['Flow engine', 'Operating model', 'What-if'], difficulty: 'Advanced', accent: '#7af3cf',
  camera: [8.8, 6.6, 12.5], target: [0, 1.7, 0], bloom: .55, previewTime: 3,
  dataNote: 'Synthetic monthly scenario, USD and units/month. Revenue = volume × price; variable cost = volume × unit cost; operating result = revenue − variable cost − $25,000 fixed cost. Excludes tax, financing, and depreciation. Tube radius = 0.52 × sqrt(USD/100,000), so tube cross-sectional area is proportional to amount. Revenue + max(0,−profit) = variable cost + fixed cost + max(0,profit). Hub positions and rings are layout, not quantitative axes; moving particles illustrate direction, not transaction counts or time. The table retains the signed reconciliation; its final total is not another contribution.',
  setup(app) {
    let input: UnitEconomicsInput = { volume: 1_200, price: 55, unitCost: 24 };
    let model = calculateUnitEconomics(input);
    const layer = createChartLayer(chart => draw(chart));
    function draw(chart: ChartBuilder) {
      type P = [number, number, number];
      const core: P = [0, 1.8, 0];
      const revenue: P = [-4.5, 1.8, 0];
      const variable: P = [4.3, 3.7, -1.7];
      const fixed: P = [4.3, .15, 2.15];
      const result: P = [4.9, 1.8, -.3];
      const positive = '#6cf6b8', income = '#68d9ff', expense = '#ff987e', loss = '#ed74c8';
      const route = (points: P[], amount: number, color: string, seed: number) => {
        if (amount <= 0) return;
        const radius = .52 * Math.sqrt(amount / 100_000);
        chart.tube(points, color, radius, .18);
        chart.tube(points, color, .018, .95);
        chart.flow(points, { color, count: Math.round(100 + amount / 180), speed: .13, size: .052, spread: radius * .8, seed });
      };
      chart.ring([0, -.6, 0], 3.3, '#245269', .012, 'y');
      chart.ring([0, -.6, 0], 2.65, '#245269', .009, 'y');
      chart.line([[-5.2, -.6, 0], [5.4, -.6, 0]], '#294555', .4);
      for (const p of [revenue, variable, fixed, result]) chart.line([[p[0], -.6, p[2]], p], '#294555', .25);
      // Reactor rings are structural accents; every monetary flow uses the same area scale.
      chart.ring(core, .93, '#92f1e0', .042, 'x');
      chart.ring(core, 1.23, '#3da2bd', .022, 'x');
      chart.ring(core, 1.48, '#28647c', .016, 'y');
      chart.glow(core, '#52dbd0', 1.3);
      chart.point(core, '#b4fff0', .16);
      route([revenue, [-3, 2.05, .6], [-1.4, 1.9, .25], core], model.revenue, income, 11);
      route([core, [1.4, 3, -.4], [2.6, 3.9, -1.5], variable], model.variableCost, expense, 23);
      route([core, [1.6, .5, .75], [2.7, -.1, 1.9], fixed], model.fixedCost, '#ffbe75', 37);
      if (model.profit > 0) route([core, [1.7, 1.95, -.1], [3.3, 1.9, -.2], result], model.profit, positive, 41);
      if (model.profit < 0) {
        const gap: P = [-2.8, -.2, 2.8];
        route([gap, [-1.8, .1, 2.2], [-.7, 1.2, 1.1], core], -model.profit, loss, 59);
        chart.glow(gap, loss, .55);
        chart.label(`FUNDING GAP ${usd(-model.profit)}`, [-2.8, -.75, 2.8], .23, loss);
        chart.line([core, result], loss, .35);
      }
      for (const [p, color] of [[revenue, income], [variable, expense], [fixed, '#ffbe75'], [result, model.profit < 0 ? loss : positive]] as [P, string][]) {
        chart.ring(p, .33, color, .025, 'x'); chart.glow(p, color, .65); chart.point(p, color, .09);
      }
      chart.label('REVENUE', [-4.5, 2.65, 0], .26, income);
      chart.label(usd(model.revenue), [-4.5, 2.25, 0], .24, '#d7f7ff');
      chart.label('VARIABLE COST', [4.3, 4.4, -1.7], .24, expense);
      chart.label(usd(model.variableCost), [4.3, 4.02, -1.7], .22);
      chart.label('FIXED COST', [4.3, -.5, 2.15], .24, '#ffbe75');
      chart.label(usd(model.fixedCost), [4.3, -.86, 2.15], .22);
      chart.label(model.profit < 0 ? 'OPERATING LOSS' : 'RETAINED PROFIT', [5, 2.65, -.3], .24, model.profit < 0 ? loss : positive);
      chart.label(usd(model.profit), [5, 2.25, -.3], .24, model.profit < 0 ? loss : positive);
      chart.label('REVENUE → COSTS + RESULT', [0, -.98, -.8], .25, '#7a9da6');
    }
    app.add(layer);
    function change(patch: Partial<UnitEconomicsInput>) { const next = { ...input, ...patch }; const result = calculateUnitEconomics(next); input = next; model = result; layer.redraw(draw); }
    return {
      controls: [
        { id: 'volume', label: 'Monthly units', min: 500, max: 2_000, step: 50, value: 1_200, format: value => value.toLocaleString('en-US'), apply: value => change({ volume: value }) },
        { id: 'price', label: 'Selling price / unit', min: 30, max: 70, step: 1, value: 55, format: usd, apply: value => change({ price: value }) },
        { id: 'unit-cost', label: 'Variable cost / unit', min: 10, max: 45, step: 1, value: 24, format: usd, apply: value => change({ unitCost: value }) },
      ],
      readout: () => ({
        metrics: [
          { label: 'Monthly revenue', value: usd(model.revenue), detail: `${model.volume.toLocaleString('en-US')} units × ${usd(model.price)}` },
          { label: 'Operating result', value: usd(model.profit), detail: model.margin === null ? 'Margin undefined at zero revenue' : `${(model.margin * 100).toFixed(2)}% of revenue` },
          { label: 'Unit contribution', value: usd(model.unitContribution), detail: model.breakEvenUnits === null ? 'No positive-volume break-even at this contribution' : `Break-even: ${model.breakEvenUnits.toLocaleString('en-US')} units/month` },
        ],
        legend: [{ label: 'Revenue inflow', color: '#68d9ff' }, { label: 'Variable / fixed cost', color: '#ff987e' }, { label: 'Retained profit', color: '#6cf6b8' }, { label: 'Funding gap if loss', color: '#ed74c8' }],
        table: { caption: 'Synthetic monthly USD. The ending total repeats the result; do not sum it as another contribution.', columns: ['Step', 'Role', 'Signed value (USD)', 'Opening (USD)', 'Closing (USD)'], rows: model.waterfall.map(row => [row.label, row.role, row.value, row.base, row.end]) },
      }),
    };
  },
};
export default example;
