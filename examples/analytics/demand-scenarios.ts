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
  summary: 'Unfold three crystalline demand sails from a fixed historical spine.',
  description: 'A fixed historical spine unfolds into three crystalline scenario sails. Change growth, seasonality, or spread to reshape their illuminated crests and monthly cross-sections. Each sail rises from zero to its exact modeled demand; the widely separated alternatives reveal how the same assumptions compound over six future months.',
  tags: ['Scenario fan', 'Sensitivity', 'Future alternatives'], difficulty: 'Advanced', accent: '#9ed5ff',
  camera: [9.1, 7.2, 12.6], target: [.15, 2, 0], bloom: .3,
  dataNote: 'Synthetic units/month. History is fixed. At horizon h=1…6: unrounded base = 1,300 × (1+growth)^h × [1+seasonality×sin(2πh/12)]. Low/high multiply that base by [1∓spread×h/6]; each path is rounded to whole units. Spread is an assumption, not a confidence level. No model fitting or probability estimates. X is linear month; all sail heights share a fixed 0–3,000 unit scale and start at zero. Depth separates low/base/high alternatives and has no quantitative meaning; lanes stay separate even when spread is zero. Facets and cross-sections interpolate the exact monthly knots, not likelihood. Traveling tracers illustrate horizon direction and never change the model.',
  setup(app) {
    let input: DemandInput = { growth: .025, seasonality: .12, spread: .18 };
    let model = calculateDemandScenarios(input);
    const colors = { history: '#b5cbde', low: '#75beff', base: '#b7efb2', high: '#ffc48c' };
    const x = (month: number) => -5.2 + (month - 1) * 10.4 / 17;
    const y = (units: number) => units / 500;
    const layer = createChartLayer(chart => draw(chart));
    function draw(chart: ChartBuilder) {
      type P = [number, number, number];
      const depth = (horizon: number, side: number) => side * (horizon / 6) ** .72 * 3.4;
      chart.frame({ x: [-5.4, 5.4], y: [0, 6], z: [-3.6, 3.6],
        xTicks: [1, 3, 6, 9, 12, 15, 18].map(month => ({ value: x(month), label: `M${month}` })),
        yTicks: [0, 600, 1200, 1800, 2400, 3000].map(value => ({ value: y(value), label: whole(value) })), xLabel: 'Month', yLabel: 'Units / month' });
      const history: P[] = model.history.map(row => [x(row.month), y(row.units), 0]);
      chart.tube(history, colors.history, .035, .9);
      chart.flow(history, { color: '#d3e8fa', count: 160, size: .028, speed: .075, spread: .018, seed: 7 });
      const historyCurtain = model.history.map(row => [[x(row.month), 0, 0], [x(row.month), y(row.units), 0]] as P[]);
      chart.surface(historyCurtain, historyCurtain.map(() => ['#192b40', colors.history]), .2);
      model.history.forEach(row => {
        chart.line([[x(row.month), 0, 0], [x(row.month), y(row.units), 0]], colors.history, .14);
        chart.point([x(row.month), y(row.units), 0], colors.history, .045);
      });
      chart.line([[x(12), 0, -3.6], [x(12), 0, 3.6]], '#94a8b5', .4);
      chart.label('FIXED HISTORY', [x(5), 3.2, -.25], .22, colors.history);
      chart.label('SIX MONTHS / THREE ALTERNATIVES', [x(15), 6.3, -.3], .2, '#b9d9ed');
      const anchor = { month: 12, horizon: 0, low: HISTORICAL_DEMAND[11], base: HISTORICAL_DEMAND[11], high: HISTORICAL_DEMAND[11] };
      const future = [anchor, ...model.future];
      const membrane: P[][] = future.map(row => Array.from({ length: 17 }, (_, i) => {
        const t = i / 16, units = t <= .5 ? row.low + (row.base - row.low) * t * 2 : row.base + (row.high - row.base) * (t - .5) * 2;
        return [x(row.month), y(units), depth(row.horizon, t * 2 - 1)];
      }));
      const shades = membrane.map(() => Array.from({ length: 17 }, (_, i) => i < 5 ? '#4f9de2' : i > 11 ? '#dfa06a' : '#7eb995'));
      chart.surface(membrane, shades, .2);
      for (let i = 1; i < membrane.length; i++) {
        chart.tube(membrane[i], '#d3e5ef', .01, .5);
        if (i % 2 === 0) chart.label(`M${future[i].month}`, [x(future[i].month), .1, depth(i, 1) + .3], .16, '#93b2c6');
      }
      for (const name of ['low', 'base', 'high'] as const) {
        const side = name === 'low' ? -1 : name === 'high' ? 1 : 0;
        const points: P[] = future.map(row => [x(row.month), y(row[name]), depth(row.horizon, side)]);
        // Each sail is an area-to-zero section, with faceted ribs at actual monthly knots.
        const sail: P[][] = future.map(row => [0, .34, .68, 1].map(fraction =>
          [x(row.month), y(row[name]) * fraction, depth(row.horizon, side)] as P));
        chart.surface(sail, sail.map((_, i) => ['#0b2335', i % 2 ? '#30627b' : '#244654', colors[name], colors[name]]), name === 'high' ? .25 : .34);
        chart.line(future.map(row => [x(row.month), 0, depth(row.horizon, side)]), colors[name], .45);
        chart.tube(points, colors[name], name === 'base' ? .05 : .035, .95);
        chart.flow(points, { color: colors[name], count: name === 'base' ? 170 : 120, size: .04, speed: .12, spread: .025, seed: 31 + side });
        for (let i = 0; i < model.future.length; i++) {
          const row = model.future[i], z = depth(row.horizon, side), crest: P = [x(row.month), y(row[name]), z];
          chart.tube([[x(row.month), 0, z], crest], colors[name], .009, .48);
          chart.point(crest, colors[name], .06);
          if (i > 0) {
            const prior = model.future[i - 1];
            chart.line([[x(prior.month), 0, depth(prior.horizon, side)], crest], colors[name], .2);
          }
        }
        const last = model.future.at(-1)!;
        const endpoint: P = [x(18), y(last[name]), side * 3.4];
        chart.glow(endpoint, colors[name], .48);
        chart.label(`${name.toUpperCase()} · ${whole(last[name])}`, [x(18) + .2, y(last[name]) + .27, side * 3.4], .23, colors[name]);
      }
      chart.label('DEPTH SEPARATES SCENARIOS / NO PROBABILITIES', [x(14), .08, 4.05], .15, '#8aa9bd');
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
