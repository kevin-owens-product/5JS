import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';
import type { ExampleDefinition, ExampleReadout } from '../types.js';

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
  summary: 'Measure missing fields, duplicate records, and failed amount rules.',
  description: 'Compare three quality checks across four synthetic sources. Change the required fields or the minimum valid amount and inspect how the affected-record count differs from the sum of overlapping flags.',
  tags: ['Data quality', 'Validation', 'Duplicates'], difficulty: 'Intermediate', accent: '#f6b783',
  camera: [8, 7, 12], target: [0, 2, 0], bloom: .04,
  dataNote: 'Synthetic fixture: 80 rows per source, 320 total. Rates use each source’s row count. Duplicates count occurrences after the first within a source. Null amounts are missing, not invalid. Flag categories can overlap; affected records are counted once. Minimum amount is a configurable rule, not statistical outlier detection.',
  setup(app) {
    const records = qualityRecords(); let source = 0, required = 0, minimum = 0;
    const requirements = ['both', 'amount', 'email'] as const;
    let rows = calculate();
    function calculate() { return auditRecords(source ? records.filter(row => row.source === sourceNames[source-1]) : records, requirements[required], minimum); }
    function draw(chart: ChartBuilder) {
      chart.frame({ x: [-5, 5], y: [0, 5], z: [-2.5, 2.5],
        xTicks: rows.map(row => ({ value: -3.75 + sourceNames.indexOf(row.source) * 2.5, label: row.source })),
        yTicks: [0, 25, 50, 75, 100].map(value => ({ value: value / 20, label: `${value}%` })),
        zTicks: [{ value: -1.6, label: 'Missing' }, { value: 0, label: 'Duplicate' }, { value: 1.6, label: 'Invalid' }], xLabel: 'Source', yLabel: 'Share of source rows' });
      for (const row of rows) [row.missing, row.duplicate, row.invalid].forEach((count, i) => chart.bar({ x: -3.75 + sourceNames.indexOf(row.source) * 2.5, z: -1.6 + i * 1.6, value: 5 * count / row.records, width: 1.1, depth: .8, color: colors[i] }));
    }
    const layer = createChartLayer(draw); app.add(layer);
    function refresh() { rows = calculate(); layer.redraw(draw); }
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
