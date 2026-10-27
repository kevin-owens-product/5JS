import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import { createConnectedData, buildEntityRecords } from '../connected/fixture.js';
import { createOutcomeExplorer } from '../connected/explorer.js';
import type { ConnectedDataset, OutcomeExplorer, OutcomeView, SelectableEntity } from '../connected/types.js';
import type { ExampleDefinition } from '../types.js';

const SEGMENTS = ['All segments', 'Growth', 'Enterprise'] as const;
const COLORS = ['#78c8f4', '#c5a2f2', '#efbf79'];
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 });
export interface CustomerHealthSettings { service: number; segment: number; capacity: number }

/** Select observed abandoned sessions, not churn scores or inferred monetary losses. */
export function calculateCustomerHealth(data: ConnectedDataset, settings: CustomerHealthSettings) {
  if (!Number.isInteger(settings.service) || settings.service < 0 || settings.service > data.services.length || !Number.isInteger(settings.segment) || settings.segment < 0 || settings.segment > 2 || !Number.isInteger(settings.capacity) || settings.capacity < 1 || settings.capacity > 6) throw new RangeError('Invalid customer review controls.');
  const serviceId = settings.service ? data.services[settings.service - 1].id : null;
  const sessions = data.sessions.filter(session => session.outcome === 'abandoned').map(session => {
    const checkout = data.checkouts.find(row => row.sessionId === session.id && row.status === 'abandoned');
    // Checkout blockers identify a service directly; other sessions supply event associations only.
    const serviceIds = checkout?.serviceId ? [checkout.serviceId] : [...new Set(session.events.flatMap(event => event.serviceId ? [event.serviceId] : []))];
    return { session, checkout, serviceIds };
  }).filter(row => row.serviceIds.length && (!serviceId || row.serviceIds.includes(serviceId)));
  const rows = data.customers.filter(customer => !settings.segment || customer.segment === SEGMENTS[settings.segment]).flatMap(customer => {
    const linked = sessions.filter(row => row.session.customerId === customer.id);
    if (!linked.length) return [];
    return [{ customer, linked, serviceIds: [...new Set(linked.flatMap(row => row.serviceIds))],
      abandonedSessions: linked.length, basketExposure: linked.reduce((sum, row) => sum + (row.checkout?.amount ?? 0), 0) }];
  }).sort((a, b) => b.abandonedSessions - a.abandonedSessions || b.customer.annualValue - a.customer.annualValue || a.customer.id.localeCompare(b.customer.id));
  const planned = rows.slice(0, settings.capacity);
  return { rows, planned, abandonedSessions: rows.reduce((sum, row) => sum + row.abandonedSessions, 0),
    annualValueExposure: rows.reduce((sum, row) => sum + row.customer.annualValue, 0),
    plannedAnnualValue: planned.reduce((sum, row) => sum + row.customer.annualValue, 0),
    basketExposure: rows.reduce((sum, row) => sum + row.basketExposure, 0) };
}

const example: ExampleDefinition = {
  id: 'customer-health', title: 'Customer impact review', category: 'Business', outcome: 'Prioritize customer reviews',
  summary: 'Prioritize owner reviews from observed abandoned sessions and linked service evidence.',
  description: 'Select a customer dossier or a service to trace the abandoned sessions behind the review queue. Customer height shows annual account value as exposure, while the queue ranks observed abandonment counts first. Change service, segment, or review capacity to assign a bounded investigation plan without inventing a churn score.',
  tags: ['Connected customers', 'Service evidence', 'Review capacity'], difficulty: 'Advanced', accent: '#a5d9e9',
  camera: [8.11, 6.75, 10.29], target: [0, 1.6, .7], bloom: .22, previewTime: 3,
  dataNote: 'Synthetic linked observations. Included sessions have outcome abandoned. Checkout sessions associate through their recorded blocker service; other abandoned sessions associate through event service IDs, which do not establish causation. Active and completed sessions are excluded. X is review rank: abandoned-session count descending, then annual customer value descending, then ID. Y is customer annualValue on a fixed fixture-wide USD scale; depth separates Growth and Enterprise. Annual value is counted once per affected customer and is exposure, not lost revenue, churn probability, or expected impact. Service links and evidence-rack positions are categorical; moving guides follow recorded links. Review capacity changes the proposed worklist, not observed exposure.',
  setup(app) {
    const data = createConnectedData(), records = buildEntityRecords(data);
    const settings: CustomerHealthSettings = { service: 0, segment: 0, capacity: 3 };
    let state = calculateCustomerHealth(data, settings), explorer: OutcomeExplorer | undefined;
    let targets: SelectableEntity[] = [];
    const services = ['All linked services', ...data.services.map(service => service.name)];
    const scale = Math.ceil(Math.max(...data.customers.map(row => row.annualValue)) / 50000) * 50000;
    const y = (value: number) => .35 + value / scale * 3.6;
    function focusedRow() {
      const id = explorer?.selectedId;
      return state.rows.find(row => row.customer.id === id || row.customer.ownerId === id || row.serviceIds.includes(id ?? '') || row.linked.some(link => [link.session.id, link.checkout?.id, link.session.productId, link.session.personId].includes(id ?? ''))) ?? state.rows[0];
    }
    function draw(chart: ChartBuilder) {
      targets = [];
      const focus = focusedRow(), selected = explorer?.selectedId ?? state.planned[0]?.customer.id;
      const points = new Map<string, Position>();
      const target = (id: string, point: Position) => { if (!points.has(id)) { points.set(id, point); targets.push({ id, position: point }); } };
      const label = (id: string) => records.find(record => record.id === id)?.label ?? id;
      chart.frame({ x: [-2.5, 4.5], y: [.35, 3.95], z: [-2.2, 2.2],
        yTicks: [0, .5, 1].map(t => ({ value: y(t * scale), label: usd(t * scale) })),
        zTicks: [{ value: -1.4, label: 'Growth' }, { value: 1.4, label: 'Enterprise' }],
        xLabel: 'Review rank by observed sessions', yLabel: 'Annual value (USD)' });
      chart.label('OBSERVATIONS → OWNER REVIEWS', [0, 4.6, -.3], .23, '#bed9e7');
      data.services.forEach((service, index) => {
        const links = state.rows.filter(row => row.serviceIds.includes(service.id));
        if (!links.length) return;
        const point: Position = [-4.45, 1.7, -1.8 + index * 1.8]; target(service.id, point);
        const color = selected === service.id ? '#fff0ba' : COLORS[index];
        chart.box({ x: point[0], y: point[1], z: point[2], width: .23, height: .8, depth: .58, color, opacity: .7 });
        chart.glow(point, color, .16);
        chart.label(service.name, [point[0], 2.35, point[2]], .16, color);
        chart.label(`${links.length} affected customers`, [point[0], 1.05, point[2]], .14, '#9bb5c8');
      });
      state.rows.forEach((row, index) => {
        const planned = state.planned.includes(row), focused = focus?.customer.id === row.customer.id;
        const x = -1.9 + index / Math.max(1, state.rows.length - 1) * 5.8, z = row.customer.segment === 'Growth' ? -1.4 : 1.4;
        const top = y(row.customer.annualValue), point: Position = [x, top, z]; target(row.customer.id, point);
        const tint = focused ? '#ffe8af' : planned ? '#99d8ed' : '#627d99';
        // A folded dossier surface rises from the common zero plane to the exact annual value.
        const panel: Position[][] = [[[x - .28, .35, z], [x, .35, z + .18], [x + .28, .35, z]], [[x - .28, top, z], [x, top, z + .18], [x + .28, top, z]]];
        chart.surface(panel, [[tint, tint, tint], [tint, tint, tint]], planned ? .28 : .1);
        chart.line([[x - .28, .35, z], [x - .28, top, z], [x + .28, top, z], [x + .28, .35, z]], tint, .65);
        chart.point(point, tint, focused ? .1 : .067); chart.glow(point, tint, focused ? .23 : .1);
        chart.label(row.customer.name, [x, top + .34, z], .15, tint);
        chart.label(`#${index + 1} · ${row.abandonedSessions} abandoned`, [x, .12, z], .13, tint);
        for (const serviceId of row.serviceIds) {
          const servicePoint = points.get(serviceId); if (!servicePoint) continue;
          const route: Position[] = [servicePoint, [-3, .75, servicePoint[2]], [x - .4, .65, z], point];
          chart.line(route, tint, focused ? .62 : .18);
          if (focused) chart.flow(route, { color: tint, count: 22, speed: .075, size: .035, spread: 0, seed: index * 7 + serviceId.length });
        }
      });
      if (focus) {
        const personId = focus.linked.some(link => link.session.personId === selected) ? selected! : focus.customer.ownerId;
        const ownerPoint: Position = [-4.2, -.55, 3.45]; target(personId, ownerPoint);
        chart.point(ownerPoint, selected === personId ? '#ffe8af' : '#aacbed', .08);
        chart.label(label(personId), [-4.2, -.16, 3.45], .16, '#bfd2e7');
        chart.label(personId === focus.customer.ownerId ? 'REVIEW OWNER' : 'OBSERVED CONTACT', [-4.2, -.86, 3.45], .12, '#839fb7');
        const customerPoint = points.get(focus.customer.id)!;
        chart.line([customerPoint, ownerPoint], '#8baec8', .36);
        const productIds = [...new Set(focus.linked.map(link => link.session.productId))];
        productIds.forEach((id, index) => {
          const point: Position = [4.7, -.45 + index * .65, 3.45]; target(id, point);
          chart.point(point, selected === id ? '#ffe8af' : '#9fbbdb', .075);
          chart.label(label(id), [4.7, point[1] + .27, 3.45], .14, '#b8cce4');
        });
        focus.linked.forEach((link, index) => {
          const x = -2.35 + index / Math.max(1, focus.linked.length - 1) * 5.8;
          const sessionPoint: Position = [x, -.6, 3.45]; target(link.session.id, sessionPoint);
          const tint = selected === link.session.id || selected === link.checkout?.id ? '#ffe8af' : '#8ec8e4';
          chart.point(sessionPoint, tint, .075);
          chart.label(link.session.id, [x, -.28, 3.45], .13, tint);
          chart.line([customerPoint, sessionPoint], tint, .4);
          chart.flow([customerPoint, sessionPoint], { color: tint, count: 14, speed: .075, size: .028, spread: 0, seed: 32 + index });
          if (link.checkout) {
            const basketPoint: Position = [x, -1.25, 3.45]; target(link.checkout.id, basketPoint);
            chart.box({ x, y: basketPoint[1], z: basketPoint[2], width: .18, height: .12, depth: .18, color: tint });
            chart.line([sessionPoint, basketPoint], tint, .65);
            chart.label(`${link.checkout.id} / ${usd(link.checkout.amount)}`, [x, -1.55, 3.45], .12, tint);
          }
          const productPoint = points.get(link.session.productId)!;
          chart.line([sessionPoint, productPoint], '#7196b4', .22);
        });
      } else chart.label('No observed abandoned sessions match this cohort', [0, 2, 0], .27, '#b7cedc');
    }
    function view(): OutcomeView {
      return {
        question: 'Which customers should the named owners review within the available capacity?',
        summary: `${state.rows.length} affected customers link to ${state.abandonedSessions} observed abandoned sessions. Their ${usd(state.annualValueExposure)} annual value is exposure, not predicted loss. ${state.planned.length} owner reviews are proposed.`,
        scope: `${services[settings.service]} · ${SEGMENTS[settings.segment]}. Rank by observed abandoned-session count, then annual value, then ID; capacity ${settings.capacity}. Active observations are not classified as abandoned.`,
        candidates: state.planned.map(row => ({ entityId: row.customer.id, reason: `${row.abandonedSessions} observed abandoned sessions; ${row.serviceIds.map(id => data.services.find(service => service.id === id)!.name).join(', ')}`, measure: `${usd(row.customer.annualValue)} annual account exposure; ${usd(row.basketExposure)} observed abandoned baskets` })),
        actions: state.planned.map(row => ({ id: `customer-review:${row.customer.id}`, title: `Review observed friction for ${row.customer.name}`, ownerId: row.customer.ownerId,
          rationale: `${row.abandonedSessions} linked abandoned sessions place this customer in the capacity-limited evidence-review queue.`,
          evidenceIds: [...new Set([row.customer.id, ...row.serviceIds, ...row.linked.flatMap(link => [link.session.id, ...(link.checkout ? [link.checkout.id] : [])])])],
          metric: 'Owner-verified disposition of each listed abandoned session, followed by completion rate for the same eligible workflow',
          baseline: `${row.abandonedSessions} observed abandoned sessions; ${usd(row.basketExposure)} abandoned basket value; ${usd(row.customer.annualValue)} annual value exposure.`,
          success: `Review all ${row.abandonedSessions} listed sessions, record a verified explanation and next step for each, then measure completion in a separately defined follow-up window.`,
          guardrail: 'Do not treat unresolved active sessions as abandonment, contact a customer without authorization, or discount completed counterexamples when validating an explanation.',
          caveat: 'Service associations are evidence to investigate, not a causal diagnosis. Annual customer value is neither lost revenue nor expected recovery; no churn probability is calculated.',
        })),
      };
    }
    const layer = createChartLayer(draw); app.add(layer);
    explorer = createOutcomeExplorer({ records, view, targets: () => targets, onSelect: () => layer.redraw(draw), initialId: state.planned[0]?.customer.id });
    function change(patch: Partial<CustomerHealthSettings>) { Object.assign(settings, patch); state = calculateCustomerHealth(data, settings); layer.redraw(draw); explorer!.refresh(); }
    return {
      connected: explorer,
      controls: [
        { id: 'service', label: 'Linked service', min: 0, max: data.services.length, step: 1, value: 0, format: value => services[value], apply: value => change({ service: value }) },
        { id: 'segment', label: 'Customer segment', min: 0, max: 2, step: 1, value: 0, format: value => SEGMENTS[value], apply: value => change({ segment: value }) },
        { id: 'capacity', label: 'Owner review capacity', min: 1, max: 6, step: 1, value: 3, format: value => `${value} customer reviews`, apply: value => change({ capacity: value }) },
      ],
      readout: () => ({
        metrics: [{ label: 'Affected customers', value: String(state.rows.length), detail: `${state.abandonedSessions} observed abandoned sessions` }, { label: 'Annual value exposure', value: usd(state.annualValueExposure), detail: 'Unique customer annualValue; not lost revenue' }, { label: 'Reviews proposed', value: `${state.planned.length} / ${settings.capacity}`, detail: `${usd(state.plannedAnnualValue)} annual value represented; no impact estimate` }],
        legend: [{ label: 'Planned customer review', color: '#99d8ed' }, { label: 'Outside current review capacity', color: '#627d99' }, { label: 'Selected evidence', color: '#ffe8af' }],
        table: { caption: 'Affected customers ranked by abandoned sessions, annual value, then ID. Annual value is counted once per customer; basket amounts are separate observed checkout exposure.', columns: ['Customer ID', 'Customer', 'Segment', 'Abandoned sessions', 'Basket exposure USD', 'Annual value USD', 'Proposed review', 'Owner ID'], rows: state.rows.map(row => [row.customer.id, row.customer.name, row.customer.segment, row.abandonedSessions, row.basketExposure, row.customer.annualValue, state.planned.includes(row) ? 'Yes' : 'No', row.customer.ownerId]) },
      }),
      dispose() { explorer!.dispose(); },
    };
  },
};
export default example;
