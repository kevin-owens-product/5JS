import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';
import { Vector3 } from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

export interface Customer { id: string; annualRevenue: number; engagement: number; tenureMonths: number }
export type CustomerSegment = 'Champions' | 'Growth' | 'At risk' | 'Develop';
export interface SegmentedCustomer extends Customer { segment: CustomerSegment }
const SEGMENTS: CustomerSegment[] = ['Champions', 'Growth', 'At risk', 'Develop'];
const COLORS: Record<CustomerSegment, string> = { Champions: '#88e4a6', Growth: '#69ceff', 'At risk': '#ffba70', Develop: '#b29bf3' };
const FILTERS: ('All' | CustomerSegment)[] = ['All', ...SEGMENTS];

export function createCustomerData(): Customer[] {
  return Array.from({ length: 60 }, (_, i) => ({ id: `C${String(i + 1).padStart(3, '0')}`,
    annualRevenue: 4000 + (i * 7919 + (i % 5) * 3800) % 96001,
    engagement: 15 + (i * 29 + Math.floor(i / 4) * 7) % 86,
    tenureMonths: 1 + (i * 7 + Math.floor(i / 5) * 3) % 48,
  }));
}

export function segmentCustomer(customer: Customer, highValueThreshold: number): CustomerSegment {
  const highValue = customer.annualRevenue >= highValueThreshold;
  const engaged = customer.engagement >= 60;
  return highValue ? (engaged ? 'Champions' : 'At risk') : (engaged ? 'Growth' : 'Develop');
}

export function selectCustomers(customers: readonly Customer[], minimumTenure: number, highValueThreshold: number, segment: 'All' | CustomerSegment): SegmentedCustomer[] {
  return customers.filter(customer => customer.tenureMonths >= minimumTenure)
    .map(customer => ({ ...customer, segment: segmentCustomer(customer, highValueThreshold) }))
    .filter(customer => segment === 'All' || customer.segment === segment);
}

export function summarizeCustomers(customers: readonly Customer[]) {
  const scores = customers.map(customer => customer.engagement).sort((a, b) => a - b);
  const middle = Math.floor(scores.length / 2);
  const medianEngagement = scores.length ? (scores.length % 2 ? scores[middle] : (scores[middle - 1] + scores[middle]) / 2) : null;
  return { count: customers.length, annualRevenue: customers.reduce((sum, customer) => sum + customer.annualRevenue, 0), medianEngagement };
}

const usd = (value: number) => `$${value.toLocaleString('en-US')}`;
const example: ExampleDefinition = {
  id: 'customer-segments', title: 'Customer segments', category: 'Analytics',
  summary: 'Carve a customer volume with explicit rules and faceted segment envelopes.',
  description: 'Move the revenue boundary through four faceted customer envelopes. Every luminous account stays at its exact revenue, engagement, and tenure coordinates; translucent hulls reveal each segment’s spatial extent. Filter tenure or isolate a segment to see its envelope rebuild around the remaining customers.',
  tags: ['Segment volumes', 'Rule planes', 'Convex envelopes'], difficulty: 'Advanced', accent: '#8fe0b3',
  camera: [8.6, 6.8, 11], target: [0, 2.2, 0], bloom: 0.24,
  dataNote: 'Synthetic account snapshot at June 30, 2026: one point per customer. Annual revenue is trailing-12-month USD; engagement is an illustrative 0–100 score; tenure is whole months. High value means revenue ≥ the cutoff; engaged means score ≥60. Segment names are demonstration rules, not ML clusters or measured churn predictions. Faceted envelopes are convex hulls of displayed accounts in each segment, not density estimates, confidence regions, or additional customers. Hull tracers scan spatial extent without changing positions or values. Constant point size carries no metric.',
  setup(app) {
    const customers = createCustomerData();
    let minimumTenure = 0, highValueThreshold = 50000, segmentIndex = 0;
    let rows = selectCustomers(customers, minimumTenure, highValueThreshold, 'All');
    const draw = (chart: ChartBuilder) => {
      chart.frame({ x: [-5, 5], y: [0, 4.5], z: [-3, 3],
        xTicks: [{ value: -4.5, label: '$0' }, { value: 0, label: '$50k' }, { value: 4.5, label: '$100k' }],
        yTicks: [0, 50, 100].map(value => ({ value: value / 100 * 4.5, label: String(value) })),
        zTicks: [0, 24, 48].map(value => ({ value: -2.5 + value / 48 * 5, label: String(value) })),
        xLabel: 'Annual revenue · USD', yLabel: 'Engagement · 0–100', zLabel: 'Tenure · months',
      });
      const cutoffX = -4.5 + highValueThreshold / 100000 * 9;
      type P = [number, number, number];
      const position = (row: Customer): P => [-4.5 + row.annualRevenue / 100000 * 9, row.engagement / 100 * 4.5, -2.5 + row.tenureMonths / 48 * 5];
      chart.surface([[[cutoffX, 0, -2.5], [cutoffX, 0, 2.5]], [[cutoffX, 4.5, -2.5], [cutoffX, 4.5, 2.5]]], [['#9a7639', '#9a7639'], ['#e9c77d', '#e9c77d']], .055);
      chart.surface([[[-4.5, 2.7, -2.5], [4.5, 2.7, -2.5]], [[-4.5, 2.7, 2.5], [4.5, 2.7, 2.5]]], [['#5d879b', '#5d879b'], ['#83a5bf', '#83a5bf']], .045);
      chart.line([[cutoffX, 0, -2.5], [cutoffX, 4.5, -2.5], [cutoffX, 4.5, 2.5], [cutoffX, 0, 2.5]], '#d4bb83', 0.45);
      chart.line([[-4.5, 2.7, -2.5], [4.5, 2.7, -2.5]], '#d4bb83', 0.45);
      chart.flow([[cutoffX, 2.7, -2.48], [cutoffX, 2.7, 2.48]], { color: '#ffe6a6', count: 140, speed: .11, size: .035, spread: .015, seed: 16 });
      chart.label(`HIGH VALUE ≥ ${usd(highValueThreshold)}`, [cutoffX, 4.9, -.6], .22, '#e9c77d');
      chart.label('ENGAGED ≥ 60', [4.6, 2.9, -2.5], .2, '#a9c7dc');
      for (const segment of SEGMENTS) {
        const members = rows.filter(row => row.segment === segment), hue = COLORS[segment];
        const vertices = members.map(row => new Vector3(...position(row)));
        // Avoid degenerate hulls for small or coplanar filtered subsets.
        let solid = false;
        if (vertices.length >= 4) {
          const a = vertices[0];
          for (let b = 1; b < vertices.length && !solid; b++) for (let c = b + 1; c < vertices.length && !solid; c++) {
            const normal = vertices[b].clone().sub(a).cross(vertices[c].clone().sub(a));
            solid = vertices.some(point => Math.abs(normal.dot(point.clone().sub(a))) > 1e-6);
          }
        }
        if (solid) {
          const geometry = new ConvexGeometry(vertices), attribute = geometry.getAttribute('position');
          const edges = new Map<string, [P, P]>();
          try {
            for (let i = 0; i < attribute.count; i += 3) {
              const triangle = [0, 1, 2].map(offset => [attribute.getX(i + offset), attribute.getY(i + offset), attribute.getZ(i + offset)] as P);
              chart.surface([[triangle[0], triangle[1]], [triangle[2], triangle[2]]], [[hue, hue], [hue, hue]], .105);
              for (let j = 0; j < 3; j++) {
                const a = triangle[j], b = triangle[(j + 1) % 3];
                const key = [a.join(','), b.join(',')].sort().join('|'); edges.set(key, [a, b]);
              }
            }
          } finally { geometry.dispose(); }
          let edgeIndex = 0;
          for (const edge of edges.values()) {
            chart.line(edge, hue, .34);
            if (edgeIndex++ % 3 === 0) chart.flow(edge, { color: hue, count: 18, speed: .09, size: .025, spread: 0, seed: 20 + edgeIndex });
          }
        }
        if (members.length) {
          const side = segment === 'Champions' || segment === 'At risk' ? 1 : -1;
          const high = segment === 'Champions' || segment === 'Growth';
          chart.label(`${segment.toUpperCase()} · ${members.length}`, [side * 2.9, high ? 4.8 : .25, 2.75], .21, hue);
        }
      }
      for (const row of rows) {
        const point = position(row);
        chart.point(point, COLORS[row.segment], .065);
        chart.glow(point, COLORS[row.segment], .22);
      }
      if (!rows.length) chart.label('NO ACCOUNTS MEET THESE RULES', [0, 2.2, 0], .27, '#b6c6d4');
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { rows = selectCustomers(customers, minimumTenure, highValueThreshold, FILTERS[segmentIndex]); layer.redraw(draw); };
    return {
      controls: [
        { id: 'tenure', label: 'Minimum tenure', min: 0, max: 36, step: 3, value: minimumTenure, format: value => `${value} months`, apply(value) { minimumTenure = value; refresh(); } },
        { id: 'high-value', label: 'High-value cutoff', min: 25000, max: 75000, step: 5000, value: highValueThreshold, format: usd, apply(value) { highValueThreshold = value; refresh(); } },
        { id: 'segment', label: 'Segment shown', min: 0, max: 4, step: 1, value: segmentIndex, format: value => FILTERS[value], apply(value) { segmentIndex = value; refresh(); } },
      ],
      readout() {
        const summary = summarizeCustomers(rows);
        return {
          metrics: [
            { label: 'Customers shown', value: String(summary.count), detail: `Of ${customers.length} synthetic accounts; both filters applied.` },
            { label: 'Annual revenue shown', value: usd(summary.annualRevenue), detail: 'Sum over the displayed customers only.' },
            { label: 'Median engagement', value: summary.medianEngagement === null ? 'No observations' : summary.medianEngagement.toFixed(1), detail: 'Illustrative score, 0–100.' },
          ],
          legend: SEGMENTS.map(segment => ({ label: `${segment} (${rows.filter(row => row.segment === segment).length})`, color: COLORS[segment] })),
          table: { caption: `Displayed accounts. High value ≥${usd(highValueThreshold)}; engaged ≥60. Champions: high/engaged; Growth: low/engaged; At risk: high/low; Develop: low/low.`, columns: ['Customer', 'Annual USD', 'Engagement', 'Tenure months', 'Segment'], rows: rows.map(row => [row.id, row.annualRevenue, row.engagement, row.tenureMonths, row.segment]) },
        };
      },
    };
  },
};
export default example;
