import { collectPages, jsonConnector, type DataPage, type Field } from '../../packages/connectors/src/index.js';

export type Decision = 'conversion' | 'retention' | 'product';
export const segments = ['All accounts', 'Growth', 'Scale', 'Enterprise'] as const;
export type Segment = typeof segments[number];
export interface Account { id: string; name: string; segment: Exclude<Segment, 'All accounts'>; cohort: string; annualValue: number; renewalDays: number }
export interface Session { id: string; accountId: string; device: 'Mobile' | 'Desktop'; person: string }
export interface Checkout { id: string; sessionId: string; stage: number; amount: number; blocker: string }
export interface Usage { id: string; accountId: string; week: number; active: boolean; sessions: number }
export interface Ticket { id: string; accountId: string; status: 'open' | 'resolved'; topic: string }
export interface Interview { id: string; accountId: string; featureId: string; stance: 'supports' | 'mixed' | 'contradicts'; quote: string; person: string }
export interface Feature { id: string; name: string; effort: number; owner: string; metric: string; guardrail: string }
export interface OutcomeDataset { accounts: Account[]; sessions: Session[]; checkouts: Checkout[]; usage: Usage[]; tickets: Ticket[]; interviews: Interview[]; features: Feature[] }
export interface SourceReceipt { table: keyof OutcomeDataset; page: DataPage }
export const PERIOD = 'Fictional cohorts observed for 12 weeks · snapshot 30 June 2026';
export const palette = { conversion: '#c8f58c', retention: '#b6a5ff', product: '#f6b98a', negative: '#e797a2' };

/** Deliberately fictional joined records. No random values or third-party data. */
export function createOutcomeDataset(): OutcomeDataset {
  const names = ['Aster', 'Bramble', 'Cobalt', 'Drift', 'Ember', 'Fern', 'Grove', 'Harbor', 'Indigo', 'Juniper', 'Kite', 'Lumen'];
  const data: OutcomeDataset = { accounts: [], sessions: [], checkouts: [], usage: [], tickets: [], interviews: [], features: [
    { id: 'checkout', name: 'Resilient checkout', effort: 2, owner: 'Payments team', metric: 'Completed / started checkout attempts', guardrail: 'Duplicate charges and payment errors must not increase.' },
    { id: 'activation', name: 'Guided first workspace', effort: 4, owner: 'Activation team', metric: 'New accounts reaching first workspace milestone within 7 days', guardrail: 'Track setup time and support contacts alongside activation.' },
    { id: 'visibility', name: 'Explainable service status', effort: 3, owner: 'Product insights team', metric: 'Correct status interpretations in a moderated task', guardrail: 'Measure false certainty and accessibility failures.' },
  ] };
  for (let i = 0; i < 36; i++) {
    const id = `acct-${String(i + 1).padStart(3, '0')}`, segment = segments[1 + Math.floor(i / 12)] as Account['segment'];
    data.accounts.push({ id, name: `${names[i % 12]} ${['Studio', 'Works', 'Group'][Math.floor(i / 12)]}`, segment, cohort: ['January', 'February', 'March'][i % 3], annualValue: [12000, 42000, 144000][Math.floor(i / 12)] + (i % 4) * 3000, renewalDays: [7, 14, 21, 45, 62, 28][i % 6] });
    for (let j = 0; j < 4; j++) {
      const key = i * 4 + j, sessionId = `session-${key + 1}`, n = (i * 7 + j * 3) % 17;
      const stage = n < 2 ? 0 : n < 4 ? 1 : n < 8 ? 2 : 3;
      data.sessions.push({ id: sessionId, accountId: id, device: key % 3 ? 'Mobile' : 'Desktop', person: `Research participant ${i + 1}` });
      data.checkouts.push({ id: `checkout-${key + 1}`, sessionId, stage, amount: 70 + (key % 9) * 30, blocker: ['Cart exit', 'Address validation', 'Payment timeout', 'Completed'][stage] });
    }
    for (const week of [0, 4, 8, 12]) {
      const active = week === 0 || (i * 5 + Math.floor(week / 4) * 3) % 19 >= Math.floor(week / 3);
      const sessions = !active ? 0 : (i % 6 < 3 && week === 12 ? 2 + i % 3 : 14 + i % 11);
      data.usage.push({ id: `usage-${i}-${week}`, accountId: id, week, active, sessions });
    }
    if (i % 3 !== 2) data.tickets.push({ id: `ticket-${i + 1}`, accountId: id, status: i % 4 === 3 ? 'resolved' : 'open', topic: i % 2 ? 'Setup milestone unclear' : 'Intermittent payment timeout' });
    for (let j = 0; j < (i % 4 === 0 ? 2 : 1); j++) {
      const primary = (i * 5) % 11 < 5 ? 'checkout' : (i * 5) % 11 < 9 ? 'activation' : 'visibility';
      const featureId = j === 0 ? primary : ['checkout', 'activation', 'visibility'][(['checkout', 'activation', 'visibility'].indexOf(primary) + 1) % 3], stance = (['supports', 'supports', 'mixed', 'contradicts'] as const)[(i * 3 + j * 2) % 4];
      const quotes: Record<string, string[]> = {
        checkout: ['I retried payment because I could not tell if the first attempt completed.', 'A retry helped once, but another attempt still stalled.', 'My payment completed clearly; I do not need a different flow.'],
        activation: ['I needed help choosing the first workspace configuration.', 'The guide helped me start, but some options were already familiar.', 'I preferred configuring my workspace without a guided flow.'],
        visibility: ['I could see a warning, but not which service caused it.', 'The status view helped, though I still checked with support.', 'The existing status view already answered my question.'],
      };
      data.interviews.push({ id: `interview-${i + 1}-${j + 1}`, accountId: id, featureId, stance, quote: quotes[featureId][stance === 'supports' ? 0 : stance === 'mixed' ? 1 : 2], person: `Research participant ${i + 1}` });
    }
  }
  return data;
}

const sourceLabels: Record<keyof OutcomeDataset, string> = { accounts: 'CRM account snapshot', sessions: 'Web-session export', checkouts: 'Commerce attempt ledger', usage: 'Product-usage warehouse', tickets: 'Support-conversation export', interviews: 'Research interview sheet', features: 'Product initiative catalog' };
/** The public demos use actual JSON connectors; production source mappings are application-owned. */
export async function loadOutcomeDataset(): Promise<{ data: OutcomeDataset; receipts: SourceReceipt[] }> {
  const fixture = createOutcomeDataset();
  const receipts = await Promise.all((Object.keys(fixture) as (keyof OutcomeDataset)[]).map(async table => {
    const records = fixture[table] as unknown as Record<string, unknown>[], names = Object.keys(records[0]);
    const fields: Field[] = names.map(name => ({ name, type: typeof records[0][name] === 'number' ? 'integer' : typeof records[0][name] === 'boolean' ? 'boolean' : 'string' }));
    const connector = jsonConnector({ id: `motif-${table}`, source: sourceLabels[table], mode: 'fixture', fields, rows: records.map(record => names.map(name => record[name])) });
    return { table, page: await collectPages(connector, undefined, { limit: 25, maxRows: 1000 }) };
  }));
  const data = Object.fromEntries(receipts.map(({ table, page }) => {
    if (page.page.truncated) throw new Error(`Incomplete ${table} snapshot`);
    return [table, page.rows.map(row => Object.fromEntries(page.fields.map((field, i) => [field.name, row[i]])))];
  })) as unknown as OutcomeDataset;
  validateOutcomeDataset(data);
  return { data, receipts };
}

export function validateOutcomeDataset(data: OutcomeDataset): void {
  for (const rows of Object.values(data) as { id: string }[][]) if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate source IDs would change the join grain.');
  const accounts = new Set(data.accounts.map(row => row.id)), sessions = new Set(data.sessions.map(row => row.id)), features = new Set(data.features.map(row => row.id));
  for (const row of [...data.sessions, ...data.usage, ...data.tickets, ...data.interviews]) if (!accounts.has(row.accountId)) throw new Error('An account join is missing.');
  for (const row of data.checkouts) if (!sessions.has(row.sessionId) || !Number.isSafeInteger(row.amount) || row.amount < 0 || !Number.isInteger(row.stage) || row.stage < 0 || row.stage > 3) throw new Error('Invalid checkout source record.');
  for (const row of data.interviews) if (!features.has(row.featureId)) throw new Error('A product join is missing.');
  const usageKeys = data.usage.map(row => `${row.accountId}/${row.week}`);
  if (new Set(usageKeys).size !== usageKeys.length) throw new Error('Usage must have one account-week observation.');
  for (const account of data.accounts) for (const week of [0, 4, 8, 12]) if (!data.usage.some(row => row.accountId === account.id && row.week === week)) throw new Error('A mature cohort observation is missing.');
}
export function scopedAccounts(data: OutcomeDataset, segment: Segment): Account[] { return data.accounts.filter(account => segment === 'All accounts' || account.segment === segment); }
export function conversionModel(data: OutcomeDataset, segment: Segment, recovery: number) {
  if (!Number.isFinite(recovery) || recovery < 0 || recovery > 50) throw new Error('Recovery assumption must be 0–50%.');
  const accounts = scopedAccounts(data, segment), ids = new Set(accounts.map(row => row.id)), sessionAccount = new Map(data.sessions.filter(row => ids.has(row.accountId)).map(row => [row.id, row.accountId]));
  const attempts = data.checkouts.filter(row => sessionAccount.has(row.sessionId)), completed = attempts.filter(row => row.stage === 3), failed = attempts.filter(row => row.stage === 2);
  const exposure = failed.reduce((sum, row) => sum + row.amount, 0);
  return { accounts, attempts, completed, failed, exposure, rate: attempts.length ? completed.length / attempts.length : 0, stages: [0, 1, 2, 3].map(stage => attempts.filter(row => row.stage >= stage).length), modeledCompletions: failed.length * recovery / 100, modeledBasketValue: exposure * recovery / 100, review: accounts.filter(row => failed.some(attempt => sessionAccount.get(attempt.sessionId) === row.id)) };
}
export function retentionModel(data: OutcomeDataset, segment: Segment, coverage: number) {
  if (!Number.isFinite(coverage) || coverage < 0 || coverage > 100) throw new Error('Review coverage must be 0–100%.');
  const accounts = scopedAccounts(data, segment), at = (id: string, week: number) => data.usage.find(row => row.accountId === id && row.week === week)!;
  const review = accounts.filter(row => row.renewalDays <= 30 && at(row.id, 12).sessions < at(row.id, 8).sessions * .6 && data.tickets.some(ticket => ticket.accountId === row.id && ticket.status === 'open')).sort((a, b) => a.renewalDays - b.renewalDays || a.id.localeCompare(b.id));
  const queue = review.slice(0, Math.ceil(review.length * coverage / 100));
  const cohorts = ['January', 'February', 'March'].map(name => { const members = accounts.filter(row => row.cohort === name); return { name, members, counts: [0, 4, 8, 12].map(week => members.filter(row => at(row.id, week).active).length) }; });
  return { accounts, cohorts, review, queue, active: accounts.filter(row => at(row.id, 12).active).length, annualValue: queue.reduce((sum, row) => sum + row.annualValue, 0) };
}
export function productModel(data: OutcomeDataset, segment: Segment, capacity: number) {
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 6) throw new Error('Discovery capacity must be 1–6 weeks.');
  const accounts = scopedAccounts(data, segment), ids = new Set(accounts.map(row => row.id));
  return { accounts, initiatives: data.features.map(feature => {
    const evidence = data.interviews.filter(row => ids.has(row.accountId) && row.featureId === feature.id);
    return { ...feature, evidence, customers: new Set(evidence.map(row => row.accountId)).size, supporters: new Set(evidence.filter(row => row.stance === 'supports').map(row => row.accountId)).size, contradictions: evidence.filter(row => row.stance === 'contradicts').length, feasible: feature.effort <= capacity };
  }) };
}

export const decisionCopy = {
  conversion: { eyebrow: '01 / CONVERSION', title: 'Find the moment momentum breaks.', short: 'Conversion observatory', description: 'Follow checkout attempts from intent to completion. Inspect payment failures, then size a clearly labeled recovery scenario.', metric: 'Attempt completion', owner: 'Payments team', guardrail: 'No increase in duplicate charges, refunds, or payment error rate.', next: 'Instrument retry states, prototype a resumable checkout, then run a randomized test with a fixed observation window.' },
  retention: { eyebrow: '02 / RETENTION', title: 'See the accounts behind the curve.', short: 'Retention horizon', description: 'Connect mature usage cohorts to upcoming renewals and open support conversations. Build a review queue from observed signals.', metric: 'Week-12 active accounts', owner: 'Customer success team', guardrail: 'Track outreach burden and complaints. Never treat a review flag as a churn prediction.', next: 'Review the linked support history with each owner, confirm the account’s context, and measure response and next-period usage.' },
  product: { eyebrow: '03 / PRODUCT DECISIONS', title: 'Give the roadmap an evidence trail.', short: 'Opportunity constellation', description: 'Bring customer requests, counter-evidence, and estimated effort into one decision. Pick the next question to investigate.', metric: 'Distinct interviewed accounts', owner: 'Product research team', guardrail: 'Recruit beyond the existing interview sample and preserve contradictory findings.', next: 'Recruit a balanced research sample, define a falsifiable prototype task, and test the selected hypothesis before committing delivery capacity.' },
};

export function decisionBrief(data: OutcomeDataset, decision: Decision, segment: Segment, scenario: number, selectedId: string): string {
  const copy = decisionCopy[decision], conversion = conversionModel(data, segment, decision === 'conversion' ? scenario : 25), retention = retentionModel(data, segment, decision === 'retention' ? scenario : 100), product = productModel(data, segment, decision === 'product' ? scenario : 3);
  const initiative = decision === 'product' ? product.initiatives.find(row => row.id === selectedId) : undefined;
  if (decision === 'product' && !initiative) throw new Error('Select a product initiative before creating its brief.');
  const baseline = decision === 'conversion' ? `${conversion.completed.length}/${conversion.attempts.length} attempts completed; ${conversion.failed.length} payment-timeout attempts with ${conversion.exposure} USD attempted basket value.` : decision === 'retention' ? `${retention.active}/${retention.accounts.length} accounts active at week 12; ${retention.review.length} meet the review rule.` : `${initiative!.name}: ${initiative!.customers} distinct interviewed accounts, ${initiative!.supporters} supporting accounts, ${initiative!.contradictions} contradicting interviews, ${initiative!.effort} estimated weeks.\nEvidence IDs: ${initiative!.evidence.map(row => row.id).join(', ')}.\nAccount IDs: ${[...new Set(initiative!.evidence.map(row => row.accountId))].join(', ')}.`;
  const assumption = decision === 'conversion' ? `${scenario}% of payment-timeout attempts assumed to complete: ${conversion.modeledCompletions.toFixed(1)} additional expected completions and ${conversion.modeledBasketValue.toFixed(2)} USD attempted basket value. These are modeled, not observed or causal estimates.` : decision === 'retention' ? `${scenario}% review coverage selects ${retention.queue.length} accounts, with ${retention.annualValue} USD annual contract value as context. This is not revenue predicted to churn or be recovered.` : `${scenario} weeks discovery capacity. Effort estimates are fictional planning assumptions; request counts are not predicted impact.`;
  return `# Motif · ${copy.short}\n\nStatus: proposed investigation, not an executed action.\n\nData: entirely fictional JSON snapshots. ${PERIOD}.\nSegment: ${segment}. Selected record: ${selectedId}.\n\n## Observed baseline\n${baseline}\n\n## Scenario / planning assumptions\n${assumption}\n\n## Proposed owner\n${initiative?.owner ?? copy.owner}\n\n## Next action\n${copy.next}\n\n## Primary measure\n${initiative?.metric ?? copy.metric}\n\n## Guardrail\n${initiative?.guardrail ?? copy.guardrail}\n\n## Source and grain\nAccounts join sessions by accountId; checkouts join sessions by sessionId. Usage has one observation per account/week. Interviews are qualitative and may repeat an account. No live provider account was queried; the demo uses the Motif JSON connector. Define your own authorized source mappings before connecting production data.\n`;
}
