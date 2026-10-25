import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';

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
  summary: 'Sixty customers, three measured axes, and transparent segment rules.',
  description: 'Plot annual revenue, engagement score, and tenure on fixed axes. Colors are explicit revenue-and-engagement rules. Raise the high-value cutoff, filter by tenure or segment, and inspect the exact customers and totals remaining on screen.',
  tags: ['Segmentation', '3D scatter', 'Rule-based'], difficulty: 'Intermediate', accent: '#8fe0b3',
  camera: [8, 7, 12], target: [0, 2, 0], bloom: 0.05,
  dataNote: 'Synthetic account snapshot at June 30, 2026: one point per customer. Annual revenue is trailing-12-month USD; engagement is an illustrative 0–100 score; tenure is whole months. High value means revenue ≥ the cutoff; engaged means score ≥60. Segment names are demonstration rules, not ML clusters or measured churn predictions.',
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
      chart.line([[cutoffX, 0, -2.5], [cutoffX, 4.5, -2.5], [cutoffX, 4.5, 2.5], [cutoffX, 0, 2.5]], '#d4bb83', 0.45);
      chart.line([[-4.5, 2.7, -2.5], [4.5, 2.7, -2.5]], '#d4bb83', 0.45);
      for (const row of rows) chart.point([-4.5 + row.annualRevenue / 100000 * 9, row.engagement / 100 * 4.5, -2.5 + row.tenureMonths / 48 * 5], COLORS[row.segment], 0.09);
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
