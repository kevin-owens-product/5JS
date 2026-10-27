import { createChartLayer, type ChartBuilder } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export const WORK_CENTERS = Object.freeze([
  { name: 'Cutting', load: 120, capacity: 160 },
  { name: 'Assembly', load: 180, capacity: 200 },
  { name: 'Finishing', load: 150, capacity: 160 },
  { name: 'QA', load: 105, capacity: 140 },
  { name: 'Packing', load: 130, capacity: 150 },
]);
export interface CapacityInput { demand: number; overtime: number; downtime: number }
const precision = (value: number) => Math.round(value * 100) / 100;
export function calculateCapacity(input: CapacityInput) {
  if (!Object.values(input).every(Number.isFinite) || input.demand < 0 || input.overtime < 0 || input.downtime < 0 || input.downtime >= 1) throw new RangeError('Demand and overtime must be nonnegative; downtime must be in [0, 1).');
  const rows = WORK_CENTERS.map(center => {
    const load = precision(center.load * input.demand);
    const capacity = precision(center.capacity * (1 + input.overtime) * (1 - input.downtime));
    if (!Number.isFinite(load) || !Number.isFinite(capacity) || capacity <= 0) throw new RangeError('Scaled load must remain finite and rounded capacity must remain positive and finite.');
    const utilization = load / capacity;
    if (!Number.isFinite(utilization)) throw new RangeError('Utilization must remain finite.');
    return { name: center.name, load, capacity, utilization, uncovered: precision(Math.max(0, load - capacity)) };
  });
  const load = precision(rows.reduce((sum, row) => sum + row.load, 0));
  const capacity = precision(rows.reduce((sum, row) => sum + row.capacity, 0));
  if (!Number.isFinite(load) || !Number.isFinite(capacity)) throw new RangeError('Aggregate load and capacity must remain finite.');
  const weightedUtilization = load / capacity;
  if (!Number.isFinite(weightedUtilization)) throw new RangeError('Weighted utilization must remain finite.');
  return { rows, load, capacity, weightedUtilization, uncovered: precision(rows.reduce((sum, row) => sum + row.uncovered, 0)) };
}
const hours = (value: number) => `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} h`;
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const example: ExampleDefinition = {
  id: 'capacity-planning', title: 'Capacity planning', category: 'Business',
  summary: 'Run a luminous factory line and expose capacity bottlenecks.',
  description: 'Five work-center reactors form a connected production line. Each inner arc fills one turn at 100% utilization; a second coral arc shows excess load above 100%. Live particles trace the illustrative process direction while the gauges and exact hour labels respond to demand, overtime, and downtime.',
  tags: ['Digital factory', 'Flow network', 'Utilization'], difficulty: 'Advanced', accent: '#8dd9d0',
  camera: [7.2, 6.8, 12.3], target: [0, 1.1, 0], bloom: .48,
  dataNote: 'Synthetic hours/week by work center. Load = baseline hours × demand multiplier. Capacity = baseline capacity × (1+overtime) × (1−downtime), rounded to 0.01h. Uncovered hours = max(load−capacity,0) per center; spare hours cannot transfer between centers. Weighted utilization = total load/total capacity. Pod positions form a process diagram, not numeric axes. Inner arc = min(utilization,100%); outer arc = excess above 100%, with a second full turn representing 200% total. Moving particles illustrate direction, not measured jobs, throughput, or a queue simulation.',
  setup(app) {
    let input: CapacityInput = { demand: 1.1, overtime: .1, downtime: .05 };
    let model = calculateCapacity(input);
    function draw(chart: ChartBuilder) {
      const positions: [number, number, number][] = model.rows.map((_, index) => [-4.3 + index * 2.15, 1.2, index % 2 === 0 ? .65 : -.65]);
      const rail = positions.flatMap(([x, y, z], i) => i ? [[x - .6, .15, z] as [number, number, number], [x, .15, z] as [number, number, number]] : [[x - .9, .15, z] as [number, number, number], [x, .15, z] as [number, number, number]]);
      chart.ribbon(rail, .32, '#1b4b67', .35);
      chart.tube(rail, '#2c7b99', .025, .8);
      chart.flow(rail, { color: '#71dfff', count: 480, speed: .14, size: .045, spread: .08, seed: 61 });
      chart.label('PRODUCTION CIRCUIT', [0, -.45, 2.25], .3, '#a3e8ee');
      chart.label('INNER TURN 0–100%  ·  OUTER TURN 100–200%', [0, -.95, 2.25], .19, '#6c97b1');
      model.rows.forEach((row, index) => {
        const [x, y, z] = positions[index];
        const hot = row.uncovered > 0, color = hot ? '#ff7c72' : '#64e1cb';
        const arc = (radius: number, fraction: number): [number, number, number][] => Array.from({ length: 81 }, (_, i) => {
          const angle = -Math.PI / 2 + Math.max(0, Math.min(1, fraction)) * Math.PI * 2 * i / 80;
          return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z + .16];
        });
        // Reactor plinth and an illuminated cage give each work center a physical home.
        chart.ring([x, .05, z], .73, '#254c69', .035, 'y');
        chart.ring([x, .12, z], .5, '#3d9cb0', .018, 'y');
        for (const side of [-1, 1]) chart.tube([[x + side * .48, .12, z], [x + side * .48, .68, z], [x + side * .33, .92, z]], '#265d7f', .022, .65);
        chart.ring([x, y, z], .69, '#233d59', .055, 'z');
        chart.ring([x, y, z], .88, '#1c3046', .018, 'z');
        if (row.utilization > 0) chart.tube(arc(.69, row.utilization), color, .055);
        if (row.utilization > 1) chart.tube(arc(.88, row.utilization - 1), '#ff7c72', .045);
        chart.glow([x, y, z - .08], color, .6);
        chart.point([x, y, z], color, .12);
        chart.flow(arc(.69, Math.min(row.utilization, 1)), { color, count: 105, speed: .18, size: .035, spread: .015, seed: 70 + index });
        chart.label(pct(row.utilization), [x, y, z + .22], .25, '#e0fff6');
        chart.label(row.name.toUpperCase(), [x, 2.5, z], .25, color);
        chart.label(`${hours(row.load)} / ${hours(row.capacity)}`, [x, 2.17, z], .18, '#94b9cf');
        if (hot) {
          chart.label(`+${hours(row.uncovered)} UNCOVERED`, [x, 2.84, z], .18, '#ffb5a3');
          chart.glow([x, y, z - .2], '#ff5c73', 1.15);
        }
        if (index < positions.length - 1) {
          const next = positions[index + 1];
          const path: [number, number, number][] = [[x + .75, y, z], [x + 1.05, 1.8, z], [next[0] - 1.05, 1.8, next[2]], [next[0] - .75, next[1], next[2]]];
          const routeColor = hot || model.rows[index + 1].uncovered > 0 ? '#f8a46e' : '#65c6fc';
          chart.tube(path, routeColor, .025, .55);
          chart.flow(path, { color: routeColor, count: 95, speed: .35, size: .045, spread: .045, seed: 80 + index });
        }
      });
    }
    const layer = createChartLayer(draw); app.add(layer);
    function change(patch: Partial<CapacityInput>) { const next = { ...input, ...patch }; const result = calculateCapacity(next); input = next; model = result; layer.redraw(draw); }
    return {
      controls: [
        { id: 'demand', label: 'Workload multiplier', min: .6, max: 1.5, step: .05, value: 1.1, format: value => `${value.toFixed(2)}×`, apply: value => change({ demand: value }) },
        { id: 'overtime', label: 'Overtime capacity', min: 0, max: .4, step: .05, value: .1, format: pct, apply: value => change({ overtime: value }) },
        { id: 'downtime', label: 'Unavailable time', min: 0, max: .25, step: .05, value: .05, format: pct, apply: value => change({ downtime: value }) },
      ],
      readout: () => ({
        metrics: [
          { label: 'Scheduled weekly load', value: hours(model.load), detail: 'Sum of all work-center load' },
          { label: 'Available capacity', value: hours(model.capacity), detail: `${hours(model.uncovered)} locally uncovered` },
          { label: 'Weighted utilization', value: pct(model.weightedUtilization), detail: 'Total load ÷ total capacity' },
        ],
        legend: [{ label: 'Inner arc: utilized share of capacity', color: '#64e1cb' }, { label: 'Outer coral arc: load above 100%', color: '#ff7c72' }, { label: 'Illustrative process direction', color: '#65c6fc' }],
        table: { caption: 'Synthetic weekly hours. Local shortfalls are summed without offsetting spare capacity elsewhere.', columns: ['Work center', 'Load h', 'Capacity h', 'Utilization %', 'Uncovered h'], rows: model.rows.map(row => [row.name, row.load, row.capacity, Number((row.utilization * 100).toFixed(2)), row.uncovered]) },
      }),
    };
  },
};
export default example;
