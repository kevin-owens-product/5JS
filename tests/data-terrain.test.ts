import assert from 'node:assert/strict';
import test from 'node:test';
import { Color, Group, InstancedMesh, LineSegments, Mesh, ShaderMaterial } from 'three';
import { createDemoGraph, layoutGraph, networkGraph } from '../src/layers/networkGraph';
import { terrain } from '../src/layers/terrain';

test('data and terrain colors reject invalid input before mutating live state', () => {
  assert.throws(() => networkGraph({ colorA: 'definitely-not-a-color' }), /colorA/);
  assert.throws(() => terrain({ colorB: 'rgb(300, 0, 0)' }), /colorB/);
  const land = terrain({ resolution: 2 });
  const material = (land.object as Mesh).material as ShaderMaterial;
  const original = material.uniforms.uColorA.value.clone();
  assert.throws(() => land.set({ height: 3, colorA: 'transparent' }), /colorA/);
  assert.equal(material.uniforms.uHeight.value, 2.2);
  assert.ok(original.equals(material.uniforms.uColorA.value));
  land.set({ colorA: 'rgb(50%, 25%, 0%)' });
  assert.ok(material.uniforms.uColorA.value.r > material.uniforms.uColorA.value.g);
  land.dispose();
});

test('sample graph and grouped layout reproduce from a seed and keep edges valid', () => {
  const first = createDemoGraph(140, 7);
  const second = createDemoGraph(140, 7);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, createDemoGraph(140, 8));
  assert.equal(new Set(first.nodes.map((node) => node.id)).size, 140);
  const ids = new Set(first.nodes.map((node) => node.id));
  for (const edge of first.edges) assert.ok(ids.has(edge.source) && ids.has(edge.target));
  const a = layoutGraph(first, 4, 7);
  assert.deepEqual(a, layoutGraph(second, 4, 7));
  assert.notDeepEqual(a, layoutGraph(first, 4, 8));
  assert.ok(a.every(Number.isFinite));
});

test('explicit graph preserves coordinates, IDs and source data', () => {
  const data = {
    nodes: [{ id: 'alpha', group: 10, value: 2, position: [1, 2, 3] as [number, number, number] }, { id: 'beta', group: 30, value: 5, position: [-1, 0, 2] as [number, number, number] }],
    edges: [{ source: 'alpha', target: 'beta', weight: 0.5 }],
  };
  const original = structuredClone(data);
  const layer = networkGraph({ data });
  assert.equal(layer.count, 2);
  assert.deepEqual(layer.object.userData.nodeIds, ['alpha', 'beta']);
  assert.equal(layer.object.userData.synthetic, false);
  const edges = layer.object.getObjectByName('network-edges') as LineSegments;
  assert.deepEqual(Array.from(edges.geometry.getAttribute('position').array), [1, 2, 3, -1, 0, 2]);
  assert.ok(layer.object.getObjectByName('network-nodes') instanceof InstancedMesh);
  assert.deepEqual(data, original);
  data.nodes[0].id = 'mutated-outside-layer';
  layer.set({ colorA: '#ffffff' });
  assert.deepEqual(layer.object.userData.nodeIds, ['alpha', 'beta']);
  layer.dispose();
});

test('graph rejects duplicate IDs, missing endpoints, nonfinite values and invalid counts', () => {
  assert.throws(() => networkGraph({ nodeCount: 0 }), /nodeCount/);
  assert.throws(() => networkGraph({ nodeCount: 1.5 }), /integer/);
  assert.throws(() => networkGraph({ data: { nodes: [], edges: [] } }), /nodes.length/);
  assert.throws(() => networkGraph({ data: { nodes: [{ id: 'a' }, { id: 'a' }], edges: [] } }), /Duplicate/);
  assert.throws(() => networkGraph({ data: { nodes: [{ id: 'a' }], edges: [{ source: 'a', target: 'b' }] } }), /missing endpoint/);
  assert.throws(() => networkGraph({ data: { nodes: [{ id: 'a', value: NaN }], edges: [] } }), /value/);
  assert.throws(() => networkGraph({ data: { nodes: [{ id: 'a', position: [0, Infinity, 0] }], edges: [] } }), /position/);
  assert.throws(() => networkGraph({ data: { nodes: [{ id: 'a' }], edges: [{ source: 'a', target: 'a', weight: -1 }] } }), /weight/);
  assert.throws(() => networkGraph({ nodeCount: 3, data: { nodes: [{ id: 'a' }], edges: [] } }), /either data or nodeCount/);
});

test('graph live appearance changes are validated atomically and speed zero freezes rotation', () => {
  const graph = networkGraph({ nodeCount: 20 });
  const edgeMaterial = (graph.object.getObjectByName('network-edges') as LineSegments).material;
  assert.ok(!Array.isArray(edgeMaterial));
  graph.set({ edgeOpacity: 0.7, nodeSize: 0.1, colorA: '#ffffff', speed: 0 });
  assert.equal(edgeMaterial.opacity, 0.7);
  graph.update(1, 1);
  assert.equal(graph.object.rotation.y, 0);
  graph.set({ speed: 1 }); graph.update(2, 1);
  assert.ok(graph.object.rotation.y > 0);
  assert.throws(() => graph.set({ edgeOpacity: 2, speed: 0 }), /edgeOpacity/);
  assert.equal(edgeMaterial.opacity, 0.7);
  assert.throws(() => graph.set({ nodeCount: 10 }), /create a new/);
  graph.dispose();
});

test('graph disposal releases each resource once and detaches the object', () => {
  const graph = networkGraph({ nodeCount: 12 });
  const scene = new Group(); scene.add(graph.object);
  const disposals = new Map<object, number>();
  graph.object.traverse((object) => {
    const renderable = object as Mesh;
    const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
    for (const resource of [renderable.geometry, ...materials].filter(Boolean)) {
      disposals.set(resource, 0);
      resource.addEventListener('dispose', () => disposals.set(resource, disposals.get(resource)! + 1));
    }
  });
  graph.dispose(); graph.dispose();
  assert.equal(graph.object.parent, null);
  assert.ok([...disposals.values()].every((count) => count === 1));
  assert.throws(() => graph.set({ speed: 1 }), /disposed/);
});

test('terrain vertex count, live uniforms, wireframe, deterministic seed and freeze', () => {
  const layer = terrain({ resolution: 24, seed: 9 });
  const material = (layer.object as Mesh).material as ShaderMaterial;
  assert.equal(layer.count, 25 * 25);
  layer.set({ height: 3, frequency: 2, speed: 2, wireframe: true, colorA: '#ffffff' });
  assert.equal(material.uniforms.uHeight.value, 3);
  assert.equal(material.uniforms.uFrequency.value, 2);
  assert.equal(material.wireframe, true);
  assert.ok(material.uniforms.uColorA.value.equals(new Color('#ffffff')));
  layer.update(10, 0.5);
  assert.equal(material.uniforms.uTime.value, 1);
  layer.set({ speed: 0 }); layer.update(20, 1);
  assert.equal(material.uniforms.uTime.value, 1);
  const second = terrain({ resolution: 2, seed: 9 });
  assert.equal(((second.object as Mesh).material as ShaderMaterial).uniforms.uSeed.value, material.uniforms.uSeed.value);
  second.dispose(); layer.dispose();
});

test('terrain validates bounds, rejects structural changes and disposes exactly once', () => {
  assert.throws(() => terrain({ resolution: 513 }), /resolution/);
  assert.throws(() => terrain({ frequency: 0 }), /frequency/);
  assert.throws(() => terrain({ height: Infinity }), /height/);
  const layer = terrain({ resolution: 2 });
  const mesh = layer.object as Mesh;
  let geometryDisposals = 0; let materialDisposals = 0;
  mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  const material = mesh.material as ShaderMaterial;
  material.addEventListener('dispose', () => materialDisposals++);
  assert.throws(() => layer.set({ size: 6 }), /create a new/);
  assert.throws(() => layer.set({ height: -1 }), /height/);
  assert.equal(material.uniforms.uHeight.value, 2.2);
  layer.dispose(); layer.dispose();
  assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1);
  assert.throws(() => layer.set({ height: 1 }), /disposed/);
});
