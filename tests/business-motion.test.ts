import assert from 'node:assert/strict';
import test from 'node:test';
import type { BufferAttribute, Mesh, Points, TorusGeometry } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import { examples } from '../examples/catalog.js';
import { createChartLayer } from '../examples/shared/chart.js';
import funnel from '../examples/business/conversion-funnel.js';

test('funnel gate openings preserve population ratios even at minimum conversion', () => {
  const layers: FiveLayer<object>[] = [];
  const instance = funnel.setup({ add(layer: FiveLayer<object>) { layers.push(layer); return layer; } } as unknown as FiveApp);
  try {
    for (const useMinimum of [false, true]) {
      if (useMinimum) for (const control of instance.controls!) control.apply(control.min);
      const counts = instance.readout!().table.rows.map(row => Number(row[1]));
      const rings: TorusGeometry[] = [];
      layers[0].object.traverse(object => {
        const geometry = (object as Mesh).geometry as TorusGeometry | undefined;
        if (geometry?.type === 'TorusGeometry' && [0.035, 0.012].includes(geometry.parameters.tube)) rings.push(geometry);
      });
      assert.equal(rings.length, 8);
      rings.forEach((ring, i) => {
        const aperture = ring.parameters.radius - ring.parameters.tube;
        assert.ok(aperture > 0, 'small cohorts still need an open, nonintersecting gate');
        assert.ok(Math.abs(aperture ** 2 / 2.1 ** 2 - counts[Math.floor(i / 2)] / 100000) < 1e-12);
      });
      if (useMinimum) assert.equal(counts.at(-1), 20);
    }
  } finally { layers.forEach(layer => layer.dispose()); instance.dispose?.(); }
});

for (const example of examples.filter(example => example.category === 'Business')) {
  test(`${example.id}: visible flow moves, pause freezes, and motion preserves the data`, () => {
    const layers: FiveLayer<object>[] = [];
    const instance = example.setup({ add(layer: FiveLayer<object>) { layers.push(layer); return layer; } } as unknown as FiveApp);
    const values = JSON.stringify(instance.readout!());
    const attributes: BufferAttribute[] = [];
    for (const layer of layers) layer.object.traverse(object => {
      if ((object as Points).isPoints) attributes.push((object as Points).geometry.getAttribute('position') as BufferAttribute);
    });
    assert.ok(attributes.length > 0);
    const before = attributes.map(attribute => Array.from(attribute.array));
    layers.forEach(layer => layer.update(1, .537));
    const moving = attributes.map(attribute => Array.from(attribute.array));
    assert.notDeepEqual(moving, before, 'the scene must include actual moving particles');
    assert.ok(moving.flat().every(Number.isFinite));
    layers.forEach(layer => layer.update(1000, 0));
    assert.deepEqual(attributes.map(attribute => Array.from(attribute.array)), moving, 'zero delta freezes every effect');
    assert.equal(JSON.stringify(instance.readout!()), values, 'motion must not fabricate transactions or change numeric geometry');
    layers.forEach(layer => layer.dispose()); instance.dispose?.();
  });
}

test('animated geometry is owned through redraw and disposal', () => {
  const layer = createChartLayer(chart => {
    chart.flow([[-1,0,0],[0,1,0],[1,0,0]], { color: '#73daff', count: 50 });
    chart.glow([0,0,0], '#73daff');
    chart.ring([0,0,0], 1, '#73daff');
    chart.ribbon([[-1,0,0],[1,0,0]], .5, '#73daff');
  });
  const resources = new Set<any>();
  layer.object.traverse(object => { for (const resource of [(object as any).geometry, (object as any).material].flat()) if (resource) resources.add(resource); });
  let released = 0; resources.forEach(resource => resource.addEventListener('dispose', () => released++));
  layer.redraw(chart => chart.flow([[-1,0,0],[1,0,0]], { color: '#73daff' }));
  assert.equal(released, resources.size);
  layer.dispose(); layer.dispose();
  assert.doesNotThrow(() => layer.update(3, .5));
});
