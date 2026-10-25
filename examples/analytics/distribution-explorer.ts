import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';

export function createLatencyObservations(): number[] {
  return Array.from({ length: 96 }, (_, i) => 90 + i * 17 % 60 + (i % 7) ** 2 * 8 + (i % 23 === 0 ? 360 : 0));
}
export interface HistogramBin { lower: number; upper: number; count: number; density: number | null }

/** Left-closed bins; only the final bin includes its upper edge. */
export function histogram(observations: readonly number[], lower: number, upper: number, binCount: number) {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) throw new RangeError('Histogram bounds must be finite and increasing.');
  if (!Number.isInteger(binCount) || binCount < 1 || binCount > 100) throw new RangeError('Histogram binCount must be an integer from 1 to 100.');
  if (!observations.every(Number.isFinite)) throw new RangeError('Histogram observations must be finite.');
  const width = (upper - lower) / binCount;
  const included = observations.filter(value => value >= lower && value <= upper);
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({ lower: lower + i * width, upper: lower + (i + 1) * width, count: 0, density: null }));
  for (const value of included) {
    const position = (value - lower) / width, nearestEdge = Math.round(position);
    // Preserve intended decimal boundary ties despite binary floating-point noise.
    const atEdge = Math.abs(position - nearestEdge) <= Number.EPSILON * Math.max(1, Math.abs(position)) * 4;
    bins[Math.min(binCount - 1, atEdge ? nearestEdge : Math.floor(position))].count++;
  }
  for (const bin of bins) bin.density = included.length ? bin.count / (included.length * width) : null;
  return { bins, included, excludedCount: observations.length - included.length, width };
}

const example: ExampleDefinition = {
  id: 'distribution-explorer', title: 'Distribution explorer', category: 'Analytics',
  summary: 'Inspect bin boundaries, excluded observations, and normalized density.',
  description: 'Re-bin the same 96 request latencies. Narrow the range to inspect the main distribution while explicitly counting excluded observations. Switch from counts to density; density is count divided by included sample size and bin width, so its area is one.',
  tags: ['Histogram', 'Density', 'Bin boundaries'], difficulty: 'Intermediate', accent: '#c2a5ef',
  camera: [8, 7, 12], target: [0, 2, 0], bloom: 0.04,
  dataNote: 'Synthetic individual request latencies in milliseconds; 96 fixed observations, no live service data. Bins include their lower edge and exclude the upper edge, except the final bin includes both. Range filtering happens before normalization. Density units are 1/ms and describe included observations only; observations outside the range are counted separately.',
  setup(app) {
    const observations = createLatencyObservations();
    let binCount = 8, upper = 800, measure = 0;
    let result = histogram(observations, 0, upper, binCount);
    const draw = (chart: ChartBuilder) => {
      const density = measure === 1, yMaximum = density ? 0.02 : 96;
      chart.frame({ x: [-5, 5], y: [0, 4.5], z: [-2, 2],
        xTicks: [0, 0.5, 1].map(fraction => ({ value: -4.5 + fraction * 9, label: `${fraction * upper}` })),
        yTicks: [0, 0.5, 1].map(fraction => ({ value: fraction * 4.5, label: density ? (fraction * yMaximum).toFixed(2) : String(fraction * yMaximum) })),
        zTicks: [{ value: 0, label: 'Requests' }],
        xLabel: 'Latency · ms', yLabel: density ? 'Density · 1/ms' : 'Request count', zLabel: 'One sample',
      });
      for (let i = 0; i < result.bins.length; i++) {
        const bin = result.bins[i], value = density ? bin.density ?? 0 : bin.count;
        const x = -4.5 + (i + 0.5) / binCount * 9;
        chart.bar({ x, z: 0, value: value / yMaximum * 4.5, width: 9 / binCount * 0.87, depth: 1.3, color: '#b59be4' });
        chart.label(density ? value.toFixed(3) : String(bin.count), [x, value / yMaximum * 4.5 + 0.18, 0], 0.18);
      }
    };
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => { result = histogram(observations, 0, upper, binCount); layer.redraw(draw); };
    return {
      controls: [
        { id: 'bins', label: 'Number of bins', min: 4, max: 16, step: 1, value: binCount, apply(value) { binCount = value; refresh(); } },
        { id: 'upper', label: 'Range upper bound', min: 400, max: 1000, step: 100, value: upper, format: value => `${value} ms`, apply(value) { upper = value; refresh(); } },
        { id: 'measure', label: 'Column height', min: 0, max: 1, step: 1, value: measure, format: value => value === 0 ? 'Count' : 'Density · 1/ms', apply(value) { measure = value; refresh(); } },
      ],
      readout() {
        const sorted = [...result.included].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
        const median = sorted.length ? (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) : null;
        return {
          metrics: [
            { label: 'Included requests', value: String(result.included.length), detail: `Of ${observations.length} fixed observations; range 0–${upper} ms inclusive.` },
            { label: 'Outside range', value: String(result.excludedCount), detail: 'Excluded observations do not enter density normalization.' },
            { label: 'Included median', value: median === null ? 'No observations' : `${median.toFixed(1)} ms`, detail: `Bin width ${result.width.toFixed(2)} ms; median uses original observations.` },
          ],
          legend: [{ label: measure === 0 ? 'Count per bin' : 'Density normalized over included requests', color: '#b59be4' }],
          table: { caption: 'Exact counts and normalized values for all displayed bins. Density × bin width sums to one when observations are included.', columns: ['Interval ms', 'Count', 'Included share', 'Density 1/ms'], rows: result.bins.map((bin, i) => [`[${bin.lower.toFixed(2)}, ${bin.upper.toFixed(2)}${i === binCount - 1 ? ']' : ')'}`, bin.count, result.included.length ? `${(bin.count / result.included.length * 100).toFixed(2)}%` : 'Undefined', bin.density === null ? 'Undefined' : bin.density.toFixed(5)]) },
        };
      },
    };
  },
};
export default example;
