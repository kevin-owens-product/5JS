import { Raycaster, Vector2 } from 'three';
import { createFive } from '../src/index.js';
import { connectorSlug } from '../connectors/paths.js';
import { connectorCatalog } from '../packages/connectors/src/catalog.js';
import { conversionModel, decisionBrief, decisionCopy, loadOutcomeDataset, palette, PERIOD, productModel, retentionModel, scopedAccounts, segments, type Decision, type OutcomeDataset, type Segment } from '../examples/outcomes/model.js';
import { createDecisionScene, type DecisionScene } from '../examples/outcomes/scene.js';
import './motif.css';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const escape = (value: unknown) => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const mark = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 25V7L16 20 28 7v18M4 15l12 12 12-12" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
const total = connectorCatalog.filter(item => item.status === 'implemented').length;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="site-header"><a class="motif-brand" href="./" aria-label="Motif home">${mark}<span>motif</span></a><nav aria-label="Main navigation"><a href="./examples/">Examples <span>50</span></a><a href="./connectors/">Connectors <span>45 guides</span></a><a href="./demo/playground.html">Playground</a><a class="github-link" href="https://github.com/kevin-owens-product/5JS">GitHub ↗</a></nav></header>
<main><section class="hero"><div class="hero-copy"><p class="eyebrow"><i></i> OPEN SOURCE VISUAL INTELLIGENCE</p><h1>Find the pattern.<br><em>Move the outcome.</em></h1><p class="hero-description">Connect the numbers to the people behind them. Motif turns data, relationships, and evidence into something you can explore—and act on.</p><div class="hero-actions"><a class="primary-link" href="#decision-lab">Explore the decision lab <span>↗</span></a><a class="secondary-link" href="./examples/">See every example →</a></div><p class="hero-footnote">TypeScript · Built on Three.js · MIT licensed · Experimental</p></div>
<div class="hero-map" aria-label="Source records connect through Motif to conversion, retention, and product decisions"><div class="map-orbit orbit-a"></div><div class="map-orbit orbit-b"></div><div class="map-orbit orbit-c"></div><svg class="map-lines" viewBox="0 0 540 390" preserveAspectRatio="none" aria-hidden="true"><path d="M75 63C175 63 150 194 270 194M56 190H270M90 316C160 316 175 194 270 194M270 194C370 194 370 77 463 77M270 194H480M270 194C370 194 370 316 463 316"/></svg><span class="source-dot source-a"><b>▦</b> Customers</span><span class="source-dot source-b"><b>⌁</b> Behavior</span><span class="source-dot source-c"><b>≋</b> Evidence</span><div class="map-center">${mark}<strong>motif</strong><small>MAKE THE CONNECTION</small></div><span class="outcome-dot outcome-a"><i></i> Conversion</span><span class="outcome-dot outcome-b"><i></i> Retention</span><span class="outcome-dot outcome-c"><i></i> Product</span><div class="map-caption">SOURCE → RELATIONSHIP → DECISION</div></div></section>
<section class="principles" aria-label="Motif capabilities"><div><span>01</span><strong>Connect the sources.</strong><p>Read databases, warehouses, and data tools through one typed contract.</p></div><div><span>02</span><strong>Follow the evidence.</strong><p>Move from a visual pattern to customers, sessions, checkouts, and interviews.</p></div><div><span>03</span><strong>Make a decision.</strong><p>Build an investigation with an owner, baseline, next step, and guardrail.</p></div></section>
<section class="decision-lab" id="decision-lab" aria-labelledby="lab-title"><div class="section-heading"><div><p class="eyebrow">THE DECISION LAB</p><h2 id="lab-title">A view worth doing something about.</h2></div><span class="fixture-badge">FICTIONAL DATA · LOCAL JSON CONNECTORS</span></div><div class="decision-tabs" role="group" aria-label="Choose an outcome">${(['conversion', 'retention', 'product'] as Decision[]).map((id, i) => `<button data-decision="${id}" aria-pressed="${i === 0}" style="--tab-accent:${palette[id]}"><span>0${i + 1}</span>${decisionCopy[id].short}<b>↗</b></button>`).join('')}</div>
<div class="decision-heading"><div><p class="eyebrow" id="decision-eyebrow"></p><h3 id="decision-title"></h3><p id="decision-description"></p></div><label class="segment-label" for="segment">Account segment<select id="segment">${segments.map(segment => `<option>${segment}</option>`).join('')}</select></label></div>
<div class="metrics-grid" id="decision-metrics" aria-live="polite"></div>
<div class="lab-grid"><section class="lab-view"><div class="view-toolbar"><span><i></i> CONNECTED EVIDENCE</span><div><button id="motion" aria-label="Pause scene motion">Pause motion</button><button id="camera">Reset view ↺</button></div></div><div class="spatial-view" id="spatial-view" aria-label="Interactive spatial view. Drag to orbit; select a point to inspect its record."></div><div class="scene-fallback" id="scene-fallback" hidden>3D rendering is unavailable. All records, calculations, controls, and decision briefs remain available below.</div><div class="scene-hint">DRAG TO ORBIT · SELECT A POINT TO FOLLOW ITS RECORD</div><div class="encoding" id="encoding"></div><div class="stage-readout" id="stage-readout"></div></section>
<aside class="evidence-panel" aria-label="Source record inspector"><p class="eyebrow">THE RECORD BEHIND THE PATTERN</p><label for="initiative" id="initiative-label" hidden>Product initiative</label><select id="initiative" hidden></select><label for="record">Inspect an account</label><select id="record"></select><div id="account-evidence"></div></aside></div>
<div class="decision-bottom"><section class="scenario-panel"><p class="eyebrow" id="scenario-kind">EXPLICIT SCENARIO ASSUMPTION</p><div class="scenario-title"><label for="scenario" id="scenario-label"></label><output for="scenario" id="scenario-value"></output></div><input type="range" id="scenario"><p id="scenario-description"></p><p class="scenario-result" id="scenario-result" aria-live="polite"></p></section><section class="action-panel"><p class="eyebrow">FROM OBSERVATION TO ACTION</p><h4 id="action-title"></h4><p id="action-description"></p><button id="build-brief">Build an investigation brief <span>↗</span></button></section></div>
<details class="source-receipts"><summary>Inspect the source contract, joins, and completeness <span id="source-count"></span></summary><p>These examples read seven fictional snapshots through the Motif JSON connector. They do not connect to live provider accounts. Production use requires authorized source queries and explicit schema mappings.</p><div id="source-receipts"></div><p class="source-rule">Grain: one account; one web session; one checkout attempt; one usage observation per account/week; one support conversation; one interview; one initiative. Account IDs and session IDs define joins. An interview count is not an independent-account count.</p></details><p id="load-status" role="status">Loading the source snapshots…</p></section>
<section class="connector-section" id="connectors"><div class="section-heading"><div><p class="eyebrow">MEET YOUR DATA WHERE IT LIVES</p><h2>Many sources.<br>One way to explore.</h2></div><div class="connector-intro"><p><strong>${total} implemented catalog entries.</strong> Server adapters keep credentials with your application. Visualizations receive typed records, source provenance, and explicit completeness.</p><p class="muted">Scopes are specific. Protocol tests are not live-account certification.</p></div></div><label class="connector-search" for="connector-search">Find a connector<input id="connector-search" type="search" placeholder="Try PostgreSQL, Shopify, or Google Sheets…"></label><div class="connector-grid" id="connector-grid"></div><p id="connector-count" role="status"></p><a class="secondary-link" href="./connectors/">Explore all 45 connector guides ↗</a></section>
<section class="closing"><p class="eyebrow">BUILD SOMETHING WORTH UNDERSTANDING</p><h2>Your data has a story.<br><em>Make it useful.</em></h2><a class="primary-link" href="./examples/">Explore the example library ↗</a></section></main>
<footer class="site-footer"><a class="motif-brand" href="./">${mark}<span>motif</span></a><p>Open source. Open possibilities.</p><div><a href="./LICENSE">MIT license</a><a href="./THIRD_PARTY_NOTICES.md">Third-party notices</a><a href="https://github.com/kevin-owens-product/5JS">Source ↗</a></div></footer>
<dialog class="detail-dialog" id="detail-dialog" aria-labelledby="detail-title"><header><div><p class="eyebrow">SOURCE RECORD · FICTIONAL</p><h2 id="detail-title" tabindex="-1"></h2></div><button id="detail-back" hidden>← Back</button><button id="close-detail" aria-label="Close record">×</button></header><div id="detail-body"></div></dialog>
<dialog class="brief-dialog" id="brief-dialog" aria-labelledby="brief-title"><header><div><p class="eyebrow">PROPOSED INVESTIGATION</p><h2 id="brief-title">An evidence trail you can take with you.</h2></div><button id="close-brief" aria-label="Close brief">×</button></header><p>This creates a local brief. It does not contact customers, assign work, or change a source system.</p><pre id="brief-content" tabindex="0"></pre><button class="primary-link" id="download-brief">Download Markdown brief ↓</button></dialog>`;

let data: OutcomeDataset, decision: Decision = 'conversion', segment: Segment = 'All accounts', scenario = 25, selected = '', featureId = 'checkout';
let scene: DecisionScene | undefined, app: ReturnType<typeof createFive> | undefined;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let paused = reduced, brief = '';
const detailHistory: {table: keyof OutcomeDataset; id: string}[] = [];
function metrics(items: [string, string, string][]) { $('decision-metrics').innerHTML = items.map(([label, value, detail]) => `<div class="metric-card"><span>${escape(label)}</span><strong>${escape(value)}</strong><small>${escape(detail)}</small></div>`).join(''); }
function render() {
  const copy = decisionCopy[decision], accounts = scopedAccounts(data, segment), account = accounts.find(item => item.id === selected) ?? accounts[0]; selected = account?.id ?? '';
  document.documentElement.style.setProperty('--decision-accent', palette[decision]);
  document.querySelectorAll<HTMLButtonElement>('[data-decision]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.decision === decision)));
  $('decision-eyebrow').textContent = copy.eyebrow; $('decision-title').textContent = copy.title; $('decision-description').textContent = copy.description;
  $('record').innerHTML = accounts.map(row => `<option value="${escape(row.id)}">${escape(row.name)}</option>`).join(''); ($('record') as HTMLSelectElement).value = selected;
  $('initiative').hidden = $('initiative-label').hidden = decision !== 'product';
  $('initiative').innerHTML = data.features.map(row => `<option value="${row.id}">${row.name}</option>`).join(''); ($('initiative') as HTMLSelectElement).value = featureId;
  const slider = $('scenario') as HTMLInputElement; slider.min = decision === 'product' ? '1' : '0'; slider.max = decision === 'conversion' ? '50' : decision === 'retention' ? '100' : '6'; slider.step = decision === 'product' ? '1' : '5'; slider.value = String(scenario);
  $('scenario-value').textContent = `${scenario}${decision === 'product' ? ' weeks' : '%'}`;
  if (decision === 'conversion') {
    const model = conversionModel(data, segment, scenario);
    metrics([['Observed completion', pct(model.rate), `${model.completed.length} / ${model.attempts.length} attempts`], ['Payment timeouts', String(model.failed.length), `${model.review.length} distinct accounts`], ['Attempted basket value', money(model.exposure), 'Failed-payment attempts; not lost revenue'], ['Modeled extra completions', model.modeledCompletions.toFixed(1), `Assuming ${scenario}% of timeout attempts recover`]]);
    $('encoding').textContent = 'Gate area represents attempts reaching each stage. Paths are individual attempts; coral branches are recorded exits. Motion is a reading aid, not event timing.';
    $('stage-readout').innerHTML = ['Started', 'Address reached', 'Payment reached', 'Completed'].map((name, i) => `<div><small>${name}</small><b>${model.stages[i]}</b><span>${pct(model.stages[i] / Math.max(1, model.attempts.length))} of starts</span></div>`).join('');
    $('scenario-kind').textContent = 'EXPLICIT SCENARIO ASSUMPTION'; $('scenario-label').textContent = 'Assumed recovery of payment-timeout attempts';
    $('scenario-description').textContent = 'Apply an assumed recovery rate only to observed payment-timeout attempts. The recorded funnel stays unchanged.';
    $('scenario-result').textContent = `${model.modeledCompletions.toFixed(1)} modeled additional completions · ${money(model.modeledBasketValue)} attempted basket value. Not a forecast or causal estimate.`;
    $('action-title').textContent = 'Test a checkout that can recover.';
  } else if (decision === 'retention') {
    const model = retentionModel(data, segment, scenario);
    metrics([['Week-12 active', pct(model.active / Math.max(1, model.accounts.length)), `${model.active} / ${model.accounts.length} mature accounts`], ['Review signals', String(model.review.length), 'Renewal ≤30 days, usage drop >40%, open support'], ['Selected review queue', String(model.queue.length), `${scenario}% coverage of the review set`], ['Annual value in queue', money(model.annualValue), 'Contract context; not predicted churn']]);
    $('encoding').textContent = 'Ribbons show observed active-account shares at weeks 0, 4, 8, and 12. Ground markers are accounts; amber marks the selected review queue. Cohorts have complete observation windows; tracers guide reading and do not create observations.';
    $('stage-readout').innerHTML = model.cohorts.map(cohort => `<div><small>${cohort.name} · ${cohort.members.length} accounts</small><b>${pct(cohort.counts[3] / Math.max(1, cohort.members.length))}</b><span>W0 → 4 → 8 → 12: ${cohort.counts.join(' → ')}</span></div>`).join('');
    $('scenario-kind').textContent = 'OPERATIONAL PLANNING'; $('scenario-label').textContent = 'Review coverage'; $('scenario-description').textContent = 'Prioritize accounts with the nearest renewal first. Coverage changes the work queue, not observed retention.';
    $('scenario-result').textContent = model.queue.length ? `Review: ${model.queue.map(row => row.name).join(', ')}. These signals require human investigation.` : 'No accounts selected for review at this coverage.';
    $('action-title').textContent = 'Make the next conversation informed.';
  } else {
    const model = productModel(data, segment, scenario), initiative = model.initiatives.find(row => row.id === featureId)!;
    metrics([['Interviewed accounts', String(initiative.customers), 'Distinct accounts for the selected initiative'], ['Supporting accounts', String(initiative.supporters), 'Qualitative support; not purchase intent'], ['Contradicting interviews', String(initiative.contradictions), 'Counter-evidence stays visible'], ['Estimated discovery', `${initiative.effort} weeks`, initiative.feasible ? 'Within the planning capacity' : 'Exceeds the planning capacity']]);
    $('encoding').textContent = 'Clusters are initiatives: right = more distinct interviewed accounts; up = more estimated weeks. Satellite points are interviews; coral = contradicts, sand = mixed. Space within a cluster and tracer timing have no metric meaning.';
    $('stage-readout').innerHTML = model.initiatives.map(row => `<button class="initiative-card" data-feature="${row.id}" aria-pressed="${featureId === row.id}"><small>${row.name}</small><b>${row.customers} accounts</b><span>${row.effort} estimated weeks · ${row.contradictions} contradicting</span></button>`).join('');
    $('scenario-kind').textContent = 'PLANNING ASSUMPTION'; $('scenario-label').textContent = 'Discovery capacity'; $('scenario-description').textContent = 'Compare explicitly fictional effort estimates with your capacity. Interview counts are evidence coverage, not impact forecasts.';
    $('scenario-result').textContent = `${initiative.name}: ${initiative.feasible ? 'scope fits' : 'narrow the scope to fit'} ${scenario} weeks. Recruit a broader sample before deciding to ship.`;
    $('action-title').textContent = `Investigate ${initiative.name.toLowerCase()}.`;
  }
  $('action-description').textContent = copy.next;
  if (scene) { scene.configure(decision, segment, scenario); scene.select(selected); }
  renderAccount();
  $('load-status').textContent = `${PERIOD} · All seven source snapshots complete.`;
}
function renderAccount() {
  const account = data.accounts.find(row => row.id === selected); if (!account) return;
  const sessions = data.sessions.filter(row => row.accountId === account.id), sessionIds = new Set(sessions.map(row => row.id)), attempts = data.checkouts.filter(row => sessionIds.has(row.sessionId)), tickets = data.tickets.filter(row => row.accountId === account.id), interviews = data.interviews.filter(row => row.accountId === account.id && row.featureId === (decision === 'conversion' ? 'checkout' : decision === 'retention' ? 'activation' : featureId));
  const recent = data.usage.find(row => row.accountId === account.id && row.week === 12)!;
  const recordButton = (table: keyof OutcomeDataset, id: string, label: string) => `<button class="record-link" data-table="${table}" data-record="${escape(id)}">${escape(label)} <span>↗</span></button>`;
  $('account-evidence').innerHTML = `<div class="account-heading"><span>${escape(account.id)} · ${escape(account.segment)}</span><h4>${escape(account.name)}</h4></div><div class="account-facts"><div><small>Annual contract value</small><b>${money(account.annualValue)}</b></div><div><small>Next renewal</small><b>${account.renewalDays} days</b></div></div><p class="record-observation">${decision === 'conversion' ? `${attempts.filter(row => row.stage === 3).length} of ${attempts.length} attempts completed. ${attempts.filter(row => row.stage === 2).length} payment timeouts.` : decision === 'retention' ? `Week-12 status: ${recent.active ? 'active' : 'inactive'} · ${recent.sessions} sessions. ${tickets.filter(row => row.status === 'open').length} open support conversations.` : `${interviews.length} interviews linked to the selected initiative. Absence of testimony is not evidence against it.`}</p><div class="record-links">${recordButton('accounts', account.id, 'CRM account record')}${decision === 'conversion' ? attempts.map(row => recordButton('checkouts', row.id, `${row.blocker} · ${money(row.amount)}`)).join('') : decision === 'retention' ? data.usage.filter(row => row.accountId === account.id).map(row => recordButton('usage', row.id, `Week ${row.week} · ${row.sessions} sessions · ${row.active ? 'active' : 'inactive'}`)).join('') + tickets.map(row => recordButton('tickets', row.id, `${row.status} · ${row.topic}`)).join('') : recordButton('features', featureId, 'Initiative measure, owner and guardrail')}</div>${interviews.length ? interviews.map(row => `<blockquote><span class="stance">${escape(row.stance)} · FICTIONAL INTERVIEW</span><p>“${escape(row.quote)}”</p>${recordButton('interviews', row.id, row.person)}</blockquote>`).join('') : '<p class="empty-evidence">No interview for this account in the selected scope. Recruit before inferring intent.</p>'}`;
}
function setDecision(next: Decision) {
  decision = next; scenario = next === 'conversion' ? 25 : next === 'retention' ? 100 : 3; render(); resetCamera();
  const url = new URL(location.href); url.searchParams.set('outcome', decision); history.replaceState(null, '', url);
}
function resetCamera() { app?.resetCamera(decision === 'product' ? [11, 7, 18] : [11, 8, 17], [0, decision === 'product' ? 1.2 : decision === 'retention' ? .8 : 0, 0]); }
function openRecord(table: keyof OutcomeDataset, id: string, remember = true) {
  const record = (data[table] as unknown as Record<string, unknown>[]).find(row => row.id === id); if (!record) return;
  if (!($('detail-dialog') as HTMLDialogElement).open) detailHistory.length = 0;
  if (remember) { detailHistory.push({table,id}); if(detailHistory.length>30)detailHistory.shift(); }
  $('detail-back').hidden = detailHistory.length < 2;
  $('detail-title').textContent = `${table} / ${id}`;
  $('detail-body').innerHTML = `<p>Adapter: JSON snapshot · mode: fixture · completeness: complete</p><dl>${Object.entries(record).map(([name, value]) => `<dt>${escape(name)}</dt><dd>${escape(value)}</dd>`).join('')}</dl><p class="source-rule">Values are copied from the source record. This is fictional demonstration data.</p>`;
  const links: {table:keyof OutcomeDataset; id:string; label:string}[] = [];
  const add=(target:keyof OutcomeDataset,value:unknown,label:string)=>{if(typeof value==='string')links.push({table:target,id:value,label})};
  add('accounts',record.accountId,'Linked account');add('sessions',record.sessionId,'Linked web session');add('features',record.featureId,'Linked initiative');
  if(table==='accounts') for(const target of ['sessions','usage','tickets','interviews'] as const)for(const row of data[target].filter(row=>row.accountId===id))add(target,row.id,`${target} / ${row.id}`);
  if(table==='sessions') for(const row of data.checkouts.filter(row=>row.sessionId===id))add('checkouts',row.id,`Checkout attempt / ${row.id}`);
  if(table==='features') for(const row of data.interviews.filter(row=>row.featureId===id))add('interviews',row.id,`Interview / ${row.id}`);
  const related=document.createElement('div');related.className='related-records';
  for(const link of links){const button=document.createElement('button');button.className='record-link';button.dataset.table=link.table;button.dataset.record=link.id;button.textContent=link.label+' ↗';button.addEventListener('click',()=>openRecord(link.table,link.id));related.append(button)}
  if(links.length)$('detail-body').append(related);
  if(!($('detail-dialog') as HTMLDialogElement).open)($('detail-dialog') as HTMLDialogElement).showModal();
  $('detail-title').focus(); $('detail-dialog').scrollTop = 0;
}
function renderCatalog() {
  const query = ($('connector-search') as HTMLInputElement).value.trim().toLowerCase(), matches = connectorCatalog.filter(row => `${row.name} ${row.category} ${row.scope}`.toLowerCase().includes(query));
  $('connector-grid').innerHTML = matches.map(row => `<article><div><span>${escape(row.category)}</span><small>${row.status === 'implemented' ? 'IMPLEMENTED' : 'PLANNED'}</small></div><h3>${escape(row.name)}</h3><p>${escape(row.scope)}</p><a href="./connectors/${connectorSlug(row.name)}/">Guide + code samples ↗</a></article>`).join('');
  $('connector-count').textContent = `${matches.length} of ${connectorCatalog.length} catalog entries shown.`;
}
$('connector-search').addEventListener('input', renderCatalog); renderCatalog();
document.querySelectorAll<HTMLButtonElement>('[data-decision]').forEach(button => button.addEventListener('click', () => { if (data) setDecision(button.dataset.decision as Decision); }));
$('segment').addEventListener('change', () => { if (!data) return; segment = ($('segment') as HTMLSelectElement).value as Segment; render(); });
$('scenario').addEventListener('input', () => { if (!data) return; scenario = Number(($('scenario') as HTMLInputElement).value); render(); });
$('record').addEventListener('change', () => { selected = ($('record') as HTMLSelectElement).value; scene?.select(selected); renderAccount(); });
$('initiative').addEventListener('change', () => { featureId = ($('initiative') as HTMLSelectElement).value; render(); scene?.select(featureId); });
$('stage-readout').addEventListener('click', event => { const button = (event.target as Element).closest<HTMLButtonElement>('[data-feature]'); if (button) { featureId = button.dataset.feature!; render(); scene?.select(featureId); } });
$('account-evidence').addEventListener('click', event => { const button = (event.target as Element).closest<HTMLButtonElement>('[data-record]'); if (button) openRecord(button.dataset.table as keyof OutcomeDataset, button.dataset.record!); });
$('motion').textContent = paused ? 'Play motion' : 'Pause motion'; $('motion').setAttribute('aria-label', paused ? 'Play scene motion' : 'Pause scene motion');
$('motion').addEventListener('click', () => { paused = !paused; app?.setPaused(paused); $('motion').textContent = paused ? 'Play motion' : 'Pause motion'; $('motion').setAttribute('aria-label', paused ? 'Play scene motion' : 'Pause scene motion'); });
$('camera').addEventListener('click', resetCamera);
$('build-brief').addEventListener('click', () => { if (!data) return; brief = decisionBrief(data, decision, segment, scenario, decision === 'product' ? featureId : selected); $('brief-content').textContent = brief; ($('brief-dialog') as HTMLDialogElement).showModal(); });
$('download-brief').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([brief], { type: 'text/markdown;charset=utf-8' })), a = document.createElement('a'); a.href = url; a.download = `motif-${decision}-investigation.md`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
$('detail-back').addEventListener('click',()=>{detailHistory.pop();const previous=detailHistory.at(-1);if(previous)openRecord(previous.table,previous.id,false)});
$('close-detail').addEventListener('click', () => ($('detail-dialog') as HTMLDialogElement).close()); $('close-brief').addEventListener('click', () => ($('brief-dialog') as HTMLDialogElement).close());
for (const id of ['detail-dialog', 'brief-dialog']) $(id).addEventListener('click', event => { const rect = $(id).getBoundingClientRect(); if (event.target === $(id) && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) ($(id) as HTMLDialogElement).close(); });

async function initialize() {
try {
  const loaded = await loadOutcomeDataset(); data = loaded.data;
  const requested = new URLSearchParams(location.search).get('outcome'); if (requested && Object.hasOwn(decisionCopy, requested)) { decision = requested as Decision; scenario = decision === 'conversion' ? 25 : decision === 'retention' ? 100 : 3; }
  $('source-count').textContent = `${loaded.receipts.reduce((sum, item) => sum + item.page.rows.length, 0)} records`;
  $('source-receipts').innerHTML = loaded.receipts.map(({ table, page }) => `<div><strong>${escape(table)}</strong><span>${page.rows.length} records · ${page.fields.length} fields · COMPLETE</span><small>${escape(page.provenance.source)} · ${escape(page.provenance.provider)} / ${escape(page.provenance.mode)}</small></div>`).join('');
  try {
    app = createFive({ container: $('spatial-view'), background: '#0b1316', bloom: .35, paused, autoRotate: false });
    scene = createDecisionScene(data, decision); app.add(scene); resetCamera();
    const ray = new Raycaster(), pointer = new Vector2(); let start: [number, number] | undefined;
    $('spatial-view').addEventListener('pointerdown', event => { start = [event.clientX, event.clientY]; });
    $('spatial-view').addEventListener('pointerup', event => { if (!start || Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 5 || !app || !scene) return; start = undefined; const box = $('spatial-view').getBoundingClientRect(); pointer.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1); ray.setFromCamera(pointer, app.camera); const hit = ray.intersectObjects([...scene.targets])[0]; if (!hit) return; const id = hit.object.userData.recordId; if (data.features.some(row => row.id === id)) { featureId = id; render(); scene.select(id); } else { selected = id; if(hit.object.userData.featureId){featureId=hit.object.userData.featureId;render()} ($('record') as HTMLSelectElement).value = id; scene.select(id); renderAccount(); } });
  } catch (error) { $('scene-fallback').hidden = false; console.warn('Motif spatial view unavailable', error); }
  render(); document.body.dataset.motifReady = 'true';
} catch (error) { $('load-status').textContent = `Source snapshots could not load: ${error instanceof Error ? error.message : 'unknown error'}.`; document.body.dataset.motifReady = 'error'; }
}
void initialize();
window.addEventListener('pagehide', event => { if (!event.persisted) app?.dispose(); });
