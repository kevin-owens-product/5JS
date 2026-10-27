import assert from 'node:assert/strict';
import test from 'node:test';
import { Scene } from 'three';
import type { BufferGeometry, Material, Mesh, Points, BufferAttribute } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import evidence, { evidenceToRoadmapModel } from '../examples/analytics/evidence-to-roadmap.js';
import { createConnectedData, buildEntityRecords } from '../examples/connected/fixture.js';
import type { Theme } from '../examples/connected/types.js';

const themes = ['all', 'checkout', 'activation', 'visibility'] as const;
const segments = ['all', 'Growth', 'Enterprise'] as const;
function mount() {
  const scene = new Scene(), layers: FiveLayer<object>[] = [];
  const app = { add<P extends object>(layer: FiveLayer<P>) { layers.push(layer); scene.add(layer.object); return layer; } } as FiveApp;
  return { scene, layers, instance: evidence.setup(app) };
}

test('interview records, participants, customers, and exposure use their distinct grains', () => {
  const data = createConnectedData(), model = evidenceToRoadmapModel(data);
  assert.equal(model.interviews.length, 12);
  assert.equal(model.participants.length, 12);
  assert.equal(model.customers.length, 6);
  assert.equal(model.exposure, data.customers.reduce((sum, customer) => sum + customer.annualValue, 0));
  const repeated = { ...data, interviews: [...data.interviews, { ...data.interviews[0], id: 'interview:repeat-contact' }] };
  const repeatModel = evidenceToRoadmapModel(repeated);
  assert.equal(repeatModel.interviews.length, 13);
  assert.equal(repeatModel.participants.length, model.participants.length, 'a follow-up interview is not another participant');
  assert.equal(repeatModel.customers.length, model.customers.length, 'a follow-up interview is not another customer');
  assert.equal(repeatModel.exposure, model.exposure, 'repeated evidence must not multiply customer annual value');
});

test('contradicting and mixed records remain in the default scene and each proposed test', () => {
  const data = createConnectedData(), model = evidenceToRoadmapModel(data);
  assert.deepEqual(model.counts, { supports: 6, mixed: 3, contradicts: 3 });
  for (const theme of themes.slice(1) as Theme[]) {
    const action = model.actions.find(action => action.id === `investigate-${theme}`)!;
    assert.ok(action);
    const rows = data.interviews.filter(interview => interview.theme === theme);
    assert.equal(rows.filter(row => row.stance === 'contradicts').length, 1);
    assert.equal(rows.filter(row => row.stance === 'mixed').length, 1);
    for (const row of rows) assert.ok(action.evidenceIds.includes(row.id), `missing ${row.stance} source ${row.id}`);
    assert.match(action.rationale, /do not validate the proposed solution/);
    assert.match(action.baseline, /measure that baseline/);
    assert.match(action.success, /10 of 12/);
    assert.match(action.caveat, /not expected incremental revenue/);
  }
});

test('every filtered action resolves to in-scope sources, linked sessions, and an internal owner', () => {
  const data = createConnectedData(), recordIds = new Set(buildEntityRecords(data).map(record => record.id));
  for (const theme of themes) for (const segment of segments) {
    const model = evidenceToRoadmapModel(data, { theme, segment });
    assert.ok(model.interviews.every(interview => (theme === 'all' || interview.theme === theme)
      && (segment === 'all' || data.customers.find(customer => customer.id === interview.customerId)!.segment === segment)));
    const customerIds = new Set(model.interviews.map(interview => interview.customerId));
    assert.equal(model.customers.length, customerIds.size);
    assert.equal(model.exposure, data.customers.filter(customer => customerIds.has(customer.id)).reduce((sum, customer) => sum + customer.annualValue, 0));
    for (const action of model.actions) {
      assert.ok(data.people.some(person => person.id === action.ownerId && person.customerId === undefined));
      assert.equal(action.evidenceIds.length, new Set(action.evidenceIds).size);
      assert.ok(action.evidenceIds.every(id => recordIds.has(id)));
      const actionTheme = action.id.slice('investigate-'.length);
      const interviewIds = model.interviews.filter(interview => interview.theme === actionTheme).map(interview => interview.id);
      assert.deepEqual(action.evidenceIds.filter(id => id.startsWith('interview:')).sort(), interviewIds.sort());
      assert.ok(action.evidenceIds.filter(id => id.startsWith('session:')).every(id => model.sessions.some(session => session.id === id)));
      for (const field of ['title', 'rationale', 'metric', 'baseline', 'success', 'guardrail', 'caveat'] as const) assert.ok(action[field].length > 15, `${action.id}/${field}`);
    }
  }
  const empty = evidenceToRoadmapModel({ ...data, interviews: [] });
  assert.equal(empty.exposure, 0);
  assert.deepEqual(empty.actions, []);
  assert.deepEqual(empty.customers, []);
});

test('theme/segment controls keep selectable geometry, records, readouts, and investigation evidence synchronized', () => {
  const { instance, layers } = mount(), connected = instance.connected!;
  assert.ok(connected);
  const data = createConnectedData(), recordIds = new Set(connected.records.map(record => record.id));
  try {
    for (let themeIndex = 0; themeIndex < themes.length; themeIndex++) for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      instance.controls!.find(control => control.id === 'theme')!.apply(themeIndex);
      instance.controls!.find(control => control.id === 'segment')!.apply(segmentIndex);
      const model = evidenceToRoadmapModel(data, { theme: themes[themeIndex], segment: segments[segmentIndex] });
      const targets = connected.targets(), targetIds = targets.map(target => target.id);
      const expected = [...model.products, ...model.interviews, ...model.customers].map(record => record.id).sort();
      assert.deepEqual([...targetIds].sort(), expected);
      assert.equal(targetIds.length, new Set(targetIds).size);
      assert.ok(targetIds.every(id => recordIds.has(id)));
      assert.ok(targets.every(target => target.position.every(Number.isFinite)));
      assert.deepEqual(connected.view().candidates.map(candidate => candidate.entityId).sort(), expected);
      assert.deepEqual(connected.view().actions, model.actions);
      assert.deepEqual(instance.readout!().table.rows.map(row => row[0]).sort(), model.interviews.map(interview => interview.id).sort());
      assert.ok(connected.selectedId && targetIds.includes(connected.selectedId));
      const contradiction = model.interviews.find(interview => interview.stance === 'contradicts');
      if (contradiction) {
        connected.select(contradiction.id);
        assert.equal(connected.selectedId, contradiction.id);
        assert.ok(connected.records.find(record => record.id === contradiction.id)!.evidence!.some(item => item.basis === 'Fictional interview'));
      }
    }
  } finally { instance.dispose!(); layers.forEach(layer => layer.dispose()); }
});

test('source selection changes the visual emphasis; motion preserves evidence and disposal releases resources', () => {
  const { instance, layers, scene } = mount(), connected = instance.connected!;
  const fingerprint = () => {
    const colors: number[] = [];
    scene.traverse(object => {
      const material = (object as Mesh).material;
      for (const item of material ? [material].flat() : []) if ('color' in item) colors.push((item as Material & { color: { getHex(): number } }).color.getHex());
    });
    return colors.join(',');
  };
  const before = fingerprint();
  connected.select(connected.records.find(record => record.kind === 'interview')!.id);
  assert.notEqual(fingerprint(), before, 'selection must change visible material emphasis');
  const readout = JSON.stringify(instance.readout!()), view = JSON.stringify(connected.view());
  const flows: BufferAttribute[] = [];
  scene.traverse(object => {
    if ((object as Points).isPoints) {
      const position = (object as Points).geometry.getAttribute('position');
      if (position) flows.push(position as BufferAttribute);
    }
  });
  assert.ok(flows.length > 0);
  const initial = flows.map(flow => Array.from(flow.array));
  layers.forEach(layer => layer.update(1, .5));
  assert.ok(flows.some((flow, i) => Array.from(flow.array).some((value, index) => value !== initial[i][index])));
  const moving = flows.map(flow => Array.from(flow.array));
  layers.forEach(layer => layer.update(5000, 0));
  flows.forEach((flow, i) => assert.deepEqual(Array.from(flow.array), moving[i]));
  assert.equal(JSON.stringify(instance.readout!()), readout);
  assert.equal(JSON.stringify(connected.view()), view);
  const geometries = new Set<BufferGeometry>();
  scene.traverse(object => { const geometry = (object as Mesh).geometry; if (geometry) geometries.add(geometry); });
  let disposed = 0;
  geometries.forEach(geometry => geometry.addEventListener('dispose', () => disposed++));
  instance.dispose!(); instance.dispose!(); layers.forEach(layer => { layer.dispose(); layer.dispose(); });
  assert.equal(disposed, geometries.size);
  assert.deepEqual(connected.targets(), []);
  assert.throws(() => connected.select('product:checkout'), /disposed/);
});
