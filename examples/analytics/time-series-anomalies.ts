import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';

export interface TimeObservation { hour: number; timestamp: string; baseline: number; observed: number }
export interface ResidualObservation extends TimeObservation { residual: number; flagged: boolean }

export function createTimeSeries(): TimeObservation[] {
  const injected: Record<number, number> = { 8: 32, 19: -28, 38: 45, 53: -36, 65: 40 };
  return Array.from({ length: 72 }, (_, hour) => {
    const baseline = 100 + 14 * Math.sin(hour / 24 * Math.PI * 2) + 8 * Math.cos(hour / 12 * Math.PI * 2);
    const residual = (hour * 13 % 17 - 8) * 1.4 + (injected[hour] ?? 0);
    return { hour, timestamp: new Date(Date.UTC(2026, 5, 1, hour)).toISOString(), baseline, observed: baseline + residual };
  });
}

export function residualRows(series: readonly TimeObservation[], hours: number, threshold: number): ResidualObservation[] {
  if (!Number.isInteger(hours) || hours < 1) throw new RangeError('hours must be a positive integer.');
  if (!Number.isFinite(threshold) || threshold < 0) throw new RangeError('threshold must be finite and nonnegative.');
  return series.slice(-hours).map(row => {
    const residual = row.observed - row.baseline;
    return { ...row, residual, flagged: Math.abs(residual) > threshold };
  });
}

export function summarizeResiduals(rows: readonly ResidualObservation[]) {
  const flagged = rows.filter(row => row.flagged).length;
  return { count: rows.length, flagged, flaggedRate: rows.length ? flagged / rows.length : null,
    meanAbsoluteResidual: rows.length ? rows.reduce((sum, row) => sum + Math.abs(row.residual), 0) / rows.length : null };
}

const example: ExampleDefinition = {
  id: 'time-series-anomalies', title: 'Time-series anomalies', category: 'Analytics',
  summary: 'Inspect a signal corridor where residual bridges connect baseline to observation.',
  description: 'Two illuminated rails separate the known baseline from the observed hourly signal. A translucent bridge curtain exposes their differences; amber boundaries form the operational tolerance corridor. Moving inspection traces travel through the fixed samples, and coral bridges identify strict threshold exceedances.',
  tags: ['Residuals', 'Time series', 'Thresholds'], difficulty: 'Intermediate', accent: '#ffad96',
  camera: [7, 5.2, 10.8], target: [0, 2, 0], bloom: 0.2,
  dataNote: 'Synthetic hourly mean requests/minute, June 1–3, 2026 UTC. The baseline is known by construction, not fitted or forecast. A flag means |observed − baseline| > the chosen threshold. Threshold surfaces are operational rules, not confidence or prediction intervals. Rail paths interpolate between the fixed hourly samples; traveling inspection lights do not add observations. Depth separates baseline and observed lanes and is not elapsed time.',
  setup(app) {
    const series = createTimeSeries();
    let hours = 72, threshold = 20, view = 0;
    let rows = residualRows(series, hours, threshold);
    const x = (hour: number) => -4.5 + hour / 71 * 9;
    const draw = (chart: ChartBuilder) => {
      const residualView = view === 1;
      const y = (value: number) => 0.2 + (residualView ? (value + 60) / 120 : value / 170) * 4;
      const baseline = (row: ResidualObservation) => residualView ? 0 : row.baseline;
      const observed = (row: ResidualObservation) => residualView ? row.residual : row.observed;
      chart.frame({ x: [-4.8, 4.8], y: [0.2, 4.2], z: [-1.65, 1.65],
        xTicks: [{ value: x(0), label: 'Jun 1' }, { value: x(24), label: 'Jun 2' }, { value: x(48), label: 'Jun 3' }, { value: x(71), label: '23h' }],
        yTicks: (residualView ? [-60, 0, 60] : [0, 85, 170]).map(value => ({ value: y(value), label: String(value) })),
        zTicks: [{ value: -1.15, label: residualView ? 'Zero' : 'Baseline' }, { value: 1.15, label: residualView ? 'Residual' : 'Observed' }], xLabel: 'Time · UTC', yLabel: residualView ? 'Residual · requests/min' : 'Mean requests/min',
      });
      const observedPath = rows.map(row => [x(row.hour), y(observed(row)), 1.15] as [number, number, number]);
      const baselinePath = rows.map(row => [x(row.hour), y(baseline(row)), -1.15] as [number, number, number]);
      chart.surface(rows.map(row => [[x(row.hour), y(baseline(row)), -1.15], [x(row.hour), y(observed(row)), 1.15]]), rows.map(row => ['#6db899', row.flagged ? '#ef8f85' : '#4fa4c4']), 0.22);
      chart.tube(baselinePath, '#84c8a4', 0.022);
      chart.tube(observedPath, '#6bd8ed', 0.03);
      for (const sign of [-1, 1]) {
        const boundary = rows.map(row => [[x(row.hour), y(baseline(row) + sign * threshold), -1.15], [x(row.hour), y(baseline(row) + sign * threshold), 1.15]] as [number, number, number][]);
        chart.surface(boundary, rows.map(() => ['#b9904f', '#c8ac72']), 0.08);
        chart.line(boundary.map(pair => pair[1]), '#c8ac72', 0.6);
      }
      for (const row of rows) {
        const bridge: [number, number, number][] = [[x(row.hour), y(baseline(row)), -1.15], [x(row.hour), y(observed(row)), 1.15]];
        if (row.flagged) { chart.tube(bridge, '#ef8f85', 0.016); chart.glow(bridge[1], '#ff9a86', 0.26); }
        else chart.line(bridge, '#5f8ba7', 0.2);
        chart.point(bridge[1], row.flagged ? '#ff9a86' : '#91deef', row.flagged ? 0.057 : 0.026);
      }
      chart.flow(observedPath, { color: '#d3f6ff', count: 18, speed: 0.075, size: 0.043, spread: 0, seed: 12 });
      chart.flow(baselinePath, { color: '#bbf3c9', count: 12, speed: 0.075, size: 0.035, spread: 0, seed: 12 });
      [...rows].filter(row => row.flagged).sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual)).slice(0, 4).forEach(row => chart.label(`${row.residual > 0 ? '+' : ''}${row.residual.toFixed(1)}`, [x(row.hour), y(observed(row)) + 0.2, 1.35], 0.19, '#ffb3a2'));
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { rows = residualRows(series, hours, threshold); layer.redraw(draw); };
    return {
      controls: [
        { id: 'window', label: 'Trailing window', min: 24, max: 72, step: 12, value: hours, format: value => `${value} hours`, apply(value) { hours = value; refresh(); } },
        { id: 'threshold', label: 'Absolute residual limit', min: 5, max: 40, step: 1, value: threshold, format: value => `${value} requests/min`, apply(value) { threshold = value; refresh(); } },
        { id: 'view', label: 'Signal view', min: 0, max: 1, step: 1, value: view, format: value => value === 0 ? 'Observed + baseline' : 'Residual', apply(value) { view = value; refresh(); } },
      ],
      readout() {
        const summary = summarizeResiduals(rows);
        return {
          metrics: [
            { label: 'Flagged observations', value: String(summary.flagged), detail: `${summary.count} displayed hours; strict |residual| > ${threshold}.` },
            { label: 'Flagged share', value: summary.flaggedRate === null ? 'No observations' : `${(summary.flaggedRate * 100).toFixed(1)}%`, detail: 'Descriptive fraction, not an estimated error probability.' },
            { label: 'Mean absolute residual', value: summary.meanAbsoluteResidual === null ? 'No observations' : summary.meanAbsoluteResidual.toFixed(2), detail: 'Requests/min, over the displayed hours.' },
          ],
          legend: [{ label: view === 0 ? 'Observed' : 'Residual', color: '#6ccfe3' }, { label: view === 0 ? 'Known baseline' : 'Zero residual', color: '#97b699' }, { label: 'Rule threshold', color: '#c8ac72' }, { label: 'Threshold exceeded', color: '#ff8f80' }],
          table: { caption: 'All displayed hourly observations; calculations use full precision, table values are rounded. UTC timestamps.', columns: ['UTC hour', 'Observed', 'Baseline', 'Residual', 'Flag'], rows: rows.map(row => [row.timestamp.slice(5, 16).replace('T', ' '), row.observed.toFixed(2), row.baseline.toFixed(2), `${row.residual >= 0 ? '+' : ''}${row.residual.toFixed(2)}`, row.flagged ? 'Yes' : 'No']) },
        };
      },
    };
  },
};
export default example;
