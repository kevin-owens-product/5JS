import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEntityRecords, createConnectedData } from '../examples/connected/fixture.js';
import type { EntityRecord, Theme } from '../examples/connected/types.js';

const field = (record: EntityRecord, label: string) => record.fields.find(item => item.label === label)?.value;
const themes: Theme[] = ['checkout', 'activation', 'visibility'];

test('connected fixture is deterministic, independently mutable, and has the declared entity grain', () => {
  const first = createConnectedData(), second = createConnectedData();
  assert.deepEqual(first, second);
  assert.deepEqual(Object.fromEntries(Object.entries(first).map(([key, rows]) => [key, rows.length])), {
    customers: 6, people: 15, products: 3, services: 3, sessions: 36, checkouts: 24, interviews: 12,
  });
  const prefixes = { customers: 'customer:', people: 'person:', products: 'product:', services: 'service:', sessions: 'session:', checkouts: 'checkout:', interviews: 'interview:' };
  const ids = Object.entries(first).flatMap(([key, rows]) => rows.map(row => {
    assert.ok(row.id.startsWith(prefixes[key as keyof typeof prefixes]));
    return row.id;
  }));
  assert.equal(ids.length, 99);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(first.people.filter(person => person.customerId).length, 12);
  assert.equal(first.people.filter(person => !person.customerId).length, 3);
  assert.deepEqual(first.customers.map(customer => customer.segment), ['Growth', 'Growth', 'Growth', 'Enterprise', 'Enterprise', 'Enterprise']);
  first.customers[0].productIds.push('test:mutation');
  first.sessions[0].events[0].label = 'mutated';
  first.interviews[0].sessionIds.length = 0;
  assert.deepEqual(second, createConnectedData());
});

test('every native relationship joins to the same customer, participant, product, and service', () => {
  const data = createConnectedData();
  const customers = new Map(data.customers.map(row => [row.id, row]));
  const people = new Map(data.people.map(row => [row.id, row]));
  const products = new Map(data.products.map(row => [row.id, row]));
  const services = new Map(data.services.map(row => [row.id, row]));
  const sessions = new Map(data.sessions.map(row => [row.id, row]));
  for (const customer of data.customers) {
    assert.ok(people.has(customer.ownerId));
    assert.equal(people.get(customer.ownerId)!.customerId, undefined);
    assert.ok(customer.productIds.every(id => products.has(id)));
    assert.equal(data.people.filter(person => person.customerId === customer.id).length, 2);
    assert.equal(data.sessions.filter(session => session.customerId === customer.id).length, 6);
    assert.equal(data.interviews.filter(interview => interview.customerId === customer.id).length, 2);
  }
  for (const person of data.people) if (person.customerId) assert.ok(customers.has(person.customerId));
  for (const product of data.products) {
    assert.ok(people.has(product.ownerId));
    assert.equal(people.get(product.ownerId)!.customerId, undefined);
    assert.ok(product.serviceIds.every(id => services.has(id)));
  }
  for (const service of data.services) {
    assert.ok(people.has(service.ownerId));
    assert.equal(people.get(service.ownerId)!.customerId, undefined);
  }
  for (const session of data.sessions) {
    const customer = customers.get(session.customerId)!, person = people.get(session.personId)!, product = products.get(session.productId)!;
    assert.ok(customer && person && product);
    assert.equal(person.customerId, customer.id);
    assert.ok(customer.productIds.includes(product.id));
    assert.ok(session.events.length > 2);
    let previous = -1;
    for (const event of session.events) {
      assert.ok(Number.isInteger(event.offsetSeconds) && event.offsetSeconds > previous);
      previous = event.offsetSeconds;
      if (event.serviceId) assert.ok(product.serviceIds.includes(event.serviceId));
    }
    assert.match(session.startedAt, /^2026-06-\d\dT/);
    const end = Date.parse(session.startedAt) + previous * 1000;
    assert.ok(end < Date.parse('2026-07-01T00:00:00Z'));
  }
  const blockerService = { 'payment-timeout': 'service:payments', 'address-validation': 'service:addresses', 'shipping-cost': 'service:shipping', none: 'service:payments' };
  for (const checkout of data.checkouts) {
    const session = sessions.get(checkout.sessionId)!;
    assert.ok(session);
    assert.equal(checkout.productId, session.productId);
    assert.equal(session.productId, 'product:checkout');
    assert.equal(session.outcome, checkout.status);
    assert.equal(checkout.serviceId, blockerService[checkout.blocker]);
    assert.ok(session.events.some(event => event.serviceId === checkout.serviceId));
    assert.equal(checkout.blocker === 'none', checkout.status === 'completed');
    assert.ok(Number.isInteger(checkout.amount) && checkout.amount > 0);
  }
  assert.equal(new Set(data.checkouts.map(row => row.sessionId)).size, data.checkouts.length);
});

test('checkout and session denominators remain distinct and service joins do not multiply customers', () => {
  const data = createConnectedData(), sessions = new Map(data.sessions.map(row => [row.id, row]));
  const abandoned = data.checkouts.filter(row => row.status === 'abandoned');
  const completed = data.checkouts.filter(row => row.status === 'completed');
  assert.equal(completed.length, 12);
  assert.equal(abandoned.length, 12);
  assert.equal(completed.length / data.checkouts.length, 0.5);
  assert.notEqual(completed.length / data.sessions.length, 0.5);
  assert.equal(data.sessions.filter(row => row.outcome === 'active').length, 4);
  assert.equal(data.sessions.filter(row => row.outcome === 'abandoned').length, 15);
  assert.deepEqual(['payment-timeout', 'address-validation', 'shipping-cost'].map(blocker => abandoned.filter(row => row.blocker === blocker).length), [5, 4, 3]);
  assert.deepEqual(data.customers.map(customer => abandoned.filter(row => sessions.get(row.sessionId)!.customerId === customer.id).length), [2, 3, 1, 2, 1, 3]);
  for (const customer of data.customers) assert.equal(data.checkouts.filter(row => sessions.get(row.sessionId)!.customerId === customer.id).length, 4);
  assert.equal(data.checkouts.reduce((sum, row) => sum + row.amount, 0), 7716);
  assert.equal(completed.reduce((sum, row) => sum + row.amount, 0), 4098);
  assert.equal(abandoned.reduce((sum, row) => sum + row.amount, 0), 3618);
  const exposed = new Set(abandoned.map(row => sessions.get(row.sessionId)!.customerId));
  const distinctAnnualValue = data.customers.filter(customer => exposed.has(customer.id)).reduce((sum, customer) => sum + customer.annualValue, 0);
  assert.equal(distinctAnnualValue, 648000);
  const joinedAnnualValue = abandoned.reduce((sum, row) => sum + data.customers.find(customer => customer.id === sessions.get(row.sessionId)!.customerId)!.annualValue, 0);
  assert.ok(joinedAnnualValue > distinctAnnualValue, 'Fixture must expose accidental fanout in customer-value sums.');
  const paymentEvents = data.sessions.flatMap(session => session.events.filter(event => event.serviceId === 'service:payments'));
  const paymentSessions = data.sessions.filter(session => session.events.some(event => event.serviceId === 'service:payments'));
  assert.ok(paymentEvents.length > paymentSessions.length, 'Repeated service events must not count as extra sessions.');
});

test('fictional interviews balance theme coverage and refer to the participant’s actual authored behavior', () => {
  const data = createConnectedData(), sessions = new Map(data.sessions.map(row => [row.id, row]));
  assert.equal(new Set(data.interviews.map(row => row.personId)).size, 12);
  for (const theme of themes) {
    const interviews = data.interviews.filter(row => row.theme === theme);
    assert.equal(interviews.length, 4);
    assert.deepEqual(['supports', 'contradicts', 'mixed'].map(stance => interviews.filter(row => row.stance === stance).length), [2, 1, 1]);
    assert.equal(new Set(interviews.map(row => row.customerId)).size, 4);
    assert.equal(new Set(interviews.map(row => row.personId)).size, 4);
  }
  for (const interview of data.interviews) {
    assert.match(interview.quote, /^Fictional interview:/);
    assert.match(interview.date, /^2026-06-\d\d$/);
    assert.equal(interview.productId, `product:${interview.theme}`);
    assert.ok(interview.sessionIds.length > 0);
    assert.equal(new Set(interview.sessionIds).size, interview.sessionIds.length);
    const referenced = interview.sessionIds.map(id => sessions.get(id)!);
    for (const session of referenced) {
      assert.ok(session);
      assert.equal(session.customerId, interview.customerId);
      assert.equal(session.personId, interview.personId);
      assert.equal(session.productId, interview.productId);
      assert.ok(Date.parse(session.startedAt) + session.events.at(-1)!.offsetSeconds * 1000 < Date.parse(interview.date));
    }
    if (interview.stance === 'contradicts') assert.ok(referenced.every(session => session.outcome === 'completed'));
    if (interview.stance === 'supports') assert.ok(referenced.every(session => session.outcome !== 'completed'));
    if (interview.stance === 'mixed' && interview.theme !== 'visibility') {
      assert.ok(referenced.some(session => session.outcome === 'completed'));
      assert.ok(referenced.some(session => session.outcome !== 'completed'));
    }
  }
});

test('normalized inspection records have reversible typed links, exact timelines, and explicit fiction labels', () => {
  const data = createConnectedData(), before = JSON.stringify(data), records = buildEntityRecords(data);
  assert.equal(JSON.stringify(data), before);
  assert.deepEqual(records, buildEntityRecords(data));
  const byId = new Map(records.map(record => [record.id, record]));
  assert.equal(records.length, 99);
  assert.equal(byId.size, records.length);
  assert.deepEqual([...new Set(records.map(record => record.kind))].sort(), ['checkout', 'customer', 'interview', 'person', 'product', 'service', 'session']);
  for (const record of records) {
    assert.ok(record.label.length > 0 && record.summary.length > 0);
    assert.match(record.summary, /[Ff]ictional|[Ss]ynthetic/);
    assert.match(field(record, 'Source')!, /all organizations, people, behavior, and interviews are fictional/);
    assert.equal(field(record, 'Observation window'), 'June 1–30, 2026 UTC');
    assert.ok(record.links.length > 0);
    assert.equal(new Set(record.links.map(link => link.id)).size, record.links.length);
    for (const link of record.links) {
      assert.ok(byId.has(link.id), `${record.id} → ${link.id}`);
      assert.ok(link.label.length > 0);
      assert.ok(byId.get(link.id)!.links.some(reverse => reverse.id === record.id));
    }
    for (const evidence of record.evidence ?? []) assert.ok(['Synthetic observation', 'Fictional interview', 'Hypothesis'].includes(evidence.basis));
  }
  for (const session of data.sessions) {
    const record = byId.get(session.id)!;
    assert.deepEqual(record.timeline, session.events.map(event => ({ label: `+${event.offsetSeconds}s`, detail: event.label })));
    if (session.outcome === 'active') assert.match(field(record, 'Outcome interpretation')!, /not classified as abandoned/);
  }
  for (const interview of data.interviews) {
    const record = byId.get(interview.id)!;
    assert.equal(record.evidence![0].basis, 'Fictional interview');
    assert.equal(record.evidence![0].text, interview.quote);
  }
  assert.doesNotMatch(JSON.stringify({ data, records }), /https?:\/\//);
  assert.ok(data.people.every(person => / (Sample|Example)$/.test(person.name)));
});

test('entity summaries reconcile to native rows without counting expanded links', () => {
  const data = createConnectedData(), records = new Map(buildEntityRecords(data).map(record => [record.id, record]));
  const sessions = new Map(data.sessions.map(session => [session.id, session]));
  for (const customer of data.customers) {
    const record = records.get(customer.id)!, attempts = data.checkouts.filter(row => sessions.get(row.sessionId)!.customerId === customer.id);
    const completed = attempts.filter(row => row.status === 'completed').length;
    assert.equal(field(record, 'Observed sessions'), '6');
    assert.equal(field(record, 'Checkout attempts'), '4');
    assert.equal(field(record, 'Completed / abandoned attempts'), `${completed} / ${4 - completed}`);
    assert.equal(field(record, 'Annual contract value'), `${customer.annualValue.toLocaleString('en-US')} USD`);
    assert.match(record.evidence![0].text, /exposure, not checkout revenue or predicted loss/);
  }
  for (const product of data.products) {
    const record = records.get(product.id)!;
    assert.equal(field(record, 'Observed sessions'), String(data.sessions.filter(row => row.productId === product.id).length));
    assert.equal(field(record, 'Customer organizations'), String(data.customers.filter(row => row.productIds.includes(product.id)).length));
  }
  for (const service of data.services) {
    const record = records.get(service.id)!, blocked = data.checkouts.filter(row => row.status === 'abandoned' && row.serviceId === service.id);
    assert.equal(field(record, 'Sessions touching service'), String(data.sessions.filter(row => row.events.some(event => event.serviceId === service.id)).length));
    assert.equal(field(record, 'Abandoned checkout attempts with this blocker service'), String(blocked.length));
    assert.equal(field(record, 'Distinct customers with these abandoned attempts'), String(new Set(blocked.map(row => sessions.get(row.sessionId)!.customerId)).size));
  }
});
