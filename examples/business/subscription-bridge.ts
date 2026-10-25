import type { ExampleDefinition } from '../types.js';
import { createChartLayer, type ChartBuilder } from '../shared/chart.js';

const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
export interface SubscriptionSettings { newMrr: number; expansion: number; churn: number }

export function calculateSubscriptionBridge(settings: SubscriptionSettings = { newMrr: 18000, expansion: 9000, churn: 11000 }) {
  if (Object.values(settings).some(value => !Number.isFinite(value) || value < 0) || settings.newMrr > 30000 || settings.expansion > 20000 || settings.churn > 25000) throw new RangeError('Invalid monthly recurring revenue scenario.');
  const starting = 100000; const contraction = 5000;
  let balance = starting;
  const steps = [{ label: 'Starting', type: 'Balance', amount: starting, base: 0, balance: starting }];
  for (const [label, amount] of [['New', settings.newMrr], ['Expansion', settings.expansion], ['Contraction', -contraction], ['Churn', -settings.churn]] as const) {
    const base = balance; balance += amount;
    steps.push({ label, type: amount >= 0 ? 'Increase' : 'Decrease', amount, base, balance });
  }
  steps.push({ label: 'Ending', type: 'Balance', amount: balance, base: 0, balance });
  return { starting, contraction, ending: balance, netChange: balance - starting, nrr: (starting + settings.expansion - contraction - settings.churn) / starting, steps };
}

const example: ExampleDefinition = {
  id: 'subscription-bridge', title: 'Subscription bridge', category: 'Business',
  summary: 'An orbital MRR exchange reveals the inflows and leaks behind growth.',
  description: 'Two luminous balance rings anchor an orbital MRR exchange. New subscriptions and expansion stream inward; contraction and churn peel outward. Enclosed ring area scales with MRR, while tube cross-sectional area scales with each change. Watch the ending balance respond without losing the exact reconciliation.',
  tags: ['Orbital flows', 'MRR', 'Retention'], difficulty: 'Advanced', accent: '#73edcf',
  camera: [8.7, 7.6, 12.5], target: [0, 1.5, 0], bloom: .55, previewTime: 4,
  dataNote: 'Synthetic one-month MRR bridge in USD per month. Starting MRR = $100,000; contraction = $5,000. Ending = starting + new + expansion − contraction − churn. NRR = (starting + expansion − contraction − churn) / starting; new customers are excluded. Starting and ending rows are balances, not changes to sum. Balance-ring radius = 2.3 × sqrt(MRR/150,000); the reference ring is $150k. Change-tube radius = 0.5 × sqrt(abs(change)/30,000), with a separate scale from the balance rings. Layout positions and moving particles illustrate inflow/outflow, not spatial measures or real transactions.',
  setup(app) {
    const settings: SubscriptionSettings = { newMrr: 18000, expansion: 9000, churn: 11000 };
    let state = calculateSubscriptionBridge(settings);
    const draw = (chart: ChartBuilder) => {
      type P = [number, number, number];
      const start: P = [0, .55, 0], end: P = [0, 2.25, 0];
      const balanceRadius = (value: number) => 2.3 * Math.sqrt(value / 150000);
      const startRadius = balanceRadius(state.starting), endRadius = balanceRadius(state.ending);
      chart.ring([0, -.45, 0], 2.3, '#345779', .014, 'y');
      chart.ring([0, -.45, 0], balanceRadius(50000), '#233b51', .008, 'y');
      chart.label('$150k', [2.3, -.78, 0], .21, '#7ca1c3');
      chart.ring(start, startRadius, '#6d9ee7', .06, 'y');
      chart.ring(end, endRadius, '#7af4ce', .07, 'y');
      chart.ring(end, endRadius + .14, '#3f977f', .012, 'y');
      chart.glow(start, '#588ce7', 1.4); chart.glow(end, '#63e5c5', 1.5);
      chart.tube([start, [0, 1.2, 0], end], '#74b7e7', .12, .22);
      chart.flow([start, [0, 1.2, 0], end], { color: '#92d9ff', count: 220, speed: .18, size: .05, spread: .2, seed: 13 });
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2;
        const a: P = [Math.cos(angle) * startRadius, start[1], Math.sin(angle) * startRadius];
        const b: P = [Math.cos(angle) * endRadius, end[1], Math.sin(angle) * endRadius];
        chart.line([a, b], '#477a88', .2);
      }
      const lanes: { label: string; amount: number; from: P; curve: P[]; color: string; seed: number }[] = [
        { label: 'NEW', amount: settings.newMrr, from: [-4.25, 3.9, -1.8], curve: [[-4.25, 3.9, -1.8], [-3.4, 4.2, -1], [-1.1, 3.7, .2], end], color: '#72e8bc', seed: 19 },
        { label: 'EXPANSION', amount: settings.expansion, from: [3.7, 4.1, -2], curve: [[3.7, 4.1, -2], [3.1, 4.5, -.8], [1.2, 3.5, .3], end], color: '#82cfff', seed: 31 },
        { label: 'CONTRACTION', amount: -state.contraction, from: [4.25, .5, 2.45], curve: [end, [1.9, 1.8, 1.3], [3.35, .7, 2.8], [4.25, .5, 2.45]], color: '#f7b56d', seed: 47 },
        { label: 'CHURN', amount: -settings.churn, from: [-4.25, .25, 2.5], curve: [end, [-1.8, 1.4, 1.2], [-3.2, .1, 2.8], [-4.25, .25, 2.5]], color: '#ed6eaa', seed: 61 },
      ];
      for (const lane of lanes) {
        const amount = Math.abs(lane.amount), radius = .5 * Math.sqrt(amount / 30000);
        if (amount > 0) {
          chart.tube(lane.curve, lane.color, radius, .17);
          chart.tube(lane.curve, lane.color, .02, .85);
          chart.flow(lane.curve, { color: lane.color, count: Math.round(80 + amount / 60), speed: .115, size: .045, spread: radius * .75, seed: lane.seed });
        }
        chart.ring(lane.from, .29, lane.color, .02, 'y'); chart.glow(lane.from, lane.color, .55);
        chart.label(lane.label, [lane.from[0], lane.from[1] + .58, lane.from[2]], .23, lane.color);
        chart.label(`${lane.amount >= 0 ? '+' : '−'}${usd(amount)}`, [lane.from[0], lane.from[1] + .23, lane.from[2]], .22);
      }
      chart.label(`ENDING ${usd(state.ending)}/mo`, [0, 3.05, -.45], .3, '#b4ffe1');
      chart.label(`STARTING ${usd(state.starting)}/mo`, [0, -.05, 0], .25, '#8ab5ec');
      chart.label('BALANCE AREA · USD / MONTH', [0, -.9, -.7], .22, '#769aa4');
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { state = calculateSubscriptionBridge(settings); layer.redraw(draw); };
    return {
      controls: [
        { id: 'new-mrr', label: 'New subscription MRR', min: 0, max: 30000, step: 1000, value: 18000, format: value => `${usd(value)}/mo`, apply: value => { settings.newMrr = value; refresh(); } },
        { id: 'expansion', label: 'Expansion MRR', min: 0, max: 20000, step: 1000, value: 9000, format: value => `${usd(value)}/mo`, apply: value => { settings.expansion = value; refresh(); } },
        { id: 'churn', label: 'Churned MRR', min: 0, max: 25000, step: 1000, value: 11000, format: value => `${usd(value)}/mo`, apply: value => { settings.churn = value; refresh(); } },
      ],
      readout: () => ({
        metrics: [
          { label: 'Ending MRR', value: `${usd(state.ending)}/mo`, detail: `Starting ${usd(state.starting)}/mo` },
          { label: 'Net MRR change', value: `${state.netChange >= 0 ? '+' : '−'}${usd(Math.abs(state.netChange))}`, detail: `${(state.netChange / state.starting * 100).toFixed(1)}% of starting MRR` },
          { label: 'Net revenue retention', value: `${(state.nrr * 100).toFixed(1)}%`, detail: 'Existing-customer MRR only; excludes new MRR' },
        ],
        legend: [{ label: 'Starting balance', color: '#6d9ee7' }, { label: 'Ending balance', color: '#7af4ce' }, { label: 'New / expansion inflows', color: '#72e8bc' }, { label: 'Contraction / churn outflows', color: '#ed6eaa' }],
        table: { caption: 'MRR reconciliation in USD/month. Sum only the four change rows onto the starting balance.', columns: ['Component', 'Row type', 'Amount USD/mo', 'Running MRR USD/mo'], rows: state.steps.map(step => [step.label, step.type, step.amount, step.balance]) },
      }),
    };
  },
};
export default example;
