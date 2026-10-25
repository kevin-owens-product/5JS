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
  summary: 'Compare an hourly signal with its known baseline and explicit threshold.',
  description: 'A deterministic seasonal baseline and known perturbations make every residual inspectable. Switch between the observed signal and residuals, shorten the trailing window, and adjust a threshold in the same units as the signal. Red points mark strict threshold exceedances.',
  tags: ['Residuals', 'Time series', 'Thresholds'], difficulty: 'Intermediate', accent: '#ffad96',
  camera: [8, 7, 12], target: [0, 2, 0], bloom: 0.03,
  dataNote: 'Synthetic hourly mean requests/minute, June 1–3, 2026 UTC. The baseline is known by construction, not fitted or forecast. A flag means |observed − baseline| > the chosen threshold. Threshold bands are operational rules, not confidence or prediction intervals, and imply no probability guarantee.',
  setup(app) {
    const series = createTimeSeries();
    let hours = 72, threshold = 20, view = 0;
    let rows = residualRows(series, hours, threshold);
    const x = (hour: number) => -4.5 + hour / 71 * 9;
    const draw = (chart: ChartBuilder) => {
      const residualView = view === 1;
      const y = (value: number) => residualView ? (value + 60) / 120 * 4.5 : value / 170 * 4.5;
      chart.frame({ x: [-5, 5], y: [0, 4.5], z: [-2, 2],
        xTicks: [{ value: x(0), label: 'Jun 1' }, { value: x(24), label: 'Jun 2' }, { value: x(48), label: 'Jun 3' }, { value: x(71), label: '23h' }],
        yTicks: (residualView ? [-60, 0, 60] : [0, 85, 170]).map(value => ({ value: y(value), label: String(value) })),
        zTicks: [{ value: 0, label: 'Hourly' }], xLabel: 'Time · UTC', yLabel: residualView ? 'Residual · requests/min' : 'Mean requests/min', zLabel: 'One signal',
      });
      chart.line(rows.map(row => [x(row.hour), y(residualView ? row.residual : row.observed), 0]), '#6ccfe3');
      chart.line(rows.map(row => [x(row.hour), y(residualView ? 0 : row.baseline), 0]), '#97b699', 0.85);
      for (const sign of [-1, 1]) chart.line(rows.map(row => [x(row.hour), y((residualView ? 0 : row.baseline) + sign * threshold), 0]), '#c8ac72', 0.65);
      for (const row of rows) if (row.flagged) chart.point([x(row.hour), y(residualView ? row.residual : row.observed), 0], '#ff8f80', 0.09);
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
