import type { FiveApp } from '../../src/index.js';
import type { OutcomeExplorer, EntityRecord, OutcomeView } from '../connected/types.js';
import { investigationBrief, type BriefItem } from '../connected/brief.js';
import { bindEntityPicking } from '../connected/picking.js';
import { downloadBlob } from './runtime.js';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
  const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node;
};
const actionButton = (label: string, handler: () => void, className?: string) => {
  const button = element('button', label, className); button.type = 'button'; button.addEventListener('click', handler); return button;
};
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const kinds = ['customer', 'product', 'service', 'person', 'interview', 'session', 'checkout'];

/** UI adapter for the shared example contract. It never writes to an external system. */
export function mountOutcomeUI(title: string, explorer: OutcomeExplorer, app: FiveApp): () => void {
  const dialog = get('viewer'), aside = document.querySelector<HTMLElement>('.example-info')!;
  const heading = get('outcome-heading'), tabs = get('outcome-tabs'), inspector = get('record-inspector'), workspace = get('outcome-workspace'), tooltip = get('entity-tooltip');
  const settings = [...aside.children].filter(child => child !== tabs && child !== inspector) as HTMLElement[];
  const originalHidden = new Map(settings.map(node => [node, node.hidden]));
  const index = new Map(explorer.records.map(record => [record.id, record]));
  const brief = new Map<string, BriefItem>(), pinned = new Set<string>();
  const history: string[] = []; let lastSelected: string | null = null, goingBack = false, mode: 'inspect' | 'scenario' = 'inspect';
  let previousView = '', allRecords = false, disposed = false;
  dialog.classList.add('connected'); heading.hidden = tabs.hidden = inspector.hidden = workspace.hidden = false;
  const stageHint = document.querySelector<HTMLElement>('.stage-top span:last-child')!;
  const oldHint = stageHint.textContent; stageHint.textContent = 'SELECT A NODE TO INSPECT · DRAG TO ORBIT';

  tabs.replaceChildren(); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Example sidebar');
  const inspectTab = actionButton('Inspect record', () => switchMode('inspect'));
  const scenarioTab = actionButton('Scenario & display', () => switchMode('scenario'));
  inspectTab.setAttribute('role', 'tab'); scenarioTab.setAttribute('role', 'tab');
  inspectTab.id = 'inspect-record-tab'; scenarioTab.id = 'scenario-display-tab';
  inspectTab.setAttribute('aria-controls', inspector.id);
  inspector.setAttribute('role', 'tabpanel'); inspector.setAttribute('aria-labelledby', inspectTab.id);
  const scenarioPanel = element('section'); scenarioPanel.id = 'scenario-panel';
  scenarioPanel.setAttribute('role', 'tabpanel'); scenarioPanel.setAttribute('aria-labelledby', scenarioTab.id);
  scenarioTab.setAttribute('aria-controls', scenarioPanel.id);
  scenarioPanel.append(...settings); aside.append(scenarioPanel);
  tabs.append(inspectTab, scenarioTab);
  function switchMode(next: typeof mode) {
    mode = next; inspector.hidden = mode !== 'inspect'; scenarioPanel.hidden = mode !== 'scenario';
    for (const node of settings) node.hidden = mode === 'inspect' || Boolean(originalHidden.get(node));
    inspectTab.setAttribute('aria-selected', String(mode === 'inspect')); scenarioTab.setAttribute('aria-selected', String(mode === 'scenario'));
    inspectTab.tabIndex = mode === 'inspect' ? 0 : -1; scenarioTab.tabIndex = mode === 'scenario' ? 0 : -1;
  }
  for (const tab of [inspectTab, scenarioTab]) tab.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); switchMode(event.key === 'Home' ? 'inspect' : event.key === 'End' ? 'scenario' : mode === 'inspect' ? 'scenario' : 'inspect');
      (mode === 'inspect' ? inspectTab : scenarioTab).focus();
    }
  });
  switchMode('inspect');

  workspace.replaceChildren();
  const recordArea = element('section', undefined, 'outcome-records'), actionArea = element('section', undefined, 'outcome-actions');
  recordArea.setAttribute('aria-label', 'Linked records'); actionArea.setAttribute('aria-label', 'Proposed actions');
  recordArea.append(element('div', '01 / INVESTIGATE', 'eyebrow'), element('h3', 'Follow the evidence'));
  const tools = element('div', undefined, 'record-tools');
  const search = element('input'); search.type = 'search'; search.placeholder = 'Search records…'; search.setAttribute('aria-label', 'Search linked records'); search.id = 'entity-search';
  const kind = element('select'); kind.setAttribute('aria-label', 'Record type'); kind.id = 'entity-kind';
  const allKind = element('option', 'All record types'); allKind.value = ''; kind.append(allKind);
  for (const name of kinds) { const option = element('option', name[0].toUpperCase() + name.slice(1)); option.value = name; kind.append(option); }
  const browse = actionButton('Browse all 99 records', () => { allRecords = !allRecords; kind.value = ''; renderRecords(explorer.view()); });
  browse.id = 'browse-all-entities';
  const count = element('p', undefined, 'record-count'); count.setAttribute('role', 'status');
  const list = element('div', undefined, 'record-list'); list.id = 'entity-list';
  tools.append(search, kind); recordArea.append(tools, browse, count, list);
  search.addEventListener('input', () => renderRecords(explorer.view())); kind.addEventListener('change', () => { if (kind.value) allRecords = true; renderRecords(explorer.view()); });
  actionArea.append(element('div', '02 / DESIGN THE NEXT STEP', 'eyebrow'), element('h3', 'Propose a measurable action'));
  const actions = element('div', undefined, 'action-list'); actions.id = 'outcome-actions';
  actionArea.append(actions);
  const briefBar = element('section', undefined, 'brief-bar'); briefBar.setAttribute('aria-label', 'Investigation brief');
  const briefStatus = element('span'); briefStatus.id = 'brief-status'; briefStatus.setAttribute('role', 'status');
  const download = actionButton('Download investigation brief', () => {
    downloadBlob(new Blob([investigationBrief(title, [...brief.values()], explorer.records, [...pinned])], { type: 'text/markdown;charset=utf-8' }), `5js-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-brief.md`);
  }, 'brief-download'); download.id = 'download-brief';
  const clear = actionButton('Clear brief', () => { brief.clear(); pinned.clear(); renderActions(explorer.view()); renderInspector(); updateBrief(); }); clear.id = 'clear-brief';
  const note = element('small', 'Brief items keep the evidence, scope, and assumptions you selected. This demo creates a local file; it does not contact customers or create tasks.');
  briefBar.append(briefStatus, download, clear, note);
  workspace.append(recordArea, actionArea, briefBar);

  function updateBrief() {
    briefStatus.textContent = `${brief.size} proposed ${brief.size === 1 ? 'action' : 'actions'} · ${pinned.size} pinned ${pinned.size === 1 ? 'record' : 'records'}`;
    download.disabled = !brief.size && !pinned.size; clear.disabled = download.disabled;
  }
  function revealInspector() {
    switchMode('inspect'); aside.scrollTop = 0;
    inspector.querySelector<HTMLElement>('#record-title')?.focus({ preventScroll: true });
    const destination = window.innerWidth <= 760 ? inspector : document.querySelector<HTMLElement>('.viewer-content')!;
    destination.scrollIntoView({ block: 'start' });
  }
  function select(id: string) { explorer.select(id); revealInspector(); }
  function linkedButton(record: EntityRecord, label?: string) {
    const button = actionButton(label ?? record.label, () => select(record.id)); button.dataset.entityId = record.id;
    button.title = `${record.kind}: ${record.label}`; return button;
  }
  function renderRecords(view: OutcomeView) {
    const candidateMap = new Map(view.candidates.map(candidate => [candidate.entityId, candidate]));
    const source = allRecords ? explorer.records : view.candidates.map(candidate => index.get(candidate.entityId)!).filter(Boolean);
    const query = search.value.toLocaleLowerCase().trim();
    const rows = source.filter(record => (!kind.value || record.kind === kind.value) && `${record.label} ${record.id} ${record.kind} ${record.summary}`.toLocaleLowerCase().includes(query));
    browse.textContent = allRecords ? 'Return to priority records' : `Browse all ${explorer.records.length} records`;
    browse.setAttribute('aria-pressed', String(allRecords));
    count.textContent = `${rows.length} ${rows.length === 1 ? 'record' : 'records'} · ${allRecords ? 'full fictional dataset; scene filters do not hide related evidence' : 'current scenario priorities'}`;
    list.replaceChildren();
    for (const record of rows) {
      const button = linkedButton(record); button.className = 'entity-row';
      button.replaceChildren(element('span', record.kind, `entity-kind kind-${record.kind}`), element('strong', record.label));
      const candidate = candidateMap.get(record.id);
      button.append(element('small', candidate?.reason ?? record.summary));
      if (candidate) button.append(element('span', candidate.measure, 'entity-measure'));
      list.append(button);
    }
    if (!rows.length) list.append(element('p', 'No records match this view. Broaden the scenario or search.', 'empty-records'));
    updateSelectedRows();
  }
  function updateSelectedRows() {
    for (const button of list.querySelectorAll<HTMLButtonElement>('[data-entity-id]')) button.setAttribute('aria-pressed', String(button.dataset.entityId === explorer.selectedId));
  }
  function renderInspector() {
    inspector.replaceChildren(); const record = explorer.selectedId ? index.get(explorer.selectedId) : undefined;
    inspector.dataset.entityId = record?.id ?? '';
    if (!record) { inspector.append(element('h3', 'No records in this cohort'), element('p', 'Broaden the scenario to inspect evidence and propose an action.')); return; }
    const top = element('div', undefined, 'inspector-top');
    if (history.length) top.append(actionButton('← Back', () => { const prior = history.pop()!; goingBack = true; select(prior); goingBack = false; }));
    top.append(element('span', record.kind, `entity-kind kind-${record.kind}`)); inspector.append(top);
    const title = element('h3', record.label); title.id = 'record-title'; title.tabIndex = -1;
    inspector.append(title, element('code', record.id, 'record-id'), element('p', record.summary, 'record-summary'));
    const pin = actionButton(pinned.has(record.id) ? 'Unpin evidence' : 'Pin as evidence', () => {
      if (pinned.has(record.id)) pinned.delete(record.id); else pinned.add(record.id);
      pin.textContent = pinned.has(record.id) ? 'Unpin evidence' : 'Pin as evidence'; pin.setAttribute('aria-pressed', String(pinned.has(record.id))); updateBrief();
    }, 'pin-evidence'); pin.setAttribute('aria-pressed', String(pinned.has(record.id))); pin.id = 'pin-evidence'; inspector.append(pin);
    for (const evidence of record.evidence ?? []) {
      const block = element('section', undefined, 'record-evidence');
      block.append(element('span', evidence.basis, 'evidence-basis'), element('h4', evidence.label), element('p', evidence.text)); inspector.append(block);
    }
    if (record.timeline?.length) {
      inspector.append(element('h4', 'Session timeline'));
      const timeline = element('ol', undefined, 'session-timeline');
      for (const event of record.timeline) { const row = element('li'); row.append(element('time', event.label), element('span', event.detail)); timeline.append(row); }
      inspector.append(timeline);
    }
    const fields = element('dl', undefined, 'record-fields');
    for (const field of record.fields) fields.append(element('dt', field.label), element('dd', field.value));
    inspector.append(fields, element('h4', `Linked records · ${record.links.length}`));
    const links = element('div', undefined, 'record-links');
    for (const relation of record.links) { const related = index.get(relation.id); if (related) links.append(linkedButton(related, relation.label)); }
    inspector.append(links);
  }
  function renderActions(view: OutcomeView) {
    actions.replaceChildren();
    for (const action of view.actions) {
      const card = element('article', undefined, 'outcome-action'); card.dataset.actionId = action.id;
      card.append(element('span', 'PROPOSED TEST / INVESTIGATION', 'eyebrow'), element('h4', action.title), element('p', action.rationale));
      const owner = index.get(action.ownerId);
      if (owner) { const ownerRow = element('div', undefined, 'action-owner'); ownerRow.append(element('span', 'Proposed owner'), linkedButton(owner)); card.append(ownerRow); }
      const details = element('dl', undefined, 'action-measures');
      for (const [name, value] of [['Measure', action.metric], ['Observed baseline', action.baseline], ['Success criterion', action.success], ['Guardrail', action.guardrail]]) details.append(element('dt', name), element('dd', value));
      card.append(details, element('p', action.caveat, 'action-caveat'));
      const evidence = element('div', undefined, 'action-evidence'); evidence.append(element('span', `${action.evidenceIds.length} evidence records`));
      for (const id of action.evidenceIds) { const record = index.get(id); if (record) evidence.append(linkedButton(record)); }
      const evidenceDetails = element('details'); evidenceDetails.append(element('summary', 'Inspect supporting and conflicting evidence'), evidence); card.append(evidenceDetails);
      const current: BriefItem = { question: view.question, scope: view.scope, action };
      const state = () => { const saved = brief.get(action.id); return !saved ? 'Add to brief' : JSON.stringify(saved) === JSON.stringify(current) ? 'Remove from brief' : 'Update brief with this scope'; };
      const add = actionButton(state(), () => {
        if (state() === 'Remove from brief') brief.delete(action.id);
        else brief.set(action.id, structuredClone(current));
        add.textContent = state(); add.setAttribute('aria-pressed', String(brief.has(action.id))); updateBrief();
      }, 'add-to-brief'); add.dataset.actionId = action.id; add.setAttribute('aria-pressed', String(brief.has(action.id))); card.append(add);
      actions.append(card);
    }
    if (!view.actions.length) actions.append(element('p', 'No proposed action is supported by the current cohort. Broaden the scenario to inspect more records.', 'empty-records'));
  }
  function render() {
    if (disposed) return;
    const view = explorer.view(), signature = JSON.stringify(view);
    if (signature !== previousView) {
      previousView = signature;
      heading.replaceChildren(element('span', 'DECISION WORKFLOW · SYNTHETIC LINKED RECORDS', 'eyebrow'), element('h3', view.question), element('p', view.summary), element('small', view.scope));
      const explore = actionButton('Explore records & actions ↓', () => { workspace.scrollIntoView({ block: 'start' }); search.focus({ preventScroll: true }); }, 'outcome-jump');
      heading.append(explore);
      renderRecords(view); renderActions(view);
    }
    if (explorer.selectedId !== lastSelected) {
      if (!goingBack && lastSelected) history.push(lastSelected);
      lastSelected = explorer.selectedId; renderInspector(); aside.scrollTop = 0;
    }
    updateSelectedRows(); updateBrief();
  }
  // The initial empty cohort must still render its explanatory inspector.
  render(); if (lastSelected === null) renderInspector();
  const unsubscribe = explorer.subscribe(render), stopPicking = bindEntityPicking(app, explorer, tooltip, () => switchMode('inspect'));
  return () => {
    disposed = true; unsubscribe(); stopPicking();
    for (const node of settings) { node.hidden = Boolean(originalHidden.get(node)); aside.append(node); }
    scenarioPanel.remove();
    for (const host of [heading, tabs, inspector, workspace]) { host.hidden = true; host.replaceChildren(); }
    inspector.removeAttribute('data-entity-id'); dialog.classList.remove('connected'); stageHint.textContent = oldHint;
  };
}
