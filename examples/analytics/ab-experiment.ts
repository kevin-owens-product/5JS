import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';

export type ExperimentSegment = 'Desktop' | 'Mobile' | 'Tablet';
export interface ExperimentRow { segment: ExperimentSegment; variant: 'A' | 'B'; visitors: number; conversions: number }
const SEGMENTS: ExperimentSegment[] = ['Desktop', 'Mobile', 'Tablet'];
const FILTERS = ['All segments', ...SEGMENTS];
const MEASURES = ['Conversion rate', 'Conversions', 'Eligible visitors'];

export function createExperimentData(): ExperimentRow[] {
  return [
    { segment: 'Desktop', variant: 'A', visitors: 4000, conversions: 480 },
    { segment: 'Desktop', variant: 'B', visitors: 3600, conversions: 468 },
    { segment: 'Mobile', variant: 'A', visitors: 6000, conversions: 360 },
    { segment: 'Mobile', variant: 'B', visitors: 7000, conversions: 490 },
    { segment: 'Tablet', variant: 'A', visitors: 1000, conversions: 80 },
    { segment: 'Tablet', variant: 'B', visitors: 900, conversions: 81 },
  ];
}

export function summarizeExperiment(rows: readonly ExperimentRow[]) {
  for (const row of rows) if (!Number.isInteger(row.visitors) || !Number.isInteger(row.conversions) || row.visitors < 0 || row.conversions < 0 || row.conversions > row.visitors) throw new RangeError('Experiment counts must be nonnegative integers with conversions ≤ visitors.');
  const total = (variant: 'A' | 'B') => {
    const selected = rows.filter(row => row.variant === variant);
    const visitors = selected.reduce((sum, row) => sum + row.visitors, 0);
    const conversions = selected.reduce((sum, row) => sum + row.conversions, 0);
    return { visitors, conversions, rate: visitors ? conversions / visitors : null };
  };
  const a = total('A'), b = total('B');
  return { a, b, difference: a.rate === null || b.rate === null ? null : b.rate - a.rate };
}

const example: ExampleDefinition = {
  id: 'ab-experiment', title: 'A/B experiment', category: 'Analytics',
  summary: 'Compare observed conversion rates using their actual visitor denominators.',
  description: 'Blue columns are variant A and green columns variant B, separated by device segment. Filter the segment or inspect conversions and eligible visitors directly. Overall rates are recomputed from summed counts, and the observed B−A difference is expressed in percentage points.',
  tags: ['A/B counts', 'Weighted rates', 'Observed differences'], difficulty: 'Starter', accent: '#91d9ae',
  camera: [8, 7, 12], target: [0, 2, 0], bloom: 0.03,
  dataNote: 'Synthetic A/B counts: one eligible visitor appears in exactly one variant and device segment. Visitors entered June 1–7, 2026; binary conversion was observed within seven days, with follow-up complete June 14. These illustrative counts are not a live experiment. Rates and differences are descriptive; no statistical significance, causal effect, or winner is claimed.',
  setup(app) {
    const data = createExperimentData();
    let segment = 0, measure = 0;
    let rows = [...data];
    const draw = (chart: ChartBuilder) => {
      const maximum = [0.16, 600, 8000][measure];
      const value = (row: ExperimentRow) => measure === 0 ? row.conversions / row.visitors : measure === 1 ? row.conversions : row.visitors;
      chart.frame({ x: [-5, 5], y: [0, 4.5], z: [-3, 3],
        xTicks: [{ value: -1.5, label: 'A' }, { value: 1.5, label: 'B' }],
        yTicks: [0, 0.5, 1].map(fraction => ({ value: fraction * 4.5, label: measure === 0 ? `${fraction * maximum * 100}%` : String(fraction * maximum) })),
        zTicks: SEGMENTS.map((label, i) => ({ value: -1.8 + i * 1.8, label })),
        xLabel: 'Assigned variant', yLabel: MEASURES[measure], zLabel: 'Device segment',
      });
      for (const row of rows) {
        const x = row.variant === 'A' ? -1.5 : 1.5, z = -1.8 + SEGMENTS.indexOf(row.segment) * 1.8;
        const height = value(row) / maximum * 4.5;
        chart.bar({ x, z, value: height, width: 1.3, depth: 0.95, color: row.variant === 'A' ? '#73bde8' : '#88d5a3' });
        chart.label(measure === 0 ? `${(value(row) * 100).toFixed(1)}%` : String(value(row)), [x, height + 0.2, z], 0.21);
      }
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { rows = data.filter(row => segment === 0 || row.segment === SEGMENTS[segment - 1]); layer.redraw(draw); };
    return {
      controls: [
        { id: 'segment', label: 'Device segment', min: 0, max: 3, step: 1, value: segment, format: value => FILTERS[value], apply(value) { segment = value; refresh(); } },
        { id: 'measure', label: 'Column height', min: 0, max: 2, step: 1, value: measure, format: value => MEASURES[value], apply(value) { measure = value; refresh(); } },
      ],
      readout() {
        const summary = summarizeExperiment(rows);
        return {
          metrics: [
            { label: 'Observed rate · A', value: summary.a.rate === null ? 'No eligible visitors' : `${(summary.a.rate * 100).toFixed(2)}%`, detail: `${summary.a.conversions.toLocaleString('en-US')} / ${summary.a.visitors.toLocaleString('en-US')} visitors.` },
            { label: 'Observed rate · B', value: summary.b.rate === null ? 'No eligible visitors' : `${(summary.b.rate * 100).toFixed(2)}%`, detail: `${summary.b.conversions.toLocaleString('en-US')} / ${summary.b.visitors.toLocaleString('en-US')} visitors.` },
            { label: 'Observed B − A', value: summary.difference === null ? 'Not defined' : `${summary.difference >= 0 ? '+' : ''}${(summary.difference * 100).toFixed(2)} pp`, detail: 'Percentage-point difference; descriptive, not a significance result.' },
          ],
          legend: [{ label: 'Variant A', color: '#73bde8' }, { label: 'Variant B', color: '#88d5a3' }],
          table: { caption: 'The same segment/variant rows shown in the chart. Overall rates sum conversions and eligible visitors before division.', columns: ['Device', 'Variant', 'Visitors', 'Conversions', 'Observed rate'], rows: rows.map(row => [row.segment, row.variant, row.visitors, row.conversions, `${(row.conversions / row.visitors * 100).toFixed(2)}%`]) },
        };
      },
    };
  },
};
export default example;
