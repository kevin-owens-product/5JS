import type { ExampleDefinition } from '../types.js';
import { createChartLayer, type ChartBuilder } from '../shared/chart.js';

export const MARKETING_CHANNELS = [
  { channel: 'Search', spend: 48000, orders: 1440, customers: 960, aov: 110 },
  { channel: 'Social', spend: 36000, orders: 960, customers: 720, aov: 90 },
  { channel: 'Video', spend: 28000, orders: 600, customers: 420, aov: 112 },
  { channel: 'Email', spend: 6000, orders: 700, customers: 210, aov: 60 },
  { channel: 'Affiliates', spend: 16000, orders: 560, customers: 400, aov: 100 },
] as const;
export interface MarketingSettings { channel: number; spendPercent: number; yieldPercent: number }
const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function calculateMarketing(settings: MarketingSettings = { channel: 0, spendPercent: 100, yieldPercent: 100 }) {
  if (!Number.isInteger(settings.channel) || settings.channel < 0 || settings.channel > MARKETING_CHANNELS.length || ![settings.spendPercent, settings.yieldPercent].every(value => Number.isFinite(value) && value >= 70 && value <= 130)) throw new RangeError('Invalid marketing scenario.');
  const response = settings.spendPercent / 100 * settings.yieldPercent / 100;
  const rows = MARKETING_CHANNELS.flatMap((channel, index) => {
    if (settings.channel !== 0 && settings.channel !== index + 1) return [];
    const spend = Math.round(channel.spend * settings.spendPercent / 100);
    const orders = Math.round(channel.orders * response);
    const customers = Math.round(channel.customers * response);
    const revenue = orders * channel.aov;
    return [{ ...channel, index, spend, orders, customers, revenue, roas: revenue / spend, cac: spend / customers }];
  });
  const spend = rows.reduce((sum, row) => sum + row.spend, 0);
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const customers = rows.reduce((sum, row) => sum + row.customers, 0);
  const orders = rows.reduce((sum, row) => sum + row.orders, 0);
  return { rows, spend, revenue, customers, orders, roas: revenue / spend, cac: spend / customers };
}

const example: ExampleDefinition = {
  id: 'marketing-efficiency', title: 'Marketing efficiency', category: 'Business',
  summary: 'Route marketing investment through a luminous attribution network.',
  description: 'A blue investment hub fans out through five channel stations before green revenue paths converge at the return hub. Tube cross-sectional area represents monthly dollars on one shared scale. Traveling light makes direction readable; each channel carries its exact ROAS label.',
  tags: ['Attribution network', 'Flow architecture', 'Scenario'], difficulty: 'Advanced', accent: '#87b7ed',
  camera: [8, 6.5, 13], target: [0, 2, 0], bloom: .45, previewTime: 4,
  dataNote: 'Synthetic monthly channel data, USD. Modeled spend = round(baseline spend × spend %). Orders and new customers = round(baseline counts × spend % × yield %), using percentages as fractions. Attributed revenue = rounded orders × fixed baseline AOV. ROAS = revenue / ad spend; CAC = ad spend / new customers, excluding other acquisition costs. Blended metrics use summed numerators and denominators, not averages of ratios. Revenue is not profit. Tube radius = 0.24 × sqrt(monthly USD / 300,000), so cross-sectional area is proportional to dollars for both spend and revenue. Channel positions are categorical; hub and station sizes are decorative. Particle counts and speed illustrate direction, not real events or causal attribution.',
  setup(app) {
    const settings: MarketingSettings = { channel: 0, spendPercent: 100, yieldPercent: 100 };
    let state = calculateMarketing(settings);
    const draw = (chart: ChartBuilder) => {
      const spend: [number, number, number] = [-4.6, 2.3, 0], revenue: [number, number, number] = [4.6, 2.3, 0];
      chart.ring([0, -.3, 0], 5.65, '#28495a', .015, 'y');
      const circuit: [number, number, number][] = Array.from({ length: 65 }, (_, i) => {
        const a = i / 64 * Math.PI * 2;
        return [0, 2.4 + Math.sin(a) * 1.55, Math.cos(a) * 2.7];
      });
      chart.tube(circuit, '#9a8b62', .012, .38);
      for (const [position, color, radius] of [[spend, '#709dff', .65], [revenue, '#65f2c3', .85]] as const) {
        chart.ring([...position], radius, color, .038, 'x');
        chart.ring([position[0] - .12, position[1], position[2]], radius * 1.12, color, .012, 'x');
        chart.point([...position], color, .2); chart.glow([...position], color, .85);
      }
      chart.label('INVESTMENT', [-4.6, 3.55, 0], .22, '#9dbdff');
      chart.label(usd(state.spend), [-4.6, 3.2, 0], .27, '#dbe9ff');
      chart.label('ATTRIBUTED REVENUE', [4.6, 3.65, 0], .22, '#9df5d7');
      chart.label(usd(state.revenue), [4.6, 3.3, 0], .27, '#ddfff1');
      for (const row of state.rows) {
        const angle = row.index / 5 * Math.PI * 2 + .2;
        const node: [number, number, number] = [0, 2.4 + Math.sin(angle) * 1.55, Math.cos(angle) * 2.7];
        const inputPath: [number, number, number][] = [spend, [-2.5, node[1] + .4, node[2] * .9], node];
        const outputPath: [number, number, number][] = [node, [2.5, node[1] + .4, node[2] * .9], revenue];
        const inputRadius = .24 * Math.sqrt(row.spend / 300000), outputRadius = .24 * Math.sqrt(row.revenue / 300000);
        chart.tube(inputPath, '#709dff', inputRadius, .26);
        chart.tube(outputPath, '#65f2c3', outputRadius, .26);
        chart.flow(inputPath, { color: '#b9ceff', count: Math.max(25, Math.round(row.spend / 300)), speed: .14, size: .037, spread: inputRadius * .5, seed: 300 + row.index });
        chart.flow(outputPath, { color: '#b3ffe4', count: Math.max(25, Math.round(row.revenue / 300)), speed: .14, size: .037, spread: outputRadius * .5, seed: 400 + row.index });
        chart.ring(node, .26, '#f8cf8a', .026, 'x'); chart.point(node, '#f8cf8a', .1); chart.glow(node, '#ffd890', .38);
        chart.label(row.channel.toUpperCase(), [node[0], node[1] + .57, node[2]], .23, '#f4dfb9');
        chart.label(`${row.roas.toFixed(2)}× ROAS`, [node[0], node[1] + .3, node[2]], .18, '#9fbdbe');
      }
      chart.ring([0, -.25, 3.2], .24, '#b7d8df', .012, 'z');
      chart.label('$300k', [0, -.65, 3.2], .2, '#a3bfc8');
      chart.label('TUBE AREA REFERENCE · USD / MONTH', [0, -1.02, 3.2], .17, '#78949e');
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { state = calculateMarketing(settings); layer.redraw(draw); };
    return {
      controls: [
        { id: 'channel', label: 'Channel', min: 0, max: 5, step: 1, value: 0, format: value => value === 0 ? 'All channels' : MARKETING_CHANNELS[value - 1].channel, apply: value => { settings.channel = value; refresh(); } },
        { id: 'spend', label: 'Spend vs baseline', min: 70, max: 130, step: 5, value: 100, format: value => `${value}%`, apply: value => { settings.spendPercent = value; refresh(); } },
        { id: 'yield', label: 'Modeled conversion yield', min: 70, max: 130, step: 5, value: 100, format: value => `${value}%`, apply: value => { settings.yieldPercent = value; refresh(); } },
      ],
      readout: () => ({
        metrics: [
          { label: 'Attributed revenue', value: usd(state.revenue), detail: `${state.orders.toLocaleString('en-US')} orders; ${usd(state.spend)} ad spend` },
          { label: 'Blended ROAS', value: `${state.roas.toFixed(2)}×`, detail: 'Sum of revenue / sum of spend' },
          { label: 'Ad-spend CAC', value: `$${state.cac.toFixed(2)}`, detail: `Spend / ${state.customers.toLocaleString('en-US')} new customers` },
        ],
        legend: [{ label: 'Ad spend', color: '#87b7ed' }, { label: 'Attributed revenue', color: '#76d1b8' }],
        table: { caption: 'Every displayed channel in the modeled month. Monetary fields are USD; ratios are computed before display rounding.', columns: ['Channel', 'Spend USD', 'Orders', 'New customers', 'AOV USD', 'Revenue USD', 'ROAS ×', 'CAC USD'], rows: state.rows.map(row => [row.channel, row.spend, row.orders, row.customers, row.aov, row.revenue, Number(row.roas.toFixed(4)), Number(row.cac.toFixed(2))]) },
      }),
    };
  },
};
export default example;
