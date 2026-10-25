import assert from 'node:assert/strict';
import test from 'node:test';
import type { FiveApp, FiveLayer } from '../src/index.js';
import { createChartLayer } from '../examples/shared/chart.js';
import budget, { budgetRows } from '../examples/business/budget-variance.js';
import quality, { auditRecords, qualityRecords } from '../examples/analytics/data-quality.js';
import { toCsv, dataCsv } from '../examples/gallery/dataExport.js';

test('budget variance reconciles and scenario leaves the plan unchanged', () => {
  const base = budgetRows(3, 0), changed = budgetRows(3, 20);
  assert.equal(base.length, 6);
  for (const [i, row] of base.entries()) {
    assert.equal(row.variance, row.actual - row.plan);
    assert.equal(changed[i].plan, row.plan);
    assert.equal(changed[i].actual, Math.round(row.actual * 1.2));
    assert.deepEqual(budgetRows(3, 0, i + 1), [row]);
  }
  assert.throws(() => budgetRows(7), RangeError);
});

test('quality audit distinguishes overlapping checks from distinct affected records', () => {
  const rows = [
    { source: 'Store', id: 'a', amount: 12, email: 'a@example.test' },
    { source: 'Store', id: 'a', amount: -1, email: null },
    { source: 'Store', id: 'b', amount: null, email: null },
    { source: 'App', id: 'a', amount: 30, email: 'a@example.test' },
  ];
  assert.deepEqual(auditRecords(rows), [
    { source: 'Store', records: 3, missing: 2, duplicate: 1, invalid: 1, flagged: 2 },
    { source: 'App', records: 1, missing: 0, duplicate: 0, invalid: 0, flagged: 0 },
  ]);
  assert.equal(auditRecords(rows, 'amount')[0].missing, 1);
  assert.equal(auditRecords(rows, 'both', 20)[0].flagged, 3);
  assert.equal(qualityRecords().length, 320);
  assert.deepEqual(qualityRecords(), qualityRecords());
  assert.equal(auditRecords([{ source: 'Warehouse', id: 'x', amount: null, email: null }])[0].missing, 1);
});

test('chart signed bars use base + value and redraw releases replaced resources', () => {
  const layer = createChartLayer(chart => chart.bar({ x: 0, z: 0, value: -2, base: 3, color: '#fff' }));
  const mesh = layer.object.children[0].children[0] as any;
  assert.equal(mesh.position.y, 2);
  assert.equal(mesh.geometry.parameters.height, 2);
  let disposedGeometry = 0, disposedMaterial = 0;
  mesh.geometry.addEventListener('dispose', () => disposedGeometry++);
  mesh.material.addEventListener('dispose', () => disposedMaterial++);
  assert.throws(() => layer.redraw(chart => chart.bar({ x: 0, z: 0, value: NaN, color: '#fff' })));
  assert.equal(layer.object.children[0].children[0], mesh, 'a failed redraw keeps the previous chart');
  layer.redraw(chart => chart.point([0, 0, 0], '#fff'));
  assert.equal(disposedGeometry, 1); assert.equal(disposedMaterial, 1);
  layer.dispose(); layer.dispose();
  assert.throws(() => layer.redraw(() => {}), /disposed/);
});

for (const example of [budget, quality]) test(`${example.id}: controls keep chart and current-data table usable`, () => {
  const owned: FiveLayer<any>[] = [];
  const app = { add: (layer: FiveLayer<any>) => { owned.push(layer); return layer; } } as unknown as FiveApp;
  const instance = example.setup(app);
  const initial = JSON.stringify(instance.readout?.());
  let changed = false;
  for (const control of instance.controls ?? []) {
    for (const value of [control.min, control.max, control.value]) {
      control.apply(value);
      const readout = instance.readout!();
      assert.ok(readout.table.rows.length > 0);
      assert.ok(readout.table.rows.every(row => row.length === readout.table.columns.length));
      assert.ok(readout.metrics.every(metric => !/NaN|Infinity/.test(metric.value)));
      changed ||= JSON.stringify(readout) !== initial;
    }
  }
  assert.ok(changed);
  owned.forEach(layer => layer.dispose()); instance.dispose?.();
});

test('data export retains numbers and quotes newlines/commas while neutralizing formula text', () => {
  assert.equal(toCsv([['A,B', 'say "hi"', 'line\nbreak', '=1+1', -42]]), '"A,B","say ""hi""","line\nbreak","\'=1+1","-42"\r\n');
});

test('analytical CSV carries period and scenario context with each exported row', () => {
  const csv = dataCsv({ caption: 'Mar 2025 · 10% cost scenario', columns: ['USD'], rows: [[95920]] }, { example: 'Budget', notes: 'Synthetic USD', controls: 'Department: Engineering' });
  assert.ok(csv.includes('"Mar 2025 · 10% cost scenario","Department: Engineering","95920"'));
  assert.equal(csv.split('\r\n')[0], '"Example","Data notes","View","Controls","USD"');
});
