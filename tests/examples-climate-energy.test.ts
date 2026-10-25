import assert from 'node:assert/strict';
import test from 'node:test';
import type { BufferAttribute, BufferGeometry, Material, Mesh, Points } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import jet, { jetLatitude, globePosition } from '../examples/climate/jet-stream.js';
import ocean, { gyrePath } from '../examples/climate/ocean-gyres.js';
import grid, { calculateDispatch } from '../examples/energy/grid-dispatch.js';
import fusion, { fusionPath } from '../examples/energy/fusion-chamber.js';

test('synthetic jets remain within their stated latitude bounds and spherical radius', () => {
  for (const center of [20, 36, 55]) for (const amplitude of [2, 12, 22]) for (const hemisphere of [-1, 1] as const) {
    for (let i = 0; i <= 100; i++) {
      const longitude = i / 100 * Math.PI * 2;
      const latitude = jetLatitude(longitude, hemisphere, center, amplitude);
      assert.ok(Math.abs(latitude - hemisphere * center) <= amplitude + 1e-12);
      assert.ok(Math.abs(latitude) < 90);
      assert.ok(Math.abs(Math.hypot(...globePosition(longitude, latitude, 2.9)) - 2.9) < 1e-12);
    }
    assert.ok(Math.abs(jetLatitude(0, hemisphere, center, amplitude) - jetLatitude(Math.PI * 2, hemisphere, center, amplitude)) < 1e-12);
  }
  assert.throws(() => jetLatitude(0, 1, 90, 12));
});

test('ocean gyres close and preserve the chosen opposite winding directions', () => {
  for (const direction of [-1, 1] as const) {
    const path = gyrePath(-2.25, 1.7, -1.5, direction, .6);
    assert.ok(path.flat().every(Number.isFinite));
    assert.ok(Math.hypot(...path[0].map((v, axis) => v - path.at(-1)![axis])) < 1e-12);
    assert.ok(Math.sign(path[1][2]) === direction);
    assert.ok(path.every(point => Math.abs(point[1] + 1.5) <= .11 + 1e-12));
  }
});

test('synthetic grid dispatch conserves supply and demand under deficit and surplus', () => {
  for (const demand of [180, 310, 480]) for (const solar of [.2, .75, 1]) for (const wind of [.2, .7, 1]) {
    const model = calculateDispatch({ demand, solar, wind });
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9);
    close(model.served + model.unserved, demand);
    close(model.served + model.curtailment, model.available);
    close(sum(model.generators.map(row => row.dispatched)), model.served);
    close(sum(model.districts.map(row => row.served)), model.served);
    close(sum(model.districts.map(row => row.unmet)), model.unserved);
    assert.ok(model.generators.every(row => row.dispatched >= 0 && row.dispatched <= row.available + 1e-9));
    assert.ok(model.districts.every(row => row.served <= row.demand + 1e-9 && row.unmet >= 0));
  }
  assert.equal(calculateDispatch({ demand: 480, solar: .2, wind: .2 }).unserved, 336);
  assert.equal(calculateDispatch({ demand: 180, solar: 1, wind: 1 }).curtailment, 220);
  assert.throws(() => calculateDispatch({ demand: NaN, solar: 1, wind: 1 }));
});

test('fusion helices close at integer winding and remain inside their declared torus', () => {
  for (const turns of [1, 4, 7]) for (const radius of [.3, .65, .85]) {
    const path = fusionPath(turns, radius, .3);
    assert.ok(Math.hypot(...path[0].map((v, axis) => v - path.at(-1)![axis])) < 1e-11);
    for (const [x, y, z] of path) assert.ok(Math.abs((Math.hypot(x, z) - 3) ** 2 + (y / 1.35) ** 2 - radius ** 2) < 1e-11);
  }
  assert.throws(() => fusionPath(2.5, .6));
});

for (const example of [jet, ocean, grid, fusion]) test(`${example.id} animates, pauses, preserves readouts, and disposes finite scenario geometry`, () => {
  const layers: FiveLayer<object>[] = [];
  const instance = example.setup({ add(layer: FiveLayer<object>) { layers.push(layer); return layer; } } as unknown as FiveApp);
  const moving = () => layers.flatMap(layer => {
    const values: number[] = [];
    layer.object.traverse(object => {
      if ((object as Points).isPoints) values.push(...Array.from(((object as Points).geometry.getAttribute('position') as BufferAttribute).array));
    });
    values.push(...layer.object.rotation.toArray().slice(0, 3) as number[]);
    return values;
  });
  try {
    const initial = moving(), readout = JSON.stringify(instance.readout!());
    layers.forEach(layer => layer.update(1, .537));
    assert.notDeepEqual(moving(), initial);
    const after = moving(); layers.forEach(layer => layer.update(999, 0)); assert.deepEqual(moving(), after);
    assert.equal(JSON.stringify(instance.readout!()), readout);
    for (const control of instance.controls!) {
      for (const value of [control.min, control.max, control.value]) {
        control.apply(value);
        for (const layer of layers) layer.object.traverse(object => {
          const position = (object as Mesh).geometry?.getAttribute('position');
          if (position) assert.ok(Array.from(position.array).every(Number.isFinite), `${control.id}: nonfinite geometry`);
        });
        assert.ok(instance.readout!().table.rows.length > 0);
      }
    }
    const resources = new Set<BufferGeometry | Material>();
    layers.forEach(layer => layer.object.traverse(object => {
      if ((object as Mesh).geometry) resources.add((object as Mesh).geometry);
      for (const material of [(object as Mesh).material].flat()) if (material) resources.add(material);
    }));
    let released = 0; resources.forEach(resource => resource.addEventListener('dispose', () => released++));
    layers.forEach(layer => { layer.dispose(); layer.dispose(); });
    assert.equal(released, resources.size);
  } finally { layers.forEach(layer => layer.dispose()); instance.dispose?.(); }
});
