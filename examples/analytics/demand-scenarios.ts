import { createChartLayer, type ChartBuilder } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export const HISTORICAL_DEMAND = Object.freeze([850, 880, 920, 990, 1080, 1150, 1110, 1060, 1010, 1090, 1220, 1300]);
export interface DemandInput { growth: number; seasonality: number; spread: number }
export function calculateDemandScenarios(input: DemandInput) {
  const { growth, seasonality, spread } = input;
  if (!Number.isFinite(growth) || growth <= -1 || !Number.isFinite(seasonality) || seasonality < 0 || seasonality > 1 || !Number.isFinite(spread) || spread < 0 || spread > 1) {
    throw new RangeError('Growth must exceed −100%; seasonality and scenario spread must be between 0 and 1.');
  }
  const history = HISTORICAL_DEMAND.map((units, index) => ({ month: index + 1, units }));
  const anchor = HISTORICAL_DEMAND[HISTORICAL_DEMAND.length - 1];
  const future = Array.from({ length: 6 }, (_, index) => {
    const horizon = index + 1;
    const seasonalFactor = 1 + seasonality * Math.sin(2 * Math.PI * horizon / 12);
    const unroundedBase = anchor * (1 + growth) ** horizon * seasonalFactor;
    return { month: 12 + horizon, horizon, low: Math.round(unroundedBase * (1 - spread * horizon / 6)), base: Math.round(unroundedBase), high: Math.round(unroundedBase * (1 + spread * horizon / 6)) };
  });
  return { ...input, history, future, totals: { low: future.reduce((sum, row) => sum + row.low, 0), base: future.reduce((sum, row) => sum + row.base, 0), high: future.reduce((sum, row) => sum + row.high, 0) } };
}
const whole = (value: number) => value.toLocaleString('en-US');
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const example: ExampleDefinition = {
  id: 'demand-scenarios', title: 'Demand scenarios', category: 'Analytics',
  summary: 'Separate historical demand from three explicit what-if paths.',
  description: 'Twelve fixed synthetic months lead into six modeled months. A translucent low-to-high envelope shows user-selected alternatives around the base path. It is a scenario range, not a confidence interval or statistical forecast.',
  tags: ['Scenarios', 'Time series', 'Assumptions'], difficulty: 'Intermediate', accent: '#9ed5ff',
  camera: [8, 7, 12], target: [0, 2, 0], bloom: .05,
  dataNote: 'Synthetic units/month. History is fixed. At horizon h=1…6: unrounded base = 1,300 × (1+growth)^h × [1+seasonality×sin(2πh/12)]. Low/high multiply that base by [1∓spread×h/6]; each path is rounded to whole units. Spread is an assumption, not a confidence level. No model fitting or probability estimates.',
  setup(app) {
    let input: DemandInput = { growth: .025, seasonality: .12, spread: .18 };
    let model = calculateDemandScenarios(input);
    const colors = { history: '#a3b7c7', low: '#78b9fb', base: '#bce799', high: '#f2c08b' };
    const x = (month: number) => -4.8 + (month - 1) * 9.6 / 17;
    const y = (units: number) => units / 600;
    const layer = createChartLayer(chart => draw(chart));
    function draw(chart: ChartBuilder) {
      chart.frame({ x: [-5, 5], y: [0, 5], z: [-.8, .8],
        xTicks: [1, 3, 6, 9, 12, 15, 18].map(month => ({ value: x(month), label: `M${month}` })),
        yTicks: [0, 600, 1200, 1800, 2400, 3000].map(value => ({ value: y(value), label: whole(value) })), xLabel: 'Month', yLabel: 'Units / month' });
      chart.line(model.history.map(row => [x(row.month), y(row.units), 0]), colors.history);
      model.history.forEach(row => chart.point([x(row.month), y(row.units), 0], colors.history, .05));
      const boundary = x(12.5);
      chart.line([[boundary, 0, .1], [boundary, 4.65, .1]], '#94a8b5', .45);
      chart.label('HISTORY', [x(6), 4.65, 0], .21, colors.history);
      chart.label('WHAT-IF', [x(15), 4.65, 0], .21, colors.base);
      for (const row of model.future) chart.bar({ x: x(row.month), z: 0, base: y(row.low), value: y(row.high - row.low), width: .36, depth: .26, color: colors.low, opacity: .18 });
      for (const name of ['low', 'base', 'high'] as const) {
        const points: [number, number, number][] = [[x(12), y(HISTORICAL_DEMAND[11]), 0], ...model.future.map(row => [x(row.month), y(row[name]), 0] as [number, number, number])];
        chart.line(points, colors[name]);
        model.future.forEach(row => chart.point([x(row.month), y(row[name]), 0], colors[name], name === 'base' ? .065 : .045));
      }
    }
    app.add(layer);
    function change(patch: Partial<DemandInput>) { const next = { ...input, ...patch }; const result = calculateDemandScenarios(next); input = next; model = result; layer.redraw(draw); }
    return {
      controls: [
        { id: 'growth', label: 'Monthly growth assumption', min: -.04, max: .08, step: .005, value: .025, format: percent, apply: value => change({ growth: value }) },
        { id: 'seasonality', label: 'Seasonal amplitude', min: 0, max: .25, step: .01, value: .12, format: percent, apply: value => change({ seasonality: value }) },
        { id: 'spread', label: 'Month-18 scenario spread', min: 0, max: .4, step: .02, value: .18, format: percent, apply: value => change({ spread: value }) },
      ],
      readout: () => ({
        metrics: [
          { label: 'Next 6 months · low', value: `${whole(model.totals.low)} units`, detail: 'Sum of the six low-path months' },
          { label: 'Next 6 months · base', value: `${whole(model.totals.base)} units`, detail: `${percent(model.growth)} monthly growth assumption` },
          { label: 'Next 6 months · high', value: `${whole(model.totals.high)} units`, detail: 'Scenario alternative, not a probability bound' },
        ],
        legend: Object.entries(colors).map(([label, color]) => ({ label: label === 'history' ? 'Historical (synthetic)' : `${label[0].toUpperCase()}${label.slice(1)} scenario`, color })),
        table: { caption: 'Synthetic monthly whole units. Historical rows stay fixed; modeled rows are assumptions, not measured outcomes.', columns: ['Month', 'Status', 'Historical units', 'Low units', 'Base units', 'High units'], rows: [...model.history.map(row => [`M${row.month}`, 'Historical', row.units, '—', '—', '—']), ...model.future.map(row => [`M${row.month}`, 'Modeled', '—', row.low, row.base, row.high])] },
      }),
    };
  },
};
export default example;
