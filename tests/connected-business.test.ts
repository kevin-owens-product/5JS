import assert from 'node:assert/strict';
import test from 'node:test';
import { BufferGeometry, Material } from 'three';
import type { Mesh, Points } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import { createConnectedData } from '../examples/connected/fixture.js';
import checkout, { calculateCheckoutRecovery } from '../examples/business/checkout-recovery.js';
import health, { calculateCustomerHealth } from '../examples/business/customer-health.js';

const data = createConnectedData();

test('checkout recovery excludes completed baskets and separates observed dollars from assumed recovery', () => {
  const baseline = calculateCheckoutRecovery(data, { blocker: 0, device: 0, recoveryFraction: .25 });
  assert.equal(baseline.rows.length, 12);
  assert.equal(baseline.exposure, 3618);
  assert.equal(baseline.scenarioValue, 904.5);
  assert.equal(baseline.customers, 6);
  assert.deepEqual(baseline.groups.map(group => [group.blocker, group.rows.length, group.exposure]), [['address-validation', 4, 1311], ['payment-timeout', 5, 1265], ['shipping-cost', 3, 1042]]);
  const altered = createConnectedData();
  altered.checkouts.filter(row => row.status === 'completed').forEach(row => { row.amount *= 1000; });
  assert.equal(calculateCheckoutRecovery(altered, { blocker: 0, device: 0, recoveryFraction: .25 }).exposure, baseline.exposure);
  for (const fraction of [0, .3, .6]) {
    const result = calculateCheckoutRecovery(data, { blocker: 0, device: 0, recoveryFraction: fraction });
    assert.equal(result.exposure, baseline.exposure);
    assert.equal(result.scenarioValue, baseline.exposure * fraction);
    assert.deepEqual(result.rows.map(row => row.checkout.id), baseline.rows.map(row => row.checkout.id));
  }
  assert.throws(() => calculateCheckoutRecovery(data, { blocker: 0, device: 0, recoveryFraction: .7 }), /Invalid/);
});

test('checkout cohorts reconcile every blocker/device selection to original record IDs', () => {
  const blockers = ['', 'payment-timeout', 'address-validation', 'shipping-cost'];
  const devices = ['', 'Desktop', 'Mobile'];
  for (let blocker = 0; blocker <= 3; blocker++) for (let device = 0; device <= 2; device++) {
    const expected = data.checkouts.filter(row => row.status === 'abandoned' && (!blocker || row.blocker === blockers[blocker]) && (!device || data.sessions.find(session => session.id === row.sessionId)!.device === devices[device]));
    const result = calculateCheckoutRecovery(data, { blocker, device, recoveryFraction: .4 });
    assert.deepEqual(result.rows.map(row => row.checkout.id).sort(), expected.map(row => row.id).sort());
    assert.equal(result.exposure, expected.reduce((sum, row) => sum + row.amount, 0));
    assert.equal(result.groups.reduce((sum, group) => sum + group.exposure, 0), result.exposure);
  }
});

test('customer review counts observed abandoned sessions and annual value once per affected customer', () => {
  const result = calculateCustomerHealth(data, { service: 0, segment: 0, capacity: 3 });
  assert.equal(result.abandonedSessions, 15);
  assert.equal(result.annualValueExposure, 648000);
  assert.equal(result.basketExposure, 3618);
  assert.equal(result.rows.length, 6);
  assert.deepEqual(result.planned.map(row => row.customer.id), ['customer:01', 'customer:06', 'customer:02']);
  const ids = result.rows.flatMap(row => row.linked.map(link => link.session.id));
  assert.equal(new Set(ids).size, 15);
  assert.ok(result.rows.flatMap(row => row.linked).every(link => link.session.outcome === 'abandoned'));
  assert.ok(data.sessions.filter(session => session.outcome !== 'abandoned').every(session => !ids.includes(session.id)));
  for (let service = 1; service <= 3; service++) {
    const filtered = calculateCustomerHealth(data, { service, segment: 0, capacity: 6 });
    const serviceId = data.services[service - 1].id;
    assert.equal(filtered.abandonedSessions, [5, 7, 3][service - 1]);
    assert.ok(filtered.rows.flatMap(row => row.linked).every(link => link.serviceIds.includes(serviceId)));
    assert.equal(filtered.annualValueExposure, filtered.rows.reduce((sum, row) => sum + row.customer.annualValue, 0));
  }
});

test('review capacity alters the proposed worklist without changing observed exposure', () => {
  const low = calculateCustomerHealth(data, { service: 0, segment: 0, capacity: 1 });
  const high = calculateCustomerHealth(data, { service: 0, segment: 0, capacity: 6 });
  assert.equal(low.planned.length, 1); assert.equal(high.planned.length, 6);
  assert.equal(low.annualValueExposure, high.annualValueExposure);
  assert.equal(low.abandonedSessions, high.abandonedSessions);
  assert.equal(low.basketExposure, high.basketExposure);
  const growth = calculateCustomerHealth(data, { service: 0, segment: 1, capacity: 6 });
  const enterprise = calculateCustomerHealth(data, { service: 0, segment: 2, capacity: 6 });
  assert.equal(growth.annualValueExposure, 108000); assert.equal(enterprise.annualValueExposure, 540000);
  assert.equal(growth.abandonedSessions + enterprise.abandonedSessions, high.abandonedSessions);
  assert.throws(() => calculateCustomerHealth(data, { service: 0, segment: 0, capacity: 0 }), /Invalid/);
});

function mount(example: typeof checkout) {
  const layers: FiveLayer<object>[] = [];
  const app = { add<P extends object>(layer: FiveLayer<P>) { layers.push(layer); return layer; } } as FiveApp;
  return { layers, instance: example.setup(app) };
}
function resources(layers: FiveLayer<object>[]) {
  const result = new Set<BufferGeometry | Material>();
  for (const layer of layers) layer.object.traverse(object => {
    const mesh = object as Mesh;
    if (mesh.geometry) result.add(mesh.geometry);
    if (mesh.material) for (const material of [mesh.material].flat()) result.add(material);
  });
  return result;
}
function positions(layers: FiveLayer<object>[]) {
  const result: number[][] = [];
  for (const layer of layers) layer.object.traverse(object => {
    const points = object as Points;
    const position = points.geometry?.getAttribute('position');
    if (points.isPoints && position?.count > 1) result.push(Array.from(position.array));
  });
  return result;
}
for (const example of [checkout, health]) {
  test(`${example.id}: selection, linked actions, filter reconciliation and controls stay coherent`, () => {
    const { layers, instance } = mount(example), explorer = instance.connected!;
    assert.ok(example.outcome && explorer);
    const records = new Map(explorer.records.map(record => [record.id, record]));
    const verify = () => {
      const view = explorer.view(), readout = instance.readout!();
      assert.ok(readout.metrics.length >= 3 && readout.table.rows.length <= 80);
      assert.ok(readout.table.rows.every(row => row.length === readout.table.columns.length));
      assert.ok(explorer.targets().every(target => records.has(target.id) && target.position.every(Number.isFinite)));
      assert.equal(new Set(explorer.targets().map(target => target.id)).size, explorer.targets().length);
      for (const candidate of view.candidates) assert.ok(records.has(candidate.entityId));
      for (const action of view.actions) {
        assert.equal(records.get(action.ownerId)?.kind, 'person');
        assert.ok(action.ownerId.startsWith('person:owner-'));
        assert.ok(action.evidenceIds.length && action.evidenceIds.every(id => records.has(id)));
        for (const value of [action.title, action.rationale, action.metric, action.baseline, action.success, action.guardrail, action.caveat]) assert.ok(value.length > 8);
      }
      for (const layer of layers) layer.object.traverse(object => {
        const position = (object as Mesh).geometry?.getAttribute('position');
        if (position) assert.ok(Array.from(position.array).every(Number.isFinite));
      });
    };
    verify();
    const candidate = explorer.view().candidates[1].entityId;
    let notifications = 0; const unsubscribe = explorer.subscribe(() => notifications++);
    const previous = resources(layers); let releases = 0;
    previous.forEach(resource => resource.addEventListener('dispose', () => releases++));
    explorer.select(candidate);
    assert.equal(explorer.selectedId, candidate); assert.equal(notifications, 1);
    assert.ok(explorer.targets().some(target => target.id === candidate));
    assert.equal(releases, previous.size, 'selection redraw releases prior geometry/materials');
    for (const control of instance.controls!) {
      for (const value of [control.min, control.max, control.value]) { control.apply(value); verify(); }
      assert.ok(explorer.selectedId === null || explorer.view().candidates.some(row => row.entityId === explorer.selectedId));
    }
    unsubscribe(); instance.dispose!(); layers.forEach(layer => layer.dispose());
    assert.throws(() => explorer.select(candidate), /disposed/);
  });

  test(`${example.id}: evidence guides animate, pause, preserve readouts and release resources once`, () => {
    const { layers, instance } = mount(example);
    const readout = instance.readout!(), actions = instance.connected!.view();
    const before = positions(layers); assert.ok(before.length > 0);
    layers.forEach(layer => layer.update(.537, .537));
    const moved = positions(layers); assert.notDeepEqual(moved, before);
    layers.forEach(layer => layer.update(1000, 0));
    assert.deepEqual(positions(layers), moved);
    assert.deepEqual(instance.readout!(), readout); assert.deepEqual(instance.connected!.view(), actions);
    const counts = new Map([...resources(layers)].map(resource => [resource, 0]));
    counts.forEach((_, resource) => resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource)! + 1)));
    instance.dispose!(); instance.dispose!();
    layers.forEach(layer => { layer.dispose(); layer.dispose(); });
    for (const count of counts.values()) assert.equal(count, 1);
  });
}
