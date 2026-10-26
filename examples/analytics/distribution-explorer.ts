import type { ExampleDefinition } from '../types.js';
import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder, Position } from '../shared/chart.js';
import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from 'three';
import type { FiveLayer } from '../../src/index.js';

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
  summary: 'Follow individual requests through a vaulted sample-to-density instrument.',
  description: 'Ninety-six request sparks descend from a suspended latency rail into vaulted bin chambers. Each chamber exposes an exact histogram section: its peak shows count or density, while its width preserves the bin interval. Re-bin or narrow the range to watch the same samples redistribute and reveal the normalization.',
  tags: ['Histogram', 'Density', 'Bin boundaries'], difficulty: 'Intermediate', accent: '#c2a5ef',
  camera: [6.4, 4.5, 9.4], target: [0, 1.9, 0], bloom: 0.18,
  dataNote: 'Synthetic individual request latencies in milliseconds; 96 fixed observations, no live service data. Bins include their lower edge and exclude the upper edge, except the final bin includes both. Range filtering happens before normalization. Density units are 1/ms and describe included observations only. At each vault midpoint, the outlined rectangle has the exact bin width and count/density height. In density mode, its area in ms × 1/ms is the included probability mass. Curved roof depth and chamber volume have no analytical meaning. Exactly one animated spark represents each request, preserving its latency X coordinate as it replays entry into its bin. Spark depth, vertical packing, paths and replay speed are inspection aids, not arrival times or throughput. Excluded requests use a separate orange dock, not the latency axis.',
  setup(app) {
    const observations = createLatencyObservations();
    let binCount = 8, upper = 800, measure = 0;
    let result = histogram(observations, 0, upper, binCount);
    const floor = 0.24;
    const height = (bin: HistogramBin) => floor + (measure === 1 ? bin.density ?? 0 : bin.count) / (measure === 1 ? 0.016 : 64) * 4.05;
    const tint = (bin: number) => bin % 2 ? '#bc9af1' : '#7fdae5';
    const sampleRoutes = () => {
      const ranks = new Array<number>(binCount).fill(0); let excluded = 0;
      return observations.map(value => {
        if (value > upper) return { start: [4.63, 4.24, -2.48] as Position, end: [4.63, 0.4 + excluded++ * 0.08, 1.85] as Position, color: '#f4ad83' };
        const position = value / result.width, nearestEdge = Math.round(position);
        const atEdge = Math.abs(position - nearestEdge) <= Number.EPSILON * Math.max(1, Math.abs(position)) * 4;
        const index = Math.min(binCount - 1, atEdge ? nearestEdge : Math.floor(position)), bin = result.bins[index], rank = ranks[index]++;
        const x = -4.4 + value / upper * 8.8, z = (rank % 7 / 6 - 0.5) * 3.4;
        const section = Math.sqrt(1 - (z / 2.2) ** 2);
        return { start: [x, 4.24, -2.48] as Position, end: [x, floor + (height(bin) - floor) * section * (0.22 + (Math.floor(rank / 7) + 0.5) / Math.ceil(bin.count / 7) * 0.65), z] as Position, color: tint(index) };
      });
    };
    let routes = sampleRoutes();
    const draw = (chart: ChartBuilder) => {
      const density = measure === 1, yMaximum = density ? 0.016 : 64;
      chart.frame({ x: [-4.7, 4.7], y: [floor, 4.29], z: [-2.6, 2.4],
        xTicks: [0, 0.25, 0.5, 0.75, 1].map(fraction => ({ value: -4.4 + fraction * 8.8, label: `${fraction * upper}` })),
        yTicks: [0, 0.5, 1].map(fraction => ({ value: floor + fraction * 4.05, label: density ? (fraction * yMaximum).toFixed(3) : String(fraction * yMaximum) })),
        xLabel: 'Latency · ms', yLabel: density ? 'Density · 1/ms' : 'Requests per bin',
      });
      chart.box({ x: 0, y: 0.1, z: 0, width: 8.85, height: 0.04, depth: 4.4, color: '#152136' });
      chart.tube([[-4.4, 4.24, -2.48], [4.4, 4.24, -2.48]], '#c7d0f5', 0.027);
      chart.tube([[-4.52, floor, -2.48], [-4.52, 3.8, -2.48], [-4.4, 4.24, -2.48]], '#677b9e', 0.022);
      chart.label('96 requests · replay into bins', [0, 4.45, -2.48], 0.21, '#d8d6f1');
      for (let i = 0; i < result.bins.length; i++) {
        const bin = result.bins[i], value = density ? bin.density ?? 0 : bin.count;
        const left = -4.4 + i / binCount * 8.8, right = -4.4 + (i + 1) / binCount * 8.8;
        const center = (left + right) / 2, top = height(bin), color = tint(i);
        // The exact rectangular section is exposed inside a decorative curved vault.
        const section: Position[][] = [[[left, floor, 0], [right, floor, 0]], [[left, top, 0], [right, top, 0]]];
        chart.surface(section, [['#243a53', '#243a53'], [color, color]], 0.24);
        chart.line([[left, floor, 0], [left, top, 0], [right, top, 0], [right, floor, 0], [left, floor, 0]], color, 0.95);
        const roof = Array.from({ length: 25 }, (_, step): Position[] => {
          const angle = step / 24 * Math.PI, y = floor + (top - floor) * Math.sin(angle), z = -2.2 * Math.cos(angle);
          return [[left, y, z], [right, y, z]];
        });
        chart.surface(roof, roof.map((_, step) => [step < 12 ? '#465777' : color, step < 12 ? '#465777' : color]), 0.24);
        chart.tube(roof.map(row => row[0]), color, 0.012, 0.65);
        chart.tube(roof.map(row => row[1]), color, 0.012, 0.65);
        chart.line([[left, floor, -2.2], [left, floor, 2.2], [right, floor, 2.2]], color, 0.5);
        if (bin.count && (binCount <= 10 || i % 2 === 0)) chart.label(density ? value.toFixed(3) : String(bin.count), [center, top + 0.17, 0], 0.16, '#e1d9fc');
      }
      routes.forEach(({ start, end, color }) => {
        // Thin guide filaments reveal the complete route even while its one sample moves.
        chart.line(Array.from({ length: 17 }, (_, step): Position => {
          const t = step / 16;
          return [start[0], start[1] + (end[1] - start[1]) * t, start[2] + (end[2] - start[2]) * t * t];
        }), color, 0.13);
      });
      if (result.excludedCount) chart.label(`${result.excludedCount} outside`, [4.63, 0.7 + result.excludedCount * 0.08, 1.85], 0.17, '#f4ad83');
    };
    const layer = createChartLayer(draw); app.add(layer);
    const geometry = new BufferGeometry(), positions = new BufferAttribute(new Float32Array(observations.length * 3), 3), colors = new BufferAttribute(new Float32Array(observations.length * 3), 3);
    geometry.setAttribute('position', positions); geometry.setAttribute('color', colors);
    const samples = new Points(geometry, new PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
    samples.name = 'distribution:one-point-per-request'; samples.frustumCulled = false;
    let elapsed = 0, disposed = false;
    const animateSamples = () => {
      routes.forEach(({ start, end, color }, index) => {
        const phase = (elapsed * 0.085 + index * 0.61803398875) % 1;
        const t = Math.min(1, phase / 0.76);
        positions.setXYZ(index, start[0], start[1] + (end[1] - start[1]) * t, start[2] + (end[2] - start[2]) * t * t);
        const tint = new Color(color); colors.setXYZ(index, tint.r, tint.g, tint.b);
      });
      positions.needsUpdate = true; colors.needsUpdate = true; geometry.computeBoundingBox();
    };
    animateSamples();
    const sampleLayer: FiveLayer = { object: samples, kind: 'histogramSamples', count: observations.length,
      update(_time, delta) { if (disposed || !Number.isFinite(delta) || delta <= 0) return; elapsed += delta; animateSamples(); }, set() {},
      dispose() { if (disposed) return; disposed = true; geometry.dispose(); samples.material.dispose(); samples.removeFromParent(); },
    };
    app.add(sampleLayer);
    const refresh = () => { result = histogram(observations, 0, upper, binCount); routes = sampleRoutes(); layer.redraw(draw); animateSamples(); };
    return {
      controls: [
        { id: 'bins', label: 'Number of bins', min: 4, max: 16, step: 1, value: binCount, apply(value) { binCount = value; refresh(); } },
        { id: 'upper', label: 'Range upper bound', min: 400, max: 1000, step: 100, value: upper, format: value => `${value} ms`, apply(value) { upper = value; refresh(); } },
        { id: 'measure', label: 'Chamber section height', min: 0, max: 1, step: 1, value: measure, format: value => value === 0 ? 'Count' : 'Density · 1/ms', apply(value) { measure = value; refresh(); } },
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
