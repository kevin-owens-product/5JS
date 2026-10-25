import { createChartLayer, type ChartBuilder } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export const INVENTORY_ITEMS = Object.freeze([
  { sku: 'A-01', stock: 520, demand: 28, leadDays: 10 },
  { sku: 'B-02', stock: 360, demand: 18, leadDays: 8 },
  { sku: 'C-03', stock: 180, demand: 12, leadDays: 14 },
  { sku: 'D-04', stock: 700, demand: 35, leadDays: 12 },
  { sku: 'E-05', stock: 140, demand: 10, leadDays: 7 },
  { sku: 'F-06', stock: 410, demand: 22, leadDays: 9 },
]);
export interface InventoryInput { demandMultiplier: number; safetyDays: number; stockMultiplier: number }
export function calculateInventoryCoverage(input: InventoryInput) {
  if (!Object.values(input).every(Number.isFinite) || input.demandMultiplier <= 0 || input.safetyDays < 0 || input.stockMultiplier < 0) throw new RangeError('Demand must be positive; safety days and stock multipliers must be nonnegative.');
  const rows = INVENTORY_ITEMS.map(item => {
    const stock = Math.round(item.stock * input.stockMultiplier);
    const dailyDemand = Math.round(item.demand * input.demandMultiplier * 100) / 100;
    if (dailyDemand <= 0) throw new RangeError('Rounded daily demand must remain positive.');
    const thresholdDays = item.leadDays + input.safetyDays;
    const reorderPoint = Math.round(dailyDemand * thresholdDays * 100) / 100;
    const targetUnits = Math.round(dailyDemand * (thresholdDays + 7) * 100) / 100;
    const reorder = stock <= reorderPoint;
    return { sku: item.sku, stock, dailyDemand, leadDays: item.leadDays, safetyDays: input.safetyDays, coverageDays: stock / dailyDemand, thresholdDays, reorderPoint, targetUnits, reorder, suggestedUnits: reorder ? Math.max(0, Math.ceil(targetUnits - stock)) : 0 };
  });
  const stock = rows.reduce((sum, row) => sum + row.stock, 0);
  const dailyDemand = Math.round(rows.reduce((sum, row) => sum + row.dailyDemand, 0) * 100) / 100;
  return { rows, stock, dailyDemand, portfolioCoverage: stock / dailyDemand, atThreshold: rows.filter(row => row.reorder).length, suggestedUnits: rows.reduce((sum, row) => sum + row.suggestedUnits, 0) };
}
const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
const example: ExampleDefinition = {
  id: 'inventory-coverage', title: 'Inventory coverage', category: 'Business',
  summary: 'Explore a supply constellation that lights up replenishment routes.',
  description: 'Six SKU satellites surround a supply hub. Each orbital gauge maps a full turn to 60 days of coverage; a gold beacon marks the lead-time-plus-safety threshold. When a SKU reaches its reorder point, an arched replenishment route lights up and carries illustrative pulses from the hub.',
  tags: ['Supply network', 'Orbital gauges', 'Replenishment'], difficulty: 'Advanced', accent: '#9cd6d0',
  camera: [7.8, 9.6, 11.7], target: [0, .8, 0], bloom: .52,
  dataNote: 'Synthetic stock units by SKU and average units/day. Adjusted stock rounds to whole units; adjusted demand rounds to 0.01 units/day. Coverage = stock/daily demand. Reorder point = daily demand × (lead days+safety days), rounded to 0.01 units. Flag if stock ≤ point. When flagged, order whole units up to daily demand × (lead+safety+7 days); otherwise order zero. One complete gauge turn is 60 days; the gold tick marks lead+safety days. Satellite positions are diagram layout. Animated pulses indicate a proposed replenishment route, not real shipments or unit counts. No receipts, backorders, lot sizes, or demand variability are modeled.',
  setup(app) {
    let input: InventoryInput = { demandMultiplier: 1, safetyDays: 7, stockMultiplier: 1 };
    let model = calculateInventoryCoverage(input);
    function draw(chart: ChartBuilder) {
      const hub: [number, number, number] = [0, .7, 0];
      chart.ring([0, .05, 0], 1.13, '#253a62', .035, 'y');
      chart.ring(hub, .68, '#76c8ff', .025, 'y');
      chart.ring(hub, .46, '#8ef5dd', .035, 'x');
      chart.ring(hub, .46, '#8ef5dd', .018, 'z');
      chart.glow(hub, '#5cdde8', 1.5);
      chart.point(hub, '#a2f1eb', .17);
      chart.label('SUPPLY HUB', [0, 1.55, 0], .28, '#c5ffef');
      chart.label(`${number(model.suggestedUnits)} UNITS PROPOSED`, [0, 1.95, 0], .18, '#8db9d0');
      const hubOrbit: [number, number, number][] = Array.from({ length: 65 }, (_, i) => [Math.cos(i / 64 * Math.PI * 2) * 1.05, .08, Math.sin(i / 64 * Math.PI * 2) * 1.05]);
      chart.flow(hubOrbit, { color: '#77d5ff', count: 220, speed: .09, size: .04, spread: .03, seed: 92 });
      model.rows.forEach((row, index) => {
        const angle = index / model.rows.length * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(angle) * 3.8, z = Math.sin(angle) * 3.8, y = .35;
        const color = row.reorder ? '#ff8d86' : '#67dfbd';
        const point = (radius: number, fraction: number): [number, number, number] => {
          const phase = -Math.PI / 2 + fraction * Math.PI * 2;
          return [x + Math.cos(phase) * radius, y, z + Math.sin(phase) * radius];
        };
        chart.ring([x, y, z], .78, '#203a59', .065, 'y');
        chart.ring([x, .06, z], .96, '#1d3852', .016, 'y');
        const arc: [number, number, number][] = Array.from({ length: 65 }, (_, i) => point(.78, row.coverageDays / 60 * i / 64));
        if (row.coverageDays > 0) chart.tube(arc, color, .063);
        const threshold = point(.78, row.thresholdDays / 60);
        chart.point(threshold, '#ffcf7f', .1);
        chart.glow(threshold, '#ffd18b', .3);
        chart.tube([[x, .12, z], [x, .85, z]], color, .026, .75);
        chart.glow([x, .65, z], color, .68);
        chart.point([x, .67, z], color, .13);
        chart.label(row.sku, [x, 1.48, z], .25, '#d6f8f1');
        chart.label(`${row.coverageDays.toFixed(1)} DAYS`, [x, 1.15, z], .2, color);
        chart.label(`REORDER ≤ ${row.thresholdDays}d`, [x, -.25, z + .5], .15, '#d6b988');
        const path: [number, number, number][] = [hub, [x * .35, 2.1 + index % 2 * .35, z * .35], [x * .8, 1.7, z * .8], [x, .72, z]];
        chart.tube(path, row.reorder ? '#6dbbff' : '#284763', row.reorder ? .04 : .014, row.reorder ? .8 : .4);
        if (row.reorder) {
          chart.flow(path, { color: '#9edfff', count: 210, speed: .16, size: .05, spread: .075, seed: 100 + index });
          chart.label(`+${number(row.suggestedUnits)} UNITS`, [x, 1.83, z], .18, '#a3dfff');
        }
      });
      chart.label('ORBITAL COVERAGE  ·  ONE TURN = 60 DAYS', [0, -.45, 5.05], .21, '#8daec9');
    }
    const layer = createChartLayer(draw); app.add(layer);
    function change(patch: Partial<InventoryInput>) { const next = { ...input, ...patch }; const result = calculateInventoryCoverage(next); input = next; model = result; layer.redraw(draw); }
    return {
      controls: [
        { id: 'demand', label: 'Daily demand multiplier', min: .6, max: 1.8, step: .05, value: 1, format: value => `${value.toFixed(2)}×`, apply: value => change({ demandMultiplier: value }) },
        { id: 'safety-days', label: 'Safety-stock days', min: 2, max: 12, step: 1, value: 7, format: value => `${value} days`, apply: value => change({ safetyDays: value }) },
        { id: 'stock', label: 'On-hand stock multiplier', min: .5, max: 1.5, step: .05, value: 1, format: value => `${value.toFixed(2)}×`, apply: value => change({ stockMultiplier: value }) },
      ],
      readout: () => ({
        metrics: [
          { label: 'At/below reorder point', value: `${model.atThreshold} / ${model.rows.length} SKUs`, detail: 'Equality triggers the policy flag' },
          { label: 'Portfolio coverage', value: `${model.portfolioCoverage.toFixed(2)} days`, detail: `${number(model.stock)} units ÷ ${number(model.dailyDemand)} units/day` },
          { label: 'Suggested replenishment', value: `${number(model.suggestedUnits)} units`, detail: 'When flagged, order up to lead + safety + 7 days; no order lot' },
        ],
        legend: [{ label: 'Coverage arc above reorder threshold', color: '#67dfbd' }, { label: 'Coverage at/below reorder threshold', color: '#ff8d86' }, { label: 'Lead + safety beacon', color: '#ffcf7f' }, { label: 'Proposed route · illustrative pulses', color: '#9edfff' }],
        table: { caption: 'Synthetic current stock and daily demand. Ratios display two decimals; proposed units use the stated seven-day order-up-to policy.', columns: ['SKU', 'Stock units', 'Units/day', 'Coverage days', 'Lead days', 'Safety days', 'Reorder point units', 'Order-up-to units', 'Suggested units', 'Policy status'], rows: model.rows.map(row => [row.sku, row.stock, row.dailyDemand, Number(row.coverageDays.toFixed(2)), row.leadDays, row.safetyDays, row.reorderPoint, row.targetUnits, row.suggestedUnits, row.reorder ? 'At/below point' : 'Above point']) },
      }),
    };
  },
};
export default example;
