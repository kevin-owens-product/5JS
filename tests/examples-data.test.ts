import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Vector3 } from 'three';
import type { FiveApp, FiveLayer, GraphData } from '../src/index.js';
import community, { createCommunityData } from '../examples/data/community-network.js';
import dependency, { createDependencyData } from '../examples/data/dependency-tree.js';
import helix, { createDoubleHelixData } from '../examples/data/double-helix.js';
import lattice, { createLatticeData } from '../examples/data/lattice-network.js';

const recipes = [
  { example: community, create: createCommunityData, nodes: 210 },
  { example: dependency, create: createDependencyData, nodes: 121 },
  { example: helix, create: createDoubleHelixData, nodes: 168 },
  { example: lattice, create: createLatticeData, nodes: 216 },
];

function assertConnectedGraph(data: GraphData): void {
  const adjacency = new Map(data.nodes.map((node) => [node.id, new Set<string>()]));
  assert.equal(adjacency.size, data.nodes.length, 'IDs are unique');
  const edgeKeys = new Set<string>();
  for (const edge of data.edges) {
    assert.ok(adjacency.has(edge.source) && adjacency.has(edge.target), 'edge endpoints exist');
    assert.notEqual(edge.source, edge.target, 'no self edges');
    const edgeKey = JSON.stringify([edge.source, edge.target].sort());
    assert.ok(!edgeKeys.has(edgeKey), 'no repeated undirected edges');
    edgeKeys.add(edgeKey);
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  const visited = new Set<string>();
  const pending = [data.nodes[0].id];
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const neighbor of adjacency.get(id)!) if (!visited.has(neighbor)) pending.push(neighbor);
  }
  assert.equal(visited.size, data.nodes.length, 'all nodes are reachable');
}

for (const { example, create, nodes } of recipes) {
  test(`${example.id}: deterministic explicit connected graph and live controls`, () => {
    const data = create();
    assert.equal(data.nodes.length, nodes);
    assert.deepEqual(data, create());
    assertConnectedGraph(data);
    for (const node of data.nodes) {
      assert.equal(node.position?.length, 3);
      assert.ok(node.position!.every((coordinate) => Number.isFinite(coordinate) && Math.abs(coordinate) <= 3.5));
    }
    assert.match(example.dataNote!, /^Synthetic/);
    const camera = new PerspectiveCamera(45, 1.5, 0.05, 2000);
    camera.position.fromArray(example.camera);
    camera.lookAt(...(example.target ?? [0, 0, 0]));
    camera.updateMatrixWorld();
    for (const node of data.nodes) {
      const projected = new Vector3(...node.position!).project(camera);
      assert.ok(Math.abs(projected.x) < 0.94 && Math.abs(projected.y) < 0.94, 'default camera frames every node with a margin');
    }
    const owned: FiveLayer<any>[] = [];
    const app = { add: (layer: FiveLayer<any>) => { owned.push(layer); return layer; } } as unknown as FiveApp;
    const instance = example.setup(app);
    assert.equal(owned.length, 1);
    assert.equal(owned[0].count, nodes);
    assert.equal(owned[0].object.userData.synthetic, false);
    owned[0].update(2, 2);
    assert.equal(owned[0].object.rotation.y, 0, 'structured graphs start without rotation');
    const controls = instance.controls ?? [];
    assert.ok(controls.length >= 1 && controls.length <= 3);
    for (const control of controls) {
      assert.ok(control.value >= control.min && control.value <= control.max);
      control.apply(control.min); control.apply(control.max); control.apply(control.value);
    }
    for (const layer of owned) layer.dispose();
    instance.dispose?.();
  });
}

test('tree, helix, and lattice preserve their promised topologies', () => {
  const tree = createDependencyData();
  assert.equal(tree.edges.length, tree.nodes.length - 1);
  const incoming = new Map<string, number>();
  for (const edge of tree.edges) incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  assert.equal(incoming.has('root'), false);
  assert.ok(tree.nodes.filter((node) => node.id !== 'root').every((node) => incoming.get(node.id) === 1));
  const spiral = createDoubleHelixData();
  assert.equal(spiral.edges.length, 2 * 83 + 84);
  const grid = createLatticeData();
  assert.equal(grid.edges.length, 540);
  const positions = new Map(grid.nodes.map((node) => [node.id, node.position!]));
  for (const edge of grid.edges) {
    const a = positions.get(edge.source)!; const b = positions.get(edge.target)!;
    const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    assert.ok(Math.abs(distance - 1.15) < 1e-10);
  }
});
