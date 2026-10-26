import type { ExampleDefinition, ExampleReadout } from '../types.js';
import { conversionModel, createOutcomeDataset, decisionCopy, palette, productModel, retentionModel, segments, type Decision } from './model.js';
import { createDecisionScene } from './scene.js';

export function decisionRecipe(decision: Decision): ExampleDefinition {
  const copy = decisionCopy[decision];
  return {
    id: `source-${decision}`, title: copy.short, category: decision === 'conversion' ? 'Business' : 'Analytics', outcome: copy.title,
    workbench: `../?outcome=${decision}#decision-lab`, summary: copy.description,
    description: `${copy.description} Open the full decision workspace for exact source records, linked accounts, scenario comparisons, and an exportable investigation brief.`,
    tags: ['Source records', 'Decision workflow', decision], difficulty: 'Advanced', accent: palette[decision],
    camera: decision === 'product' ? [11, 7, 18] : [11, 8, 17], bloom: .3, previewTime: 2,
    dataNote: 'Entirely fictional joined source snapshots. Conversion counts checkout attempts, retention counts distinct mature accounts, and product views distinguish interview records from distinct accounts. Scenario controls do not alter historical observations. Gate area represents stage counts; cohort ribbon height represents active-account share; initiative position encodes account evidence coverage and estimated effort. The full workspace reads the same fixture through JSON connectors; no live provider accounts are queried.',
    setup(app) {
      const data = createOutcomeDataset(), scene = createDecisionScene(data, decision); app.add(scene);
      let segment = 0, scenario = decision === 'conversion' ? 25 : decision === 'retention' ? 100 : 3;
      function redraw() { scene.configure(decision, segments[segment], scenario); }
      redraw();
      function readout(): ExampleReadout {
        if (decision === 'conversion') {
          const model = conversionModel(data, segments[segment], scenario);
          return { metrics: [{ label: 'Observed completion', value: `${(model.rate * 100).toFixed(1)}%`, detail: `${model.completed.length}/${model.attempts.length} attempts` }, { label: 'Payment timeouts', value: String(model.failed.length) }, { label: 'Modeled extra completions', value: model.modeledCompletions.toFixed(1), detail: `${scenario}% recovery assumption; not a forecast` }], legend: [{ label: 'Completed attempts', color: palette.conversion }, { label: 'Recorded exits', color: palette.negative }], table: { caption: 'Observed funnel; stages are cumulative and must not be summed.', columns: ['Stage', 'Attempts'], rows: model.stages.map((count, i) => [['Started', 'Address', 'Payment', 'Completed'][i], count]) } };
        }
        if (decision === 'retention') {
          const model = retentionModel(data, segments[segment], scenario);
          return { metrics: [{ label: 'Week-12 active', value: `${model.active}/${model.accounts.length}`, detail: 'All cohorts have a complete 12-week window.' }, { label: 'Accounts to review', value: String(model.queue.length), detail: 'Observed renewal, usage, and support signals.' }, { label: 'Annual value in queue', value: `${model.annualValue.toLocaleString('en-US')} USD`, detail: 'Context, not a churn forecast.' }], table: { caption: 'Distinct active accounts at each observation, not survival probabilities.', columns: ['Cohort', 'Week 0', 'Week 4', 'Week 8', 'Week 12'], rows: model.cohorts.map(cohort => [cohort.name, ...cohort.counts]) } };
        }
        const model = productModel(data, segments[segment], scenario);
        return { metrics: [{ label: 'Initiatives', value: String(model.initiatives.length) }, { label: 'Discovery capacity', value: `${scenario} weeks`, detail: 'Planning assumption.' }, { label: 'Within capacity', value: String(model.initiatives.filter(row => row.feasible).length), detail: 'No implied recommendation to ship.' }], table: { caption: 'Qualitative evidence and fictional effort estimates; request volume is not impact.', columns: ['Initiative', 'Distinct accounts', 'Supporting accounts', 'Contradicting interviews', 'Estimated weeks'], rows: model.initiatives.map(row => [row.name, row.customers, row.supporters, row.contradictions, row.effort]) } };
      }
      return { controls: [{ id: 'segment', label: 'Account segment', min: 0, max: 3, step: 1, value: 0, format: value => segments[value], apply(value) { if (!Number.isInteger(value) || value < 0 || value > 3) throw new Error('Invalid segment.'); segment = value; redraw(); } }, { id: 'scenario', label: decision === 'conversion' ? 'Assumed recovery (%)' : decision === 'retention' ? 'Review coverage (%)' : 'Discovery capacity (weeks)', min: decision === 'product' ? 1 : 0, max: decision === 'conversion' ? 50 : decision === 'retention' ? 100 : 6, step: decision === 'product' ? 1 : 5, value: scenario, apply(value) { if (!Number.isFinite(value) || value < (decision === 'product' ? 1 : 0) || value > (decision === 'conversion' ? 50 : decision === 'retention' ? 100 : 6)) throw new Error('Invalid scenario.'); scenario = value; redraw(); } }], readout };
    },
  };
}
