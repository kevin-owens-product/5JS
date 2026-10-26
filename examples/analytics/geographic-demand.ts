import type { ExampleDefinition } from '../types.js';
import { createChartLayer, type ChartBuilder } from '../shared/chart.js';

export const DEMAND_CITIES = [
  { city: 'Westport', region: 1, longitude: -123, latitude: 47, orders: 4200, aov: 85 },
  { city: 'Bayview', region: 1, longitude: -122, latitude: 38, orders: 5100, aov: 110 },
  { city: 'Sunridge', region: 1, longitude: -118, latitude: 34, orders: 6200, aov: 95 },
  { city: 'Highland', region: 1, longitude: -105, latitude: 40, orders: 2900, aov: 90 },
  { city: 'Crossroads', region: 2, longitude: -97, latitude: 33, orders: 4700, aov: 80 },
  { city: 'Lakeside', region: 2, longitude: -88, latitude: 42, orders: 5300, aov: 105 },
  { city: 'Southgate', region: 2, longitude: -90, latitude: 30, orders: 2400, aov: 75 },
  { city: 'Pinecrest', region: 3, longitude: -84, latitude: 34, orders: 3800, aov: 88 },
  { city: 'Coastline', region: 3, longitude: -80, latitude: 26, orders: 3100, aov: 92 },
  { city: 'Capital', region: 3, longitude: -77, latitude: 39, orders: 4900, aov: 115 },
  { city: 'Harbor', region: 3, longitude: -74, latitude: 41, orders: 7100, aov: 120 },
  { city: 'Northhaven', region: 3, longitude: -71, latitude: 44, orders: 2700, aov: 98 },
] as const;
const REGIONS = ['All regions', 'West', 'Central', 'East'];
const COLORS = ['#7ecfbd', '#e6bc7d', '#b8a4eb'];
export interface DemandSettings { region: number; uplift: number; minimumOrders: number }

export function calculateGeographicDemand(settings: DemandSettings = { region: 0, uplift: 0, minimumOrders: 0 }) {
  if (!Number.isInteger(settings.region) || settings.region < 0 || settings.region > 3 || !Number.isFinite(settings.uplift) || settings.uplift < -30 || settings.uplift > 50 || !Number.isFinite(settings.minimumOrders) || settings.minimumOrders < 0 || settings.minimumOrders > 6000) throw new RangeError('Invalid geographic demand scenario.');
  const rows = DEMAND_CITIES.filter(row => settings.region === 0 || row.region === settings.region)
    .map(row => { const orders = Math.round(row.orders * (1 + settings.uplift / 100)); return { ...row, baselineOrders: row.orders, orders, revenue: orders * row.aov }; })
    .filter(row => row.orders >= settings.minimumOrders);
  return { rows, orders: rows.reduce((sum, row) => sum + row.orders, 0), revenue: rows.reduce((sum, row) => sum + row.revenue, 0) };
}

/** Small deterministic Delaunay mesh in the displayed degree-coordinate plane. */
function triangulate(points: { x: number; z: number }[]): number[][] {
  if (points.length < 3) return [];
  const vertices = [...points, { x: -100, z: -100 }, { x: 100, z: -100 }, { x: 0, z: 100 }];
  let triangles = [[points.length, points.length + 1, points.length + 2]];
  function contains(triangle: number[], index: number) {
    const p = vertices[index], a = vertices[triangle[0]], b = vertices[triangle[1]], c = vertices[triangle[2]];
    const ax = a.x - p.x, az = a.z - p.z, bx = b.x - p.x, bz = b.z - p.z, cx = c.x - p.x, cz = c.z - p.z;
    const determinant = (ax * ax + az * az) * (bx * cz - bz * cx) - (bx * bx + bz * bz) * (ax * cz - az * cx) + (cx * cx + cz * cz) * (ax * bz - az * bx);
    const orientation = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    return orientation > 0 ? determinant > 1e-10 : determinant < -1e-10;
  }
  for (let i = 0; i < points.length; i++) {
    const bad = triangles.filter(triangle => contains(triangle, i));
    const boundary = new Map<string, { edge: [number, number]; count: number }>();
    for (const triangle of bad) for (let j = 0; j < 3; j++) {
      const edge: [number, number] = [triangle[j], triangle[(j + 1) % 3]], key = [...edge].sort((a, b) => a - b).join(':');
      const current = boundary.get(key);
      if (current) current.count++; else boundary.set(key, { edge, count: 1 });
    }
    triangles = triangles.filter(triangle => !bad.includes(triangle));
    for (const { edge, count } of boundary.values()) if (count === 1) triangles.push([...edge, i]);
  }
  return triangles.filter(triangle => triangle.every(index => index < points.length));
}

const example: ExampleDefinition = {
  id: 'geographic-demand', title: 'Geographic demand', category: 'Analytics',
  summary: 'Explore a triangulated demand topography anchored to exact city coordinates.',
  description: 'A faceted demand canopy rises from a longitude–latitude lattice. Every city is an exact height anchor; luminous contour traces reveal the interpolated surface between them. Filter regions, raise the minimum-order plane, or model a demand change to reshape the canopy and inspect the cities that remain.',
  tags: ['Demand topography', 'Triangulated surface', 'Spatial filters'], difficulty: 'Advanced', accent: '#e6bc7d',
  camera: [8.4, 8.4, 10.8], target: [0, 1.9, 0], bloom: .26,
  dataNote: 'Synthetic one-month orders for 12 fictional cities at illustrative longitude/latitude coordinates. Modeled orders = round(baseline orders × (1 + uplift / 100)); revenue = modeled orders × fixed city AOV in USD. Minimum orders filters the modeled count. X is −125° to −65° longitude, Z 25° to 50° latitude, Y 0–12,000 orders. Terrain vertices are the displayed city values; triangles interpolate between them and are not additional demand observations or a spatial forecast. Mesh edges are not transport routes. Contour tracers scan order levels without changing values. Linear degree spacing is not a geographic distance projection, area map, or real demand dataset.',
  setup(app) {
    const settings: DemandSettings = { region: 0, uplift: 0, minimumOrders: 0 };
    let state = calculateGeographicDemand(settings);
    const x = (longitude: number) => -4.7 + (longitude + 125) / 60 * 9.4;
    const z = (latitude: number) => -2.6 + (latitude - 25) / 25 * 5.2;
    const draw = (chart: ChartBuilder) => {
      type P = [number, number, number];
      chart.frame({ x: [-4.7, 4.7], y: [0, 5], z: [-2.6, 2.6], xLabel: 'Longitude (degrees)', yLabel: 'Monthly orders', zLabel: 'Latitude (degrees)',
        xTicks: [-125, -110, -95, -80, -65].map(value => ({ value: x(value), label: `${Math.abs(value)}°W` })),
        zTicks: [25, 30, 35, 40, 45, 50].map(value => ({ value: z(value), label: `${value}°N` })),
        yTicks: [0, 4000, 8000, 12000].map(value => ({ value: value / 2400, label: `${value / 1000}k` })) });
      const map = DEMAND_CITIES.map(row => ({ x: x(row.longitude), z: z(row.latitude) }));
      for (const triangle of triangulate(map)) {
        const points: P[] = triangle.map(index => [map[index].x, 0, map[index].z]);
        chart.surface([[points[0], points[1]], [points[2], points[2]]], [['#163343', '#163343'], ['#163343', '#163343']], .42);
        chart.line([...points, points[0]], '#335064', .35);
      }
      const anchors = state.rows.map(row => ({ x: x(row.longitude), z: z(row.latitude) }));
      const triangles = triangulate(anchors), edges = new Map<string, { a: P; b: P; count: number }>();
      for (const triangle of triangles) {
        const points: P[] = triangle.map(index => [anchors[index].x, state.rows[index].orders / 2400, anchors[index].z]);
        const hues = triangle.map(index => COLORS[state.rows[index].region - 1]);
        chart.surface([[points[0], points[1]], [points[2], points[2]]], [[hues[0], hues[1]], [hues[2], hues[2]]], .48);
        for (let i = 0; i < 3; i++) {
          const key = [triangle[i], triangle[(i + 1) % 3]].sort((a, b) => a - b).join(':');
          const edge = edges.get(key);
          if (edge) edge.count++; else edges.set(key, { a: points[i], b: points[(i + 1) % 3], count: 1 });
        }
        for (const orders of [2000, 4000, 6000, 8000, 10000]) {
          const level = orders / 2400, intersections: P[] = [];
          for (let i = 0; i < 3; i++) {
            const a = points[i], b = points[(i + 1) % 3];
            if ((a[1] < level && b[1] >= level) || (b[1] < level && a[1] >= level)) {
              const t = (level - a[1]) / (b[1] - a[1]);
              intersections.push([a[0] + (b[0] - a[0]) * t, level + .01, a[2] + (b[2] - a[2]) * t]);
            }
          }
          if (intersections.length === 2) {
            chart.line(intersections, '#c9e7f5', .5);
            chart.flow(intersections, { color: '#c8f3ff', count: 22, size: .022, speed: .1, spread: 0, seed: orders + triangle[0] });
          }
        }
      }
      for (const edge of edges.values()) {
        chart.line([edge.a, edge.b], '#a0ccd9', .28);
        if (edge.count === 1) chart.surface([[[edge.a[0], 0, edge.a[2]], edge.a], [[edge.b[0], 0, edge.b[2]], edge.b]], [['#183748', '#74b9bc'], ['#183748', '#74b9bc']], .09);
      }
      const threshold = settings.minimumOrders / 2400;
      chart.surface([[[-4.6, threshold, -2.5], [4.6, threshold, -2.5]], [[-4.6, threshold, 2.5], [4.6, threshold, 2.5]]], [['#b1833c', '#b1833c'], ['#e0b260', '#e0b260']], settings.minimumOrders ? .045 : 0);
      if (settings.minimumOrders) {
        chart.line([[-4.6, threshold, 2.5], [4.6, threshold, 2.5]], '#efca89', .8);
        chart.label(`FILTER PLANE · ${settings.minimumOrders.toLocaleString('en-US')} ORDERS`, [0, threshold + .22, 2.65], .2, '#efca89');
      }
      for (let index = 0; index < state.rows.length; index++) {
        const row = state.rows[index], hue = COLORS[row.region - 1], peak: P = [x(row.longitude), row.orders / 2400, z(row.latitude)];
        chart.tube([[peak[0], .015, peak[2]], peak], hue, .014, .6);
        chart.flow([[peak[0], .025, peak[2]], peak], { color: hue, count: 45, size: .022, speed: .13, spread: .02, seed: 50 + index });
        chart.point(peak, hue, .055); chart.glow(peak, hue, .35);
        chart.label(row.city, [peak[0], peak[1] + .23, peak[2]], .18, hue);
      }
      if (state.rows.length === 0) chart.label('No cities meet this filter', [0, 2.5, 0], 0.3);
      chart.label('CITY KNOTS · INTERPOLATED CANOPY', [0, 5.55, -.6], .23, '#b9d8e7');
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { state = calculateGeographicDemand(settings); layer.redraw(draw); };
    return {
      controls: [
        { id: 'region', label: 'Region', min: 0, max: 3, step: 1, value: 0, format: value => REGIONS[value], apply: value => { settings.region = value; refresh(); } },
        { id: 'uplift', label: 'Modeled demand change', min: -30, max: 50, step: 5, value: 0, format: value => `${value >= 0 ? '+' : ''}${value}%`, apply: value => { settings.uplift = value; refresh(); } },
        { id: 'minimum-orders', label: 'Minimum modeled orders', min: 0, max: 6000, step: 500, value: 0, format: value => value.toLocaleString('en-US'), apply: value => { settings.minimumOrders = value; refresh(); } },
      ],
      readout: () => ({
        metrics: [
          { label: 'Cities shown', value: String(state.rows.length), detail: `${REGIONS[settings.region]}; modeled orders ≥ ${settings.minimumOrders.toLocaleString('en-US')}` },
          { label: 'Monthly orders shown', value: state.orders.toLocaleString('en-US'), detail: 'Sum across displayed cities only' },
          { label: 'Modeled revenue shown', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(state.revenue), detail: 'City orders × fixed city AOV, summed' },
        ],
        legend: COLORS.map((color, i) => ({ label: REGIONS[i + 1], color })),
        table: { caption: 'Every displayed fictional city. Coordinates are degrees; monetary fields are USD.', columns: ['City', 'Region', 'Longitude °', 'Latitude °', 'Baseline orders', 'Modeled orders', 'AOV USD', 'Modeled revenue USD'], rows: state.rows.map(row => [row.city, REGIONS[row.region], row.longitude, row.latitude, row.baselineOrders, row.orders, row.aov, row.revenue]) },
      }),
    };
  },
};
export default example;
