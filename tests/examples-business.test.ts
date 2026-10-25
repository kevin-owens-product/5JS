import assert from 'node:assert/strict';
import test from 'node:test';
import type { FiveApp, FiveLayer } from '../src/index.js';
import type { ExampleReadout } from '../examples/types.js';
import revenue, { calculateRevenue } from '../examples/business/revenue-landscape.js';
import funnel, { calculateFunnel } from '../examples/business/conversion-funnel.js';
import bridge, { calculateSubscriptionBridge } from '../examples/business/subscription-bridge.js';
import marketing, { calculateMarketing } from '../examples/business/marketing-efficiency.js';
import pareto, { calculatePareto } from '../examples/analytics/pareto-analysis.js';
import geography, { calculateGeographicDemand } from '../examples/analytics/geographic-demand.js';

test('revenue totals use the selected month-region grain and rounded scenario rows', () => {
  const baseline = calculateRevenue();
  assert.equal(baseline.rows.length, 36);
  assert.equal(new Set(baseline.rows.map(row => `${row.month}:${row.region}`)).size, 36);
  assert.equal(baseline.revenue, baseline.baseline);
  assert.equal(baseline.delta, 0);
  const europe = calculateRevenue({ months: 6, region: 2, uplift: 25 });
  assert.equal(europe.rows.length, 6);
  assert.ok(europe.rows.every(row => row.region === 'Europe' && row.month < 6));
  assert.equal(europe.baseline, 547000);
  assert.equal(europe.revenue, 683750);
  assert.equal(europe.monthlyAverage, 683750 / 6);
  assert.equal(europe.delta, europe.revenue - europe.baseline);
  const maximum = calculateRevenue({ months: 12, region: 0, uplift: 40 });
  assert.ok(maximum.rows.every(row => row.revenue === Math.round(row.baseline * 1.4) && row.revenue <= 350000));
  assert.equal(maximum.revenue, maximum.rows.reduce((sum, row) => sum + row.revenue, 0));
  assert.deepEqual(calculateRevenue(), baseline, 'scenario calculations do not mutate the baseline');
});

test('funnel applies conditional rates sequentially with exact integer rounding', () => {
  const baseline = calculateFunnel();
  assert.deepEqual(baseline.rows.map(row => row.count), [100000, 8000, 4800, 1200]);
  assert.equal(baseline.conversion, 0.012);
  assert.equal(baseline.lost, 98800);
  const rounded = calculateFunnel({ signup: 2.003, activation: 37, paid: 33 });
  assert.deepEqual(rounded.rows.map(row => row.count), [100000, 2003, 741, 245]);
  assert.equal(rounded.rows.reduce((sum, row) => sum + row.lost, 0), rounded.lost);
  assert.ok(rounded.rows.every(row => Number.isInteger(row.count)));
  for (let i = 1; i < rounded.rows.length; i++) assert.ok(rounded.rows[i].count <= rounded.rows[i - 1].count);
  const zero = calculateFunnel({ signup: 0, activation: 100, paid: 100 });
  assert.equal(zero.paid, 0); assert.equal(zero.conversion, 0);
  assert.equal(zero.rows[2].realizedRate, null);
});

test('subscription bridge reconciles signed changes and excludes new MRR from NRR', () => {
  const baseline = calculateSubscriptionBridge();
  assert.equal(baseline.ending, 111000);
  assert.equal(baseline.netChange, 11000);
  assert.equal(baseline.nrr, 0.93);
  assert.deepEqual(baseline.steps.map(row => row.balance), [100000, 118000, 127000, 122000, 111000, 111000]);
  assert.equal(baseline.starting + baseline.steps.slice(1, -1).reduce((sum, row) => sum + row.amount, 0), baseline.ending);
  const newOnly = calculateSubscriptionBridge({ newMrr: 30000, expansion: 9000, churn: 11000 });
  assert.equal(newOnly.nrr, baseline.nrr);
  assert.equal(newOnly.ending - baseline.ending, 12000);
  const ceiling = calculateSubscriptionBridge({ newMrr: 30000, expansion: 20000, churn: 0 });
  assert.equal(ceiling.ending, 145000);
  assert.ok(ceiling.steps.every(row => row.balance <= 150000));
  assert.equal(calculateSubscriptionBridge({ newMrr: 0, expansion: 0, churn: 25000 }).ending, 70000);
});

test('marketing uses orders × AOV and weighted aggregate ROAS and CAC', () => {
  const baseline = calculateMarketing();
  assert.equal(baseline.spend, 134000);
  assert.equal(baseline.revenue, 410000);
  assert.equal(baseline.orders, 4260);
  assert.equal(baseline.customers, 2710);
  assert.equal(baseline.roas, 410000 / 134000);
  assert.equal(baseline.cac, 134000 / 2710);
  assert.notEqual(baseline.roas, baseline.rows.reduce((sum, row) => sum + row.roas, 0) / baseline.rows.length);
  const email = calculateMarketing({ channel: 4, spendPercent: 100, yieldPercent: 70 });
  assert.equal(email.rows.length, 1); assert.equal(email.rows[0].channel, 'Email');
  assert.equal(email.orders, 490); assert.equal(email.customers, 147); assert.equal(email.revenue, 29400);
  assert.equal(email.roas, 4.9);
  const maximum = calculateMarketing({ channel: 0, spendPercent: 130, yieldPercent: 130 });
  for (const row of maximum.rows) {
    assert.equal(row.revenue, row.orders * row.aov);
    assert.ok(row.revenue <= 300000 && row.customers <= row.orders);
    assert.equal(row.cac, row.spend / row.customers);
  }
});

test('Pareto ranking retains hidden rows in the full segment denominator', () => {
  const baseline = calculatePareto();
  assert.equal(baseline.total, 460000);
  assert.equal(baseline.rows.length, 12); assert.equal(baseline.displayed.length, 8);
  assert.equal(baseline.shownShare, 430000 / 460000);
  assert.equal(baseline.countToThreshold, 6);
  assert.equal(baseline.rows.at(-1)!.cumulativeShare, 1);
  const topThree = calculatePareto({ topN: 3, segment: 0, threshold: 80 });
  assert.equal(topThree.total, baseline.total);
  assert.equal(topThree.displayed.at(-1)!.cumulativeShare, 284000 / 460000);
  assert.equal(topThree.countToThreshold, 6, 'threshold count may extend beyond displayed top N');
  for (const segment of [0, 1, 2]) {
    const result = calculatePareto({ topN: 12, segment, threshold: 95 });
    assert.equal(result.rows.at(-1)!.cumulativeShare, 1);
    assert.equal(result.shownShare, 1);
    for (let i = 1; i < result.rows.length; i++) {
      assert.ok(result.rows[i].revenue <= result.rows[i - 1].revenue);
      assert.ok(result.rows[i].cumulativeShare >= result.rows[i - 1].cumulativeShare);
    }
    assert.ok(result.rows[result.countToThreshold - 1].cumulativeShare >= 0.95);
    if (result.countToThreshold > 1) assert.ok(result.rows[result.countToThreshold - 2].cumulativeShare < 0.95);
  }
});

test('geographic scenario filters modeled counts while preserving degree coordinates', () => {
  const baseline = calculateGeographicDemand();
  assert.equal(baseline.rows.length, 12);
  assert.equal(new Set(baseline.rows.map(row => row.city)).size, 12);
  assert.ok(baseline.rows.every(row => row.longitude >= -125 && row.longitude <= -65 && row.latitude >= 25 && row.latitude <= 50));
  const selected = calculateGeographicDemand({ region: 3, uplift: 50, minimumOrders: 6000 });
  assert.deepEqual(selected.rows.map(row => row.city), ['Capital', 'Harbor']);
  assert.equal(selected.orders, 18000);
  assert.equal(selected.revenue, 2123250);
  for (const row of selected.rows) {
    const original = baseline.rows.find(candidate => candidate.city === row.city)!;
    assert.equal(row.longitude, original.longitude); assert.equal(row.latitude, original.latitude);
    assert.equal(row.orders, Math.round(original.orders * 1.5));
    assert.equal(row.revenue, row.orders * row.aov);
    assert.ok(row.orders <= 12000);
  }
  const empty = calculateGeographicDemand({ region: 3, uplift: -30, minimumOrders: 6000 });
  assert.equal(empty.rows.length, 0); assert.equal(empty.orders, 0); assert.equal(empty.revenue, 0);
});

test('business calculation functions reject invalid states', () => {
  assert.throws(() => calculateRevenue({ months: 0, region: 0, uplift: 0 }), /Invalid/);
  assert.throws(() => calculateFunnel({ signup: NaN, activation: 60, paid: 25 }), /conversion rates/);
  assert.throws(() => calculateSubscriptionBridge({ newMrr: -1, expansion: 0, churn: 0 }), /Invalid/);
  assert.throws(() => calculateMarketing({ channel: 6, spendPercent: 100, yieldPercent: 100 }), /Invalid/);
  assert.throws(() => calculatePareto({ topN: 2.5, segment: 0, threshold: 80 }), /Invalid/);
  assert.throws(() => calculateGeographicDemand({ region: 0, uplift: Infinity, minimumOrders: 0 }), /Invalid/);
});

function assertReadout(readout: ExampleReadout) {
  assert.ok(readout.metrics.length >= 2);
  assert.ok(readout.table.caption.length > 0 && readout.table.columns.length > 0);
  for (const metric of readout.metrics) {
    assert.ok(metric.label.length > 0 && metric.value.length > 0);
    assert.doesNotMatch(metric.value, /NaN|Infinity|undefined/);
  }
  for (const row of readout.table.rows) {
    assert.equal(row.length, readout.table.columns.length);
    assert.ok(row.every(cell => typeof cell === 'string' || (typeof cell === 'number' && Number.isFinite(cell))));
  }
}

const recipes = [
  { example: revenue, rows: 36, domainLabel: '$350k' },
  { example: funnel, rows: 4, domainLabel: '100,000' },
  { example: bridge, rows: 6, domainLabel: '$150k' },
  { example: marketing, rows: 5, domainLabel: '$300k' },
  { example: pareto, rows: 12, domainLabel: '$150k' },
  { example: geography, rows: 12, domainLabel: '12k' },
];

for (const { example, rows, domainLabel } of recipes) {
  test(`${example.id}: live controls, readout, fixed domain and headless disposal`, () => {
    const layers: FiveLayer<object>[] = [];
    const fake = { add: (layer: FiveLayer<object>) => { layers.push(layer); return layer; } } as unknown as FiveApp;
    const instance = example.setup(fake);
    assert.ok(instance.readout);
    const initial = instance.readout!();
    assertReadout(initial); assert.equal(initial.table.rows.length, rows);
    assert.equal(layers.length, 1); assert.ok(layers[0].count > 0);
    const controls = instance.controls!;
    assert.equal(controls.length, 3); assert.equal(new Set(controls.map(control => control.id)).size, 3);
    for (const control of controls) {
      assert.ok(control.min <= control.value && control.value <= control.max && control.step > 0);
      assert.ok(typeof control.format?.(control.value) === 'string');
      control.apply(control.min); const minimum = instance.readout!(); assertReadout(minimum);
      const midpoint = Number((control.min + Math.round((control.max - control.min) / 2 / control.step) * control.step).toPrecision(12));
      control.apply(midpoint); assertReadout(instance.readout!());
      control.apply(control.max); const maximum = instance.readout!(); assertReadout(maximum);
      assert.notDeepEqual(minimum, maximum, `${control.id} must change a meaningful readout`);
      const labels: string[] = []; layers[0].object.traverse(object => labels.push(object.name));
      assert.ok(labels.includes(domainLabel), 'the quantitative scale reference stays fixed across controls');
      control.apply(control.value);
    }
    assert.deepEqual(instance.readout!(), initial, 'restoring controls restores the original table and metrics');
    for (const layer of layers) { layer.dispose(); layer.dispose(); assert.equal(layer.object.children.length, 0); }
    instance.dispose?.();
  });
}

test('revenue rivers, conversion gates, and marketing paths animate only their illustrative tracers', () => {
  for (const example of [revenue, funnel, marketing]) {
    const layers: FiveLayer<object>[] = [];
    const app = { add: (layer: FiveLayer<object>) => { layers.push(layer); return layer; } } as unknown as FiveApp;
    const instance = example.setup(app);
    const readout = instance.readout!();
    const positions: { array: ArrayLike<number> }[] = [];
    layers[0].object.traverse(object => {
      const points = object as unknown as { isPoints?: boolean; geometry?: { getAttribute(name: string): { count: number; array: ArrayLike<number> } } };
      const position = points.geometry?.getAttribute('position');
      if (points.isPoints && position && position.count > 1) positions.push(position);
    });
    assert.ok(positions.length > 0, `${example.id} has genuine tracer geometry`);
    const before = positions.map(position => Array.from(position.array));
    layers[0].update(100, 0);
    assert.deepEqual(positions.map(position => Array.from(position.array)), before, 'pause does not move tracers');
    layers[0].update(100.25, .25);
    assert.notDeepEqual(positions.map(position => Array.from(position.array)), before, 'positive delta advances tracer positions');
    assert.deepEqual(instance.readout!(), readout, 'illustrative motion does not fabricate new business observations');
    layers[0].dispose(); instance.dispose?.();
  }
});
