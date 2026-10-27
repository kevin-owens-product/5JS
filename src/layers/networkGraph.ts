import {
  AdditiveBlending, BufferGeometry, Float32BufferAttribute, Group,
  InstancedMesh, LineBasicMaterial, LineSegments, MeshBasicMaterial,
  Object3D, Points, ShaderMaterial, SphereGeometry,
} from 'three';
import type { FiveLayer, GraphData, GraphNode, NetworkGraphOptions } from '../types.js';
import { bounded, colorString, rejectStructural, seededRandom } from './dataMath.js';
import { optionSnapshot, scientificColor } from './scientificMath.js';

const MAX_NODES = 10_000;
const MAX_EDGES = 100_000;
const defaults: Required<Omit<NetworkGraphOptions, 'data'>> = {
  nodeCount: 280, radius: 4.2, nodeSize: 0.045, speed: 0.35, seed: 42,
  edgeOpacity: 0.22, colorA: '#56f5df', colorB: '#a98aff',
};

/** A reproducible, grouped sample graph. Its connections are illustrative data. */
export function createDemoGraph(nodeCount: number, seed: number): GraphData {
  bounded(nodeCount, 'nodeCount', 1, MAX_NODES, true);
  bounded(seed, 'seed', 0, 0xffffffff, true);
  const random = seededRandom(seed);
  const groupCount = Math.min(7, nodeCount);
  const nodes: GraphNode[] = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`, group: i % groupCount, value: 0.15 + random() ** 2 * 0.85,
  }));
  const edges: GraphData['edges'] = [];
  const seen = new Set<string>();
  const connect = (source: number, target: number) => {
    if (source === target) return;
    const key = `${Math.min(source, target)}:${Math.max(source, target)}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source: nodes[source].id, target: nodes[target].id, weight: 0.4 + random() * 0.6 });
  };
  for (let group = 0; group < groupCount; group++) {
    const members: number[] = [];
    for (let index = group; index < nodeCount; index += groupCount) members.push(index);
    members.forEach((node, i) => {
      connect(node, members[(i + 1) % members.length]);
      connect(node, members[Math.floor(random() * members.length)]);
      if (i % 3 === 0) connect(node, members[Math.floor(random() * members.length)]);
    });
    connect(group, (group + 1) % groupCount);
  }
  return { nodes, edges };
}

/** Validate the exact immutable-by-convention snapshot used to allocate GPU buffers. */
function snapshotData(input: GraphData): GraphData {
  const { nodes: inputNodes, edges: inputEdges } = optionSnapshot(input, ['nodes', 'edges'], 'Graph data');
  if (!Array.isArray(inputNodes) || !Array.isArray(inputEdges)) {
    throw new TypeError('Graph data must contain nodes and edges arrays.');
  }
  const nodeCount = bounded(inputNodes.length, 'data.nodes.length', 1, MAX_NODES, true);
  const edgeCount = bounded(inputEdges.length, 'data.edges.length', 0, MAX_EDGES, true);
  const nodes: GraphData['nodes'] = [];
  const edges: GraphData['edges'] = [];
  const ids = new Set<string>();
  for (let index = 0; index < nodeCount; index++) {
    const { id, group, value, position } = optionSnapshot(inputNodes[index], ['id', 'group', 'value', 'position'], 'Graph node');
    if (typeof id !== 'string' || id.trim().length === 0) throw new TypeError('Every graph node needs a nonempty string id.');
    if (ids.has(id)) throw new Error(`Duplicate graph node id: ${id}`);
    ids.add(id);
    const node: GraphNode = { id };
    if (group !== undefined) node.group = bounded(group, `Node ${id} group`, 0, 1_000_000, true);
    if (value !== undefined) node.value = bounded(value, `Node ${id} value`, 0, 1_000_000);
    if (position !== undefined) {
      if (!Array.isArray(position) || position.length !== 3) throw new TypeError(`Node ${id} position must contain three coordinates.`);
      // Indexed reads reject sparse tuples and avoid caller-defined iteration methods.
      node.position = [0, 1, 2].map(axis => bounded(position[axis], `Node ${id} position`, -1_000_000, 1_000_000)) as [number, number, number];
    }
    nodes.push(node);
  }
  for (let index = 0; index < edgeCount; index++) {
    const { source, target, weight } = optionSnapshot(inputEdges[index], ['source', 'target', 'weight'], 'Graph edge');
    if (typeof source !== 'string' || typeof target !== 'string' || !ids.has(source) || !ids.has(target)) {
      throw new Error('Graph edge references a missing endpoint.');
    }
    const edge = { source, target, weight };
    if (weight !== undefined) edge.weight = bounded(weight, 'Edge weight', 0, 1_000_000);
    edges.push(edge);
  }
  return { nodes, edges };
}

/** Groups missing positions into deterministic 3D clusters; supplied positions are preserved. */
export function layoutGraph(data: GraphData, radius: number, seed: number): Float32Array {
  bounded(radius, 'radius', 0.01, 10_000);
  bounded(seed, 'seed', 0, 0xffffffff, true);
  return layoutSnapshot(snapshotData(data), radius, seed);
}

function layoutSnapshot(data: GraphData, radius: number, seed: number): Float32Array {
  const random = seededRandom(seed);
  const groups = [...new Set(data.nodes.map((node) => node.group ?? 0))].sort((a, b) => a - b);
  const groupIndices = new Map(groups.map((group, index) => [group, index]));
  const result = new Float32Array(data.nodes.length * 3);
  data.nodes.forEach((node, i) => {
    if (node.position) { result.set(node.position, i * 3); return; }
    const group = groupIndices.get(node.group ?? 0)!;
    const angle = group / groups.length * Math.PI * 2;
    const clusterRadius = groups.length === 1 ? 0 : radius * 0.67;
    const scatter = radius * (groups.length === 1 ? 0.8 : 0.24) * Math.cbrt(random());
    const azimuth = random() * Math.PI * 2;
    const y = random() * 2 - 1;
    const horizontal = Math.sqrt(1 - y * y);
    result.set([
      Math.cos(angle) * clusterRadius + Math.cos(azimuth) * horizontal * scatter,
      Math.sin(angle * 2 + 0.6) * clusterRadius * 0.42 + y * scatter,
      Math.sin(angle) * clusterRadius + Math.sin(azimuth) * horizontal * scatter,
    ], i * 3);
  });
  return result;
}

/** Instanced nodes with weighted edges. Layout is grouped and deterministic, not a force simulation. */
export function networkGraph(options: NetworkGraphOptions = {}): FiveLayer<NetworkGraphOptions> {
  const keys = [...Object.keys(defaults), 'data'] as (keyof NetworkGraphOptions)[];
  const supplied = optionSnapshot(options, keys, 'networkGraph options');
  const { data: suppliedData, ...parameters } = supplied;
  const config = { ...defaults, ...parameters };
  bounded(config.nodeCount, 'nodeCount', 1, MAX_NODES, true);
  bounded(config.radius, 'radius', 0.01, 10_000);
  bounded(config.seed, 'seed', 0, 0xffffffff, true);
  const validateAppearance = (value: typeof config) => {
    bounded(value.nodeSize, 'nodeSize', 0.001, 10);
    bounded(value.speed, 'speed', -10, 10);
    bounded(value.edgeOpacity, 'edgeOpacity', 0, 1);
    colorString(value.colorA, 'colorA'); colorString(value.colorB, 'colorB');
  };
  validateAppearance(config);
  if (suppliedData !== undefined && supplied.nodeCount !== undefined) {
    throw new Error('Use either data or nodeCount; explicit graph data determines its node count.');
  }
  const data = snapshotData(suppliedData === undefined ? createDemoGraph(config.nodeCount, config.seed) : suppliedData);
  const positions = layoutSnapshot(data, config.radius, config.seed);
  const count = data.nodes.length;
  const nodeIndex = new Map(data.nodes.map((node, index) => [node.id, index]));
  const groups = [...new Set(data.nodes.map((node) => node.group ?? 0))].sort((a, b) => a - b);
  const groupIndex = new Map(groups.map((group, index) => [group, index]));
  const maximumValue = data.nodes.reduce((max, node) => Math.max(max, node.value ?? 1), 0) || 1;
  const maximumWeight = data.edges.reduce((max, edge) => Math.max(max, edge.weight ?? 1), 0) || 1;
  const nodeScales = data.nodes.map((node) => 0.55 + Math.sqrt((node.value ?? 1) / maximumValue) * 1.25);
  const object = new Group();
  object.name = '5js-network-graph';
  object.userData = { nodeIds: data.nodes.map((node) => node.id), edgeCount: data.edges.length, synthetic: suppliedData === undefined };
  const nodeGeometry = new SphereGeometry(1, 8, 6);
  const nodeMaterial = new MeshBasicMaterial({ toneMapped: false });
  const nodes = new InstancedMesh(nodeGeometry, nodeMaterial, count);
  nodes.name = 'network-nodes';
  const transform = new Object3D();
  const refreshNodeSizes = () => {
    for (let i = 0; i < count; i++) {
      transform.position.fromArray(positions, i * 3);
      transform.scale.setScalar(config.nodeSize * nodeScales[i]);
      transform.updateMatrix();
      nodes.setMatrixAt(i, transform.matrix);
    }
    nodes.instanceMatrix.needsUpdate = true;
    nodes.computeBoundingSphere();
  };
  refreshNodeSizes();

  const glowGeometry = new BufferGeometry();
  glowGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  glowGeometry.setAttribute('scale', new Float32BufferAttribute(nodeScales, 1));
  const glowColors = new Float32BufferAttribute(new Float32Array(count * 3), 3);
  glowGeometry.setAttribute('color', glowColors);
  const glowMaterial = new ShaderMaterial({
    uniforms: { uSize: { value: config.nodeSize } },
    vertexShader: `attribute float scale; attribute vec3 color; varying vec3 vColor; uniform float uSize;
      void main() { vColor = color; vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p; gl_PointSize = clamp(uSize * scale * 1600.0 / max(0.1, -p.z), 2.0, 96.0); }`,
    fragmentShader: `varying vec3 vColor;
      void main() { float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard; gl_FragColor = vec4(vColor, pow(1.0 - r, 2.5) * 0.5);
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const glows = new Points(glowGeometry, glowMaterial);
  glows.name = 'network-glow';
  // Point sprites extend beyond their centers, so do not cull against the center-only bounds.
  glows.frustumCulled = false;
  const edgeGeometry = new BufferGeometry();
  const edgePositions = new Float32Array(data.edges.length * 6);
  data.edges.forEach((edge, i) => {
    edgePositions.set(positions.subarray(nodeIndex.get(edge.source)! * 3, nodeIndex.get(edge.source)! * 3 + 3), i * 6);
    edgePositions.set(positions.subarray(nodeIndex.get(edge.target)! * 3, nodeIndex.get(edge.target)! * 3 + 3), i * 6 + 3);
  });
  edgeGeometry.setAttribute('position', new Float32BufferAttribute(edgePositions, 3));
  const edgeColors = new Float32BufferAttribute(new Float32Array(data.edges.length * 6), 3);
  edgeGeometry.setAttribute('color', edgeColors);
  const edgeMaterial = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: config.edgeOpacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  const edges = new LineSegments(edgeGeometry, edgeMaterial);
  edges.name = 'network-edges';
  const refreshColors = () => {
    const colorA = scientificColor(config.colorA, 'colorA'); const colorB = scientificColor(config.colorB, 'colorB');
    const colors = data.nodes.map((node, i) => {
      const ratio = groups.length > 1 ? groupIndex.get(node.group ?? 0)! / (groups.length - 1) : i / Math.max(1, count - 1);
      return colorA.clone().lerp(colorB, ratio);
    });
    colors.forEach((color, i) => { nodes.setColorAt(i, color); color.toArray(glowColors.array, i * 3); });
    if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
    glowColors.needsUpdate = true;
    data.edges.forEach((edge, i) => {
      const brightness = 0.25 + 0.75 * (edge.weight ?? 1) / maximumWeight;
      colors[nodeIndex.get(edge.source)!].clone().multiplyScalar(brightness).toArray(edgeColors.array, i * 6);
      colors[nodeIndex.get(edge.target)!].clone().multiplyScalar(brightness).toArray(edgeColors.array, i * 6 + 3);
    });
    edgeColors.needsUpdate = true;
  };
  refreshColors();
  object.add(edges, glows, nodes);
  let disposed = false;
  let phase = 0;
  return {
    object, kind: 'networkGraph', count,
    update(_time, delta) {
      if (disposed) return;
      if (!Number.isFinite(delta) || delta < 0) return;
      const nextPhase = phase + delta * config.speed;
      if (!Number.isFinite(nextPhase)) return;
      phase = nextPhase;
      object.rotation.y = phase * 0.12;
      object.rotation.x = Math.sin(phase * 0.15) * 0.08;
    },
    set(patch) {
      if (disposed) throw new Error('Cannot update a disposed networkGraph layer.');
      const supplied = optionSnapshot(patch, keys, 'networkGraph.set()');
      rejectStructural(patch, ['data', 'nodeCount', 'radius', 'seed'], 'networkGraph');
      const next = { ...config, ...supplied };
      validateAppearance(next);
      Object.assign(config, next);
      if (supplied.nodeSize !== undefined) { refreshNodeSizes(); glowMaterial.uniforms.uSize.value = config.nodeSize; }
      if (supplied.edgeOpacity !== undefined) edgeMaterial.opacity = config.edgeOpacity;
      if (supplied.colorA !== undefined || supplied.colorB !== undefined) refreshColors();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      nodes.dispose(); nodeGeometry.dispose(); nodeMaterial.dispose();
      glowGeometry.dispose(); glowMaterial.dispose(); edgeGeometry.dispose(); edgeMaterial.dispose();
      object.removeFromParent(); object.clear();
    },
  };
}
