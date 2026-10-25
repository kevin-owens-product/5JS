import assert from 'node:assert/strict';
import test from 'node:test';
import { Group, Line, Points, Scene, ShaderMaterial } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import vortex from '../examples/scientific/vortex-flow.js';
import waves from '../examples/scientific/wave-interference.js';
import dimensions from '../examples/scientific/dimensional-dance.js';
import lorenz, { createLorenzLayer, lorenzDerivative, sampleLorenzTrajectory } from '../examples/scientific/lorenz-attractor.js';

test('scientific recipes construct with a browser-free app and expose working controls', () => {
  for (const recipe of [vortex, waves, dimensions, lorenz]) {
    const layers: FiveLayer<object>[] = [];
    const scene = new Scene();
    const app = {
      add<P extends object>(layer: FiveLayer<P>) {
        layers.push(layer);
        scene.add(layer.object);
        return layer;
      },
    } as FiveApp;
    const instance = recipe.setup(app);
    assert.ok(layers.length >= 1);
    assert.ok(instance.controls?.length && instance.controls.length <= 3);
    assert.equal(new Set(instance.controls.map(control => control.id)).size, instance.controls.length);
    for (const control of instance.controls) {
      assert.ok(control.value >= control.min && control.value <= control.max);
      for (const value of [control.min, control.max, control.value]) {
        control.apply(value);
        for (const layer of layers) layer.update(4, 0.016);
      }
    }
    instance.dispose?.();
    for (const layer of layers) layer.dispose();
    assert.equal(scene.children.length, 0);
  }
});

test('recipe controls reach particle uniforms and ordinary object transforms', () => {
  let added: FiveLayer<object>;
  const app = { add(layer: FiveLayer<object>) { added = layer; return layer; } } as FiveApp;
  const instance = waves.setup(app);
  const points = added!.object as Points;
  const material = points.material as ShaderMaterial;
  instance.controls!.find(control => control.id === 'radial')!.apply(2);
  assert.equal(material.uniforms.uTurbulence.value, 2);
  instance.controls!.find(control => control.id === 'height')!.apply(1.7);
  assert.equal(points.scale.y, 1.7);
  instance.controls!.find(control => control.id === 'speed')!.apply(0);
  const phase = material.uniforms.uTime.value;
  added!.update(10, 1);
  assert.equal(material.uniforms.uTime.value, phase);
  added!.dispose();
});

test('Lorenz derivative matches the origin, a known state, and nonzero equilibria', () => {
  assert.deepEqual(lorenzDerivative([0, 0, 0]), [0, 0, 0]);
  const derivative = lorenzDerivative([1, 1, 1]);
  assert.equal(derivative[0], 0);
  assert.equal(derivative[1], 26);
  assert.ok(Math.abs(derivative[2] + 5 / 3) < 1e-14);
  for (const sign of [-1, 1]) {
    const x = sign * Math.sqrt(72);
    assert.ok(lorenzDerivative([x, x, 27]).every(value => Math.abs(value) < 1e-12));
  }
});

test('RK4 sampling is deterministic, finite, bounded, and converges over a short interval', () => {
  const path = sampleLorenzTrajectory();
  assert.equal(path.length, 18000 * 3);
  assert.deepEqual(path, sampleLorenzTrajectory());
  assert.ok(path.every(value => Number.isFinite(value) && Math.abs(value) < 100));
  const finalState = (samples: number, step: number) => Array.from(sampleLorenzTrajectory(samples, step, 0).slice(-3));
  const coarse = finalState(11, 0.01);
  const medium = finalState(21, 0.005);
  const fine = finalState(41, 0.0025);
  const reference = finalState(201, 0.0005);
  const error = (state: number[]) => Math.hypot(...state.map((value, i) => value - reference[i]));
  assert.ok(error(medium) < error(coarse) / 8);
  assert.ok(error(fine) < error(medium) / 8);
  assert.deepEqual(Array.from(sampleLorenzTrajectory(2, 0.005, 0).slice(0, 3)), [1, 1, 1]);
  assert.throws(() => sampleLorenzTrajectory(50001), /samples/);
  assert.throws(() => sampleLorenzTrajectory(10, 0.1), /step/);
  assert.throws(() => sampleLorenzTrajectory(10, 0.005, -1), /burnIn/);
});

test('Lorenz playback preserves the precomputed trajectory and freezes without a phase reset', () => {
  const layer = createLorenzLayer();
  const object = layer.object as Group;
  const background = object.children[0] as Line;
  const trail = object.children[1] as Line;
  const marker = object.children[2] as Points;
  const positions = background.geometry.getAttribute('position').array;
  const initialMarker = marker.geometry.getAttribute('position').array.slice();
  layer.update(1, 0.5);
  assert.equal(background.geometry.getAttribute('position').array, positions);
  assert.notDeepEqual(marker.geometry.getAttribute('position').array, initialMarker);
  layer.set({ speed: 0, rotationSpeed: 0 });
  const pausedMarker = marker.geometry.getAttribute('position').array.slice();
  const rotation = object.rotation.y;
  layer.update(10, 4);
  assert.deepEqual(marker.geometry.getAttribute('position').array, pausedMarker);
  assert.equal(object.rotation.y, rotation);
  layer.set({ speed: 1, trail: 600 });
  assert.deepEqual(marker.geometry.getAttribute('position').array, pausedMarker);
  assert.equal(trail.geometry.drawRange.count, 600);
  layer.update(11, 0.5);
  assert.notDeepEqual(marker.geometry.getAttribute('position').array, pausedMarker);
  assert.throws(() => layer.set({ trail: 5, speed: 2 }), /trail/);
  assert.equal(trail.geometry.drawRange.count, 600);
  layer.dispose();
});

test('custom Lorenz layer releases every geometry and material exactly once', () => {
  const layer = createLorenzLayer();
  const parent = new Group().add(layer.object);
  let geometryDisposals = 0, materialDisposals = 0;
  for (const child of layer.object.children as (Line | Points)[]) {
    child.geometry.addEventListener('dispose', () => geometryDisposals++);
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.addEventListener('dispose', () => materialDisposals++);
  }
  layer.dispose(); layer.dispose();
  assert.equal(geometryDisposals, 3);
  assert.equal(materialDisposals, 3);
  assert.equal(parent.children.length, 0);
  assert.throws(() => layer.set({ speed: 1 }), /disposed/);
  assert.doesNotThrow(() => layer.update(1, 1));
});
