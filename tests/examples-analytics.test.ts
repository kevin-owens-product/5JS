import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Scene } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import cohorts, { createRetentionData, retentionRows, weightedRetention } from '../examples/analytics/cohort-retention.js';
import segments, { createCustomerData, segmentCustomer, selectCustomers, summarizeCustomers } from '../examples/analytics/customer-segments.js';
import correlations, { createCorrelationData, correlationCells, pearson } from '../examples/analytics/correlation-matrix.js';
import distributions, { createLatencyObservations, histogram } from '../examples/analytics/distribution-explorer.js';
import anomalies, { createTimeSeries, residualRows, summarizeResiduals } from '../examples/analytics/time-series-anomalies.js';
import experiment, { createExperimentData, summarizeExperiment } from '../examples/analytics/ab-experiment.js';

function fakeApp() {
  const layers: FiveLayer<object>[] = [], scene = new Scene();
  const app = { add<P extends object>(layer: FiveLayer<P>) { layers.push(layer); scene.add(layer.object); return layer; } } as FiveApp;
  return { app, layers, scene };
}
const close = (actual: number, expected: number, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('retention data preserves the observed triangle and uses eligible original denominators', () => {
  const data = createRetentionData();
  assert.deepEqual(data.map(cohort => cohort.retained.length), [6, 5, 4, 3, 2, 1]);
  const rows = retentionRows(data);
  assert.equal(rows.length, 21);
  assert.ok(rows.every(row => row.cohortIndex + row.month <= 5));
  assert.ok(rows.filter(row => row.month === 0).every(row => row.rate === 1));
  const m2 = weightedRetention(rows, 2);
  assert.deepEqual(m2, { eligibleCohorts: 4, retainedCustomers: 767, initialCustomers: 1180, rate: 0.65 });
  assert.equal(weightedRetention(rows, 5).eligibleCohorts, 1);
  close(weightedRetention(rows, 5).rate!, 114 / 240);
  assert.deepEqual(weightedRetention(retentionRows(data, 4), 2), { eligibleCohorts: 0, retainedCustomers: 0, initialCustomers: 0, rate: null });
  const fixture = retentionRows([
    { cohort: 'old-a', initialCustomers: 100, retained: [100, 50] },
    { cohort: 'old-b', initialCustomers: 300, retained: [300, 225] },
    { cohort: 'new', initialCustomers: 1000, retained: [1000] },
  ]);
  assert.equal(weightedRetention(fixture, 1).rate, 275 / 400);
  assert.notEqual(weightedRetention(fixture, 1).rate, (0.5 + 0.75) / 2);
  assert.throws(() => retentionRows([{ cohort: 'invalid', initialCustomers: 2, retained: [3] }]), /valid integer/);
});

test('customer segments have explicit inclusive boundaries and summaries use displayed customers', () => {
  const customer = { id: 'fixture', annualRevenue: 50000, engagement: 60, tenureMonths: 12 };
  assert.equal(segmentCustomer(customer, 50000), 'Champions');
  assert.equal(segmentCustomer({ ...customer, annualRevenue: 49999 }, 50000), 'Growth');
  assert.equal(segmentCustomer({ ...customer, engagement: 59 }, 50000), 'At risk');
  assert.equal(segmentCustomer({ ...customer, annualRevenue: 49999, engagement: 59 }, 50000), 'Develop');
  const data = createCustomerData();
  assert.equal(data.length, 60);
  assert.equal(new Set(data.map(row => row.id)).size, 60);
  assert.deepEqual(data, createCustomerData());
  const selected = selectCustomers(data, 24, 60000, 'At risk');
  assert.ok(selected.length > 0);
  assert.ok(selected.every(row => row.tenureMonths >= 24 && row.annualRevenue >= 60000 && row.engagement < 60));
  const fixture = [10, 40, 20, 30].map((engagement, i) => ({ ...customer, annualRevenue: (i + 1) * 10, engagement }));
  assert.deepEqual(summarizeCustomers(fixture), { count: 4, annualRevenue: 100, medianEngagement: 25 });
  assert.deepEqual(summarizeCustomers([]), { count: 0, annualRevenue: 0, medianEngagement: null });
  assert.equal(summarizeCustomers(fixture.slice(0, 3)).medianEngagement, 20);
});

test('Pearson handles sign, orthogonality, sample size, constant decimals, and scale', () => {
  close(pearson([1, 2, 3], [4, 8, 12])!, 1);
  close(pearson([1, 2, 3], [12, 8, 4])!, -1);
  close(pearson([-1, 0, 1], [1, -2, 1])!, 0);
  close(pearson([1e200, 2e200, 3e200], [3e-200, 2e-200, 1e-200])!, -1);
  assert.equal(pearson([], []), null);
  assert.equal(pearson([1], [2]), null);
  assert.equal(pearson(Array(36).fill(99.9), Array.from({ length: 36 }, (_, i) => i)), null);
  assert.throws(() => pearson([1], [1, 2]), /equal lengths/);
  assert.throws(() => pearson([1, NaN], [1, 2]), /finite/);
  const data = createCorrelationData();
  assert.equal(data[0].date, '2026-05-26');
  assert.equal(data.at(-1)!.date, '2026-06-30');
  const cells = correlationCells(data, 36, 0);
  assert.equal(cells.length, 21);
  assert.equal(cells.filter(cell => cell.coefficient === null).length, 6);
  assert.ok(cells.filter(cell => cell.coefficient === null).every(cell => cell.b === 5));
  const filtered = correlationCells(data, 12, 0.9);
  assert.ok(filtered.every(cell => cell.n === 12 && (cell.coefficient === null || Math.abs(cell.coefficient) >= 0.9)));
});

test('histogram counts boundary ties once and normalizes only observations inside its range', () => {
  const result = histogram([-1, 0, 1, 2, 3, 4, 5], 0, 4, 4);
  assert.deepEqual(result.bins.map(bin => bin.count), [1, 1, 1, 2]);
  assert.equal(result.included.length, 5);
  assert.equal(result.excludedCount, 2);
  close(result.bins.reduce((sum, bin) => sum + bin.density! * result.width, 0), 1);
  assert.deepEqual(histogram([0, 0.1, 0.2, 0.3, 1], 0, 1, 10).bins.map(bin => bin.count), [1, 1, 1, 1, 0, 0, 0, 0, 0, 1]);
  const conditional = histogram([1, 2, 100], 0, 10, 2);
  assert.equal(conditional.bins[0].density, 0.2);
  assert.equal(conditional.excludedCount, 1);
  assert.ok(histogram([100], 0, 10, 2).bins.every(bin => bin.count === 0 && bin.density === null));
  assert.throws(() => histogram([1], 0, 0, 2), /increasing/);
  assert.throws(() => histogram([NaN], 0, 10, 2), /finite/);
  const source = createLatencyObservations();
  assert.equal(source.length, 96);
  assert.deepEqual(source, createLatencyObservations());
  for (const upper of [400, 1000]) for (const count of [4, 16]) {
    const bins = histogram(source, 0, upper, count);
    assert.equal(bins.bins.reduce((sum, bin) => sum + bin.count, 0) + bins.excludedCount, 96);
    assert.ok(bins.bins.every(bin => (bin.density ?? 0) <= 0.02));
  }
});

test('time-series flags are strict residual exceedances with correct window summaries', () => {
  const series = createTimeSeries();
  assert.equal(series.length, 72);
  assert.equal(series[0].timestamp, '2026-06-01T00:00:00.000Z');
  assert.equal(series.at(-1)!.timestamp, '2026-06-03T23:00:00.000Z');
  assert.deepEqual(series, createTimeSeries());
  assert.deepEqual(residualRows(series, 72, 20).filter(row => row.flagged).map(row => row.hour), [8, 19, 38, 53, 65]);
  assert.deepEqual(residualRows(series, 24, 20).filter(row => row.flagged).map(row => row.hour), [53, 65]);
  const fixture = [120, 80, 121].map((observed, hour) => ({ hour, timestamp: 'fixture', observed, baseline: 100 }));
  const residuals = residualRows(fixture, 3, 20);
  assert.deepEqual(residuals.map(row => row.flagged), [false, false, true]);
  const summary = summarizeResiduals(residuals);
  assert.equal(summary.flagged, 1);
  assert.equal(summary.flaggedRate, 1 / 3);
  assert.equal(summary.meanAbsoluteResidual, 61 / 3);
  assert.deepEqual(summarizeResiduals([]), { count: 0, flagged: 0, flaggedRate: null, meanAbsoluteResidual: null });
  assert.throws(() => residualRows(series, 0, 20), /positive integer/);
});

test('A/B summaries pool counts before division and report raw differences without inference', () => {
  const data = createExperimentData();
  const total = summarizeExperiment(data);
  assert.equal(total.a.visitors, 11000);
  assert.equal(total.a.conversions, 920);
  assert.equal(total.b.visitors, 11500);
  assert.equal(total.b.conversions, 1039);
  assert.equal(total.a.rate, 920 / 11000);
  assert.equal(total.b.rate, 1039 / 11500);
  assert.equal(total.difference, 1039 / 11500 - 920 / 11000);
  assert.notEqual(total.a.rate, (0.12 + 0.06 + 0.08) / 3);
  const desktop = summarizeExperiment(data.filter(row => row.segment === 'Desktop'));
  close(desktop.difference!, 0.01);
  assert.equal(summarizeExperiment([]).difference, null);
  assert.equal(summarizeExperiment([{ segment: 'Tablet', variant: 'A', visitors: 0, conversions: 0 }]).a.rate, null);
  assert.throws(() => summarizeExperiment([{ segment: 'Tablet', variant: 'A', visitors: 1, conversions: 2 }]), /conversions/);
});

for (const recipe of [cohorts, segments, correlations, distributions, anomalies, experiment]) {
  test(`${recipe.id}: combined control corners preserve finite charts, bounded axes, and complete readouts`, () => {
    const { app, layers, scene } = fakeApp();
    const instance = recipe.setup(app);
    const controls = instance.controls!;
    assert.ok(controls.length >= 2 && controls.length <= 3);
    assert.ok(recipe.dataNote?.startsWith('Synthetic'));
    assert.equal(recipe.category, 'Analytics');
    for (let corner = 0; corner < 2 ** controls.length; corner++) {
      controls.forEach((control, index) => control.apply(corner & 1 << index ? control.max : control.min));
      const readout = instance.readout!();
      assert.ok(readout.metrics.length >= 3);
      assert.ok(readout.table.rows.length <= 80);
      for (const metric of readout.metrics) assert.doesNotMatch(metric.value, /NaN|Infinity/);
      for (const row of readout.table.rows) {
        assert.equal(row.length, readout.table.columns.length);
        for (const cell of row) typeof cell === 'number' ? assert.ok(Number.isFinite(cell)) : assert.doesNotMatch(cell, /NaN|Infinity/);
      }
      scene.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(scene);
      // Scatter glyphs have a radius; quantitative values are their centers.
      const glyphPadding = recipe.id === 'customer-segments' ? 0.1 : 0.001;
      assert.ok(bounds.min.x >= -5 - glyphPadding && bounds.max.x <= 5 + glyphPadding, `${recipe.id} x bounds ${bounds.min.x}..${bounds.max.x}`);
      assert.ok(bounds.min.y >= -glyphPadding && bounds.max.y <= 4.5 + glyphPadding, `${recipe.id} y bounds ${bounds.min.y}..${bounds.max.y}`);
      assert.ok(bounds.min.z >= -3 - glyphPadding && bounds.max.z <= 3 + glyphPadding, `${recipe.id} z bounds ${bounds.min.z}..${bounds.max.z}`);
    }
    const resources = new Set<BufferGeometry | Material>();
    scene.traverse(object => {
      const renderable = object as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
      if (renderable.geometry) resources.add(renderable.geometry);
      if (renderable.material) for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) resources.add(material);
    });
    let disposed = 0;
    for (const resource of resources) resource.addEventListener('dispose', () => disposed++);
    instance.dispose?.();
    layers.forEach(layer => { layer.dispose(); layer.dispose(); });
    assert.equal(disposed, resources.size);
    assert.equal(scene.children.length, 0);
  });
}

test('filtered readouts match the displayed customer and experiment table rows', () => {
  const customers = fakeApp();
  const customerInstance = segments.setup(customers.app);
  customerInstance.controls!.find(control => control.id === 'tenure')!.apply(24);
  customerInstance.controls!.find(control => control.id === 'segment')!.apply(3);
  const readout = customerInstance.readout!();
  assert.equal(readout.metrics[0].value, String(readout.table.rows.length));
  assert.equal(readout.metrics[1].value, `$${readout.table.rows.reduce((sum, row) => sum + Number(row[1]), 0).toLocaleString('en-US')}`);
  customers.layers.forEach(layer => layer.dispose());
  const ab = fakeApp();
  const abInstance = experiment.setup(ab.app);
  abInstance.controls!.find(control => control.id === 'segment')!.apply(2);
  const abReadout = abInstance.readout!();
  assert.equal(abReadout.table.rows.length, 2);
  assert.ok(abReadout.table.rows.every(row => row[0] === 'Mobile'));
  assert.equal(abReadout.metrics[0].value, '6.00%');
  assert.equal(abReadout.metrics[1].value, '7.00%');
  assert.equal(abReadout.metrics[2].value, '+1.00 pp');
  ab.layers.forEach(layer => layer.dispose());
});
