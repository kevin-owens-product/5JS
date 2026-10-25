import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

const TAU = Math.PI * 2;
/** Nested closed paths in a fictitious ocean basin, not a fluid integration. */
export function gyrePath(center: number, radius: number, depth: number, direction: -1 | 1, shear: number): Position[] {
  if (![center, radius, depth, shear].every(Number.isFinite) || radius <= 0 || ![-1, 1].includes(direction) || shear < 0 || shear > 1) throw new RangeError('Invalid gyre geometry.');
  return Array.from({ length: 97 }, (_, i) => {
    const a = direction * i / 96 * TAU;
    return [center + Math.cos(a) * radius + shear * .22 * Math.sin(2 * a), depth + .11 * Math.sin(2 * a + center), Math.sin(a) * radius * .9];
  });
}
const example: ExampleDefinition = {
  id: 'ocean-gyres', title: 'Ocean gyre observatory', category: 'Climate',
  summary: 'Look through a cutaway ocean basin into layered, counter-rotating currents.',
  description: 'A suspended water sheet opens onto two synthetic circulation cells. Warm surface tracers and blue deep currents follow nested loops; luminous vertical exchanges connect the layers. Adjust depth, shear, and playback to explore the structure from any angle.',
  tags: ['Ocean cutaway', 'Layered currents', 'Flow'], difficulty: 'Advanced', accent: '#56d4dc',
  camera: [7.5, 6.3, 10.2], target: [0, -.65, 0], bloom: .4,
  dataNote: 'Invented rectangular ocean basin with arbitrary length units. Current paths are prescribed closed curves, not ocean measurements or solutions of fluid equations. The two cells rotate in opposite directions by construction. Layer separation is a visual depth parameter; tracer cycles and density are presentation settings, not transport, salinity, heat, or mass flow. Exchange arcs illustrate connectivity without a conservation or climate claim.',
  setup(app) {
    let depth = 1.8, shear = .45, speed = .13;
    function draw(chart: ChartBuilder) {
      const surface: Position[][] = Array.from({ length: 13 }, (_, i) => Array.from({ length: 25 }, (_, j) => {
        const x = -4.8 + j * .4, z = -2.7 + i * .45;
        return [x, .28 + Math.sin(x * 1.6 + z) * .035, z];
      }));
      chart.surface(surface, surface.map(row => row.map(() => '#245d76')), .1);
      const rim: Position[] = [[-4.8, .28, -2.7], [4.8, .28, -2.7], [4.8, .28, 2.7], [-4.8, .28, 2.7], [-4.8, .28, -2.7]];
      chart.line(rim, '#62abc1', .6);
      for (const x of [-4.8, 0, 4.8]) {
        chart.line([[x, -depth - .5, -2.7], [x, .28, -2.7]], '#25435f', .75);
        chart.line([[x, -depth - .5, -2.7], [x, -depth - .5, 2.7]], '#23435c', .6);
      }
      for (let z = -2; z <= 2; z++) chart.line([[-4.8, -depth - .5, z], [4.8, -depth - .5, z]], '#203b50', .6);
      for (const [index, center] of [-2.25, 2.25].entries()) {
        const direction = index === 0 ? 1 : -1;
        for (let level = 0; level < 3; level++) {
          const y = -.15 - level * depth / 2;
          const color = level === 0 ? (index === 0 ? '#ffbb76' : '#87e6d2') : level === 1 ? '#4ab9cf' : '#6e98ff';
          for (let lane = 0; lane < 5; lane++) {
            const radius = .55 + lane * .3;
            const path = gyrePath(center, radius, y, direction, shear);
            chart.flow(path, { color, count: 92, speed: speed / (1 + level * .35 + lane * .12), size: level === 0 ? .038 : .032, spread: .035, seed: 100 + index * 30 + level * 6 + lane });
            if (lane === 4 || lane === 1) chart.tube(path, color, .012, level === 0 ? .35 : .17);
          }
        }
        for (const side of [-1, 1]) {
          const exchange: Position[] = [[center - .6 * side, -.15, side * 1.6], [center + .4 * side, -depth * .4, side * 2.2], [center + .8 * side, -depth, side * 1.1], [center + .2 * side, -depth - .1, side * .4]];
          if (side < 0) exchange.reverse();
          chart.tube(exchange, '#87dce9', .016, .35);
          chart.flow(exchange, { color: '#b4edff', count: 105, speed: speed * .6, size: .035, spread: .035, seed: 200 + index * 3 + side });
        }
        chart.label(index === 0 ? 'WEST CELL' : 'EAST CELL', [center, .8, -2.4], .24, '#b8dce5');
      }
      chart.label('SURFACE', [5.2, .28, 0], .2, '#89d5dd');
      chart.label('DEEP LAYER', [5.3, -depth, 0], .2, '#8ea9f8');
      chart.label('PRESCRIBED CIRCULATION · ARBITRARY UNITS', [0, -depth - .9, 2.5], .2, '#7d9db3');
    }
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => layer.redraw(draw);
    return {
      controls: [
        { id: 'depth', label: 'Layer separation', min: .6, max: 2.8, step: .1, value: depth, format: value => `${value.toFixed(1)} units`, apply(value) { depth = value; refresh(); } },
        { id: 'shear', label: 'Curve shear', min: 0, max: 1, step: .05, value: shear, format: value => value.toFixed(2), apply(value) { shear = value; refresh(); } },
        { id: 'flow', label: 'Tracer playback', min: .04, max: .28, step: .01, value: speed, format: value => `${value.toFixed(2)} cycles/s`, apply(value) { speed = value; refresh(); } },
      ],
      readout: () => ({
        metrics: [{ label: 'Circulation cells', value: '2', detail: 'Opposite prescribed directions' }, { label: 'Current layers', value: '3', detail: 'Five nested streamlines per layer and cell' }, { label: 'Layer separation', value: `${depth.toFixed(1)} units`, detail: 'Presentation depth; no physical depth mapping' }],
        legend: [{ label: 'Surface pathways', color: '#ffbb76' }, { label: 'Middle pathways', color: '#4ab9cf' }, { label: 'Deep pathways', color: '#6e98ff' }],
        table: { caption: 'Synthetic circulation layout. Playback period is for the innermost streamline.', columns: ['Cell', 'Layer', 'Nominal Y', 'Direction sign', 'Tracer period s'], rows: [-2.25, 2.25].flatMap((_, i) => Array.from({ length: 3 }, (_, level) => [i === 0 ? 'West' : 'East', ['Surface', 'Middle', 'Deep'][level], +(-.15 - level * depth / 2).toFixed(2), i === 0 ? 1 : -1, +((1 + level * .35) / speed).toFixed(2)])) },
      }),
    };
  },
};
export default example;
