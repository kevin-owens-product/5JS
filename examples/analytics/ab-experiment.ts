import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder, Position } from '../shared/chart.js';
import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from 'three';
import type { FiveLayer } from '../../src/index.js';

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
  summary: 'Inspect paired population domes with literal visitors and conversion caps.',
  description: 'Six population domes make the denominators tangible. Each spark is one visitor; bright caps contain the conversions. Dome surface area tracks population, while the base elevation compares rates or counts. Follow the inspection bridges, isolate a device, and see why pooled rates depend on the population mix.',
  tags: ['A/B counts', 'Weighted rates', 'Observed differences'], difficulty: 'Advanced', accent: '#91d9ae',
  camera: [5.8, 7.4, 10], target: [0, 1.9, 0], bloom: 0.18,
  dataNote: 'Synthetic A/B counts: one eligible visitor appears in exactly one variant and device segment. Visitors entered June 1–7, 2026; binary conversion was observed within seven days, with follow-up complete June 14. Each spark is one visitor, arranged in equal-area height bands with golden-angle azimuths on a hemisphere. Hemisphere surface area is proportional to visitors; the bright spherical cap has the exact conversion share of that area and contains exactly the conversion count of sparks. Radius uses a fixed 7,000-visitor reference across filters. Dome base elevation, not its apex, encodes the selected measure. Volume and individual positions have no analytical meaning. Traveling bridge lights are inspection guides, not moving participants. No significance, causal effect, or winner is claimed.',
  setup(app) {
    const data = createExperimentData();
    let segment = 0, measure = 0;
    let rows = [...data];
    const value = (row: ExperimentRow) => measure === 0 ? row.conversions / row.visitors : measure === 1 ? row.conversions : row.visitors;
    const base = (row: ExperimentRow) => 0.5 + value(row) / [0.16, 600, 8000][measure] * 2.85;
    const radius = (row: ExperimentRow) => 0.78 * Math.sqrt(row.visitors / 7000);
    const domePoint = (row: ExperimentRow, height: number, angle: number): Position => {
      const r = radius(row), section = r * Math.sqrt(Math.max(0, 1 - height * height));
      return [(row.variant === 'A' ? -3.1 : 3.1) + section * Math.cos(angle), base(row) + r * height, -1.8 + SEGMENTS.indexOf(row.segment) * 1.8 + section * Math.sin(angle)];
    };
    const draw = (chart: ChartBuilder) => {
      const maximum = [0.16, 600, 8000][measure];
      chart.frame({ x: [-4.5, 4.5], y: [0.5, 3.35], z: [-2.7, 2.7],
        xTicks: [{ value: -3.1, label: 'Variant A' }, { value: 3.1, label: 'Variant B' }],
        yTicks: [0, 0.5, 1].map(fraction => ({ value: 0.5 + fraction * 2.85, label: measure === 0 ? `${fraction * maximum * 100}%` : String(fraction * maximum) })),
        zTicks: SEGMENTS.map((label, i) => ({ value: -1.8 + i * 1.8, label })),
        xLabel: 'Assigned variant', yLabel: `Base · ${MEASURES[measure]}`, zLabel: 'Device segment',
      });
      for (const device of SEGMENTS) {
        const a = rows.find(row => row.segment === device && row.variant === 'A');
        const b = rows.find(row => row.segment === device && row.variant === 'B');
        if (!a || !b) continue;
        const z = -1.8 + SEGMENTS.indexOf(device) * 1.8;
        const ya = base(a), yb = base(b);
        const bridge: Position[] = [[-3.1 + radius(a), ya, z], [0, Math.max(ya, yb) + 0.22, z], [3.1 - radius(b), yb, z]];
        chart.tube(bridge, '#9bbfd2', 0.024);
        chart.flow(bridge, { color: '#e1f2f8', count: 9, speed: 0.09, size: 0.035, spread: 0, seed: 42 });
        for (const row of [a, b]) {
          const x = row.variant === 'A' ? -3.1 : 3.1, tint = row.variant === 'A' ? '#73bde8' : '#88d5a3';
          const height = base(row), r = radius(row), capStart = 1 - row.conversions / row.visitors;
          const shell = Array.from({ length: 17 }, (_, h) => Array.from({ length: 49 }, (_, angle) => domePoint(row, h / 16, angle / 48 * Math.PI * 2)));
          chart.surface(shell, shell.map(line => line.map(() => tint)), 0.08);
          const cap = Array.from({ length: 9 }, (_, h) => Array.from({ length: 49 }, (_, angle) => domePoint(row, capStart + (1 - capStart) * h / 8, angle / 48 * Math.PI * 2)));
          chart.surface(cap, cap.map(line => line.map(() => tint)), 0.62);
          chart.ring([x, height, z], r, tint, 0.022);
          chart.ring([x, height + r * capStart, z], r * Math.sqrt(1 - capStart * capStart), '#e4f5e9', 0.012);
          for (let rib = 0; rib < 8; rib++) chart.line(Array.from({ length: 21 }, (_, h) => domePoint(row, h / 20, rib / 8 * Math.PI * 2)), tint, 0.28);
          chart.tube([[x, 0.5, z], [x, height, z]], tint, 0.017, 0.55);
          chart.line([[x - r, 0.5, z], [x + r, 0.5, z]], tint, 0.45);
          chart.label(measure === 0 ? `${(value(row) * 100).toFixed(1)}%` : String(value(row)), [x, height - 0.18, z + r + 0.08], 0.19, tint);
          chart.label(`${row.conversions} / ${row.visitors}`, [x, height + r + 0.18, z], 0.17, tint);
        }
        const difference = value(b) - value(a);
        const text = measure === 0 ? `${(difference * 100).toFixed(1)} pp` : `${difference} ${measure === 1 ? 'conversions' : 'visitors'}`;
        chart.label(`B−A ${difference >= 0 ? '+' : ''}${text}`, [0, Math.max(ya, yb) + 0.42, z], 0.17, '#c8d9e3');
      }
    };
    const layer = createChartLayer(draw); app.add(layer);
    // One GPU point per eligible visitor keeps denominator size literal, not a decorative proxy.
    const population = new Points(new BufferGeometry(), new PointsMaterial({ size: 0.018, vertexColors: true, transparent: true, opacity: 0.68, depthWrite: false, toneMapped: false }));
    population.name = 'ab:eligible-visitor-domes';
    let visitorCount = 0, populationDisposed = false;
    const rebuildPopulation = () => {
      visitorCount = rows.reduce((sum, row) => sum + row.visitors, 0);
      const positions = new Float32Array(visitorCount * 3), colors = new Float32Array(visitorCount * 3);
      let offset = 0;
      for (const row of rows) {
        const tint = new Color(row.variant === 'A' ? '#b8e4ff' : '#ccffdc'), quiet = new Color(row.variant === 'A' ? '#3f7299' : '#487e61');
        for (let visitor = 0; visitor < row.visitors; visitor++, offset++) {
          // Equal increments of hemisphere height give equal surface-area cells.
          positions.set(domePoint(row, (visitor + 0.5) / row.visitors, visitor * Math.PI * (3 - Math.sqrt(5))), offset * 3);
          (visitor >= row.visitors - row.conversions ? tint : quiet).toArray(colors, offset * 3);
        }
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3)); geometry.setAttribute('color', new BufferAttribute(colors, 3));
      population.geometry.dispose(); population.geometry = geometry;
    };
    rebuildPopulation();
    const populationLayer: FiveLayer = { object: population, kind: 'experimentPopulation', get count() { return visitorCount; }, update() {}, set() {}, dispose() { if (populationDisposed) return; populationDisposed = true; population.geometry.dispose(); population.material.dispose(); population.removeFromParent(); } };
    app.add(populationLayer);
    const refresh = () => { rows = data.filter(row => segment === 0 || row.segment === SEGMENTS[segment - 1]); layer.redraw(draw); rebuildPopulation(); };
    return {
      controls: [
        { id: 'segment', label: 'Device segment', min: 0, max: 3, step: 1, value: segment, format: value => FILTERS[value], apply(value) { segment = value; refresh(); } },
        { id: 'measure', label: 'Dome base elevation', min: 0, max: 2, step: 1, value: measure, format: value => MEASURES[value], apply(value) { measure = value; refresh(); } },
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
