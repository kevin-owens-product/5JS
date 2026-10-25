import assert from 'node:assert/strict';
import test from 'node:test';
import { Group, LineSegments, Points, ShaderMaterial } from 'three';
import { hypercube } from '../src/layers/hypercube';
import { particleField } from '../src/layers/particleField';
import { hypercubeTopology, projectHypercubeVertex, rotateHypercubeVertex } from '../src/layers/scientificMath';

test('n-cube topology has the correct edge count, degree, and unit edge lengths', () => {
  for (const dimensions of [4, 5] as const) {
    const { vertices, edges } = hypercubeTopology(dimensions);
    assert.equal(vertices.length, 2 ** dimensions);
    assert.equal(edges.length, dimensions * 2 ** (dimensions - 1));
    const degrees = new Array(vertices.length).fill(0);
    const unique = new Set<string>();
    for (const [a, b] of edges) {
      unique.add(`${a}:${b}`);
      degrees[a]++; degrees[b]++;
      assert.equal(vertices[a].reduce((sum, value, dimension) => sum + (value - vertices[b][dimension]) ** 2, 0), 4);
    }
    assert.equal(unique.size, edges.length);
    assert.ok(degrees.every((degree) => degree === dimensions));
  }
});

test('higher-dimensional rotations preserve norms and edge lengths before projection', () => {
  for (const dimensions of [4, 5] as const) {
    const { vertices, edges } = hypercubeTopology(dimensions);
    for (const time of [0, 0.5, 12, 3600, -100]) {
      const rotated = vertices.map((vertex) => rotateHypercubeVertex(vertex, time));
      for (const vertex of rotated) {
        assert.ok(Math.abs(vertex.reduce((sum, coordinate) => sum + coordinate * coordinate, 0) - dimensions) < 1e-12);
        assert.ok(projectHypercubeVertex(vertex, 3.4).every(Number.isFinite));
      }
      for (const [a, b] of edges) {
        const distanceSquared = rotated[a].reduce((sum, coordinate, axis) => sum + (coordinate - rotated[b][axis]) ** 2, 0);
        assert.ok(Math.abs(distanceSquared - 4) < 1e-12);
      }
    }
  }
});

test('projection uses fourth and fifth coordinates and respects size', () => {
  const a = projectHypercubeVertex([1, 1, 1, 1], 2);
  const b = projectHypercubeVertex([1, 1, 1, -1], 2);
  const c = projectHypercubeVertex([1, 1, 1, 1, 1], 2);
  assert.notDeepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.deepEqual(projectHypercubeVertex([1, 1, 1, 1], 4), a.map((value) => value * 2));
});

test('particle seeds reproduce fields without changing global randomness', () => {
  const a = particleField({ count: 100, seed: 7 });
  const b = particleField({ count: 100, seed: 7 });
  const c = particleField({ count: 100, seed: 8 });
  const seeds = (layer: typeof a) => (layer.object as Points).geometry.getAttribute('aSeed').array;
  assert.deepEqual(seeds(a), seeds(b));
  assert.notDeepEqual(seeds(a), seeds(c));
  assert.equal(a.count, 100);
  a.dispose(); b.dispose(); c.dispose();
});

test('particle speed changes preserve phase, and live options update atomically', () => {
  const field = particleField({ count: 20, speed: 0.5 });
  const points = field.object as Points;
  const material = points.material as ShaderMaterial;
  const initialSeeds = points.geometry.getAttribute('aSeed').array.slice();
  field.update(12, 0.25);
  assert.equal(material.uniforms.uTime.value, 0.125);
  field.update(3, 0.25);
  assert.equal(material.uniforms.uTime.value, 0.25);
  field.set({ speed: 0 });
  field.update(1000, 0.5);
  assert.equal(material.uniforms.uTime.value, 0.25);
  field.set({ mode: 'wave', radius: 7, speed: 2 });
  assert.equal(material.uniforms.uMode.value, 2);
  assert.equal(material.uniforms.uRadius.value, 7);
  assert.equal(material.uniforms.uTime.value, 0.25);
  field.update(1001, 0.125);
  assert.equal(material.uniforms.uTime.value, 0.5);
  assert.deepEqual(points.geometry.getAttribute('aSeed').array, initialSeeds);
  assert.throws(() => field.set({ radius: 4, turbulence: -1 }), /turbulence/);
  assert.equal(material.uniforms.uRadius.value, 7);
  assert.throws(() => field.set({ count: 100 }), /immutable/);
  assert.throws(() => field.set({ seed: 100 }), /immutable/);
  assert.throws(() => field.set({ colorA: 'definitely not a color' }), /colorA/);
  for (const delta of [NaN, Infinity, -1, Number.MAX_VALUE]) field.update(2000, delta);
  assert.equal(material.uniforms.uTime.value, 0.5);
  field.dispose();
});

test('hypercube dimension changes rebuild topology and dispose replaced geometry', () => {
  const layer = hypercube({ dimensions: 4, speed: 1 });
  const group = layer.object as Group;
  const lines = group.children[0] as LineSegments;
  const points = group.children[1] as Points;
  assert.equal(layer.count, 16);
  assert.equal(lines.geometry.getAttribute('position').count, 64);
  layer.update(10, 0.1);
  const firstFrame = points.geometry.getAttribute('position').array.slice();
  layer.update(20, 0.1);
  assert.notDeepEqual(points.geometry.getAttribute('position').array, firstFrame);
  let replacedGeometryDisposals = 0;
  points.geometry.addEventListener('dispose', () => replacedGeometryDisposals++);
  layer.set({ dimensions: 5 });
  assert.equal(layer.count, 32);
  assert.equal(points.geometry.getAttribute('position').count, 32);
  assert.equal(lines.geometry.getAttribute('position').count, 160);
  assert.equal(replacedGeometryDisposals, 1);
  assert.throws(() => layer.set({ dimensions: 6 as 5 }), /dimensions/);
  assert.equal(layer.count, 32);
  layer.dispose();
});

test('identical delta and speed sequences reproduce animation independently of scene age', () => {
  for (const makeLayer of [() => particleField({ count: 10 }), () => hypercube()]) {
    const a = makeLayer(), b = makeLayer();
    const snapshot = (layer: typeof a) => layer.object instanceof Points
      ? (layer.object.material as ShaderMaterial).uniforms.uTime.value
      : Array.from((layer.object.children[1] as Points).geometry.getAttribute('position').array);
    for (const delta of [0.125, 0.25, 0.5]) {
      a.update(12, delta);
      b.update(3000, delta);
    }
    assert.deepEqual(snapshot(a), snapshot(b));
    const beforePause = snapshot(a);
    a.set({ speed: 0 }); b.set({ speed: 0 });
    a.update(15, 1); b.update(9000, 2);
    assert.deepEqual(snapshot(a), beforePause);
    assert.deepEqual(snapshot(a), snapshot(b));
    a.set({ speed: 2 }); b.set({ speed: 2 });
    assert.deepEqual(snapshot(a), beforePause);
    a.update(16, 0.25); b.update(10000, 0.25);
    assert.notDeepEqual(snapshot(a), beforePause);
    assert.deepEqual(snapshot(a), snapshot(b));
    const validFrame = snapshot(a);
    for (const delta of [NaN, Infinity, -1, Number.MAX_VALUE]) a.update(17, delta);
    assert.deepEqual(snapshot(a), validFrame);
    a.dispose(); b.dispose();
  }
});

test('scientific transforms reject singular or nonfinite input', () => {
  assert.throws(() => projectHypercubeVertex([1, 1, 1, 5.5], 2), /perspective camera/);
  assert.throws(() => projectHypercubeVertex([1, 1, 1, 1, 5], 2), /perspective camera/);
  assert.throws(() => projectHypercubeVertex([1, 1, Infinity, 1], 2), /finite/);
  assert.throws(() => projectHypercubeVertex([Number.MAX_VALUE, 1, 1, 1], 10000), /finite/);
  assert.throws(() => rotateHypercubeVertex([1, 1, 1, 1], Infinity), /finite/);
  assert.throws(() => rotateHypercubeVertex([1, 1, 1], 1), /4 or 5/);
});

test('scientific layers reject invalid construction and dispose resources exactly once', () => {
  assert.throws(() => particleField({ count: 250001 }), /count/);
  assert.throws(() => particleField({ count: 1.5 }), /count/);
  assert.throws(() => particleField({ seed: NaN }), /seed/);
  assert.throws(() => particleField({ radius: Infinity }), /radius/);
  assert.throws(() => hypercube({ size: 0 }), /size/);
  assert.throws(() => hypercube({ speed: Infinity }), /speed/);
  for (const layer of [particleField({ count: 2 }), hypercube()]) {
    const parent = new Group().add(layer.object);
    const resources = new Set<object>();
    const disposed: object[] = [];
    layer.object.traverse((object) => {
      const renderable = object as Points;
      if (renderable.geometry) resources.add(renderable.geometry);
      if (renderable.material) {
        for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) resources.add(material);
      }
    });
    for (const resource of resources) {
      (resource as ShaderMaterial).addEventListener('dispose', () => disposed.push(resource));
    }
    layer.dispose(); layer.dispose();
    assert.equal(disposed.length, resources.size);
    assert.equal(parent.children.length, 0);
    assert.throws(() => layer.set({}), /disposed/);
    assert.doesNotThrow(() => layer.update(1, 0.1));
  }
});
