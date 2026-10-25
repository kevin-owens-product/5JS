import test from 'node:test';
import assert from 'node:assert/strict';
import { BufferGeometry, Material } from 'three';
import type { Mesh, ShaderMaterial } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import neon from '../examples/cinematic/neon-landscape.js';
import galaxies from '../examples/cinematic/twin-galaxies.js';
import garden from '../examples/cinematic/orbital-garden.js';
import summit from '../examples/cinematic/crystal-summit.js';

const examples = [neon, galaxies, garden, summit];

function mockApp() {
  const layers: FiveLayer<object>[] = [];
  const app: Pick<FiveApp, 'add' | 'setBloom'> = {
    add<P extends object>(layer: FiveLayer<P>) { layers.push(layer); layer.update(0, 0); return layer; },
    setBloom(value) { assert.ok(Number.isFinite(value)); },
  };
  return { app: app as FiveApp, layers };
}

function snapshot(layers: FiveLayer<object>[]) {
  const values: unknown[] = [];
  for (const layer of layers) layer.object.traverse(object => {
    const mesh = object as Mesh<BufferGeometry, ShaderMaterial>;
    values.push(object.position.toArray(), object.quaternion.toArray());
    const positions = mesh.geometry?.getAttribute('position');
    if (positions) values.push(Array.from(positions.array).slice(0, 120));
    if (mesh.material?.uniforms?.uTime) values.push(mesh.material.uniforms.uTime.value);
  });
  return JSON.stringify(values);
}

for (const example of examples) {
  test(`${example.id}: setup and real controls work without browser globals`, () => {
    const { app, layers } = mockApp();
    const instance = example.setup(app);
    assert.equal(example.category, 'Cinematic');
    assert.ok(layers.length >= 2);
    assert.ok(instance.controls && instance.controls.length >= 1 && instance.controls.length <= 3);
    for (const control of instance.controls) {
      assert.ok(control.value >= control.min && control.value <= control.max);
      control.apply(control.min);
      control.apply(control.max);
      control.apply(control.value);
    }
    for (const layer of layers) layer.update(1, 1);
    const beforePause = snapshot(layers);
    for (const layer of layers) layer.update(100, 0);
    assert.equal(snapshot(layers), beforePause, 'zero delta must preserve the paused picture');
    for (const layer of layers) layer.dispose();
    instance.dispose?.();
  });

  test(`${example.id}: app-owned layers release every geometry and material once`, () => {
    const { app, layers } = mockApp();
    const instance = example.setup(app);
    const resources = new Set<BufferGeometry | Material>();
    const disposalCounts = new Map<BufferGeometry | Material, number>();
    for (const layer of layers) layer.object.traverse(object => {
      const mesh = object as Mesh;
      if (mesh.geometry) resources.add(mesh.geometry);
      if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) resources.add(material);
    });
    for (const resource of resources) {
      disposalCounts.set(resource, 0);
      resource.addEventListener('dispose', () => disposalCounts.set(resource, disposalCounts.get(resource)! + 1));
    }
    for (const layer of layers) { layer.dispose(); layer.dispose(); }
    instance.dispose?.();
    assert.ok(resources.size > 0);
    for (const resource of resources) assert.equal(disposalCounts.get(resource), 1);
  });
}

test('orbital garden moves planets with delta and keeps them still at zero orbit speed', () => {
  const { app, layers } = mockApp();
  const instance = garden.setup(app);
  const path = layers.find(layer => layer.kind === 'orbital-garden:orbit')!;
  const planet = path.object.getObjectByName('orbital-garden:planet')!;
  const initial = planet.position.toArray();
  path.update(1, 1);
  assert.notDeepEqual(planet.position.toArray(), initial);
  instance.controls!.find(control => control.id === 'orbit-speed')!.apply(0);
  const stopped = planet.position.toArray();
  path.update(2, 1);
  assert.deepEqual(planet.position.toArray(), stopped);
  layers.forEach(layer => layer.dispose());
});
