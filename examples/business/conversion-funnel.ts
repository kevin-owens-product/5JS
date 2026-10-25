import type { ExampleDefinition } from '../types.js';
import { createChartLayer, type ChartBuilder } from '../shared/chart.js';

export interface FunnelSettings { signup: number; activation: number; paid: number }
const STAGES = ['Qualified visitors', 'Signed up', 'Activated', 'Paid'];
const COLORS = ['#78d9c6', '#82b8ed', '#b49be8', '#edbd78'];
const integer = (value: number) => value.toLocaleString('en-US');

export function calculateFunnel(settings: FunnelSettings = { signup: 8, activation: 60, paid: 25 }) {
  const rates = [settings.signup, settings.activation, settings.paid];
  if (rates.some(value => !Number.isFinite(value) || value < 0 || value > 100)) throw new RangeError('Conditional conversion rates must be between 0% and 100%.');
  const counts = [100000];
  for (const rate of rates) counts.push(Math.round(counts[counts.length - 1] * rate / 100));
  const rows = counts.map((count, index) => ({ stage: STAGES[index], count, conditionalRate: index === 0 ? null : rates[index - 1], realizedRate: index === 0 || counts[index - 1] === 0 ? null : count / counts[index - 1], overallRate: count / counts[0], lost: index === 0 ? 0 : counts[index - 1] - count }));
  return { rows, paid: counts[3], conversion: counts[3] / counts[0], lost: counts[0] - counts[3] };
}

const example: ExampleDefinition = {
  id: 'conversion-funnel', title: 'Conversion funnel', category: 'Business',
  summary: 'A particle reactor makes conversion and attrition visible in space.',
  description: 'A fixed cohort enters four luminous gates. Gate area is proportional to the surviving population; cyan-to-gold streams continue through the reactor, while coral branches show where people leave. Changing conditional conversion rates reshapes the apertures and the exact counts together.',
  tags: ['Conversion reactor', 'Particle flow', 'Scenario'], difficulty: 'Advanced', accent: '#edbd78',
  camera: [8.5, 6, 13], target: [0, 2.2, 0], bloom: .56, previewTime: 4,
  dataNote: 'Synthetic cohort of 100,000 distinct qualified visitors. Signup is conditional on visiting, activation on signing up, and paid on activation. Each next count = round(previous integer count × chosen rate / 100); positive half ties round upward. Overall conversion = paid / 100,000. Stage drop-off = previous count − next count. Gate interior area is proportional to stage count: radius = 2.1 × sqrt(count / 100,000). Gate positions denote sequence, not elapsed time. Particle counts, speed, and surface opacity are illustrative; they are not individual people or event rates. This is a scenario, not measured behavior.',
  setup(app) {
    const settings: FunnelSettings = { signup: 8, activation: 60, paid: 25 };
    let state = calculateFunnel(settings);
    const draw = (chart: ChartBuilder) => {
      const xs = [-4.2, -1.4, 1.4, 4.2], centerY = 2.35;
      const radii = state.rows.map(row => 2.1 * Math.sqrt(row.count / 100000));
      chart.line([[-5.4, -.3, 0], [5.5, -.3, 0]], '#315261', .55);
      chart.ring([0, -.32, 0], 5.8, '#203b4d', .013, 'y');
      chart.label('AREA ∝ PEOPLE · FLOW IS ILLUSTRATIVE', [0, -.7, 2.4], .19, '#8fa7b2');
      state.rows.forEach((row, i) => {
        const center: [number, number, number] = [xs[i], centerY, 0];
        // Torus radii describe the tube centerline; keep its inner edge at the data radius.
        chart.ring(center, radii[i] + .035, COLORS[i], .035, 'x');
        chart.ring([xs[i] - .1, centerY, 0], radii[i] + .012, COLORS[i], .012, 'x');
        chart.glow(center, COLORS[i], .28 + radii[i] * .1);
        chart.label(['VISITORS', 'SIGNUP', 'ACTIVATED', 'PAID'][i], [xs[i], -.1, .5], .22, COLORS[i]);
        chart.label(integer(row.count), [xs[i], centerY + radii[i] + .35, 0], .28, '#e2f6f1');
        chart.line([[xs[i], 0, 0], [xs[i], centerY - radii[i], 0]], COLORS[i], .2);
      });
      for (let stage = 0; stage < 3; stage++) {
        const start = xs[stage], end = xs[stage + 1], r0 = radii[stage], r1 = radii[stage + 1];
        const shell = [start, end].map((x, side) => Array.from({ length: 49 }, (_, j) => {
          const angle = j / 48 * Math.PI * 2, radius = side === 0 ? r0 : r1;
          return [x, centerY + Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number, number];
        }));
        chart.surface(shell, shell.map(row => row.map(() => COLORS[stage])), .095);
        for (let lane = 0; lane < 14; lane++) {
          const a = lane / 14 * Math.PI * 2;
          const path: [number, number, number][] = [
            [start, centerY + Math.cos(a) * r0 * .72, Math.sin(a) * r0 * .72],
            [(start + end) / 2, centerY + Math.cos(a + .3) * (r0 + r1) * .25, Math.sin(a + .3) * (r0 + r1) * .25],
            [end, centerY + Math.cos(a) * r1 * .72, Math.sin(a) * r1 * .72],
          ];
          chart.flow(path, { color: COLORS[stage + 1], count: 44, speed: .21, size: .034, spread: .025, seed: stage * 37 + lane });
        }
        const loss = state.rows[stage + 1].lost;
        const lostShare = loss / state.rows[stage].count;
        for (const side of [-1, 1]) {
          const path: [number, number, number][] = [
            [start + .12, centerY, side * r0 * .8],
            [start + 1.25, centerY + 1.1, side * (1.8 + r0 * .4)],
            [start + 1.55, centerY + 1.35, side * 3.1],
          ];
          chart.tube(path, '#f58291', .012, .32);
          chart.flow(path, { color: '#ff8b9c', count: Math.round(170 * lostShare), speed: .18, size: .03, spread: .07, seed: 200 + stage * 3 + side });
        }
        chart.label(`−${integer(loss)} leave`, [start + 1.2, 4.8, -1.5], .18, '#ec9ba7');
      }
      chart.flow([[-5.7, centerY, 0], [-5, centerY, 0], [-4.2, centerY, 0]], { color: '#bcfff0', count: 260, speed: .22, size: .04, spread: .38, seed: 18 });
      chart.flow([[4.2, centerY, 0], [4.9, centerY, 0], [5.7, centerY, 0]], { color: '#ffe4a1', count: 120, speed: .22, size: .04, spread: .06, seed: 19 });
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { state = calculateFunnel(settings); layer.redraw(draw); };
    return {
      controls: [
        { id: 'signup', label: 'Visitor → signup', min: 2, max: 20, step: 0.5, value: 8, format: value => `${value}%`, apply: value => { settings.signup = value; refresh(); } },
        { id: 'activation', label: 'Signup → activated', min: 20, max: 90, step: 1, value: 60, format: value => `${value}%`, apply: value => { settings.activation = value; refresh(); } },
        { id: 'paid', label: 'Activated → paid', min: 5, max: 50, step: 1, value: 25, format: value => `${value}%`, apply: value => { settings.paid = value; refresh(); } },
      ],
      readout: () => ({
        metrics: [
          { label: 'Paid customers', value: integer(state.paid), detail: 'Modeled final cohort count' },
          { label: 'Visitor → paid', value: `${(state.conversion * 100).toFixed(2)}%`, detail: 'Final paid count / 100,000 visitors' },
          { label: 'Did not reach paid', value: integer(state.lost), detail: 'Visitors minus paid customers' },
        ],
        legend: [...STAGES.map((label, i) => ({ label, color: COLORS[i] })), { label: 'Leave before next stage', color: '#ff8b9c' }],
        table: { caption: 'Sequential cohort counts and conversions. Percentages use rounded integer counts.', columns: ['Stage', 'People', 'Input conditional %', 'Realized conditional %', 'Visitor share %', 'Drop-off from prior'], rows: state.rows.map(row => [row.stage, row.count, row.conditionalRate ?? '—', row.realizedRate === null ? '—' : Number((row.realizedRate * 100).toFixed(4)), Number((row.overallRate * 100).toFixed(4)), row.lost]) },
      }),
    };
  },
};
export default example;
