import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';
import type { ExampleDefinition, ExampleReadout } from '../types.js';
import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from 'three';
import type { FiveLayer } from '../../src/index.js';

export interface QualityRecord { source: string; id: string; amount: number | null; email: string | null }
const sourceNames = ['Store', 'App', 'Partner', 'Import'];
const colors = ['#7fc3f4', '#d7b9ff', '#efaf76'];

export function qualityRecords(): QualityRecord[] {
  return sourceNames.flatMap((source, s) => Array.from({ length: 80 }, (_, i) => ({
    source, id: `${source}-${i > 0 && i % (13 - s) === 0 ? i - 1 : i}`,
    amount: (i + s) % (17 - s) === 0 ? null : (i + 2 * s) % 23 === 0 ? -10 : 30 + (i * 37 + s * 11) % 260,
    email: (i + s * 3) % (11 + s) === 0 ? null : `record-${s}-${i}@example.test`,
  })));
}

/** Duplicate means every occurrence after the first, within each source. Flags may overlap. */
export function auditRecords(records: QualityRecord[], required: 'both' | 'amount' | 'email' = 'both', minimumAmount = 0) {
  if (!Number.isFinite(minimumAmount) || minimumAmount < 0 || minimumAmount > 150) throw new RangeError('Minimum amount must be 0…150.');
  return [...new Set(records.map(row => row.source))].map(source => {
    const rows = records.filter(row => row.source === source), seen = new Set<string>();
    let missing = 0, duplicate = 0, invalid = 0, flagged = 0;
    for (const row of rows) {
      const absent = (required !== 'email' && row.amount === null) || (required !== 'amount' && !row.email);
      const repeated = seen.has(row.id); seen.add(row.id);
      const badAmount = row.amount !== null && (!Number.isFinite(row.amount) || row.amount < minimumAmount);
      missing += +absent; duplicate += +repeated; invalid += +badAmount;
      flagged += +(absent || repeated || badAmount);
    }
    return { source, records: rows.length, missing, duplicate, invalid, flagged };
  }).filter(row => row.records > 0);
}

const example: ExampleDefinition = {
  id: 'data-quality', title: 'Data quality audit', category: 'Analytics',
  summary: 'Follow every record through a branching inspection manifold.',
  description: 'Four source lanes route individual records through missing-field, duplicate, and amount checks. A flagged record visits that check’s branch before continuing, so overlapping flags remain visible. Separate final exits distinguish passed records from records needing review; filter sources or change the actual validation rules.',
  tags: ['Data quality', 'Validation', 'Duplicates'], difficulty: 'Intermediate', accent: '#f6b783',
  camera: [8.2, 6.3, 11.8], target: [0, 2, 0], bloom: .16,
  dataNote: 'Synthetic fixture: 80 rows per source, 320 total. Each moving dot repeatedly traces one fixed record; this replay is not a live throughput measure. Branches mark its actual check flags and can overlap; the final review exit counts each affected row once. Rates use each source’s row count. Duplicates count occurrences after the first within a source. Null amounts are missing, not invalid. Minimum amount is a configurable rule, not statistical outlier detection. Vertical positions identify inspection routes, not a percentage axis.',
  setup(app) {
    const records = qualityRecords(); let source = 0, required = 0, minimum = 0;
    const requirements = ['both', 'amount', 'email'] as const;
    let rows = calculate();
    function calculate() { return auditRecords(source ? records.filter(row => row.source === sourceNames[source-1]) : records, requirements[required], minimum); }
    const laneZ = (name: string) => -2.1 + sourceNames.indexOf(name) * 1.4;
    const gates = [-2.25, -0.05, 2.1];
    function draw(chart: ChartBuilder) {
      chart.box({ x: 0, y: 0.08, z: 0, width: 9.4, height: 0.04, depth: 5.4, color: '#172334' });
      chart.line([[-4.7, 0.13, -2.7], [4.7, 0.13, -2.7], [4.7, 0.13, 2.7], [-4.7, 0.13, 2.7], [-4.7, 0.13, -2.7]], '#46657a', 0.55);
      gates.forEach((x, index) => chart.label(['Missing fields', 'Duplicate ID', 'Invalid amount'][index], [x, 4.2, 2.65], 0.21, colors[index]));
      chart.label('Source records', [-4.35, 3.3, 2.65], 0.21);
      chart.label('Review / passed', [4.35, 4.2, 2.65], 0.21);
      for (const row of rows) {
        const z = laneZ(row.source);
        chart.tube([[-4.45, 2.05, z], [3.15, 2.05, z]], '#4e6f87', 0.022, 0.65);
        chart.point([-4.45, 2.05, z], '#a6cfdf', 0.075);
        chart.label(row.source, [-4.35, 2.55, z], 0.19, '#bcdce6');
        [row.missing, row.duplicate, row.invalid].forEach((count, index) => {
          const x = gates[index], tint = colors[index];
          chart.box({ x, y: 2.05, z, width: 0.17, height: 0.45, depth: 0.42, color: tint, opacity: 0.32 });
          chart.tube([[x, 2.05, z], [x, 3.65, z]], tint, 0.022, count ? 0.9 : 0.2);
          chart.point([x, 3.65, z], tint, 0.055);
          chart.label(`${count}/${row.records}`, [x, 3.92, z], 0.18, tint);
        });
        chart.tube([[3.1, 2.05, z], [3.7, 2.7, z], [4.4, 3.3, z]], '#efaf76', 0.026);
        chart.tube([[3.1, 2.05, z], [3.7, 1.3, z], [4.4, 0.65, z]], '#80d9b6', 0.026);
        chart.point([4.4, 3.3, z], '#efaf76', 0.075); chart.point([4.4, 0.65, z], '#80d9b6', 0.075);
        chart.label(`${row.flagged} review`, [4.4, 3.6, z], 0.17, '#efbd93');
        chart.label(`${row.records - row.flagged} pass`, [4.4, 0.34, z], 0.17, '#a1e3c4');
      }
    }
    const layer = createChartLayer(draw); app.add(layer);
    const tracers = new Points(new BufferGeometry(), new PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
    tracers.name = 'quality:individual-record-replay';
    tracers.frustumCulled = false;
    let routes: { points: [number, number, number][]; cumulative: number[]; length: number }[] = [];
    let replayPhase = 0, replayDisposed = false;
    function animateRecords() {
      const positions = tracers.geometry.getAttribute('position') as BufferAttribute;
      routes.forEach((route, index) => {
        const distance = ((replayPhase + index / routes.length) % 1) * route.length;
        let segment = 0; while (segment < route.points.length - 2 && route.cumulative[segment + 1] < distance) segment++;
        const fraction = (distance - route.cumulative[segment]) / (route.cumulative[segment + 1] - route.cumulative[segment]);
        const a = route.points[segment], b = route.points[segment + 1];
        positions.setXYZ(index, a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction, a[2] + (b[2] - a[2]) * fraction);
      });
      positions.needsUpdate = true;
    }
    function rebuildReplay() {
      const selected = records.filter(record => source === 0 || record.source === sourceNames[source - 1]);
      const seen = new Set<string>(), rgb = new Float32Array(selected.length * 3);
      const passedColor = new Color('#9be2c8'), flaggedColor = new Color('#ffd1a0');
      routes = selected.map((record, index) => {
        const key = `${record.source}\0${record.id}`;
        const flags = [(requirements[required] !== 'email' && record.amount === null) || (requirements[required] !== 'amount' && !record.email), seen.has(key), record.amount !== null && (!Number.isFinite(record.amount) || record.amount < minimum)];
        seen.add(key);
        const flagged = flags.some(Boolean), z = laneZ(record.source);
        const points: [number, number, number][] = [[-4.45, 2.05, z]];
        gates.forEach((x, check) => { points.push([x, 2.05, z]); if (flags[check]) points.push([x, 3.65, z], [x, 2.05, z]); });
        points.push([3.1, 2.05, z], [3.7, flagged ? 2.7 : 1.3, z], [4.4, flagged ? 3.3 : 0.65, z]);
        const cumulative = [0];
        for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(...points[i].map((value, axis) => value - points[i - 1][axis])));
        (flagged ? flaggedColor : passedColor).toArray(rgb, index * 3);
        return { points, cumulative, length: cumulative[cumulative.length - 1] };
      });
      const geometry = new BufferGeometry(); geometry.setAttribute('position', new BufferAttribute(new Float32Array(selected.length * 3), 3)); geometry.setAttribute('color', new BufferAttribute(rgb, 3));
      tracers.geometry.dispose(); tracers.geometry = geometry; animateRecords();
    }
    rebuildReplay();
    const replay: FiveLayer = { object: tracers, kind: 'qualityRecordReplay', get count() { return routes.length; }, update(_time, delta) { if (replayDisposed || !Number.isFinite(delta) || delta <= 0) return; replayPhase = (replayPhase + delta * 0.075) % 1; animateRecords(); }, set() {}, dispose() { if (replayDisposed) return; replayDisposed = true; tracers.geometry.dispose(); tracers.material.dispose(); tracers.removeFromParent(); } };
    app.add(replay);
    function refresh() { rows = calculate(); layer.redraw(draw); rebuildReplay(); }
    return {
      controls: [
        { id: 'source', label: 'Source', min: 0, max: 4, step: 1, value: source, format: value => value ? sourceNames[value-1] : 'All', apply(value) { source = value; refresh(); } },
        { id: 'required', label: 'Required fields', min: 0, max: 2, step: 1, value: required, format: value => ['Amount + email', 'Amount only', 'Email only'][value], apply(value) { required = value; refresh(); } },
        { id: 'minimum', label: 'Minimum valid amount', min: 0, max: 150, step: 10, value: minimum, format: value => `$${value}`, apply(value) { minimum = value; refresh(); } },
      ],
      readout(): ExampleReadout {
        const count = rows.reduce((sum, row) => sum + row.records, 0), affected = rows.reduce((sum, row) => sum + row.flagged, 0);
        return {
          metrics: [{ label: 'Records checked', value: String(count) }, { label: 'Affected records', value: String(affected), detail: 'Distinct rows with one or more flags' }, { label: 'Pass rate', value: `${((count-affected)/count*100).toFixed(1)}%` }],
          legend: ['Missing required', 'Duplicate occurrence', 'Invalid amount'].map((label, i) => ({ label, color: colors[i] })),
          table: { caption: 'Synthetic audit results · counts may overlap across checks', columns: ['Source', 'Rows', 'Missing', 'Duplicates', 'Invalid', 'Affected rows', 'Pass %'], rows: rows.map(row => [row.source, row.records, row.missing, row.duplicate, row.invalid, row.flagged, +((row.records-row.flagged)/row.records*100).toFixed(2)]) },
        };
      },
    };
  },
};
export default example;
