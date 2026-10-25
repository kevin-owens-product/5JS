import { networkGraph, type GraphData } from '../../src/index.js';
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
  summary: '216 grid nodes joined by 540 nearest-neighbor edges.',
  description: 'Represent a six-by-six-by-six cubic grid as explicit GraphData. Color follows the vertical layer, and each interior node has six neighbors. Change the cell height to turn the cubic lattice into a rectangular lattice while preserving its topology.',
  tags: ['Lattice', 'GraphData', 'Spatial topology'], difficulty: 'Starter',
  accent: '#efc080', camera: [8.5, 6.5, 10.5], bloom: 0.18,
  dataNote: 'Synthetic finite grid. Positions and edges illustrate a lattice; no material properties or physical interactions are simulated.',
  setup(app) {
    const layer = app.add(networkGraph({ data: createLatticeData(), nodeSize: 0.027, edgeOpacity: 0.2, speed: 0, colorA: '#efc080', colorB: '#a99df2' }));
    return { controls: [
      { id: 'cell-height', label: 'Cell height scale', min: 0.4, max: 1.2, step: 0.01, value: 1, apply: (value) => { layer.object.scale.y = value; } },
      { id: 'node-radius', label: 'Node radius', min: 0.01, max: 0.06, step: 0.001, value: 0.027, apply: (value) => layer.set({ nodeSize: value }) },
      { id: 'edge-opacity', label: 'Edge opacity', min: 0.04, max: 0.5, step: 0.01, value: 0.2, apply: (value) => layer.set({ edgeOpacity: value }) },
    ] };
  },
};

export default example;
