import { networkGraph, type GraphData, type FiveLayer, type NetworkGraphOptions } from '../../src/index.js';
import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
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
  summary: 'Three cascading branches fan into a layered, 121-node dependency structure.',
  description: 'Turn a parent-child table into a 3D tree with 121 nodes. Height encodes depth, angular sectors keep the three main branches together, and node size decreases down the hierarchy. Bright trunks, circular depth guides, and pulses on actual parent-child edges reveal how each of the three branches fans out. The direction of the presentation pulses follows parent to child; pulse timing is not a measured latency.',
  tags: ['Hierarchy', 'GraphData', 'Radial layout'], difficulty: 'Starter',
  accent: '#9fb6ff', camera: [7, 5.6, 9], target: [0, -0.1, 0], bloom: 0.38, previewTime: 3,
  dataNote: 'Synthetic complete ternary tree. Node names and dependencies are illustrative rather than a real software dependency graph.',
  setup(app) {
    const data = createDependencyData();
    const graph = networkGraph({ data, nodeSize: 0.039, edgeOpacity: 0.42, speed: 0, colorA: '#86d6ff', colorB: '#b89df7' });
    const position = new Map(data.nodes.map(node => [node.id, node.position as Position]));
    const palette = ['#86d6ff', '#9cb8ff', '#b89df7'];
    let edgeOpacity = .42;
    function build(chart: ChartBuilder) {
      chart.glow([0, 2.8, 0], '#e7f8ff', .22);
      chart.label('ROOT', [0, 3.28, 0], .18, '#d9f4ff');
      for (let depth = 1; depth <= 4; depth++) {
        const radius = depth * .77, y = 2.8 - depth * 1.4;
        const path = Array.from({ length: 97 }, (_, i): Position => [Math.cos(i / 96 * Math.PI * 2) * radius, y, Math.sin(i / 96 * Math.PI * 2) * radius]);
        chart.line(path, '#738fae', .26);
        chart.label(`${3 ** depth} nodes`, [-radius - .42, y, 0], .17, '#a4b6cd');
        // Short outer arcs mark the angular extent of each top-level branch.
        for (let branch = 0; branch < 3; branch++) {
          const arc = Array.from({ length: 25 }, (_, i): Position => {
            const angle = (branch / 3 + (i / 24 * .92 + .04) / 3) * Math.PI * 2 - Math.PI / 2;
            return [Math.cos(angle) * (radius + .12), y, Math.sin(angle) * (radius + .12)];
          });
          chart.tube(arc, palette[branch], .012, .46);
        }
      }
      for (const edge of data.edges) {
        const depth = Number(edge.target.split('-')[1]);
        const index = Number(edge.target.split('-')[3]);
        const branch = Math.floor(index / 3 ** (depth - 1));
        const from = position.get(edge.source)!, to = position.get(edge.target)!;
        if (depth <= 2) chart.tube([from, to], palette[branch], depth === 1 ? .027 : .015, edgeOpacity * 1.15);
        // One path per depth-two branch continues down real selected child edges.
        if (depth <= 2 || (depth === 3 && index % 3 === 1) || (depth === 4 && index % 9 === 4)) {
          chart.flow([from, to], { color: palette[branch], count: depth === 1 ? 16 : 8, speed: .26 + depth * .035, size: depth === 1 ? .065 : .045, spread: 0, seed: depth * 101 + index });
        }
      }
    }
    const structure = createChartLayer(build);
    structure.object.name = 'dependency-tree:branch-trunks-and-levels';
    graph.object.add(structure.object);
    let disposed = false;
    const layer = app.add<NetworkGraphOptions>({
      object: graph.object, kind: graph.kind, count: graph.count,
      update(time, delta) { if (!disposed) { graph.update(time, delta); structure.update(time, delta); } },
      set(options) { graph.set(options); if (options.edgeOpacity !== undefined) { edgeOpacity = options.edgeOpacity; structure.redraw(build); } },
      dispose() { if (disposed) return; disposed = true; structure.dispose(); graph.dispose(); },
    } satisfies FiveLayer<NetworkGraphOptions>);
    return { controls: [
      { id: 'node-radius', label: 'Node radius', min: 0.015, max: 0.075, step: 0.001, value: 0.039, apply: (value) => layer.set({ nodeSize: value }) },
      { id: 'edge-opacity', label: 'Edge opacity', min: 0.1, max: 0.8, step: 0.01, value: 0.42, apply: (value) => layer.set({ edgeOpacity: value }) },
      { id: 'rotation', label: 'Rotation speed', min: 0, max: 2, step: 0.05, value: 0, apply: (value) => layer.set({ speed: value }) },
    ] };
  },
};

export default example;
