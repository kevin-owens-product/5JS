import { networkGraph, type GraphData, type FiveLayer, type NetworkGraphOptions } from '../../src/index.js';
import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
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
  summary: 'Five luminous community volumes exchange pulses across their hub links.',
  description: 'Supply explicit node IDs, groups, values, positions, and weighted edges. A translucent envelope reveals each spherical community, while bright bowed bridges emphasize the five existing inter-hub links. Tracers follow selected connections to expose their structure; their movement is illustrative, not measured traffic. This is a designed layout rather than a force simulation.',
  tags: ['GraphData', 'Communities', 'Weighted edges'], difficulty: 'Intermediate',
  accent: '#6de4c8', camera: [5.6, 4.7, 7.4], target: [0, .2, 0], bloom: 0.4, previewTime: 3,
  dataNote: 'Synthetic community graph. Groups and connections are generated for demonstration and do not represent observed communities.',
  setup(app) {
    const data = createCommunityData();
    const graph = networkGraph({ data, nodeSize: 0.037, edgeOpacity: 0.28, speed: 0, colorA: '#53e1c6', colorB: '#b897fa' });
    const colors = ['#53e1c6', '#6ed1d3', '#89bedf', '#a3abea', '#b897fa'];
    let edgeOpacity = .28;
    const positions = new Map(data.nodes.map(node => [node.id, node.position as Position]));
    function build(chart: ChartBuilder) {
      for (let group = 0; group < 5; group++) {
        const center = positions.get(`community-${group}-node-0`)!;
        const color = colors[group];
        // The envelope groups members; it is not an additional graph edge.
        const rows = Array.from({ length: 13 }, (_, latitude) => {
          const polar = latitude / 12 * Math.PI;
          return Array.from({ length: 33 }, (_, longitude): Position => {
            const azimuth = longitude / 32 * Math.PI * 2;
            return [center[0] + .98 * Math.sin(polar) * Math.cos(azimuth), center[1] + .98 * Math.cos(polar), center[2] + .98 * Math.sin(polar) * Math.sin(azimuth)];
          });
        });
        chart.surface(rows, rows.map(row => row.map(() => color)), .045);
        for (const fraction of [-.45, .45]) {
          const radius = .98 * Math.sqrt(1 - fraction * fraction);
          const latitude = Array.from({ length: 65 }, (_, i): Position => [center[0] + radius * Math.cos(i / 64 * Math.PI * 2), center[1] + fraction * .98, center[2] + radius * Math.sin(i / 64 * Math.PI * 2)]);
          chart.line(latitude, color, .22);
        }
        chart.glow(center, color, .17);
        chart.label(`0${group + 1} / 42 members`, [center[0], center[1] - 1.22, center[2]], .17, color);
        const next = positions.get(`community-${(group + 1) % 5}-node-0`)!;
        const bridge: Position[] = [center, [(center[0] * 2 + next[0]) / 3, Math.max(center[1], next[1]) + .9, (center[2] * 2 + next[2]) / 3], [(center[0] + next[0] * 2) / 3, Math.max(center[1], next[1]) + .9, (center[2] + next[2] * 2) / 3], next];
        chart.tube(bridge, color, .017, edgeOpacity * 1.3);
        chart.flow(bridge, { color, count: 28, speed: .16, size: .065, spread: 0, seed: 23 + group });
        // Only existing hub spokes receive highlights, preserving the graph topology.
        for (const member of [1, 13, 25, 37]) {
          const destination = positions.get(`community-${group}-node-${member}`)!;
          chart.flow([center, destination], { color, count: 7, speed: .3, size: .04, spread: 0, seed: group * 43 + member });
        }
      }
    }
    const structure = createChartLayer(build);
    structure.object.name = 'community-network:envelopes-and-hub-links';
    graph.object.add(structure.object);
    let disposed = false;
    const layer = app.add<NetworkGraphOptions>({
      object: graph.object, kind: graph.kind, count: graph.count,
      update(time, delta) { if (!disposed) { graph.update(time, delta); structure.update(time, delta); } },
      set(options) { graph.set(options); if (options.edgeOpacity !== undefined) { edgeOpacity = options.edgeOpacity; structure.redraw(build); } },
      dispose() { if (disposed) return; disposed = true; structure.dispose(); graph.dispose(); },
    } satisfies FiveLayer<NetworkGraphOptions>);
    return { controls: [
      { id: 'edge-opacity', label: 'Edge opacity', min: 0.05, max: 0.65, step: 0.01, value: 0.28, apply: (value) => layer.set({ edgeOpacity: value }) },
      { id: 'node-radius', label: 'Node radius', min: 0.015, max: 0.07, step: 0.001, value: 0.037, apply: (value) => layer.set({ nodeSize: value }) },
      { id: 'rotation', label: 'Rotation speed', min: 0, max: 2, step: 0.05, value: 0, apply: (value) => layer.set({ speed: value }) },
    ] };
  },
};

export default example;
