import { networkGraph, type GraphData } from '../../src/index.js';
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
  summary: 'A ladder wound around two parametric helical strands.',
  description: 'Build a spatial graph directly from sine and cosine coordinates. The 168 nodes form two colored strands with lighter cross-links at each sample. Stretch the height to inspect how pitch changes while the graph connections stay the same.',
  tags: ['Parametric geometry', 'GraphData', 'Helix'], difficulty: 'Intermediate',
  accent: '#f291bb', camera: [6, 2.3, 9], bloom: 0.25,
  dataNote: 'Synthetic illustrative ladder geometry. This is not a molecular structure, chemical model, or molecular dynamics simulation.',
  setup(app) {
    const layer = app.add(networkGraph({ data: createDoubleHelixData(), nodeSize: 0.035, edgeOpacity: 0.46, speed: 0, colorA: '#5ee0ed', colorB: '#f490b6' }));
    return { controls: [
      { id: 'height', label: 'Height scale', min: 0.65, max: 1.15, step: 0.01, value: 1, apply: (value) => { layer.object.scale.y = value; } },
      { id: 'edge-opacity', label: 'Edge opacity', min: 0.1, max: 0.8, step: 0.01, value: 0.46, apply: (value) => layer.set({ edgeOpacity: value }) },
      { id: 'rotation', label: 'Rotation speed', min: 0, max: 2, step: 0.05, value: 0, apply: (value) => layer.set({ speed: value }) },
    ] };
  },
};

export default example;
