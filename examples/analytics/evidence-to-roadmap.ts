import type { ExampleDefinition } from '../types.js';
import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import { createConnectedData, buildEntityRecords } from '../connected/fixture.js';
import { createOutcomeExplorer } from '../connected/explorer.js';
import type { ConnectedDataset, OutcomeAction, OutcomeExplorer, OutcomeView, Theme } from '../connected/types.js';

const THEMES: Theme[] = ['checkout', 'activation', 'visibility'];
const SEGMENTS = ['all', 'Growth', 'Enterprise'] as const;
export interface EvidenceFilters { theme: Theme | 'all'; segment: typeof SEGMENTS[number] }
const STANCE_COLOR = { supports: '#80e3d0', mixed: '#e9cc8c', contradicts: '#f494ad' };
const PRODUCT_COLOR = '#a7baff', CUSTOMER_COLOR = '#7bc4e4', FOCUS = '#f3ffb8';
const THEME_PLAN: Record<Theme, { label: string; title: string; hypothesis: string; metric: string; success: string; guardrail: string }> = {
  checkout: {
    label: 'Checkout recovery', title: 'Test a recoverable checkout',
    hypothesis: 'Making checkout costs and recoverable failures explicit may help customers complete an intended purchase without losing their progress.',
    metric: 'Unassisted checkout-task completion; duplicate orders or charges during retries.',
    success: 'Proposed task-test criterion: at least 10 of 12 newly recruited participants complete an assigned purchase and recover from one scripted failure without facilitator help. Report each segment separately.',
    guardrail: 'No duplicate order or charge in any scripted retry; preserve required validation and show the total cost before confirmation.',
  },
  activation: {
    label: 'First-value path', title: 'Test a guided first-value path',
    hypothesis: 'Showing the next required setup step and its purpose may help a new user reach the first useful product outcome.',
    metric: 'Unassisted completion of a predefined first-value task; setup errors.',
    success: 'Proposed task-test criterion: at least 10 of 12 newly recruited participants reach the predefined first-value outcome without facilitator help and can identify the next step. Report each segment separately.',
    guardrail: 'No skipped required prerequisite or permission check; separately record setup errors and participants who prefer their existing workflow.',
  },
  visibility: {
    label: 'Decision visibility', title: 'Test decision-ready status visibility',
    hypothesis: 'Putting current status, evidence provenance, and the next responsible person together may help users make a correct operational decision.',
    metric: 'Correct unassisted status interpretation and next-owner identification; critical misinterpretations.',
    success: 'Proposed task-test criterion: at least 10 of 12 newly recruited participants correctly explain a seeded status, cite its source, and identify the next owner without facilitator help. Report each segment separately.',
    guardrail: 'No critical decision based on a stale or misattributed status; preserve source timestamps and allow participants to inspect the underlying record.',
  },
};
const unique = <T>(values: readonly T[]) => [...new Set(values)];
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** Evidence is counted at its actual grain; repeated interviews never multiply customer exposure. */
export function evidenceToRoadmapModel(data: ConnectedDataset, filters: EvidenceFilters = { theme: 'all', segment: 'all' }) {
  if (filters.theme !== 'all' && !THEMES.includes(filters.theme)) throw new RangeError('Unknown evidence theme.');
  if (!SEGMENTS.includes(filters.segment)) throw new RangeError('Unknown customer segment.');
  const eligibleCustomers = new Set(data.customers.filter(customer => filters.segment === 'all' || customer.segment === filters.segment).map(customer => customer.id));
  const interviews = data.interviews.filter(interview => eligibleCustomers.has(interview.customerId) && (filters.theme === 'all' || interview.theme === filters.theme));
  const customerIds = new Set(interviews.map(interview => interview.customerId));
  const participantIds = new Set(interviews.map(interview => interview.personId));
  const productIds = new Set(interviews.map(interview => interview.productId));
  const sessionIds = new Set(interviews.flatMap(interview => interview.sessionIds));
  const customers = data.customers.filter(customer => customerIds.has(customer.id));
  const participants = data.people.filter(person => participantIds.has(person.id));
  const products = data.products.filter(product => productIds.has(product.id));
  const sessions = data.sessions.filter(session => sessionIds.has(session.id));
  const exposure = customers.reduce((sum, customer) => sum + customer.annualValue, 0);
  const counts = {
    supports: interviews.filter(interview => interview.stance === 'supports').length,
    mixed: interviews.filter(interview => interview.stance === 'mixed').length,
    contradicts: interviews.filter(interview => interview.stance === 'contradicts').length,
  };
  const themes = THEMES.filter(theme => interviews.some(interview => interview.theme === theme));
  const actions: OutcomeAction[] = themes.map(theme => {
    const evidence = interviews.filter(interview => interview.theme === theme), plan = THEME_PLAN[theme];
    const linkedProducts = products.filter(product => evidence.some(interview => interview.productId === product.id));
    const ownerId = linkedProducts[0]?.ownerId;
    if (!ownerId || !data.people.some(person => person.id === ownerId && !person.customerId)) throw new Error(`Theme ${theme} needs an internal product owner.`);
    const themeSessions = sessions.filter(session => evidence.some(interview => interview.sessionIds.includes(session.id)));
    const support = evidence.filter(interview => interview.stance === 'supports').length;
    const contradict = evidence.filter(interview => interview.stance === 'contradicts').length;
    const mixed = evidence.filter(interview => interview.stance === 'mixed').length;
    const evidenceIds = unique(evidence.flatMap(interview => [interview.id, interview.customerId, interview.personId, interview.productId, ...interview.sessionIds]));
    return {
      id: `investigate-${theme}`, title: plan.title, ownerId, evidenceIds,
      rationale: `Hypothesis to test: ${plan.hypothesis} The current scope contains ${support} supporting, ${contradict} contradicting, and ${mixed} mixed interview records about the problem statement from ${unique(evidence.map(interview => interview.customerId)).length} customers. These records do not validate the proposed solution. Investigate the differences before committing to a roadmap solution.`,
      metric: plan.metric,
      baseline: `Synthetic fixture: ${support} supporting / ${contradict} contradicting / ${mixed} mixed interviews; ${themeSessions.filter(session => session.outcome === 'completed').length} of ${themeSessions.length} linked sessions marked completed. These session labels are not a baseline for the proposed task; measure that baseline with the current experience before comparison.`,
      success: plan.success, guardrail: plan.guardrail,
      caveat: 'This is a fictional convenience sample, not a representative survey, causal result, or significance test. Recruit new participants from both segments and include the contradicting cases. Annual customer value is exposure/context, not expected incremental revenue or a prioritization score. The task criterion is a proposed research gate, not a production impact estimate.',
    };
  });
  return { filters, interviews, customers, participants, products, sessions, exposure, counts, themes, actions };
}
type EvidenceModel = ReturnType<typeof evidenceToRoadmapModel>;

/** A categorical layout: equal-sized nodes and guide paths do not imply effect size or confidence. */
function layout(model: EvidenceModel) {
  const positions = new Map<string, Position>();
  const themeX = (theme: Theme) => model.themes.length === 1 ? 0 : (model.themes.indexOf(theme) - (model.themes.length - 1) / 2) * 4.1;
  model.products.forEach(product => {
    const theme = model.interviews.find(interview => interview.productId === product.id)!.theme;
    positions.set(product.id, [themeX(theme), 4.1, -1.8]);
  });
  for (const theme of model.themes) {
    const rows = model.interviews.filter(interview => interview.theme === theme);
    for (const stance of ['supports', 'mixed', 'contradicts'] as const) {
      const lane = rows.filter(interview => interview.stance === stance);
      lane.forEach((interview, index) => positions.set(interview.id,
        [themeX(theme) + (stance === 'supports' ? -.98 : stance === 'contradicts' ? .98 : 0),
          stance === 'mixed' ? 1.85 : 2.65, -0.55 + index * .9]));
    }
  }
  model.customers.forEach((customer, i) => positions.set(customer.id,
    [model.customers.length === 1 ? 0 : -5.1 + i / (model.customers.length - 1) * 10.2, .28, 3.5]));
  return { positions, themeX };
}

function outcomeView(model: EvidenceModel): OutcomeView {
  return {
    question: 'What should we investigate or test next, and what evidence supports or contradicts it?',
    summary: `${model.interviews.length} interview records from ${model.participants.length} distinct participants at ${model.customers.length} customers: ${model.counts.supports} supporting, ${model.counts.contradicts} contradicting, ${model.counts.mixed} mixed. The proposed tests address evidence gaps; they are not ranked revenue forecasts.`,
    scope: `${model.filters.theme === 'all' ? 'All themes' : THEME_PLAN[model.filters.theme].label} · ${model.filters.segment === 'all' ? 'Both customer segments' : model.filters.segment} · ${usd(model.exposure)} deduplicated annual customer value as exposure/context only. Fictional interviews and synthetic linked sessions.`,
    candidates: [
      ...model.products.map(product => ({ entityId: product.id, reason: 'Inspect the problem statement and counter-evidence before testing a solution hypothesis.', measure: `${model.interviews.filter(interview => interview.productId === product.id).length} interview records` })),
      ...model.interviews.map(interview => ({ entityId: interview.id, reason: `${interview.stance === 'supports' ? 'Supporting' : interview.stance === 'contradicts' ? 'Contradicting' : 'Mixed'} fictional interview; inspect its quote and linked session.`, measure: `${THEME_PLAN[interview.theme].label} · ${interview.date}` })),
      ...model.customers.map(customer => ({ entityId: customer.id, reason: 'Inspect customer context and all related source records.', measure: `${customer.segment} · ${usd(customer.annualValue)} annual value, not expected lift` })),
    ],
    actions: model.actions,
  };
}

const example: ExampleDefinition = {
  id: 'evidence-to-roadmap', title: 'Evidence to roadmap', category: 'Analytics',
  outcome: 'Turn evidence into a test',
  summary: 'Trace product hypotheses back to customers, interviews, and counter-evidence.',
  description: 'Three decision chambers connect product hypotheses to individual interviews and customer context. Inspect a node to follow its actual sources. Supporting, mixed, and contradicting signals remain separate. Filter the scope, then review a proposed investigation with an owner, evidence, a measurable test, and explicit limits.',
  tags: ['Connected evidence', 'Research decisions', 'Counter-evidence'], difficulty: 'Advanced', accent: '#a7baff',
  camera: [7.64, 6.01, 11.65], target: [0, 2.15, .5], bloom: .26,
  dataNote: 'Entirely fictional interviews and synthetic customer/session records. Each interview marker represents one source record, not an independent customer. Metrics distinguish interviews, distinct participants, and distinct customers. Cyan supports the theme problem statement, coral contradicts it, and gold is mixed; all three remain visible by default. The statements concern checkout interruptions, setup friction, and hard-to-interpret service status. Evidence about a problem does not validate a proposed solution. Equal node sizes, categorical positions, folded chambers, and moving light guides do not encode confidence, effect size, chronology, or business impact. Connections use actual record IDs. Annual value is deduplicated customer exposure/context, never expected incremental revenue. Proposed test criteria are hypotheses for investigation, not statistical significance or an automated roadmap decision. Entity details and exported briefs preserve source IDs and caveats.',
  setup(app) {
    const data = createConnectedData(), records = buildEntityRecords(data);
    let filters: EvidenceFilters = { theme: 'all', segment: 'all' };
    let model = evidenceToRoadmapModel(data, filters), graph = layout(model);
    let explorer: OutcomeExplorer | undefined, disposed = false;
    const draw = (chart: ChartBuilder) => {
      const selected = explorer?.selectedId;
      const related = new Set<string>(selected ? [selected] : []);
      if (selected) for (const record of records) {
        if (record.id === selected) record.links.forEach(link => related.add(link.id));
        if (record.links.some(link => link.id === selected)) related.add(record.id);
      }
      const emphasized = (id: string) => related.has(id);
      chart.label('EVIDENCE → INVESTIGATION', [0, 5.45, -.2], .3, '#c3d4f0');
      chart.label('SUPPORT + COUNTER-EVIDENCE / NO CONFIDENCE SCORE', [0, 5.05, -.2], .16, '#8092af');
      for (const theme of model.themes) {
        const x = graph.themeX(theme), product = model.products.find(item => model.interviews.some(interview => interview.theme === theme && interview.productId === item.id))!;
        const productPosition = graph.positions.get(product.id)!;
        // Folded inspection chambers organize the categorical lanes; they are not sampled surfaces.
        chart.surface([
          [[x - 1.5, .6, -1.3], [x, .55, -2.2], [x + 1.5, .6, -1.3]],
          [[x - 1.5, 3.45, -1.3], [x, 4.2, -2.2], [x + 1.5, 3.45, -1.3]],
        ], [['#174942', '#222846', '#50283e'], ['#3c8b82', '#6a78b4', '#a75975']], .15);
        chart.line([[x - 1.5, .6, -1.3], [x - 1.5, 3.45, -1.3], [x, 4.2, -2.2], [x + 1.5, 3.45, -1.3], [x + 1.5, .6, -1.3]], '#6b7ea4', .48);
        chart.label(THEME_PLAN[theme].label.toUpperCase(), [x, 4.65, -1.5], .23, PRODUCT_COLOR);
        chart.label('SUPPORT', [x - 1, 1.1, 1.15], .13, STANCE_COLOR.supports);
        chart.label('MIXED', [x, 1.1, 1.15], .13, STANCE_COLOR.mixed);
        chart.label('CONTRADICT', [x + 1, 1.1, 1.15], .13, STANCE_COLOR.contradicts);
        const tint = emphasized(product.id) ? FOCUS : PRODUCT_COLOR;
        chart.box({ x: productPosition[0], y: productPosition[1], z: productPosition[2], width: .36, height: .36, depth: .36, color: tint });
        if (emphasized(product.id)) chart.glow(productPosition, tint, .65);
      }
      for (const interview of model.interviews) {
        const point = graph.positions.get(interview.id)!, product = graph.positions.get(interview.productId)!, customer = graph.positions.get(interview.customerId)!;
        const active = emphasized(interview.id), tint = active ? FOCUS : STANCE_COLOR[interview.stance];
        const productPath: Position[] = [point, [point[0], 3.35, -.7], product];
        chart.tube(productPath, tint, active ? .025 : .013, active ? .9 : .48);
        chart.flow(productPath, { color: tint, count: active ? 12 : 5, size: .035, speed: .08, spread: 0, seed: model.interviews.indexOf(interview) + 81 });
        const customerPath: Position[] = [customer, [customer[0], .8, 2.3], [point[0], 1, 1.3], point];
        chart.line(customerPath, tint, active ? .7 : .18);
        if (active) chart.flow(customerPath, { color: tint, count: 10, size: .035, speed: .065, spread: 0, seed: 41 });
        chart.box({ x: point[0], y: point[1], z: point[2], width: .26, height: .34, depth: .13, color: tint, opacity: .95 });
        if (active) chart.glow(point, tint, .48);
        chart.label(interview.id.replace('interview:', 'I '), [point[0], point[1] + .3, point[2]], .13, tint);
      }
      model.customers.forEach(customer => {
        const point = graph.positions.get(customer.id)!, tint = emphasized(customer.id) ? FOCUS : CUSTOMER_COLOR;
        chart.box({ x: point[0], y: point[1], z: point[2], width: .55, height: .12, depth: .55, color: tint, opacity: .8 });
        chart.point([point[0], point[1] + .15, point[2]], tint, .075);
        if (emphasized(customer.id)) chart.glow(point, tint, .5);
        chart.label(customer.name, [point[0], -.1, point[2]], .16, tint);
        chart.label(customer.segment.toUpperCase(), [point[0], -.36, point[2]], .1, '#789bb3');
      });
      if (!model.interviews.length) chart.label('No interviews in this scope', [0, 2.4, 0], .35, '#adc0dc');
      chart.label('CUSTOMERS / DISTINCT ACCOUNTS', [0, -.78, 3.5], .17, '#8ba9bb');
    };
    const layer = createChartLayer(draw); app.add(layer);
    explorer = createOutcomeExplorer({ records, view: () => outcomeView(model),
      targets: () => [...graph.positions].map(([id, position]) => ({ id, position })),
      onSelect: () => { if (!disposed) layer.redraw(draw); }, initialId: model.products[0]?.id });
    layer.redraw(draw);
    const change = (patch: Partial<EvidenceFilters>) => {
      filters = { ...filters, ...patch }; model = evidenceToRoadmapModel(data, filters); graph = layout(model);
      layer.redraw(draw); explorer!.refresh();
    };
    return {
      connected: explorer,
      controls: [
        { id: 'theme', label: 'Investigation theme', min: 0, max: 3, step: 1, value: 0, format: value => value === 0 ? 'All themes' : THEME_PLAN[THEMES[value - 1]].label, apply: value => change({ theme: value === 0 ? 'all' : THEMES[value - 1] }) },
        { id: 'segment', label: 'Customer segment', min: 0, max: 2, step: 1, value: 0, format: value => value === 0 ? 'Both segments' : SEGMENTS[value], apply: value => change({ segment: SEGMENTS[value] }) },
      ],
      readout: () => ({
        metrics: [
          { label: 'Interview records', value: String(model.interviews.length), detail: `${model.counts.supports} support · ${model.counts.contradicts} contradict · ${model.counts.mixed} mixed` },
          { label: 'Distinct participants', value: String(model.participants.length), detail: `${model.customers.length} distinct customer accounts; repeated sources do not add customers.` },
          { label: 'Annual customer exposure', value: usd(model.exposure), detail: 'Deduplicated customer context, not expected incremental revenue or a ranking score.' },
        ],
        legend: [{ label: 'Supports problem statement', color: STANCE_COLOR.supports }, { label: 'Contradicts problem statement', color: STANCE_COLOR.contradicts }, { label: 'Mixed evidence', color: STANCE_COLOR.mixed }, { label: 'Selected / directly related', color: FOCUS }],
        table: { caption: 'Fictional interview records in the current scope. Stances describe the theme problem statement; source details preserve the complete quote, participant, and linked sessions.',
          columns: ['Interview ID', 'Theme', 'Stance', 'Customer', 'Participant ID', 'Product ID', 'Date', 'Linked session IDs'],
          rows: model.interviews.map(interview => [interview.id, THEME_PLAN[interview.theme].label, interview.stance, model.customers.find(customer => customer.id === interview.customerId)!.name, interview.personId, interview.productId, interview.date, interview.sessionIds.join('; ')]) },
      }),
      dispose() { if (disposed) return; disposed = true; explorer!.dispose(); },
    };
  },
};
export default example;
