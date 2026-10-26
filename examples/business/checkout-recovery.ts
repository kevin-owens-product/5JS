import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import { createConnectedData, buildEntityRecords } from '../connected/fixture.js';
import { createOutcomeExplorer } from '../connected/explorer.js';
import type { ConnectedDataset, CheckoutBlocker, OutcomeExplorer, OutcomeView, SelectableEntity } from '../connected/types.js';
import type { ExampleDefinition } from '../types.js';

const BLOCKERS = ['all', 'payment-timeout', 'address-validation', 'shipping-cost'] as const;
const BLOCKER_NAMES = ['All observed blockers', 'Payment timeout', 'Address validation', 'Shipping cost'];
const DEVICES = ['All devices', 'Desktop', 'Mobile'] as const;
const COLORS = ['#efaa78', '#a9a0ef', '#71d5c6'];
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 });
export interface CheckoutRecoverySettings { blocker: number; device: number; recoveryFraction: number }

/** Exposure is observed basket value; recovery is an explicit value-weighted scenario. */
export function calculateCheckoutRecovery(data: ConnectedDataset, settings: CheckoutRecoverySettings) {
  if (!Number.isInteger(settings.blocker) || settings.blocker < 0 || settings.blocker > 3 || !Number.isInteger(settings.device) || settings.device < 0 || settings.device > 2 || !Number.isFinite(settings.recoveryFraction) || settings.recoveryFraction < 0 || settings.recoveryFraction > .6) throw new RangeError('Invalid checkout recovery controls.');
  const rows = data.checkouts.filter(checkout => checkout.status === 'abandoned').flatMap(checkout => {
    const session = data.sessions.find(row => row.id === checkout.sessionId);
    if (!session) throw new Error(`Checkout ${checkout.id} has no session.`);
    if (settings.blocker && checkout.blocker !== BLOCKERS[settings.blocker]) return [];
    if (settings.device && session.device !== DEVICES[settings.device]) return [];
    const customer = data.customers.find(row => row.id === session.customerId)!;
    const product = data.products.find(row => row.id === checkout.productId)!;
    const service = data.services.find(row => row.id === checkout.serviceId);
    if (!customer || !product || !Number.isFinite(checkout.amount) || checkout.amount < 0) throw new Error(`Invalid checkout links or amount: ${checkout.id}`);
    return [{ checkout, session, customer, product, service, scenarioValue: checkout.amount * settings.recoveryFraction }];
  }).sort((a, b) => b.checkout.amount - a.checkout.amount || a.checkout.id.localeCompare(b.checkout.id));
  const exposure = rows.reduce((sum, row) => sum + row.checkout.amount, 0);
  const groups = BLOCKERS.filter((blocker): blocker is Exclude<CheckoutBlocker, 'none'> => blocker !== 'all').map(blocker => {
    const selected = rows.filter(row => row.checkout.blocker === blocker);
    return { blocker, rows: selected, exposure: selected.reduce((sum, row) => sum + row.checkout.amount, 0) };
  }).filter(group => group.rows.length).sort((a, b) => b.exposure - a.exposure);
  return { rows, groups, exposure, scenarioValue: exposure * settings.recoveryFraction, customers: new Set(rows.map(row => row.customer.id)).size };
}

const example: ExampleDefinition = {
  id: 'checkout-recovery', title: 'Checkout recovery lab', category: 'Business', outcome: 'Recover failed checkouts',
  summary: 'Inspect abandoned baskets, trace their blockers, and assign an evidence-backed recovery review.',
  description: 'Rank observed abandoned baskets by their value, then select a basket or blocker service to inspect its session, customer, person, and product. Green stems show an explicitly assumed share of basket dollars that might be recovered. The proposed owner actions retain the exact evidence IDs and a validation plan.',
  tags: ['Connected records', 'Recovery scenario', 'Decision workflow'], difficulty: 'Advanced', accent: '#f2be83',
  camera: [7.8, 6.59, 10.02], target: [0, 1.6, .5], bloom: .24, previewTime: 3,
  dataNote: 'Synthetic linked checkout records. Only abandoned checkout amounts enter exposure; completed baskets are excluded. X ranks displayed baskets by amount, not elapsed time; Y encodes observed basket USD on a scale fixed from the complete fixture, and depth separates blocker categories. Service and relationship-node positions are categorical. Green stem height is basket amount × the recovery-fraction assumption; the total is an illustrative scenario, never a forecast, expected revenue, or causal estimate. Tracers follow evidence links and do not represent new attempts. Proposals require owner validation and do not execute external actions.',
  setup(app) {
    const data = createConnectedData(), records = buildEntityRecords(data);
    const settings: CheckoutRecoverySettings = { blocker: 0, device: 0, recoveryFraction: .25 };
    let state = calculateCheckoutRecovery(data, settings), explorer: OutcomeExplorer | undefined;
    let targets: SelectableEntity[] = [];
    const scale = Math.max(250, Math.ceil(Math.max(...data.checkouts.map(row => row.amount)) / 250) * 250);
    const y = (value: number) => .35 + value / scale * 3.6;
    const lane = (blocker: CheckoutBlocker) => Math.max(0, BLOCKERS.indexOf(blocker as typeof BLOCKERS[number]) - 1);
    function focusedRow() {
      const id = explorer?.selectedId;
      return state.rows.find(row => [row.checkout.id, row.session.id, row.customer.id, row.session.personId, row.product.id, row.service?.id, row.customer.ownerId, row.product.ownerId, row.service?.ownerId].includes(id ?? '')) ?? state.rows[0];
    }
    function draw(chart: ChartBuilder) {
      targets = [];
      const selected = explorer?.selectedId ?? state.rows[0]?.checkout.id;
      const focus = focusedRow();
      const nodes = new Map<string, Position>();
      const target = (id: string, point: Position) => { if (!nodes.has(id)) { nodes.set(id, point); targets.push({ id, position: point }); } };
      chart.frame({ x: [-3.65, 4.55], y: [.35, 3.95], z: [-2.2, 2.2],
        yTicks: [0, .5, 1].map(t => ({ value: y(t * scale), label: usd(t * scale) })),
        zTicks: BLOCKER_NAMES.slice(1).map((label, i) => ({ value: -1.8 + i * 1.8, label })),
        xLabel: 'Baskets ranked by observed value', yLabel: 'Abandoned basket USD' });
      chart.label('OBSERVED EXPOSURE → ASSUMED RECOVERY', [0, 4.55, -.6], .23, '#c7dbe4');
      for (const group of state.groups) {
        const row = group.rows[0], index = lane(group.blocker), z = -1.8 + index * 1.8;
        if (!row.service) continue;
        const point: Position = [-4.65, 1.4, z];
        target(row.service.id, point);
        chart.box({ x: point[0], y: point[1], z, width: .24, height: .65, depth: .5, color: COLORS[index], opacity: .7 });
        chart.glow(point, selected === row.service.id ? '#fff0bd' : COLORS[index], selected === row.service.id ? .24 : .1);
        chart.label(row.service.name, [-4.65, 1.95, z], .16, COLORS[index]);
        chart.label(`${group.rows.length} baskets / ${usd(group.exposure)}`, [-4.65, .85, z], .14, '#a7bbc7');
      }
      state.rows.forEach((row, index) => {
        const x = -3.15 + index / Math.max(1, state.rows.length - 1) * 7.1;
        const z = -1.8 + lane(row.checkout.blocker) * 1.8, point: Position = [x, y(row.checkout.amount), z];
        const focused = focus?.checkout.id === row.checkout.id, color = focused ? '#fff0bd' : COLORS[lane(row.checkout.blocker)];
        target(row.checkout.id, point);
        chart.line([[x, .35, z], point], color, .4);
        if (settings.recoveryFraction > 0) chart.tube([[x, .35, z], [x, y(row.scenarioValue), z]], '#79e2ae', .027, .75);
        chart.box({ x, y: point[1], z, width: focused ? .32 : .2, height: .12, depth: .27, color, opacity: .9 });
        chart.glow(point, color, focused ? .22 : .08);
        if (focused) chart.label(`${row.checkout.id} / ${usd(row.checkout.amount)}`, [x, point[1] + .4, z], .17, color);
        const servicePoint = row.service && nodes.get(row.service.id);
        if (servicePoint) {
          const path: Position[] = [servicePoint, [-3.8, .6, z], [x, .5, z], point];
          chart.line(path, color, focused ? .55 : .13);
          if (focused) chart.flow(path, { color, count: 24, speed: .1, size: .04, spread: 0, seed: index + 51 });
        }
      });
      if (focus) {
        const record = (id: string) => records.find(row => row.id === id)!;
        const personId = selected?.startsWith('person:owner-') && [focus.customer.ownerId, focus.product.ownerId, focus.service?.ownerId].includes(selected) ? selected : focus.session.personId;
        const related = [focus.customer.id, personId, focus.session.id, focus.product.id];
        related.forEach((id, i) => {
          const point: Position = [-3.6 + i * 2.35, -.65, 3.4]; target(id, point);
          chart.point(point, selected === id ? '#fff0bd' : '#a9c9ec', selected === id ? .11 : .075);
          chart.glow(point, selected === id ? '#fff0bd' : '#a9c9ec', .12);
          chart.label(record(id).label, [point[0], -.25, point[2]], .16, '#bbd3e9');
          chart.label(record(id).kind.toUpperCase(), [point[0], -.95, point[2]], .12, '#7f9aaf');
        });
        const checkoutPoint = nodes.get(focus.checkout.id)!;
        const personLink = personId === focus.session.personId ? focus.session.id : personId === focus.customer.ownerId ? focus.customer.id : personId === focus.service?.ownerId ? focus.service.id : focus.product.id;
        const linked: [string, string][] = [[focus.customer.id, focus.session.id], [personId, personLink], [focus.session.id, focus.checkout.id], [focus.checkout.id, focus.product.id]];
        for (const [a, b] of linked) {
          const from = nodes.get(a)!, to = b === focus.checkout.id ? checkoutPoint : nodes.get(b)!;
          chart.line([from, to], '#86b8dc', .5);
          chart.flow([from, to], { color: '#bfe6ff', count: 12, speed: .07, size: .026, spread: 0, seed: a.length * 5 + b.length });
        }
      } else chart.label('No abandoned baskets match this cohort', [0, 2, 0], .27, '#b8cbd5');
    }
    function view(): OutcomeView {
      return {
        question: 'Which observed checkout blockers should an owner investigate first?',
        summary: `${state.rows.length} abandoned baskets expose ${usd(state.exposure)}. A ${(settings.recoveryFraction * 100).toFixed(0)}% value-recovery assumption gives ${usd(state.scenarioValue)}; no recovery has been observed.`,
        scope: `${BLOCKER_NAMES[settings.blocker]} · ${DEVICES[settings.device]}. Synthetic fixture only; rank by observed basket dollars, not predicted recoverability.`,
        candidates: state.rows.map(row => ({ entityId: row.checkout.id, reason: `${row.customer.name} / ${row.session.device} / ${row.checkout.blocker}`, measure: `${usd(row.checkout.amount)} abandoned basket; ${usd(row.scenarioValue)} assumed recoverable value` })),
        actions: state.groups.map(group => {
          const first = group.rows[0], ownerId = first.service?.ownerId ?? first.product.ownerId;
          return { id: `checkout-review:${group.blocker}`, title: `Investigate ${BLOCKER_NAMES[BLOCKERS.indexOf(group.blocker)]}`,
            rationale: `${group.rows.length} matched abandoned baskets share this recorded blocker; their observed value is ${usd(group.exposure)}.`, ownerId,
            evidenceIds: [...new Set(group.rows.flatMap(row => [row.checkout.id, row.session.id, row.customer.id, ...(row.service ? [row.service.id] : [])]))],
            metric: 'Verified recovered basket USD from this explicitly listed cohort', baseline: `${usd(group.exposure)} abandoned; $0 recovery observed in the fixture.`,
            success: `Validate each linked failure, then measure verified completions in a new observation window. ${usd(group.exposure * settings.recoveryFraction)} is an assumed scenario benchmark, not expected impact.`,
            guardrail: group.blocker === 'payment-timeout' ? 'No duplicate charges or lower payment authorization integrity.' : group.blocker === 'address-validation' ? 'Do not accept undeliverable addresses or bypass required validation.' : 'Track shipping margin and fulfillment cost alongside any offer or price change.',
            caveat: 'A recorded blocker is diagnostic evidence, not proof of cause. Recovery fraction is an explicit assumption; existing completed baskets and customer annual value are excluded.',
          };
        }),
      };
    }
    const layer = createChartLayer(draw); app.add(layer);
    explorer = createOutcomeExplorer({ records, view, targets: () => targets, onSelect: () => layer.redraw(draw), initialId: state.rows[0]?.checkout.id });
    function change(patch: Partial<CheckoutRecoverySettings>) { Object.assign(settings, patch); state = calculateCheckoutRecovery(data, settings); layer.redraw(draw); explorer!.refresh(); }
    return {
      connected: explorer,
      controls: [
        { id: 'blocker', label: 'Recorded blocker', min: 0, max: 3, step: 1, value: 0, format: value => BLOCKER_NAMES[value], apply: value => change({ blocker: value }) },
        { id: 'device', label: 'Device cohort', min: 0, max: 2, step: 1, value: 0, format: value => DEVICES[value], apply: value => change({ device: value }) },
        { id: 'recovery', label: 'Assumed recovered value', min: 0, max: .6, step: .05, value: .25, format: value => `${(value * 100).toFixed(0)}% assumption`, apply: value => change({ recoveryFraction: value }) },
      ],
      readout: () => ({
        metrics: [{ label: 'Observed abandoned baskets', value: String(state.rows.length), detail: `${state.customers} distinct linked customers` }, { label: 'Observed basket exposure', value: usd(state.exposure), detail: 'Sum of abandoned amounts after both filters' }, { label: 'Assumed recovered value', value: usd(state.scenarioValue), detail: `${(settings.recoveryFraction * 100).toFixed(0)}% × exposure; not a forecast` }],
        legend: [...BLOCKER_NAMES.slice(1).map((label, i) => ({ label, color: COLORS[i] })), { label: 'Explicit recovery assumption', color: '#79e2ae' }],
        table: { caption: 'Exact linked abandoned baskets in the current cohort. Scenario USD = observed amount × explicit recovery assumption; no measured recovery.', columns: ['Checkout ID', 'Customer', 'Session ID', 'Device', 'Recorded blocker', 'Basket USD', 'Scenario USD'], rows: state.rows.map(row => [row.checkout.id, row.customer.name, row.session.id, row.session.device, row.checkout.blocker, row.checkout.amount, Number(row.scenarioValue.toFixed(2))]) },
      }),
      dispose() { explorer!.dispose(); },
    };
  },
};
export default example;
