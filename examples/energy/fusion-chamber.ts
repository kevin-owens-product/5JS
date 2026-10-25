import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

const TAU = Math.PI * 2, MAJOR = 3;
const torusPoint = (u: number, v: number, radius: number, elongation = 1.35): Position => [(MAJOR + radius * Math.cos(v)) * Math.cos(u), radius * Math.sin(v) * elongation, (MAJOR + radius * Math.cos(v)) * Math.sin(u)];

/** A closed integer-winding curve, deliberately not a calculated magnetic field. */
export function fusionPath(turns: number, radius: number, phase = 0): Position[] {
  if (!Number.isInteger(turns) || turns < 1 || turns > 7 || !Number.isFinite(radius) || radius < .15 || radius > .9 || !Number.isFinite(phase)) throw new RangeError('Invalid chamber path settings.');
  return Array.from({ length: 193 }, (_, i) => { const u = i / 192 * TAU; return torusPoint(u, u * turns + phase, radius); });
}

const example: ExampleDefinition = {
  id: 'fusion-chamber', title: 'Fusion chamber cutaway', category: 'Energy',
  summary: 'Travel around a glowing torus of helical paths inside a coil cage.',
  description: 'A partial chamber shell reveals a nested torus of luminous helices. Tracers spiral around the minor cross-section as they circle the central opening. Change the integer winding, bundle width, and playback to reshape this geometric field-line illustration.',
  tags: ['Toroidal geometry', 'Helical paths', 'Cutaway'], difficulty: 'Advanced', accent: '#b29aff',
  camera: [7.6, 5.8, 10.8], target: [0, -.1, 0], bloom: .48,
  dataNote: 'Geometric fusion-inspired illustration in arbitrary length units. Major radius is 3; the helix uses u from 0 to 2π and v = winding×u + phase, with vertical elongation 1.35. Integer windings close each path. Coil positions, chamber shell, colors, glow, and tracer playback are illustrative. These curves are not computed magnetic field lines, charged-particle trajectories, a plasma-confinement model, or a prediction of fusion power, temperature, stability, or safety.',
  setup(app) {
    let turns = 4, radius = .65, speed = .1;
    function draw(chart: ChartBuilder) {
      chart.ring([0, -1.65, 0], 4.5, '#294661', .03);
      chart.ring([0, -1.65, 0], 1.55, '#294661', .03);
      for (let coil = 0; coil < 12; coil++) {
        const u = coil / 12 * TAU;
        const path = Array.from({ length: 65 }, (_, i) => torusPoint(u, i / 64 * TAU, 1.12, 1.35));
        chart.tube(path, '#44718d', .055, .75);
        chart.tube(path.map(([x, y, z]) => [x * 1.015, y * 1.015, z * 1.015] as Position), '#80bed2', .014, .5);
        chart.line([[1.55 * Math.cos(u), -1.65, 1.55 * Math.sin(u)], [4.5 * Math.cos(u), -1.65, 4.5 * Math.sin(u)]], '#294661', .7);
      }
      // Omit the front 54-degree segment so the interior stays visible.
      const shell = Array.from({ length: 65 }, (_, i) => Array.from({ length: 33 }, (_, j) => torusPoint(.65 * Math.PI + i / 64 * 1.7 * Math.PI, j / 32 * TAU, 1.06, 1.35)));
      chart.surface(shell, shell.map(row => row.map(() => '#326479')), .1);
      for (const end of [0, shell.length - 1]) chart.tube(shell[end], '#81bbd5', .025, .55);
      const core = Array.from({ length: 65 }, (_, i) => Array.from({ length: 25 }, (_, j) => torusPoint(i / 64 * TAU, j / 24 * TAU, radius * .62)));
      chart.surface(core, core.map(row => row.map((_, j) => j < 12 ? '#42bea6' : '#745fc1')), .16);
      for (let lane = 0; lane < 18; lane++) {
        const inner = lane % 3 === 0;
        const path = fusionPath(turns, radius * (inner ? .65 : 1), lane / 18 * TAU);
        const color = inner ? '#8cffe2' : lane % 2 === 0 ? '#66d9ee' : '#bd91fa';
        if (lane % 2 === 0) chart.tube(path, color, .012, .28);
        chart.flow(path, { color, count: 155, speed: speed * (inner ? 1.2 : 1), size: inner ? .03 : .035, spread: .016, seed: lane + 300 });
      }
      for (let i = 0; i < 4; i++) chart.glow(torusPoint(i / 4 * TAU, i / 4 * TAU * turns, radius * .5), '#7cf0e0', .45);
      chart.label('TOROIDAL PATH LAB', [0, 2.15, 0], .3, '#bcdde4');
      chart.label(`${turns} MINOR TURNS / MAJOR CIRCUIT`, [0, -2.2, 4.2], .22, '#97a9c6');
    }
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => layer.redraw(draw);
    return {
      controls: [
        { id: 'winding', label: 'Minor-axis winding', min: 1, max: 7, step: 1, value: turns, format: value => `${value} turns`, apply(value) { turns = value; refresh(); } },
        { id: 'width', label: 'Helix minor radius', min: .3, max: .85, step: .05, value: radius, format: value => `${value.toFixed(2)} units`, apply(value) { radius = value; refresh(); } },
        { id: 'flow', label: 'Tracer playback', min: .025, max: .2, step: .025, value: speed, format: value => `${value.toFixed(3)} cycles/s`, apply(value) { speed = value; refresh(); } },
      ],
      readout: () => ({
        metrics: [{ label: 'Prescribed winding', value: `${turns}:1`, detail: 'Minor rotations per major circuit' }, { label: 'Major / minor radius', value: `${(MAJOR / radius).toFixed(2)}`, detail: 'Geometric ratio in arbitrary units' }, { label: 'Outer tracer circuit', value: `${(1 / speed).toFixed(1)} s`, detail: 'Playback period; no plasma time scale' }],
        legend: [{ label: 'Outer helical paths', color: '#bd91fa' }, { label: 'Inner helical paths', color: '#8cffe2' }, { label: 'Illustrative coils', color: '#80bed2' }],
        table: { caption: 'Sample positions of one outer prescribed helix, phase zero; arbitrary length units.', columns: ['Major angle deg', 'X', 'Y', 'Z'], rows: Array.from({ length: 12 }, (_, i) => { const u = i / 12 * TAU; return [i * 30, ...torusPoint(u, u * turns, radius).map(value => +value.toFixed(4))]; }) },
      }),
    };
  },
};
export default example;
