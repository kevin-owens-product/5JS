import type { ExampleDefinition } from '../types.js';
import { createChartLayer, type ChartBuilder } from '../shared/chart.js';

export const REVENUE_REGIONS = ['North America', 'Europe', 'Asia Pacific'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#63d7bd', '#86b5f1', '#bfa1ef'];
const BASELINES = [
  [125000, 131000, 148000, 143000, 156000, 162000, 171000, 166000, 182000, 196000, 207000, 224000],
  [81000, 84000, 93000, 89000, 97000, 103000, 108000, 105000, 117000, 129000, 138000, 156000],
  [62000, 65000, 71000, 69000, 75000, 79000, 84000, 81000, 89000, 99000, 106000, 117000],
];
const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
export interface RevenueSettings { months: number; region: number; uplift: number }

export function calculateRevenue(settings: RevenueSettings = { months: 12, region: 0, uplift: 0 }) {
  const { months, region, uplift } = settings;
  if (!Number.isInteger(months) || months < 1 || months > 12 || !Number.isInteger(region) || region < 0 || region > 3 || !Number.isFinite(uplift) || uplift < 0 || uplift > 40) throw new RangeError('Invalid revenue scenario.');
  const rows = REVENUE_REGIONS.flatMap((name, regionIndex) => region === 0 || region === regionIndex + 1
    ? BASELINES[regionIndex].slice(0, months).map((baseline, month) => ({ month, monthName: MONTHS[month], region: name, regionIndex, baseline, revenue: Math.round(baseline * (1 + uplift / 100)) })) : []);
  const baseline = rows.reduce((sum, row) => sum + row.baseline, 0);
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  return { rows, baseline, revenue, delta: revenue - baseline, monthlyAverage: revenue / months };
}

const example: ExampleDefinition = {
  id: 'revenue-landscape', title: 'Revenue landscape', category: 'Business',
  summary: 'Three luminous revenue rivers carry a year of regional performance.',
  description: 'Revenue becomes three illuminated rivers. Monthly knots retain their exact dollar height; translucent banks and traveling light reveal the trajectory across the year. Filter a region or model uplift to reshape the rivers, while the axes and underlying numbers stay fixed.',
  tags: ['Revenue rivers', 'Animated ribbons', 'Scenario'], difficulty: 'Advanced', accent: '#63d7bd',
  camera: [8.5, 7, 12], target: [0, 2, 0], bloom: .48, previewTime: 4,
  dataNote: 'Synthetic calendar-year revenue: one row per month × region, in USD. Scenario revenue = round(baseline USD × (1 + uplift / 100)) per row. Totals sum those rounded rows; the monthly average divides the selected total by months included. Uplift is an assumption, not a forecast. River crest height is revenue on a fixed $0–$350,000 scale. Width is constant. Knots are observed monthly values; connecting geometry interpolates between them. Traveling light illustrates reading direction, not additional revenue or transactions.',
  setup(app) {
    const settings: RevenueSettings = { months: 12, region: 0, uplift: 0 };
    let state = calculateRevenue(settings);
    const draw = (chart: ChartBuilder) => {
      chart.frame({ x: [-5, 5], y: [0, 5], z: [-3, 3], xLabel: 'Calendar year', yLabel: 'Revenue · USD',
        xTicks: [0, 3, 6, 9, 11].map(i => ({ value: -4.4 + i * .8, label: MONTHS[i] })),
        yTicks: [0, 100000, 200000, 350000].map(value => ({ value: value / 70000, label: `$${value / 1000}k` })),
        zTicks: ['N. America', 'Europe', 'Asia Pacific'].map((label, i) => ({ value: -2.1 + i * 2.1, label })) });
      chart.ring([0, -.08, 0], 5.65, '#25485d', .014, 'y');
      for (let regionIndex = 0; regionIndex < REVENUE_REGIONS.length; regionIndex++) {
        const rows = state.rows.filter(row => row.regionIndex === regionIndex);
        if (!rows.length) continue;
        const color = COLORS[regionIndex], z = -2.1 + regionIndex * 2.1;
        const crest: [number, number, number][] = rows.map(row => [-4.4 + row.month * .8, row.revenue / 70000, z]);
        // The river's central crest is exact; its width and luminous banks are decorative.
        const surface = rows.map(row => Array.from({ length: 7 }, (_, j) => {
          const side = (j - 3) / 3;
          return [-4.4 + row.month * .8, row.revenue / 70000 - .12 * side * side, z + side * .54] as [number, number, number];
        }));
        chart.surface(surface, surface.map(row => row.map((_, j) => j === 3 ? '#d9fff3' : color)), .48);
        for (const side of [-1, 1]) {
          const edge = crest.map(([x, y, depth]) => [x, y - .12, depth + side * .54] as [number, number, number]);
          chart.surface([edge, edge.map(([x, , depth]) => [x, .025, depth])], [edge.map(() => color), edge.map(() => '#10222e')], .13);
          chart.tube(edge, color, .012, .7);
        }
        chart.tube(crest, color, .025, .95);
        chart.flow(crest.map(([x, y, depth]) => [x, y + .045, depth]), { color: '#e1fff8', count: 260, speed: .095, size: .036, spread: .055, seed: 71 + regionIndex });
        for (const side of [-.32, .32]) chart.flow(crest.map(([x, y, depth]) => [x, y + .025, depth + side]), { color, count: 190, speed: .07, size: .025, spread: .07, seed: 91 + regionIndex + Math.round(side * 10) });
        crest.forEach((position, i) => { chart.point(position, '#dffff4', .038); if (i === crest.length - 1) chart.glow(position, color, .32); });
        const end = crest[crest.length - 1];
        chart.label(usd(rows[rows.length - 1].revenue), [end[0] + .22, end[1] + .3, end[2]], .22, '#dffff4');
      }
      chart.label('MONTHLY KNOTS · CONTINUOUS RIVERS', [0, -.75, 0], .19, '#78949e');
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { state = calculateRevenue(settings); layer.redraw(draw); };
    return {
      controls: [
        { id: 'region', label: 'Region', min: 0, max: 3, step: 1, value: 0, format: value => value === 0 ? 'All regions' : REVENUE_REGIONS[value - 1], apply: value => { settings.region = value; refresh(); } },
        { id: 'months', label: 'Months included', min: 3, max: 12, step: 1, value: 12, format: value => `Jan–${MONTHS[value - 1]}`, apply: value => { settings.months = value; refresh(); } },
        { id: 'uplift', label: 'Modeled uplift', min: 0, max: 40, step: 5, value: 0, format: value => `+${value}%`, apply: value => { settings.uplift = value; refresh(); } },
      ],
      readout: () => ({
        metrics: [
          { label: 'Scenario revenue', value: usd(state.revenue), detail: `Jan–${MONTHS[settings.months - 1]}, selected regions` },
          { label: 'Change from baseline', value: `+${usd(state.delta)}`, detail: `Baseline ${usd(state.baseline)}; modeled uplift ${settings.uplift}%` },
          { label: 'Monthly average', value: usd(state.monthlyAverage), detail: 'Selected regions combined per included month' },
        ],
        legend: REVENUE_REGIONS.map((label, i) => ({ label, color: COLORS[i] })),
        table: { caption: 'Every displayed month × region; monetary values in USD.', columns: ['Month', 'Region', 'Baseline USD', 'Scenario USD', 'Change USD'], rows: state.rows.map(row => [row.monthName, row.region, row.baseline, row.revenue, row.revenue - row.baseline]) },
      }),
    };
  },
};
export default example;
