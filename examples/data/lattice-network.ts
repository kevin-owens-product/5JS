import { networkGraph, type GraphData, type FiveLayer, type NetworkGraphOptions } from '../../src/index.js';
import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

/** A finite cubic lattice with edges only between axis-aligned nearest neighbors. */
export function createLatticeData(): GraphData {
  const nodes: GraphData['nodes'] = [];
  const edges: GraphData['edges'] = [];
  const width = 6;
  const id = (x: number, y: number, z: number) => `cell-${x}-${y}-${z}`;
  for (let y = 0; y < width; y++) {
    for (let z = 0; z < width; z++) {
      for (let x = 0; x < width; x++) {
        const source = id(x, y, z);
        nodes.push({ id: source, group: y, value: 1, position: [(x - 2.5) * 1.15, (y - 2.5) * 1.15, (z - 2.5) * 1.15] });
        if (x < width - 1) edges.push({ source, target: id(x + 1, y, z) });
        if (y < width - 1) edges.push({ source, target: id(x, y + 1, z) });
        if (z < width - 1) edges.push({ source, target: id(x, y, z + 1) });
      }
    }
  }
  return { nodes, edges };
}

const example: ExampleDefinition = {
  id: 'lattice-network', title: 'Lattice network', category: 'Data',
  summary: 'A layered cubic lattice exposes its six-neighbor interior with axial pulses.',
  description: 'Represent a six-by-six-by-six cubic grid as explicit GraphData. Color follows the vertical layer, translucent slices separate the six levels, and a bright interior neighborhood makes its six axis-aligned links explicit. Traveling pulses remain on selected existing lattice edges. Change the cell height to turn the cubic lattice into a rectangular lattice while preserving its topology.',
  tags: ['Lattice', 'GraphData', 'Spatial topology'], difficulty: 'Starter',
  accent: '#efc080', camera: [8.5, 6.5, 10.5], bloom: 0.36, previewTime: 3,
  dataNote: 'Synthetic finite grid. Positions and edges illustrate a lattice; no material properties or physical interactions are simulated.',
  setup(app) {
    const graph = networkGraph({ data: createLatticeData(), nodeSize: 0.027, edgeOpacity: 0.2, speed: 0, colorA: '#efc080', colorB: '#a99df2' });
    let edgeOpacity = .2;
    const coordinate = (index: number) => (index - 2.5) * 1.15;
    function build(chart: ChartBuilder) {
      const bound = coordinate(5);
      for (let level = 0; level < 6; level++) {
        const y = coordinate(level), color = level < 3 ? '#efc080' : '#a99df2';
        const rows: Position[][] = [[[-bound, y, -bound], [bound, y, -bound]], [[-bound, y, bound], [bound, y, bound]]];
        chart.surface(rows, [[color, color], [color, color]], .025);
        chart.label(`L${level + 1}`, [-bound - .45, y, bound], .17, color);
        // Every perimeter segment is a chain of nearest-neighbor lattice links.
        chart.line([[-bound, y, -bound], [bound, y, -bound], [bound, y, bound], [-bound, y, bound], [-bound, y, -bound]], color, edgeOpacity * 1.8);
      }
      for (const x of [-bound, bound]) for (const z of [-bound, bound]) {
        chart.tube([[x, -bound, z], [x, bound, z]], '#c3b5d3', .015, edgeOpacity * 1.8);
      }
      const center: Position = [coordinate(2), coordinate(3), coordinate(2)];
      const axisColors = ['#ffa972', '#8ef3c6', '#91bbff'];
      chart.glow(center, '#edfff9', .16);
      for (let axis = 0; axis < 3; axis++) {
        for (const direction of [-1, 1]) {
          const neighbor = [...center] as Position;
          neighbor[axis] += direction * 1.15;
          chart.tube([center, neighbor], axisColors[axis], .026, .8);
          chart.flow([center, neighbor], { color: axisColors[axis], count: 10, speed: .32, size: .07, spread: 0, seed: axis * 31 + direction + 5 });
          chart.glow(neighbor, axisColors[axis], .09);
        }
        // Longitudinal paths pass through collinear grid nodes without diagonal shortcuts.
        for (let lane = 0; lane < 3; lane++) {
          const start: Position = [coordinate(1 + lane), coordinate(1 + lane), coordinate(1 + lane)];
          const finish = [...start] as Position;
          start[axis] = -bound; finish[axis] = bound;
          chart.flow([start, finish], { color: axisColors[axis], count: 22, speed: .085 + lane * .015, size: .045, spread: 0, seed: axis * 71 + lane + 11 });
        }
      }
      chart.label('6 nearest neighbors', [center[0], center[1] + 1.55, center[2]], .19, '#c9f3e7');
    }
    const structure = createChartLayer(build);
    structure.object.name = 'lattice-network:level-slices-and-neighbor-star';
    graph.object.add(structure.object);
    let disposed = false;
    const layer = app.add<NetworkGraphOptions>({
      object: graph.object, kind: graph.kind, count: graph.count,
      update(time, delta) { if (!disposed) { graph.update(time, delta); structure.update(time, delta); } },
      set(options) { graph.set(options); if (options.edgeOpacity !== undefined) { edgeOpacity = options.edgeOpacity; structure.redraw(build); } },
      dispose() { if (disposed) return; disposed = true; structure.dispose(); graph.dispose(); },
    } satisfies FiveLayer<NetworkGraphOptions>);
    return { controls: [
      { id: 'cell-height', label: 'Cell height scale', min: 0.4, max: 1.2, step: 0.01, value: 1, apply: (value) => { layer.object.scale.y = value; } },
      { id: 'node-radius', label: 'Node radius', min: 0.01, max: 0.06, step: 0.001, value: 0.027, apply: (value) => layer.set({ nodeSize: value }) },
      { id: 'edge-opacity', label: 'Edge opacity', min: 0.04, max: 0.5, step: 0.01, value: 0.2, apply: (value) => layer.set({ edgeOpacity: value }) },
    ] };
  },
};

export default example;
