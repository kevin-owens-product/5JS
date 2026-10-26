import type {
  CheckoutBlocker, ConnectedDataset, EntityRecord, InterviewRecord, SessionEvent,
  SessionRecord, Theme,
} from './types.js';

const THEMES: Theme[] = ['checkout', 'activation', 'visibility'];
const OWNERS = ['person:owner-payments', 'person:owner-onboarding', 'person:owner-insights'];
const PERIOD = 'June 1–30, 2026 UTC';
const SOURCE = 'Synthetic demonstration data; all organizations, people, behavior, and interviews are fictional.';
const BLOCKERS: CheckoutBlocker[][] = [
  ['payment-timeout', 'address-validation', 'none', 'none'],
  ['payment-timeout', 'payment-timeout', 'none', 'shipping-cost'],
  ['none', 'none', 'address-validation', 'none'],
  ['shipping-cost', 'none', 'payment-timeout', 'none'],
  ['address-validation', 'none', 'none', 'none'],
  ['payment-timeout', 'shipping-cost', 'address-validation', 'none'],
];
const SERVICE: Record<CheckoutBlocker, string> = {
  'payment-timeout': 'service:payments', 'address-validation': 'service:addresses',
  'shipping-cost': 'service:shipping', none: 'service:payments',
};
const QUOTES: Record<Theme, Record<InterviewRecord['stance'], string>> = {
  checkout: {
    supports: 'I did not finish this checkout after the interruption.',
    contradicts: 'I completed this checkout, and the steps were clear to me.',
    mixed: 'I completed one attempt but left another; the experience was inconsistent.',
  },
  activation: {
    supports: 'I left setup before reaching the first workspace milestone.',
    contradicts: 'I completed setup and reached the first workspace milestone without confusion.',
    mixed: 'I reached the milestone in one session, but another session ended during setup.',
  },
  visibility: {
    supports: 'I opened the service view but still could not tell which service explained the delay.',
    contradicts: 'The service view helped me find the status I needed.',
    mixed: 'The view showed current status, but it did not explain the earlier interruption.',
  },
};
const HYPOTHESES: Record<Theme, string> = {
  checkout: 'Checkout interruptions impede completion.',
  activation: 'Setup friction blocks the first workspace milestone.',
  visibility: 'Service status is difficult to interpret.',
};
const pad = (value: number) => String(value).padStart(2, '0');
const rowId = (kind: string, customer: number, ordinal: number) => `${kind}:${pad(customer + 1)}:${pad(ordinal + 1)}`;
const personId = (customer: number, ordinal: number) => `person:${pad(customer * 2 + ordinal + 1)}`;
const money = (value: number) => `${value.toLocaleString('en-US')} USD`;

function checkoutEvents(blocker: CheckoutBlocker): SessionEvent[] {
  const events: SessionEvent[] = [
    { offsetSeconds: 0, label: 'Opened Cart Studio' },
    { offsetSeconds: 8, label: 'Reviewed cart' },
    { offsetSeconds: 18, label: 'Submitted address', serviceId: 'service:addresses' },
  ];
  if (blocker === 'address-validation') return [...events,
    { offsetSeconds: 31, label: 'Address validation rejected input', serviceId: 'service:addresses' },
    { offsetSeconds: 63, label: 'Left checkout without completing' },
  ];
  events.push(
    { offsetSeconds: 32, label: 'Address accepted', serviceId: 'service:addresses' },
    { offsetSeconds: 45, label: 'Displayed shipping cost', serviceId: 'service:shipping' },
  );
  if (blocker === 'shipping-cost') return [...events,
    { offsetSeconds: 58, label: 'Left after displayed shipping cost; synthetic blocker label: shipping-cost', serviceId: 'service:shipping' },
  ];
  events.push(
    { offsetSeconds: 58, label: 'Selected shipping option', serviceId: 'service:shipping' },
    { offsetSeconds: 80, label: 'Submitted payment', serviceId: 'service:payments' },
  );
  return blocker === 'payment-timeout' ? [...events,
    { offsetSeconds: 95, label: 'Payment response timed out', serviceId: 'service:payments' },
    { offsetSeconds: 124, label: 'Retry timed out', serviceId: 'service:payments' },
    { offsetSeconds: 142, label: 'Left checkout without completing' },
  ] : [...events,
    { offsetSeconds: 97, label: 'Payment authorized', serviceId: 'service:payments' },
    { offsetSeconds: 108, label: 'Checkout confirmation displayed' },
  ];
}

/** Fresh, deterministic fictional records. One checkout attempt per checkout session. */
export function createConnectedData(): ConnectedDataset {
  const names = ['Aster Cooperative', 'Bramble Works', 'Cobalt Supply', 'Drift Collective', 'Ember Systems', 'Fern Network'];
  const contacts = ['Ari', 'Blair', 'Casey', 'Drew', 'Ellis', 'Frankie', 'Gray', 'Harper', 'Indigo', 'Jules', 'Kit', 'Lane'];
  const annualValues = [24000, 36000, 48000, 120000, 180000, 240000];
  const themeCounts: Record<Theme, number> = { checkout: 0, activation: 0, visibility: 0 };
  const plans = names.map((_, customer) => [0, 1].map(ordinal => {
    const theme = THEMES[(customer + ordinal) % 3];
    const stance = (['supports', 'contradicts', 'mixed', 'supports'] as const)[themeCounts[theme]++];
    return { theme, stance, personId: personId(customer, ordinal) };
  }));
  const data: ConnectedDataset = {
    customers: names.map((name, index) => ({
      id: `customer:${pad(index + 1)}`, name, segment: index < 3 ? 'Growth' : 'Enterprise',
      annualValue: annualValues[index], productIds: [...new Set(['product:checkout', ...plans[index].map(plan => `product:${plan.theme}`)])],
      ownerId: OWNERS[index % 3],
    })),
    people: [
      ...contacts.map((name, index) => ({ id: `person:${pad(index + 1)}`, name: `${name} Sample`, role: index % 2 ? 'Operations lead' : 'Product administrator', customerId: `customer:${pad(Math.floor(index / 2) + 1)}` })),
      { id: OWNERS[0], name: 'Morgan Example', role: 'Internal commerce owner' },
      { id: OWNERS[1], name: 'Riley Example', role: 'Internal onboarding owner' },
      { id: OWNERS[2], name: 'Taylor Example', role: 'Internal insights owner' },
    ],
    products: [
      { id: 'product:checkout', name: 'Cart Studio', serviceIds: ['service:addresses', 'service:shipping', 'service:payments'], ownerId: OWNERS[0] },
      { id: 'product:activation', name: 'Launch Workspace', serviceIds: ['service:addresses'], ownerId: OWNERS[1] },
      { id: 'product:visibility', name: 'Signal Console', serviceIds: ['service:addresses', 'service:shipping', 'service:payments'], ownerId: OWNERS[2] },
    ],
    services: [
      { id: 'service:payments', name: 'Payment authorization', ownerId: OWNERS[0] },
      { id: 'service:addresses', name: 'Address validation', ownerId: OWNERS[1] },
      { id: 'service:shipping', name: 'Shipping quote', ownerId: OWNERS[2] },
    ], sessions: [], checkouts: [], interviews: [],
  };
  data.customers.forEach((customer, customerIndex) => {
    for (let ordinal = 0; ordinal < 6; ordinal++) {
      const checkout = ordinal < 4;
      const otherPlans = plans[customerIndex].filter(plan => plan.theme !== 'checkout');
      const plan = otherPlans[(ordinal - 4 + otherPlans.length) % otherPlans.length];
      const blocker = checkout ? BLOCKERS[customerIndex][ordinal] : 'none';
      const productId = checkout ? 'product:checkout' : `product:${plan.theme}`;
      let outcome: SessionRecord['outcome'];
      let events: SessionEvent[];
      if (checkout) { outcome = blocker === 'none' ? 'completed' : 'abandoned'; events = checkoutEvents(blocker); }
      else if (plan.theme === 'activation') {
        outcome = plan.stance === 'supports' ? 'abandoned' : plan.stance === 'mixed' && ordinal === 4 ? 'active' : 'completed';
        events = [
          { offsetSeconds: 0, label: 'Opened Launch Workspace' },
          { offsetSeconds: 26, label: 'Created workspace draft' },
          { offsetSeconds: 54, label: 'Started workspace address setup', serviceId: 'service:addresses' },
          { offsetSeconds: 105, label: outcome === 'completed' ? 'Reached first configured workspace milestone' : outcome === 'abandoned' ? 'Explicitly exited setup before first milestone' : 'Observation ended during setup; no abandonment classified', serviceId: 'service:addresses' },
        ];
      } else {
        outcome = plan.stance === 'supports' ? 'active' : 'completed';
        events = [
          { offsetSeconds: 0, label: 'Opened Signal Console' },
          { offsetSeconds: 22, label: 'Inspected payment status', serviceId: 'service:payments' },
          { offsetSeconds: 47, label: 'Inspected address status', serviceId: 'service:addresses' },
          { offsetSeconds: 74, label: outcome === 'completed' ? 'Completed current-status review; interpretation assessed separately in interview' : 'Observation ended in status view; resolution and abandonment unknown' },
        ];
      }
      const session: SessionRecord = {
        id: rowId('session', customerIndex, ordinal), customerId: customer.id,
        personId: checkout ? personId(customerIndex, ordinal < 2 ? 0 : 1) : plan.personId,
        productId, startedAt: new Date(Date.UTC(2026, 5, 3 + customerIndex * 3 + ordinal, 9 + ordinal, customerIndex * 7)).toISOString(),
        device: (customerIndex + ordinal) % 2 ? 'Mobile' : 'Desktop', events, outcome,
      };
      data.sessions.push(session);
      if (checkout) data.checkouts.push({
        id: rowId('checkout', customerIndex, ordinal), sessionId: session.id, productId,
        amount: 99 + customerIndex * 65 + ordinal * 40, status: blocker === 'none' ? 'completed' : 'abandoned', blocker, serviceId: SERVICE[blocker],
      });
    }
    plans[customerIndex].forEach((plan, ordinal) => {
      const candidates = data.sessions.filter(session => session.customerId === customer.id && session.personId === plan.personId && session.productId === `product:${plan.theme}`);
      const selected = plan.stance === 'mixed' ? candidates : candidates.filter(session => plan.stance === 'contradicts' ? session.outcome === 'completed' : session.outcome !== 'completed');
      data.interviews.push({
        id: rowId('interview', customerIndex, ordinal), personId: plan.personId, customerId: customer.id,
        productId: `product:${plan.theme}`, date: `2026-06-${24 + customerIndex % 3 * 2 + ordinal}`,
        theme: plan.theme, stance: plan.stance, quote: `Fictional interview: “${QUOTES[plan.theme][plan.stance]}”`, sessionIds: selected.map(session => session.id),
      });
    });
  });
  return data;
}

/** Normalize the same rows for linked inspection; aggregates never count expanded joins. */
export function buildEntityRecords(data: ConnectedDataset): EntityRecord[] {
  const records: EntityRecord[] = [];
  const sessions = new Map(data.sessions.map(session => [session.id, session]));
  const add = (record: Omit<EntityRecord, 'links'>) => records.push({ ...record, fields: [...record.fields, { label: 'Observation window', value: PERIOD }, { label: 'Source', value: SOURCE }], links: [] });
  for (const customer of data.customers) {
    const observed = data.sessions.filter(session => session.customerId === customer.id);
    const attempts = data.checkouts.filter(checkout => sessions.get(checkout.sessionId)?.customerId === customer.id);
    const completed = attempts.filter(checkout => checkout.status === 'completed').length;
    add({ id: customer.id, kind: 'customer', label: customer.name, summary: 'Fictional customer organization with linked product usage, checkout attempts, and interview evidence.',
      fields: [{ label: 'Segment', value: customer.segment }, { label: 'Annual contract value', value: money(customer.annualValue) }, { label: 'Observed sessions', value: String(observed.length) }, { label: 'Checkout attempts', value: String(attempts.length) }, { label: 'Completed / abandoned attempts', value: `${completed} / ${attempts.length - completed}` }, { label: 'Completion denominator', value: `${attempts.length} recorded checkout attempts; not sessions or people` }],
      evidence: [{ label: 'Observed checkout completion', text: `${completed} of ${attempts.length} attempts completed. Annual contract value is customer exposure, not checkout revenue or predicted loss.`, basis: 'Synthetic observation' }],
    });
  }
  for (const person of data.people) add({ id: person.id, kind: 'person', label: person.name, summary: person.customerId ? 'Fictional customer participant; sessions and interviews are linked individually.' : 'Fictional internal owner for follow-up actions.', fields: [{ label: 'Role', value: person.role }, { label: 'Relationship', value: person.customerId ? 'Customer contact' : 'Internal owner' }] });
  for (const product of data.products) add({ id: product.id, kind: 'product', label: product.name, summary: 'Fictional product with linked customers, runtime services, and observed sessions.', fields: [{ label: 'Observed sessions', value: String(data.sessions.filter(session => session.productId === product.id).length) }, { label: 'Customer organizations', value: String(data.customers.filter(customer => customer.productIds.includes(product.id)).length) }, { label: 'Checkout attempts', value: String(data.checkouts.filter(checkout => checkout.productId === product.id).length) }] });
  for (const service of data.services) {
    const touched = data.sessions.filter(session => session.events.some(event => event.serviceId === service.id));
    const blocked = data.checkouts.filter(checkout => checkout.status === 'abandoned' && checkout.serviceId === service.id);
    add({ id: service.id, kind: 'service', label: service.name, summary: 'Fictional service; a recorded blocker identifies an observed interruption, not a demonstrated root cause.', fields: [{ label: 'Sessions touching service', value: String(touched.length) }, { label: 'Abandoned checkout attempts with this blocker service', value: String(blocked.length) }, { label: 'Distinct customers with these abandoned attempts', value: String(new Set(blocked.map(checkout => sessions.get(checkout.sessionId)!.customerId)).size) }], evidence: [{ label: 'Recorded service exposure', text: `${touched.length} distinct sessions contain a service event; ${blocked.length} checkout attempts have an associated abandonment blocker. Repeated events do not create extra sessions.`, basis: 'Synthetic observation' }] });
  }
  for (const session of data.sessions) add({ id: session.id, kind: 'session', label: `${session.device} session · ${session.id.slice(8)}`, summary: 'Synthetic event sequence for one fictional participant in one product; timestamps and labels are authored fixture observations.', fields: [{ label: 'Started at', value: session.startedAt }, { label: 'Device', value: session.device }, { label: 'Observed outcome', value: session.outcome }, { label: 'Outcome interpretation', value: session.outcome === 'active' ? 'No terminal milestone or explicit abandonment observed; not classified as abandoned.' : 'Product-specific milestone completed or explicit exit observed.' }], timeline: session.events.map(event => ({ label: `+${event.offsetSeconds}s`, detail: event.label })), evidence: [{ label: 'Observation grain', text: 'One session belongs to one customer, one person, and one product. Service events are nested observations, not additional sessions.', basis: 'Synthetic observation' }] });
  for (const checkout of data.checkouts) add({ id: checkout.id, kind: 'checkout', label: `Checkout · ${checkout.id.slice(9)}`, summary: 'Synthetic checkout attempt tied to exactly one observed session.', fields: [{ label: 'Status', value: checkout.status }, { label: 'Recorded blocker', value: checkout.blocker }, { label: 'Checkout face value', value: money(checkout.amount) }, { label: 'Amount interpretation', value: 'Synthetic attempted amount; not booked revenue, margin, recoverable revenue, or predicted loss.' }], evidence: [{ label: 'Recorded outcome', text: checkout.status === 'completed' ? 'The session contains payment authorization and confirmation. No abandonment blocker is recorded.' : `The session ended without completion; its authored blocker label is ${checkout.blocker}. A service association alone does not prove the cause.`, basis: 'Synthetic observation' }] });
  for (const interview of data.interviews) add({ id: interview.id, kind: 'interview', label: `Fictional interview · ${interview.id.slice(10)}`, summary: `Fictional testimony that ${interview.stance === 'mixed' ? 'is mixed about' : interview.stance} the proposition: “${HYPOTHESES[interview.theme]}” Qualitative evidence, not a representative survey or causal finding.`, fields: [{ label: 'Date', value: interview.date }, { label: 'Theme', value: interview.theme }, { label: 'Theme proposition', value: HYPOTHESES[interview.theme] }, { label: 'Stance toward proposition', value: interview.stance }, { label: 'Referenced sessions', value: String(interview.sessionIds.length) }], evidence: [{ label: 'Fictional quotation', text: interview.quote, basis: 'Fictional interview' }] });

  const byId = new Map(records.map(record => [record.id, record]));
  const link = (from: string, to: string, forward: string, reverse: string) => {
    const a = byId.get(from), b = byId.get(to);
    if (!a || !b) throw new RangeError(`Connected record link has an unknown endpoint: ${from} → ${to}`);
    if (!a.links.some(item => item.id === to)) a.links.push({ id: to, label: `${forward} · ${b.label}` });
    if (!b.links.some(item => item.id === from)) b.links.push({ id: from, label: `${reverse} · ${a.label}` });
  };
  for (const customer of data.customers) {
    link(customer.id, customer.ownerId, 'Account owner', 'Owned customer');
    for (const productId of customer.productIds) link(customer.id, productId, 'Uses product', 'Customer');
  }
  for (const person of data.people) if (person.customerId) link(person.id, person.customerId, 'Customer', 'Contact');
  for (const product of data.products) {
    link(product.id, product.ownerId, 'Product owner', 'Owned product');
    for (const serviceId of product.serviceIds) link(product.id, serviceId, 'Runtime service', 'Product');
  }
  for (const service of data.services) link(service.id, service.ownerId, 'Service owner', 'Owned service');
  for (const session of data.sessions) {
    link(session.id, session.customerId, 'Customer', 'Observed session');
    link(session.id, session.personId, 'Participant', 'Observed session');
    link(session.id, session.productId, 'Product', 'Observed session');
    for (const event of session.events) if (event.serviceId) link(session.id, event.serviceId, 'Observed service', 'Observed session');
  }
  for (const checkout of data.checkouts) {
    const session = sessions.get(checkout.sessionId);
    if (!session) throw new RangeError(`Checkout references an unknown session: ${checkout.sessionId}`);
    link(checkout.id, session.id, 'Session timeline', 'Checkout attempt');
    link(checkout.id, session.customerId, 'Customer', 'Checkout attempt');
    link(checkout.id, session.personId, 'Participant', 'Checkout attempt');
    link(checkout.id, checkout.productId, 'Product', 'Checkout attempt');
    if (checkout.serviceId) link(checkout.id, checkout.serviceId, checkout.status === 'completed' ? 'Authorization service' : 'Recorded blocker service', 'Checkout attempt');
  }
  for (const interview of data.interviews) {
    link(interview.id, interview.customerId, 'Customer', 'Fictional interview');
    link(interview.id, interview.personId, 'Participant', 'Fictional interview');
    link(interview.id, interview.productId, 'Product', 'Fictional interview');
    for (const sessionId of interview.sessionIds) link(interview.id, sessionId, 'Referenced session', 'Fictional interview');
  }
  return records;
}
