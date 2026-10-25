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

const example: ExampleDefinition = {
  id: 'geographic-demand', title: 'Geographic demand', category: 'Analytics',
  summary: 'Place synthetic city orders on a longitude–latitude grid.',
  description: 'Column height encodes monthly orders; X and Z encode longitude and latitude in degrees. Region and minimum-volume filters preserve positions. A modeled demand change scales counts before the volume filter is applied.',
  tags: ['Geography', 'Demand', 'Spatial data'], difficulty: 'Intermediate', accent: '#e6bc7d',
  camera: [8, 7, 12], target: [0, 2, 0], bloom: 0,
  dataNote: 'Synthetic one-month orders for 12 fictional cities at illustrative longitude/latitude coordinates. Modeled orders = round(baseline orders × (1 + uplift / 100)); revenue = modeled orders × fixed city AOV in USD. Minimum orders filters the modeled count. X is −125° to −65° longitude, Z 25° to 50° latitude, Y 0–12,000 orders. Linear degree spacing is not a geographic distance projection, area map, or real demand dataset.',
  setup(app) {
    const settings: DemandSettings = { region: 0, uplift: 0, minimumOrders: 0 };
    let state = calculateGeographicDemand(settings);
    const x = (longitude: number) => -4.7 + (longitude + 125) / 60 * 9.4;
    const z = (latitude: number) => -2.6 + (latitude - 25) / 25 * 5.2;
    const draw = (chart: ChartBuilder) => {
      chart.frame({ x: [-4.7, 4.7], y: [0, 5], z: [-2.6, 2.6], xLabel: 'Longitude (degrees)', yLabel: 'Monthly orders', zLabel: 'Latitude (degrees)',
        xTicks: [-125, -110, -95, -80, -65].map(value => ({ value: x(value), label: `${Math.abs(value)}°W` })),
        zTicks: [25, 30, 35, 40, 45, 50].map(value => ({ value: z(value), label: `${value}°N` })),
        yTicks: [0, 4000, 8000, 12000].map(value => ({ value: value / 2400, label: `${value / 1000}k` })) });
      for (const row of state.rows) {
        chart.bar({ x: x(row.longitude), z: z(row.latitude), value: row.orders / 2400, width: 0.3, depth: 0.3, color: COLORS[row.region - 1] });
        chart.label(row.city, [x(row.longitude), row.orders / 2400 + 0.2, z(row.latitude)], 0.2, COLORS[row.region - 1]);
      }
      if (state.rows.length === 0) chart.label('No cities meet this filter', [0, 2.5, 0], 0.3);
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
