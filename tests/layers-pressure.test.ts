import assert from 'node:assert/strict';
import test from 'node:test';
import { performance } from 'node:perf_hooks';
import { BufferGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, Points, ShaderMaterial } from 'three';
import type { FiveLayer, GraphData } from '../src/types.js';
import { particleField } from '../src/layers/particleField.js';
import { hypercube } from '../src/layers/hypercube.js';
import { createDemoGraph, layoutGraph, networkGraph } from '../src/layers/networkGraph.js';
import { terrain } from '../src/layers/terrain.js';
import { hypercubeTopology, projectHypercubeVertex, rotateHypercubeVertex, scientificColor, seededRandom } from '../src/layers/scientificMath.js';
import { seededRandom as dataRandom } from '../src/layers/dataMath.js';

const factories = [
  { name: 'particles', create: particleField, small: { count: 8 }, key: 'radius', value: 7 },
  { name: 'hypercube', create: hypercube, small: {}, key: 'size', value: 7 },
  { name: 'network', create: networkGraph, small: { nodeCount: 8 }, key: 'nodeSize', value: 0.2 },
  { name: 'terrain', create: terrain, small: { resolution: 2 }, key: 'height', value: 7 },
];

function shader(layer: FiveLayer<any>): ShaderMaterial {
  if (layer.kind === 'networkGraph') return (layer.object.getObjectByName('network-glow') as Points).material as ShaderMaterial;
  return (layer.object as Mesh).material as ShaderMaterial;
}

function snapshot(layer: FiveLayer<any>) {
  const records: unknown[] = [];
  layer.object.traverse(object => {
    const draw = object as Mesh;
    records.push({ position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray() });
    if (draw.geometry) for (const [name, attribute] of Object.entries(draw.geometry.attributes)) records.push([name, Array.from(attribute.array)]);
    if (object instanceof InstancedMesh) records.push(['instances', Array.from(object.instanceMatrix.array)]);
    for (const material of draw.material ? [draw.material].flat() : []) {
      records.push({ opacity: material.opacity, color: (material as any).color?.toArray(), wireframe: (material as any).wireframe });
      if (material instanceof ShaderMaterial) records.push(Object.fromEntries(Object.entries(material.uniforms).map(([key, { value }]) => [key, value instanceof Color ? value.toArray() : value])));
    }
  });
  return records;
}

test('all factories and setters reject hostile non-object JavaScript inputs before mutation', () => {
  for (const entry of factories) {
    for (const value of [null, 7, true, 'options', [], () => {}, Symbol('options'), 3n]) {
      assert.throws(() => entry.create(value as never), /options object/, `${entry.name}: reject ${typeof value}`);
    }
    const layer = entry.create(entry.small as never);
    const before = snapshot(layer);
    for (const value of [undefined, null, 7, false, 'patch', [], () => {}]) assert.throws(() => layer.set(value as never), /options object/);
    assert.deepEqual(snapshot(layer), before);
    layer.dispose();
  }
});

test('supported accessor options are captured exactly once and unknown getters are not evaluated', () => {
  for (const entry of factories) {
    let reads = 0;
    const options = { ...entry.small, get unrelated() { throw new Error('Unknown property should not be read'); } };
    Object.defineProperty(options, entry.key, { enumerable: true, get() { assert.equal(++reads, 1); return entry.value; } });
    const layer = entry.create(options as never);
    assert.equal(reads, 1, `${entry.name}: constructor`);
    reads = 0;
    const patch = Object.defineProperty({}, entry.key, { enumerable: true, get() { assert.equal(++reads, 1); return entry.value / 2; } });
    layer.set(patch as never);
    assert.equal(reads, 1, `${entry.name}: set`);
    if (entry.name === 'network') assert.equal(shader(layer).uniforms.uSize.value, entry.value / 2);
    if (entry.name === 'terrain') assert.equal(shader(layer).uniforms.uHeight.value, entry.value / 2);
    if (entry.name === 'particles') assert.equal(shader(layer).uniforms.uRadius.value, entry.value / 2);
    layer.dispose();
  }
});

test('throwing accessors and invalid multi-field patches are atomic and leave layers usable', () => {
  for (const entry of factories) {
    const layer = entry.create(entry.small as never);
    const before = snapshot(layer);
    assert.throws(() => layer.set({ [entry.key]: entry.value, get speed() { throw new Error('Snapshot failed'); } } as never), /Snapshot failed/);
    assert.deepEqual(snapshot(layer), before);
    assert.throws(() => layer.set({ [entry.key]: entry.value, speed: Infinity } as never), /speed/);
    assert.deepEqual(snapshot(layer), before);
    layer.set({ [entry.key]: entry.value } as never);
    assert.notDeepEqual(snapshot(layer), before);
    layer.dispose();
  }
});

test('undefined options are no-ops, null numeric values reject, inherited/prototype keys do not alter options', () => {
  for (const entry of factories) {
    const layer = entry.create(entry.small as never);
    const before = snapshot(layer);
    layer.set({ [entry.key]: undefined } as never);
    layer.set(Object.create({ [entry.key]: entry.value }));
    layer.set(JSON.parse('{"__proto__":{"speed":999999}}'));
    assert.deepEqual(snapshot(layer), before);
    assert.equal(({} as any).speed, undefined);
    assert.throws(() => entry.create({ ...entry.small, [entry.key]: null } as never));
    layer.dispose();
  }
  const land = terrain({ resolution: 2 }); const graph = networkGraph({ nodeCount: 2 });
  assert.throws(() => land.set({ resolution: undefined }), /create a new/);
  assert.throws(() => graph.set({ nodeCount: undefined }), /create a new/);
  land.dispose(); graph.dispose();
});

test('graph data snapshots read fields once and preserve prototype-like IDs safely', () => {
  const reads = new Map<string, number>();
  const once = (key: string, value: unknown) => ({ enumerable: true, get() { reads.set(key, (reads.get(key) ?? 0) + 1); assert.equal(reads.get(key), 1, key); return value; } });
  const position = [1, 2, 3];
  for (let i = 0; i < 3; i++) Object.defineProperty(position, i, once(`coordinate-${i}`, i + 1));
  const node = Object.defineProperties({}, { id: once('id', '__proto__'), position: once('position', position), value: once('value', 2), group: once('group', 3) });
  const edge = Object.defineProperties({}, { source: once('source', '__proto__'), target: once('target', 'constructor'), weight: once('weight', 1) });
  const data = Object.defineProperties({}, { nodes: once('nodes', [node, { id: 'constructor', position: [0, 0, 0] }]), edges: once('edges', [edge]) });
  const options = Object.defineProperty({}, 'data', once('data', data));
  const graph = networkGraph(options);
  assert.equal(graph.count, 2);
  assert.deepEqual(graph.object.userData.nodeIds, ['__proto__', 'constructor']);
  assert.ok([...reads.values()].every(value => value === 1));
  graph.set({ colorA: '#fff' });
  assert.ok([...reads.values()].every(value => value === 1), 'live recoloring uses the retained snapshot');
  graph.dispose();
});

test('graph rejects sparse/malformed coordinates and values outside its Float32-safe published bounds', () => {
  for (const position of [new Array(3), [1, , 3], [0, 1e100, 0], [0, -1_000_001, 0], [0, NaN, 0]]) {
    const data = { nodes: [{ id: 'a', position }], edges: [] } as GraphData;
    assert.throws(() => layoutGraph(data, 4, 42));
    assert.throws(() => networkGraph({ data }));
  }
  assert.throws(() => networkGraph({ data: null as never }));
  assert.throws(() => networkGraph({ data: { nodes: new Array(2), edges: [] } }));
  assert.throws(() => networkGraph({ data: { nodes: [{ id: 'a' }], edges: new Array(1) } }));
  for (const data of [
    { nodes: [{ id: 'a', value: 1_000_001 }], edges: [] },
    { nodes: [{ id: 'a' }], edges: [{ source: 'a', target: 'a', weight: 1e100 }] },
  ]) assert.throws(() => networkGraph({ data }));
});

test('node normalization, weights, instance matrices and bounds remain finite at allowed extremes', () => {
  const graph = networkGraph({ nodeSize: 10, data: {
    nodes: [
      { id: 'zero', value: 0, group: 0, position: [-1e6, 1e6, -1e6] },
      { id: 'max', value: 1e6, group: 1e6, position: [1e6, -1e6, 1e6] },
      { id: 'default', position: [0, 0, 0] },
    ], edges: [{ source: 'zero', target: 'max', weight: 0 }, { source: 'max', target: 'default', weight: 1e6 }],
  } });
  const nodes = graph.object.getObjectByName('network-nodes') as InstancedMesh;
  const matrix = new Matrix4();
  nodes.getMatrixAt(0, matrix); assert.equal(matrix.elements[0], 5.5);
  nodes.getMatrixAt(1, matrix); assert.equal(matrix.elements[0], 18);
  assert.ok(Number.isFinite(nodes.boundingSphere!.radius));
  graph.object.traverse(object => {
    const geometry = (object as Mesh).geometry;
    if (geometry) for (const attribute of Object.values(geometry.attributes)) assert.ok(Array.from(attribute.array).every(Number.isFinite));
  });
  const colors = (graph.object.getObjectByName('network-edges') as Mesh).geometry.getAttribute('color');
  assert.ok(Array.from(colors.array).every(value => value >= 0 && value <= 1));
  graph.dispose();
});

test('overflowing frame deltas cannot poison transforms, uniforms, or subsequent valid updates', () => {
  for (const make of [() => networkGraph({ nodeCount: 3, speed: 10 }), () => terrain({ resolution: 2, speed: 10 }), () => particleField({ count: 3, speed: 10 }), () => hypercube({ speed: 10 })]) {
    const layer = make(); layer.update(0, 0.1);
    const before = snapshot(layer);
    for (const delta of [NaN, Infinity, -1, Number.MAX_VALUE]) layer.update(0, delta);
    assert.deepEqual(snapshot(layer), before, layer.kind);
    layer.update(0, 0.1);
    assert.notDeepEqual(snapshot(layer), before, 'valid animation can continue');
    layer.dispose();
  }
  const field = particleField({ count: 3, speed: 1 });
  field.update(0, 3e38);
  assert.equal(shader(field).uniforms.uTime.value, 0, 'derived vortex arithmetic would overflow float32 even though the time uniform fits');
  field.dispose();
});

test('seed streams stay equivalent after millions of calls and consume no global randomness', () => {
  const a = dataRandom(0xffffffff), b = seededRandom(0xffffffff);
  for (let i = 0; i < 5_000_000; i++) assert.equal(a(), b());
  const saved = Math.random;
  Math.random = () => { throw new Error('Global randomness accessed'); };
  try {
    assert.deepEqual(createDemoGraph(70, 0), createDemoGraph(70, 0));
    assert.deepEqual(layoutGraph(createDemoGraph(70, 0), 4, 0), layoutGraph(createDemoGraph(70, 0), 4, 0));
  } finally { Math.random = saved; }
});

test('randomized high-dimensional rotations preserve lengths and give finite bounded projections', () => {
  const random = seededRandom(9741);
  for (let trial = 0; trial < 100; trial++) {
    const dimensions = trial % 2 === 0 ? 4 : 5;
    const topology = hypercubeTopology(dimensions);
    const time = (random() - 0.5) * 1e12;
    const size = 0.01 + random() * 9999.99;
    const rotated = topology.vertices.map(vertex => rotateHypercubeVertex(vertex, time));
    for (const vertex of rotated) {
      assert.ok(Math.abs(vertex.reduce((sum, coordinate) => sum + coordinate ** 2, 0) - dimensions) < 1e-11);
      assert.ok(projectHypercubeVertex(vertex, size).every(value => Number.isFinite(value) && Math.abs(value) < size * 10));
    }
    for (const [a, b] of topology.edges) assert.ok(Math.abs(rotated[a].reduce((sum, coordinate, axis) => sum + (coordinate - rotated[b][axis]) ** 2, 0) - 4) < 1e-11);
  }
});

test('fractional color parsing remains finite at accepted bounds and rejects invalid forms', () => {
  for (const value of ['#000', '#fff', 'rgb(0.5, 255, 100.25)', 'rgb(0%, 100%, 50.5%)', 'hsl(-100000000000, 100%, 50%)', 'hsl(360, 0%, 100%)']) {
    assert.ok(scientificColor(value, 'color').toArray().every(component => Number.isFinite(component) && component >= 0 && component <= 1));
  }
  for (const value of ['rgb(256, 0, 0)', 'rgb(1%, 0, 0)', 'hsl(0, 101%, 0%)', '#ffffffff', 'rgba(1, 2, 3, 0.5)', 'transparent', '', null, 12]) assert.throws(() => scientificColor(value as string, 'color'));
});

test('repeated topology changes dispose only owned resources and rejected changes preserve resource identity', () => {
  const a = hypercube({ dimensions: 4 }), b = hypercube({ dimensions: 4 });
  const sibling = b.object.children[1] as Points;
  const siblingArray = sibling.geometry.getAttribute('position').array.slice();
  let siblingDisposals = 0; sibling.geometry.addEventListener('dispose', () => siblingDisposals++);
  const disposed: number[] = [];
  for (let i = 0; i < 30; i++) {
    const current = (a.object.children[1] as Points).geometry;
    let count = 0; current.addEventListener('dispose', () => count++);
    const before = snapshot(a);
    assert.throws(() => a.set({ dimensions: 5, color: 'invalid-color' }));
    assert.equal((a.object.children[1] as Points).geometry, current);
    assert.deepEqual(snapshot(a), before);
    a.set({ dimensions: i % 2 === 0 ? 5 : 4 });
    disposed.push(count);
  }
  a.dispose(); a.dispose();
  assert.ok(disposed.every(count => count === 1));
  assert.equal(siblingDisposals, 0);
  assert.deepEqual(sibling.geometry.getAttribute('position').array, siblingArray);
  b.update(0, 0.1); b.dispose(); assert.equal(siblingDisposals, 1);
});

function arrayBytes(layer: FiveLayer<any>): number {
  const buffers = new Set<ArrayBufferLike>();
  layer.object.traverse(object => {
    const geometry = (object as Mesh).geometry as BufferGeometry | undefined;
    if (geometry) {
      for (const attribute of Object.values(geometry.attributes)) buffers.add(attribute.array.buffer);
      if (geometry.index) buffers.add(geometry.index.array.buffer);
    }
    if (object instanceof InstancedMesh) { buffers.add(object.instanceMatrix.array.buffer); if (object.instanceColor) buffers.add(object.instanceColor.array.buffer); }
  });
  return [...buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0);
}

test('published maximum counts allocate bounded buffers and support update/recolor/disposal', t => {
  const graphData: GraphData = {
    nodes: Array.from({ length: 10000 }, (_, index) => ({ id: String(index), group: index % 11, value: index % 101 })),
    edges: Array.from({ length: 100000 }, (_, index) => ({ source: String(index % 10000), target: String((index % 10000 + 1 + Math.floor(index / 10000)) % 10000), weight: index % 101 })),
  };
  const cases = [
    { name: '250k particles', make: () => particleField({ count: 250000 }), expectedCount: 250000, maximumBytes: 7_000_000, change: { colorA: '#c6a6ff' } },
    { name: '10k nodes / 100k edges', make: () => networkGraph({ data: graphData }), expectedCount: 10000, maximumBytes: 7_000_000, change: { colorA: '#c6a6ff', nodeSize: 0.04 } },
    { name: '512 terrain subdivisions', make: () => terrain({ resolution: 512 }), expectedCount: 263169, maximumBytes: 15_000_000, change: { height: 3 } },
  ];
  for (const item of cases) {
    const start = performance.now();
    const layer = item.make(); const constructionMs = performance.now() - start;
    assert.equal(layer.count, item.expectedCount);
    const bytes = arrayBytes(layer); assert.ok(bytes <= item.maximumBytes, `${item.name}: ${bytes} bytes`);
    const updateStart = performance.now();
    for (let i = 0; i < 1000; i++) layer.update(i / 60, 1 / 60);
    const updatesMs = performance.now() - updateStart;
    const changeStart = performance.now(); layer.set(item.change as never); const changeMs = performance.now() - changeStart;
    const parent = new Group().add(layer.object); layer.dispose(); layer.dispose();
    assert.equal(parent.children.length, 0);
    t.diagnostic(JSON.stringify({ case: item.name, constructionMs: +constructionMs.toFixed(2), updates1000Ms: +updatesMs.toFixed(2), liveChangeMs: +changeMs.toFixed(2), typedArrayBytes: bytes }));
  }
});
