import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera } from 'three';
import { createOutcomeExplorer } from '../examples/connected/explorer.js';
import { investigationBrief, type BriefItem } from '../examples/connected/brief.js';
import { nearestEntity } from '../examples/connected/picking.js';
import type { EntityRecord, OutcomeAction, OutcomeView, SelectableEntity } from '../examples/connected/types.js';

function record(id: string, kind: EntityRecord['kind'] = 'customer'): EntityRecord {
  return { id, kind, label: id, summary: 'Synthetic review fixture', fields: [], links: [] };
}
function candidate(entityId: string) { return { entityId, reason: 'Observed fixture evidence', measure: 'One linked record' }; }
function view(ids: string[]): OutcomeView {
  return { question: 'Which observed record should be reviewed?', summary: 'Synthetic observations only.', scope: 'Current test cohort.', candidates: ids.map(candidate), actions: [] };
}

// These records deliberately separate decision candidates from linked evidence targets.
function explorerFixture() {
  const records = [record('customer:a'), record('customer:b'), record('session:a', 'session')];
  records[0].links.push({ id: 'session:a', label: 'Observed session' });
  let candidateIds = ['customer:a', 'customer:b'];
  let targets: SelectableEntity[] = [{ id: 'customer:a', position: [0, 0, 0] }, { id: 'session:a', position: [1, 0, 0] }];
  const events: string[] = [];
  const explorer = createOutcomeExplorer({ records, view: () => view(candidateIds), targets: () => targets,
    onSelect: () => events.push(`draw:${explorer.selectedId}`) });
  return { explorer, events, setCandidates(ids: string[]) { candidateIds = ids; }, setTargets(value: SelectableEntity[]) { targets = value; } };
}

test('explorer selection changes state before redraw, then notifies, and ignores an unchanged selection', () => {
  const { explorer, events } = explorerFixture();
  assert.equal(explorer.selectedId, 'customer:a');
  const unsubscribe = explorer.subscribe(() => events.push(`notify:${explorer.selectedId}`));
  explorer.select('session:a');
  assert.deepEqual(events, ['draw:session:a', 'notify:session:a']);
  explorer.select('session:a');
  assert.equal(events.length, 2, 'selecting the same record does not redraw or emit');
  unsubscribe(); unsubscribe();
  explorer.select('customer:b');
  assert.deepEqual(events, ['draw:session:a', 'notify:session:a', 'draw:customer:b']);
  explorer.dispose();
});

test('refresh preserves a visible linked target, then reconciles excluded evidence to the remaining cohort', () => {
  const { explorer, events, setCandidates, setTargets } = explorerFixture();
  explorer.select('session:a'); events.length = 0;
  explorer.subscribe(() => events.push(`notify:${explorer.selectedId}`));
  setCandidates(['customer:b']);
  explorer.refresh();
  assert.equal(explorer.selectedId, 'session:a', 'visible evidence is selectable even when it is not a decision candidate');
  assert.deepEqual(events, ['notify:session:a'], 'a retained selection notifies the new cohort without redrawing');
  setTargets([{ id: 'customer:b', position: [0, 0, 0] }]); events.length = 0;
  explorer.refresh();
  assert.equal(explorer.selectedId, 'customer:b');
  assert.deepEqual(events, ['draw:customer:b', 'notify:customer:b']);
  setTargets([]); events.length = 0;
  explorer.refresh();
  assert.equal(explorer.selectedId, 'customer:b', 'remaining candidates retain selection even without a visible target');
  assert.deepEqual(events, ['notify:customer:b']);
  setCandidates([]); events.length = 0;
  explorer.refresh();
  assert.equal(explorer.selectedId, null);
  assert.deepEqual(events, ['draw:null', 'notify:null']);
  explorer.dispose();
});

test('an evidence-only view retains a visible selection and clears it when the target disappears', () => {
  const { explorer, setCandidates, setTargets } = explorerFixture();
  explorer.select('session:a'); setCandidates([]);
  explorer.refresh(); assert.equal(explorer.selectedId, 'session:a');
  setTargets([]); explorer.refresh(); assert.equal(explorer.selectedId, null);
  explorer.dispose();
  const empty = createOutcomeExplorer({ records: [], view: () => view([]), targets: () => [] });
  assert.equal(empty.selectedId, null); empty.refresh(); assert.equal(empty.selectedId, null); empty.dispose();
});

test('explorer rejects invalid record/link/selection IDs without emitting an invalid selection', () => {
  const options = { view: () => view([]), targets: () => [] };
  assert.throws(() => createOutcomeExplorer({ ...options, records: [record('')] }), /unique/);
  assert.throws(() => createOutcomeExplorer({ ...options, records: [record('duplicate'), record('duplicate')] }), /unique/);
  const missingLink = record('customer:a'); missingLink.links.push({ id: 'absent', label: 'Missing record' });
  assert.throws(() => createOutcomeExplorer({ ...options, records: [missingLink] }), /Missing linked entity/);
  assert.throws(() => createOutcomeExplorer({ ...options, records: [record('customer:a')], initialId: 'absent' }), /Unknown selected entity/);
  assert.throws(() => createOutcomeExplorer({ ...options, records: [record('customer:a')], view: () => view(['absent']) }), /Unknown selected entity/);
  const { explorer, events, setCandidates } = explorerFixture();
  assert.throws(() => explorer.select('absent'), /Unknown entity/);
  assert.equal(explorer.selectedId, 'customer:a'); assert.deepEqual(events, []);
  setCandidates(['absent']);
  assert.throws(() => explorer.refresh(), /Unknown candidate/);
  assert.equal(explorer.selectedId, 'customer:a'); assert.deepEqual(events, []);
  explorer.dispose();
});

test('explorer disposal is idempotent, clears picking targets and prevents future mutations or subscriptions', () => {
  const { explorer, events } = explorerFixture();
  let notifications = 0;
  const unsubscribe = explorer.subscribe(() => notifications++);
  explorer.dispose(); explorer.dispose(); unsubscribe();
  assert.deepEqual(explorer.targets(), []);
  assert.throws(() => explorer.select('customer:b'), /disposed/);
  assert.throws(() => explorer.refresh(), /disposed/);
  assert.throws(() => explorer.subscribe(() => {}), /disposed/);
  assert.equal(notifications, 0); assert.deepEqual(events, []);
});

function briefFixture() {
  const observed: EntityRecord = {
    id: 'session:[observed]', kind: 'session', label: '<Session> & **name**', summary: '<script>unsafe()</script> & literal',
    fields: [{ label: 'Field [one]', value: '<img src=x> & _value_' }],
    links: [{ id: 'customer:#linked', label: 'Related customer' }],
    evidence: [{ basis: 'Synthetic observation', label: 'Event <label>', text: 'Observed <timeout> & no completion.' }],
    timeline: [{ label: 'T+1 [event]', detail: '<b>raw event</b> & detail' }],
  };
  const interview: EntityRecord = { ...record('interview:pinned', 'interview'), label: 'Pinned conversation',
    evidence: [{ basis: 'Fictional interview', label: 'Participant statement', text: 'A fictional quote, not validated customer evidence.' }, { basis: 'Hypothesis', label: 'Interpretation', text: 'A tentative explanation requiring validation.' }] };
  const owner = { ...record('person:owner', 'person'), label: '<Owner> & _lead_' };
  const linked = record('customer:#linked');
  const action: OutcomeAction = {
    id: 'review:one', title: '<Review> & [action](https://example.test)', rationale: 'Inspect <records> & *context*.', ownerId: owner.id,
    evidenceIds: [observed.id, observed.id], metric: 'Verified <completion> & rate', baseline: '0 <verified> & known observations',
    success: 'Record <review> & [decision]', guardrail: 'Keep <private> & no external send', caveat: 'Assumed <effect> & no forecast',
  };
  const item: BriefItem = { question: '<Decision> & **why**?', scope: '<Cohort> & [selection]', action };
  return { records: [observed, interview, owner, linked], observed, interview, item };
}

test('investigation briefs escape HTML before Markdown across actions, owners and evidence content', () => {
  const { records, observed, interview, item } = briefFixture();
  const result = investigationBrief('<Plan> & **review**', [item], records, [interview.id]);
  assert.ok(result.startsWith('# &lt;Plan&gt; &amp; \\*\\*review\\*\\* — investigation brief'));
  assert.ok(!result.includes('<') && !result.includes('>'), 'raw HTML tags never survive into Markdown');
  assert.ok(result.includes('&lt;Owner&gt; &amp; \\_lead\\_'));
  assert.ok(result.includes('&lt;Review&gt; &amp; \\[action\\]\\(https://example\\.test\\)'));
  assert.ok(result.includes('&lt;script&gt;unsafe\\(\\)&lt;/script&gt; &amp; literal'));
  assert.ok(result.includes('&lt;img src=x&gt; &amp; \\_value\\_'));
  assert.ok(result.includes('T\\+1 \\[event\\]: &lt;b&gt;raw event&lt;/b&gt; &amp; detail'));
  assert.ok(result.includes('Linked IDs: customer:\\#linked'));
  for (const word of ['Decision', 'Cohort', 'records', 'completion', 'verified', 'review', 'private', 'effect', 'label', 'timeout']) {
    assert.ok(result.includes(`&lt;${word}&gt;`), `escaped content remains inspectable: ${word}`);
  }
  assert.ok(!result.includes('&amp;lt;'), 'HTML entities are not escaped a second time');
  assert.ok(result.includes('session:\\[observed\\]'));
  assert.equal(observed.summary, '<script>unsafe()</script> & literal', 'export does not mutate source records');
});

test('briefs retain provenance, limits and pinned evidence while deduplicating evidence sections', () => {
  const { records, interview, item } = briefFixture();
  const second = { ...item, action: { ...item.action, id: 'review:two', title: 'Second review' } };
  const result = investigationBrief('Review plan', [item, second], records, [interview.id, interview.id]);
  assert.match(result, /Customers, people, sessions, checkouts, and interviews are fictional/);
  assert.match(result, /not completed actions or validated forecasts/);
  assert.ok(result.includes('**Synthetic observation —'));
  assert.ok(result.includes('**Fictional interview —'));
  assert.ok(result.includes('**Hypothesis —'));
  assert.ok(result.includes('Scope at selection:'));
  assert.ok(result.includes('Observed baseline:'));
  assert.ok(result.includes('Proposed success criterion:'));
  assert.ok(result.includes('Guardrail:'));
  assert.ok(result.includes('Limits / assumptions:'));
  assert.ok(result.includes('**Additional records selected:** interview:pinned'));
  const evidenceSection = result.split('## Evidence records')[1];
  assert.equal((evidenceSection.match(/^### /gm) ?? []).length, 2, 'each record appears once across repeated action and pinned references');
  assert.equal((evidenceSection.match(/^### interview:pinned /gm) ?? []).length, 1);
  assert.ok(evidenceSection.includes('A fictional quote, not validated customer evidence'));
  assert.ok(!evidenceSection.includes('### person:owner'), 'owner display does not invent an evidence record');
});

test('an evidence-only brief keeps pinned records and missing references fail explicitly', () => {
  const { records, interview, item } = briefFixture();
  const pinned = investigationBrief('Evidence collection', [], records, [interview.id]);
  assert.match(pinned, /No proposed actions selected/);
  assert.match(pinned, /Fictional interview/);
  assert.ok(pinned.includes('interview:pinned'));
  assert.throws(() => investigationBrief('Missing pin', [], records, ['absent']), /Missing evidence: absent/);
  assert.throws(() => investigationBrief('Missing action source', [{ ...item, action: { ...item.action, evidenceIds: ['absent'] } }], records), /Missing evidence: absent/);
});

function pickingCamera() {
  const camera = new PerspectiveCamera(90, 2, 1, 20);
  camera.position.set(0, 0, 5); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  return camera;
}
const rect = { left: 100, top: 50, width: 400, height: 200 };
const target = (id: string, position: [number, number, number]): SelectableEntity => ({ id, position });

test('picking projects world coordinates through the camera into an offset CSS-pixel rectangle', () => {
  const camera = pickingCamera();
  const targets = [target('origin', [0, 0, 0]), target('right-up', [1, 1, 0])];
  assert.equal(nearestEntity(targets, camera, rect, 300, 150), 'origin');
  assert.equal(nearestEntity(targets, camera, rect, 320, 130), 'right-up');
  assert.equal(nearestEntity(targets, camera, rect, 20, 80), null, 'pointer coordinates are viewport-relative, not canvas-relative');
  camera.position.set(8, 5, 11); camera.lookAt(1, 0, -2); camera.updateMatrixWorld();
  assert.equal(nearestEntity([target('look-at', [1, 0, -2])], camera, rect, 300, 150), 'look-at');
});

test('picking excludes clipped and nonfinite targets and rejects empty viewports', () => {
  const camera = pickingCamera();
  const clipped = [target('behind', [0, 0, 6]), target('before-near', [0, 0, 4.5]), target('beyond-far', [0, 0, -16]),
    target('outside-x', [11, 0, 0]), target('outside-y', [0, 6, 0]), target('nonfinite', [Number.NaN, 0, 0])];
  for (const entity of clipped) assert.equal(nearestEntity([entity], camera, rect, 300, 150), null, entity.id);
  assert.equal(nearestEntity([...clipped, target('visible', [0, 0, 0])], camera, rect, 300, 150), 'visible');
  assert.equal(nearestEntity([target('visible', [0, 0, 0])], camera, { ...rect, width: 0 }, 300, 150), null);
  assert.equal(nearestEntity([target('visible', [0, 0, 0])], camera, { ...rect, height: -1 }, 300, 150), null);
  assert.equal(nearestEntity([], camera, rect, 300, 150), null);
});

test('picking uses an inclusive 18-pixel radius and the nearest projected target', () => {
  const camera = pickingCamera(), origin = target('origin', [0, 0, 0]);
  assert.equal(nearestEntity([origin], camera, rect, 318, 150), 'origin');
  assert.equal(nearestEntity([origin], camera, rect, 318.001, 150), null);
  const right = target('right', [1, 0, 0]);
  assert.equal(nearestEntity([origin, right], camera, rect, 317, 150), 'right');
  assert.equal(nearestEntity([right, origin], camera, rect, 303, 150), 'origin');
});

test('picking resolves near-equal screen distances by depth without overriding a clear distance winner', () => {
  const camera = pickingCamera();
  const far = target('far', [0, 0, -5]), near = target('near', [0, 0, 0]);
  assert.equal(nearestEntity([far, near], camera, rect, 300, 150), 'near');
  assert.equal(nearestEntity([near, far], camera, rect, 300, 150), 'near');
  const farOffset = target('far-offset', [.2, 0, -5]); // 2 CSS pixels from the pointer.
  const tiedNear = target('near-offset', [.12, 0, 0]); // 2.4 CSS pixels: within the 0.5-pixel depth tie.
  assert.equal(nearestEntity([farOffset, tiedNear], camera, rect, 300, 150), 'near-offset');
  assert.equal(nearestEntity([tiedNear, farOffset], camera, rect, 300, 150), 'near-offset');
  const clearlyFartherNear = target('near-outside-tie', [.13, 0, 0]); // 2.6 CSS pixels.
  assert.equal(nearestEntity([farOffset, clearlyFartherNear], camera, rect, 300, 150), 'far-offset');
});
