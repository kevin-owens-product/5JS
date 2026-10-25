import { networkGraph, type GraphData } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

/** A complete ternary hierarchy with every non-root node linked to one parent. */
export function createDependencyData(): GraphData {
  const nodes: GraphData['nodes'] = [{ id: 'root', group: 0, value: 3, position: [0, 2.8, 0] }];
  const edges: GraphData['edges'] = [];
  for (let depth = 1; depth <= 4; depth++) {
    const width = 3 ** depth;
    const radius = depth * 0.77;
    for (let index = 0; index < width; index++) {
      const angle = (index + 0.5) / width * Math.PI * 2 - Math.PI / 2;
      const id = `level-${depth}-node-${index}`;
      nodes.push({
        id, group: 1 + Math.floor(index / 3 ** (depth - 1)), value: 3 / (depth + 1),
        position: [Math.cos(angle) * radius, 2.8 - depth * 1.4, Math.sin(angle) * radius],
      });
      edges.push({ source: depth === 1 ? 'root' : `level-${depth - 1}-node-${Math.floor(index / 3)}`, target: id, weight: 1 });
    }
  }
  return { nodes, edges };
}

const example: ExampleDefinition = {
  id: 'dependency-tree', title: 'Dependency tree', category: 'Data',
  summary: 'A radial hierarchy with four levels beneath one root.',
  description: 'Turn a parent-child table into a 3D tree with 121 nodes. Height encodes depth, angular sectors keep the three main branches together, and node size decreases down the hierarchy. Edges join parents to children; the renderer draws plain connections without arrowheads.',
  tags: ['Hierarchy', 'GraphData', 'Radial layout'], difficulty: 'Starter',
  accent: '#9fb6ff', camera: [7, 5.6, 9], target: [0, -0.1, 0], bloom: 0.24,
  dataNote: 'Synthetic complete ternary tree. Node names and dependencies are illustrative rather than a real software dependency graph.',
  setup(app) {
    const layer = app.add(networkGraph({ data: createDependencyData(), nodeSize: 0.039, edgeOpacity: 0.42, speed: 0, colorA: '#86d6ff', colorB: '#b89df7' }));
    return { controls: [
      { id: 'node-radius', label: 'Node radius', min: 0.015, max: 0.075, step: 0.001, value: 0.039, apply: (value) => layer.set({ nodeSize: value }) },
      { id: 'edge-opacity', label: 'Edge opacity', min: 0.1, max: 0.8, step: 0.01, value: 0.42, apply: (value) => layer.set({ edgeOpacity: value }) },
      { id: 'rotation', label: 'Rotation speed', min: 0, max: 2, step: 0.05, value: 0, apply: (value) => layer.set({ speed: value }) },
    ] };
  },
};

export default example;
