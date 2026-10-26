import type { EntityRecord, OutcomeAction } from './types.js';
export interface BriefItem { question: string; scope: string; action: OutcomeAction }
const plain = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+.!|>~]/g, '\\$&');

/** A reviewable local handoff; adding an item does not send messages or create external tasks. */
export function investigationBrief(title: string, items: readonly BriefItem[], records: readonly EntityRecord[], pinnedIds: readonly string[] = []): string {
  const index = new Map(records.map(record => [record.id, record]));
  const evidence = new Set([...items.flatMap(item => item.action.evidenceIds), ...pinnedIds]);
  for (const id of evidence) if (!index.has(id)) throw new RangeError(`Missing evidence: ${id}`);
  const lines = [`# ${plain(title)} — investigation brief`, '',
    'Synthetic demonstration. Customers, people, sessions, checkouts, and interviews are fictional. These are proposed investigations or tests, not completed actions or validated forecasts.', '',
    '## Proposed work', ''];
  items.forEach(({ question, scope, action }, i) => {
    const owner = index.get(action.ownerId);
    lines.push(`### ${i + 1}. ${plain(action.title)}`, '',
      `**Decision:** ${plain(question)}`, `**Scope at selection:** ${plain(scope)}`, `**Proposed owner:** ${plain(owner?.label ?? action.ownerId)}`, '',
      plain(action.rationale), '', `- Measure: ${plain(action.metric)}`, `- Observed baseline: ${plain(action.baseline)}`,
      `- Proposed success criterion: ${plain(action.success)}`, `- Guardrail: ${plain(action.guardrail)}`,
      `- Limits / assumptions: ${plain(action.caveat)}`, `- Evidence IDs: ${action.evidenceIds.map(plain).join(', ')}`, '');
  });
  if (!items.length) lines.push('No proposed actions selected. The records below are an evidence collection.', '');
  if (pinnedIds.length) lines.push(`**Additional records selected:** ${pinnedIds.map(plain).join(', ')}`, '');
  lines.push('## Evidence records', '');
  for (const id of evidence) {
    const record = index.get(id)!;
    lines.push(`### ${plain(record.id)} · ${plain(record.label)} (${record.kind})`, '', plain(record.summary), '');
    for (const field of record.fields) lines.push(`- ${plain(field.label)}: ${plain(field.value)}`);
    for (const item of record.evidence ?? []) lines.push('', `**${plain(item.basis)} — ${plain(item.label)}**`, '', plain(item.text));
    for (const event of record.timeline ?? []) lines.push(`- ${plain(event.label)}: ${plain(event.detail)}`);
    lines.push('', `Linked IDs: ${record.links.map(link => plain(link.id)).join(', ')}`, '');
  }
  return lines.join('\n');
}
