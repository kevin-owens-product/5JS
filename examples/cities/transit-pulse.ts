import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

const ROUTES = [
  { name: 'Harbor loop', length: 7.2, demand: 4200, color: '#71eddb' },
  { name: 'Skyline express', length: 9.6, demand: 3100, color: '#bd9cff' },
  { name: 'Garden circuit', length: 5.4, demand: 2200, color: '#ffc77f' },
];
export interface TransitSettings { speed: number; trains: number; demand: number }
export function transitService(input: TransitSettings) {
  if (!Number.isFinite(input.speed) || input.speed < 18 || input.speed > 54 || !Number.isInteger(input.trains) || input.trains < 4 || input.trains > 14 || !Number.isFinite(input.demand) || input.demand < .5 || input.demand > 1.8) throw new RangeError('Invalid synthetic transit service.');
  return ROUTES.map(route => {
    const departures = input.trains * input.speed / route.length;
    const capacity = departures * 120;
    const demand = Math.round(route.demand * input.demand);
    return { ...route, departures, capacity, demand, headway: 60 / departures, served: Math.min(capacity, demand) };
  });
}

function routePoint(route: number, angle: number): Position {
  const a = angle + route * .6;
  if (route === 0) return [4.6 * Math.cos(a), .8 + .28 * Math.sin(a * 2), 2.9 * Math.sin(a)];
  if (route === 1) return [3.4 * Math.cos(a), 1.7 + .5 * Math.cos(a * 2), 3.8 * Math.sin(a)];
  return [4.2 * Math.cos(a), 2.5 + .34 * Math.sin(a * 3), 1.7 * Math.sin(a)];
}

const example: ExampleDefinition = {
  id: 'transit-pulse', title: 'Transit pulse', category: 'Cities',
  summary: 'A layered city railway braids luminous trains through three elevated loops.',
  description: 'Three transit circuits weave above a miniature city. Large moving lights represent the configured trains, while fine trails reveal direction. Change service speed, fleet size, and passenger demand; the model recomputes headways and theoretical hourly capacity without turning the decorative trails into passengers.',
  tags: ['Urban mobility', 'Elevated routes', 'Service scenarios'], difficulty: 'Advanced', accent: '#71eddb',
  camera: [9, 8.2, 12], target: [0, 1.2, 0], bloom: .48,
  dataNote: 'Synthetic three-line transit concept. Each train has 120 spaces. Departures/hour = trains × speed(km/h) ÷ route length(km); capacity = departures × 120. Headway = 60 ÷ departures. Served demand is min(demand, capacity); no dwell time, congestion, transfers, or operational delays. Route geometry is schematic and not geographically scaled. Train animation runs 60× clock time; fine trails are illustrative.',
  setup(app) {
    let input: TransitSettings = { speed: 36, trains: 8, demand: 1 };
    let rows = transitService(input);
    function draw(chart: ChartBuilder) {
      chart.box({ x: 0, y: -.4, z: 0, width: 10.7, height: .16, depth: 9, color: '#122832' });
      for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) {
        const height = .2 + ((x * x + z * z * 3 + 7) % 5) * .12;
        chart.box({ x: x * 1.25, y: height / 2 - .3, z: z * 1.35, width: .68, height, depth: .7, color: '#254655', opacity: .65 });
      }
      for (let x = -4; x <= 4; x += 2) chart.line([[x,-.3,-4],[x,-.3,4]], '#37606a', .4);
      for (let z = -3; z <= 3; z += 2) chart.line([[-5,-.3,z],[5,-.3,z]], '#37606a', .4);
      rows.forEach((row, i) => {
        const path = Array.from({ length: 97 }, (_, j) => routePoint(i, j / 96 * Math.PI * 2));
        chart.tube(path, row.color, .033, .7);
        chart.flow(path, { color: row.color, count: 360, speed: input.speed / row.length / 60, size: .025, spread: .018, seed: 31 + i });
        // Each of these larger lights is one configured train.
        chart.flow(path, { color: '#efffff', count: input.trains, speed: input.speed / row.length / 60, size: .24, spread: 0, seed: 71 + i });
        for (let station = 0; station < 8; station++) {
          const p = routePoint(i, station / 8 * Math.PI * 2);
          chart.ring(p, .13, row.color, .022);
          chart.line([[p[0],-.3,p[2]],p], '#426577', .45);
          chart.point([p[0], -.28, p[2]], '#36566b', .055);
        }
        const label: Position = [-5.1, 3.8 - i * .5, 0];
        chart.label(row.name.toUpperCase(), label, .21, row.color);
      });
      chart.label('SYNTHETIC CITY / 24 STATIONS', [0,-.7,4.6], .21, '#9bb6c6');
    }
    const layer = createChartLayer(draw); app.add(layer);
    function change(patch: Partial<TransitSettings>) { const next = { ...input, ...patch }; const result = transitService(next); input = next; rows = result; layer.redraw(draw); }
    return {
      controls: [
        { id: 'speed', label: 'Service speed', min: 18, max: 54, step: 1, value: 36, format: v => `${v} km/h`, apply: v => change({ speed: v }) },
        { id: 'trains', label: 'Trains per route', min: 4, max: 14, step: 1, value: 8, apply: v => change({ trains: v }) },
        { id: 'demand', label: 'Passenger demand', min: .5, max: 1.8, step: .05, value: 1, format: v => `${v.toFixed(2)}×`, apply: v => change({ demand: v }) },
      ],
      readout: () => ({
        metrics: [
          { label: 'Trains in circulation', value: String(input.trains * 3), detail: 'Large lights; three routes' },
          { label: 'Theoretical capacity / h', value: Math.round(rows.reduce((s,r)=>s+r.capacity,0)).toLocaleString('en-US'), detail: '120 spaces per train' },
          { label: 'Unserved demand / h', value: Math.round(rows.reduce((s,r)=>s+r.demand-r.served,0)).toLocaleString('en-US'), detail: 'Demand above modeled capacity' },
        ],
        legend: rows.map(row => ({ label: row.name, color: row.color })),
        table: { caption: 'Synthetic line service. Decimal results rounded for display only.', columns: ['Route','Length km','Headway min','Capacity / h','Demand / h','Served / h'], rows: rows.map(r=>[r.name,r.length,+r.headway.toFixed(2),+r.capacity.toFixed(2),r.demand,+r.served.toFixed(2)]) },
      }),
    };
  },
};
export default example;
