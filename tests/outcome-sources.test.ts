import assert from 'node:assert/strict';
import test from 'node:test';
import { conversionModel, createOutcomeDataset, decisionBrief, loadOutcomeDataset, productModel, retentionModel, segments, validateOutcomeDataset } from '../examples/outcomes/model.js';
import { createDecisionScene } from '../examples/outcomes/scene.js';

test('seven connector snapshots reconstruct all 540 joined records without truncation', async () => {
  const loaded = await loadOutcomeDataset();
  assert.deepEqual(loaded.data, createOutcomeDataset());
  assert.equal(loaded.receipts.length, 7);
  assert.equal(loaded.receipts.reduce((count, item) => count + item.page.rows.length, 0), 540);
  for (const { page } of loaded.receipts) { assert.equal(page.provenance.provider, 'json'); assert.equal(page.provenance.mode, 'fixture'); assert.equal(page.page.hasMore, false); assert.equal(page.page.truncated, false); }
});

test('join validation rejects duplicate IDs, orphans and incomplete account observation windows', () => {
  const duplicate = createOutcomeDataset(); duplicate.accounts.push({ ...duplicate.accounts[0] }); assert.throws(() => validateOutcomeDataset(duplicate), /Duplicate/);
  const orphan = createOutcomeDataset(); orphan.checkouts[0].sessionId = 'missing'; assert.throws(() => validateOutcomeDataset(orphan), /Invalid checkout/);
  const missing = createOutcomeDataset(); missing.usage.pop(); assert.throws(() => validateOutcomeDataset(missing), /observation is missing/);
  const repeated = createOutcomeDataset(); repeated.usage[1].week = repeated.usage[0].week; assert.throws(() => validateOutcomeDataset(repeated), /one account-week/);
});

test('conversion cohorts reconcile to source attempts and assumptions never mutate observed outcomes', () => {
  const data = createOutcomeDataset(), before = JSON.stringify(data);
  const totals = [0, 0, 0, 0];
  for (const segment of segments.slice(1)) {
    const baseline = conversionModel(data, segment, 0), scenario = conversionModel(data, segment, 50);
    assert.deepEqual(baseline.stages, scenario.stages); assert.equal(baseline.rate, scenario.rate);
    assert.equal(baseline.modeledCompletions, 0); assert.equal(scenario.modeledCompletions, scenario.failed.length * .5);
    assert.equal(scenario.modeledBasketValue, scenario.failed.reduce((sum, row) => sum + row.amount, 0) * .5);
    baseline.stages.forEach((count, i) => { totals[i] += count; if (i) assert.ok(count <= baseline.stages[i - 1]); });
    for (const attempt of scenario.attempts) { const session = data.sessions.find(row => row.id === attempt.sessionId)!; assert.equal(data.accounts.find(row => row.id === session.accountId)!.segment, segment); }
  }
  assert.deepEqual(totals, [144, 127, 110, 76]);
  assert.equal(JSON.stringify(data), before);
});

test('retention queue uses all three review signals and values each account once', () => {
  const data = createOutcomeDataset(), noQueue = retentionModel(data, 'All accounts', 0), full = retentionModel(data, 'All accounts', 100), half = retentionModel(data, 'All accounts', 50);
  assert.deepEqual(noQueue.cohorts, full.cohorts); assert.equal(noQueue.active, full.active); assert.equal(noQueue.queue.length, 0);
  assert.equal(half.queue.length, Math.ceil(full.review.length / 2));
  assert.equal(full.annualValue, full.queue.reduce((sum, account) => sum + account.annualValue, 0));
  assert.equal(new Set(full.queue.map(account => account.id)).size, full.queue.length);
  for (const account of full.queue) {
    assert.ok(account.renewalDays <= 30);
    const usage = data.usage.filter(row => row.accountId === account.id);
    assert.ok(usage.find(row => row.week === 12)!.sessions < usage.find(row => row.week === 8)!.sessions * .6);
    assert.ok(data.tickets.some(row => row.accountId === account.id && row.status === 'open'));
  }
  const removal = structuredClone(data); removal.tickets = [];
  assert.equal(retentionModel(removal, 'All accounts', 100).queue.length, 0);
});

test('product evidence counts distinct accounts and retains counter-evidence at every capacity', () => {
  const data = createOutcomeDataset(), baseline = productModel(data, 'All accounts', 1);
  const duplicate = { ...data.interviews[0], id: 'extra-interview' }; data.interviews.push(duplicate);
  const added = productModel(data, 'All accounts', 6);
  for (const feature of added.initiatives) {
    const original = baseline.initiatives.find(row => row.id === feature.id)!;
    assert.equal(original.customers, feature.customers); assert.equal(original.supporters, feature.supporters);
    assert.ok(feature.evidence.some(row => row.stance !== 'supports'));
    assert.equal(feature.feasible, true);
    assert.equal(feature.contradictions, feature.evidence.filter(row => row.stance === 'contradicts').length);
  }
});

test('exported briefs carry observed grain, explicit assumptions, owner and guardrails', () => {
  const data = createOutcomeDataset();
  for (const decision of ['conversion', 'retention', 'product'] as const) {
    const brief = decisionBrief(data, decision, 'Growth', decision === 'product' ? 3 : 25, decision === 'product' ? 'activation' : 'acct-001');
    for (const text of ['entirely fictional', 'Segment: Growth', 'Observed baseline', 'Scenario / planning assumptions', 'Proposed owner', 'Primary measure', 'Guardrail', 'not an executed action', 'No live provider account']) assert.ok(brief.includes(text), `Missing ${text}`);
  }
  const product = decisionBrief(data, 'product', 'Growth', 3, 'activation');
  for (const field of ['Activation team', 'first workspace milestone within 7 days', 'Track setup time', 'Evidence IDs:', 'Account IDs:']) assert.ok(product.includes(field));
  assert.throws(() => conversionModel(data, 'All accounts', 100), /0–50/);
  assert.throws(() => retentionModel(data, 'All accounts', NaN), /0–100/);
  assert.throws(() => productModel(data, 'All accounts', 0), /1–6/);
});

test('decision scenes preserve data, expose selectable source IDs, and release redraw resources once', () => {
  const data = createOutcomeDataset(), baseline = JSON.stringify(data), scene = createDecisionScene(data), ids = new Set([...data.accounts, ...data.features].map(row => row.id));
  const resources = new Map<object, number>();
  scene.object.traverse((object: any) => { for (const resource of [object.geometry, ...[object.material].flat()].filter(Boolean)) if (!resources.has(resource)) { resources.set(resource, 0); resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource)! + 1)); } });
  assert.ok(scene.targets.length > 100); for (const target of scene.targets) assert.ok(ids.has(target.userData.recordId));
  scene.update(2, .1); scene.select(data.accounts[0].id);
  scene.configure('retention', 'Growth', 50);
  for (const count of resources.values()) assert.equal(count, 1);
  scene.configure('product', 'Enterprise', 3); scene.update(10, .1);
  for (const target of scene.targets.filter(row => row.userData.interviewId)) {
    const interview = data.interviews.find(row => row.id === target.userData.interviewId)!;
    assert.equal(target.userData.featureId, interview.featureId); assert.equal(target.userData.recordId, interview.accountId);
  }
  assert.equal(JSON.stringify(data), baseline); assert.ok(scene.targets.length > 0);
  scene.dispose(); scene.dispose(); assert.equal(scene.object.children.length, 0); assert.equal(scene.targets.length, 0);
});
