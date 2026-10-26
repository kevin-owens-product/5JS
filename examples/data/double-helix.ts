import { networkGraph, type GraphData, type FiveLayer, type NetworkGraphOptions } from '../../src/index.js';
import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

/** Two sampled helical strands connected by a rung at every sample. */
export function createDoubleHelixData(): GraphData {
  const nodes: GraphData['nodes'] = [];
  const edges: GraphData['edges'] = [];
  const rungs = 84;
  for (let rung = 0; rung < rungs; rung++) {
    const progress = rung / (rungs - 1);
    for (let strand = 0; strand < 2; strand++) {
      const angle = progress * Math.PI * 2 * 3.2 + strand * Math.PI;
      const id = `strand-${strand}-rung-${rung}`;
      nodes.push({ id, group: strand, value: 1, position: [Math.cos(angle) * 1.12, progress * 6.2 - 3.1, Math.sin(angle) * 1.12] });
      if (rung > 0) edges.push({ source: `strand-${strand}-rung-${rung - 1}`, target: id, weight: 1 });
    }
    edges.push({ source: `strand-0-rung-${rung}`, target: `strand-1-rung-${rung}`, weight: 0.32 });
  }
  return { nodes, edges };
}

const example: ExampleDefinition = {
  id: 'double-helix', title: 'Double helix', category: 'Data',
  summary: 'Two continuous luminous strands carry traveling samples through a twisted ladder.',
  description: 'Build a spatial graph directly from sine and cosine coordinates. The 168 nodes form two colored strands with a cross-link at every sample. Continuous rails trace the same helical parameterization; selected rungs split into cyan and rose halves, and moving markers reveal the winding direction. Stretch the height to inspect how pitch changes while the graph connections stay the same.',
  tags: ['Parametric geometry', 'GraphData', 'Helix'], difficulty: 'Intermediate',
  accent: '#f291bb', camera: [6, 2.3, 9], bloom: 0.4, previewTime: 3,
  dataNote: 'Synthetic illustrative ladder geometry. This is not a molecular structure, chemical model, or molecular dynamics simulation.',
  setup(app) {
    const data = createDoubleHelixData();
    const graph = networkGraph({ data, nodeSize: 0.035, edgeOpacity: 0.46, speed: 0, colorA: '#5ee0ed', colorB: '#f490b6' });
    let edgeOpacity = .46;
    function build(chart: ChartBuilder) {
      const strandPoint = (progress: number, strand: number): Position => {
        const angle = progress * Math.PI * 2 * 3.2 + strand * Math.PI;
        return [Math.cos(angle) * 1.12, progress * 6.2 - 3.1, Math.sin(angle) * 1.12];
      };
      for (let strand = 0; strand < 2; strand++) {
        const color = strand === 0 ? '#5ee0ed' : '#f490b6';
        const rail = Array.from({ length: 257 }, (_, i) => strandPoint(i / 256, strand));
        chart.tube(rail, color, .03, edgeOpacity);
        chart.flow(rail, { color, count: 150, speed: .055, size: .06, spread: .015, seed: 31 + strand });
        chart.glow(rail[0], color, .15);
        chart.glow(rail[rail.length - 1], color, .15);
      }
      for (let rung = 0; rung < 84; rung += 3) {
        const a = strandPoint(rung / 83, 0), b = strandPoint(rung / 83, 1);
        const middle: Position = [0, a[1], 0];
        // Every highlighted segment is one of the existing opposite-strand links.
        chart.tube([a, middle], '#5ee0ed', .015, edgeOpacity * .8);
        chart.tube([middle, b], '#f490b6', .015, edgeOpacity * .8);
        chart.point(middle, '#e0d8ed', .025);
      }
      for (const rung of [0, 21, 42, 63, 83]) {
        const y = rung / 83 * 6.2 - 3.1;
        chart.line([[1.42, y, 0], [1.68, y, 0]], '#8fa2ba', .55);
        chart.label(`${rung + 1}`, [1.9, y, 0], .17, '#c3cbd9');
      }
      chart.line([[1.55, -3.1, 0], [1.55, 3.1, 0]], '#52677c', .2);
      chart.label('84 paired samples', [0, -3.55, 0], .2, '#c3cbd9');
    }
    const structure = createChartLayer(build);
    structure.object.name = 'double-helix:continuous-rails-and-paired-rungs';
    graph.object.add(structure.object);
    let disposed = false;
    const layer = app.add<NetworkGraphOptions>({
      object: graph.object, kind: graph.kind, count: graph.count,
      update(time, delta) { if (!disposed) { graph.update(time, delta); structure.update(time, delta); } },
      set(options) { graph.set(options); if (options.edgeOpacity !== undefined) { edgeOpacity = options.edgeOpacity; structure.redraw(build); } },
      dispose() { if (disposed) return; disposed = true; structure.dispose(); graph.dispose(); },
    } satisfies FiveLayer<NetworkGraphOptions>);
    return { controls: [
      { id: 'height', label: 'Height scale', min: 0.65, max: 1.15, step: 0.01, value: 1, apply: (value) => { layer.object.scale.y = value; } },
      { id: 'edge-opacity', label: 'Edge opacity', min: 0.1, max: 0.8, step: 0.01, value: 0.46, apply: (value) => layer.set({ edgeOpacity: value }) },
      { id: 'rotation', label: 'Rotation speed', min: 0, max: 2, step: 0.05, value: 0, apply: (value) => layer.set({ speed: value }) },
    ] };
  },
};

export default example;
