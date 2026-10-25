import { networkGraph, type GraphData } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

/** Five communities with ring, hub, and cross-community connections. */
export function createCommunityData(): GraphData {
  const nodes: GraphData['nodes'] = [];
  const edges: GraphData['edges'] = [];
  const communities = 5;
  const members = 42;
  for (let group = 0; group < communities; group++) {
    const angle = group / communities * Math.PI * 2;
    const center = [Math.cos(angle) * 2.15, Math.sin(angle * 2) * 0.6, Math.sin(angle) * 2.15];
    for (let member = 0; member < members; member++) {
      const latitude = 1 - 2 * (member - 0.5) / (members - 1);
      const orbit = member * Math.PI * (3 - Math.sqrt(5)) + group * 0.4;
      const horizontal = Math.sqrt(Math.max(0, 1 - latitude * latitude));
      const radius = member === 0 ? 0 : 0.65 + (member % 5) * 0.065;
      nodes.push({
        id: `community-${group}-node-${member}`, group,
        value: member === 0 ? 2.4 : 0.35 + (member % 7) * 0.1,
        position: [
          center[0] + Math.cos(orbit) * horizontal * radius,
          center[1] + latitude * radius,
          center[2] + Math.sin(orbit) * horizontal * radius,
        ],
      });
      if (member > 0) {
        edges.push({ source: `community-${group}-node-${member}`, target: `community-${group}-node-${member === members - 1 ? 1 : member + 1}`, weight: 0.65 });
        if (member % 3 === 1) edges.push({ source: `community-${group}-node-0`, target: `community-${group}-node-${member}`, weight: 1 });
        if (member % 4 === 0) edges.push({ source: `community-${group}-node-${member}`, target: `community-${group}-node-${1 + (member + 10) % (members - 1)}`, weight: 0.4 });
      }
    }
    edges.push({ source: `community-${group}-node-0`, target: `community-${(group + 1) % communities}-node-0`, weight: 0.28 });
  }
  return { nodes, edges };
}

const example: ExampleDefinition = {
  id: 'community-network', title: 'Community network', category: 'Data',
  summary: 'Five connected communities, with hubs and weighted links.',
  description: 'Supply explicit node IDs, groups, values, positions, and weighted edges. A deterministic spherical arrangement makes each community visible; larger nodes identify the five hubs. This example uses a designed layout rather than a force simulation.',
  tags: ['GraphData', 'Communities', 'Weighted edges'], difficulty: 'Intermediate',
  accent: '#6de4c8', camera: [5.6, 5.3, 7.4], bloom: 0.3,
  dataNote: 'Synthetic community graph. Groups and connections are generated for demonstration and do not represent observed communities.',
  setup(app) {
    const layer = app.add(networkGraph({ data: createCommunityData(), nodeSize: 0.037, edgeOpacity: 0.28, speed: 0, colorA: '#53e1c6', colorB: '#b897fa' }));
    return { controls: [
      { id: 'edge-opacity', label: 'Edge opacity', min: 0.05, max: 0.65, step: 0.01, value: 0.28, apply: (value) => layer.set({ edgeOpacity: value }) },
      { id: 'node-radius', label: 'Node radius', min: 0.015, max: 0.07, step: 0.001, value: 0.037, apply: (value) => layer.set({ nodeSize: value }) },
      { id: 'rotation', label: 'Rotation speed', min: 0, max: 2, step: 0.05, value: 0, apply: (value) => layer.set({ speed: value }) },
    ] };
  },
};

export default example;
