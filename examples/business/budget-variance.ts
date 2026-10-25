import { createChartLayer } from '../shared/chart.js';
import type { ChartBuilder } from '../shared/chart.js';
import type { ExampleDefinition, ExampleReadout } from '../types.js';

const departments = ['Engineering', 'Marketing', 'Operations', 'Support', 'Finance', 'People'];
const budgets = [80000, 45000, 60000, 30000, 25000, 35000];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** One row per department and month; scenario changes actuals, never the plan. */
export function budgetRows(month = 3, costChange = 0, department = 0) {
  if (!Number.isInteger(month) || month < 1 || month > 6 || !Number.isFinite(costChange) || costChange < -20 || costChange > 20 || !Number.isInteger(department) || department < 0 || department > 6) throw new RangeError('Invalid budget scenario.');
  return departments.map((name, i) => {
    const plan = budgets[i];
    const baseline = Math.round(plan * (1 + ((month * 7 + i * 11) % 29 - 12) / 100));
    const actual = Math.round(baseline * (1 + costChange / 100));
    return { department: name, index: i, month: `${months[month-1]} 2025`, plan, actual, variance: actual - plan };
  }).filter(row => department === 0 || row.index === department - 1);
}

const example: ExampleDefinition = {
  id: 'budget-variance', title: 'Budget tension field', category: 'Business',
  summary: 'A luminous field of spending petals stretches away from the budget.',
  description: 'Each department owns an equal-angle petal. Its footprint viewed from above encodes actual expense; a blue outline shows the plan. Over-budget petals rise in amber, while under-budget petals fall in cyan. Adjust costs to stretch the field and inspect the exact variance below.',
  tags: ['Radial field', 'Variance', 'Particle flows'], difficulty: 'Advanced', accent: '#f3c47c',
  camera: [5.8, 6.8, 8.5], target: [0, .7, 0], bloom: .42,
  dataNote: 'Synthetic department expenses, Jan–Jun 2025, USD per month. Variance = actual − plan. The cost-change slider applies one percentage to baseline actuals, rounded to dollars. Equal-angle annular petal footprint area is proportional to expense; height relative to the blue plan plane is variance ($15,000 per world unit). Particle movement is illustrative and does not change the values. No real company data.',
  setup(app) {
    let month = 3, change = 0, department = 0;
    let rows = budgetRows(month, change, department);
    const layer = createChartLayer(draw); app.add(layer);
    function draw(chart: ChartBuilder) {
      const plane = .8, inner = .85;
      const radius = (expense: number) => Math.sqrt(inner * inner + expense / 150000 * 16);
      const position = (r: number, angle: number, y: number): [number, number, number] => [Math.cos(angle) * r, y, Math.sin(angle) * r];
      for (const value of [50000, 100000, 150000]) {
        const r = radius(value);
        chart.ring([0, plane, 0], r, '#173c52', .012);
        chart.label(`$${value/1000}k area`, position(r, -Math.PI/2, plane-.2), .18, '#6e9dae');
      }
      chart.ring([0, plane, 0], .58, '#79d9ff', .04);
      chart.ring([0, plane-.2, 0], .72, '#2b728c', .02);
      chart.glow([0, plane, 0], '#43c9ef', 1.2);
      chart.label('BUDGET', [0, 1.65, 0], .25, '#b9e9f7');
      chart.label('PETAL AREA · USD  /  HEIGHT · VARIANCE', [0, -.4, 4.2], .19, '#94b7c3');
      for (const row of rows) {
        const mid = -Math.PI/2 + row.index * Math.PI/3;
        const begin = mid - .43, end = mid + .43;
        const actualRadius = radius(row.actual), planRadius = radius(row.plan);
        const height = plane + row.variance / 15000;
        const color = row.variance > 0 ? '#ffb35c' : '#57eed1';
        const grid: [number, number, number][][] = [];
        const colors: string[][] = [];
        for (let r = 0; r <= 8; r++) {
          const fraction = r / 8;
          grid.push(Array.from({length:25},(_,a)=>position(inner+(actualRadius-inner)*fraction,begin+(end-begin)*a/24,plane+(height-plane)*fraction)));
          colors.push(Array.from({length:25},()=>r>5?color:r>2?(row.variance>0?'#ad6234':'#268f87'):'#173c4d'));
        }
        chart.surface(grid, colors, .6);
        const actualArc = Array.from({length:33},(_,i)=>position(actualRadius,begin+(end-begin)*i/32,height));
        const planArc = Array.from({length:33},(_,i)=>position(planRadius,begin+(end-begin)*i/32,plane));
        chart.tube(actualArc,color,.025);chart.tube(planArc,'#64b8e7',.018,.6);
        for(const angle of [begin,end]) {
          chart.line([position(inner,angle,plane),position(planRadius,angle,plane)],'#3b7999',.65);
          chart.tube([position(inner,angle,plane),position(actualRadius,angle,height)],color,.012,.6);
        }
        const stream=[position(inner*.6,mid,plane),position((inner+actualRadius)/2,mid,plane+(height-plane)*.35),position(actualRadius,mid,height)];
        chart.flow(stream,{color,count:180,speed:.13+row.index*.012,size:.045,spread:.13,seed:31+row.index});
        chart.flow(actualArc,{color,count:70,speed:.17,size:.04,spread:.02,seed:81+row.index});
        chart.glow(position(actualRadius,mid,height),color,.55);
        chart.label(row.department,position(actualRadius+.62,mid,height+.25),.23,color);
        chart.label(`${row.variance>=0?'+':''}${usd(row.variance)}`,position(actualRadius+.62,mid,height-.1),.18,'#d0dfe4');
      }
    }
    function refresh() { rows = budgetRows(month, change, department); layer.redraw(draw); }
    return {
      controls: [
        { id: 'month', label: 'Reporting month', min: 1, max: 6, step: 1, value: month, format: value => `${months[value-1]} 2025`, apply(value) { month = value; refresh(); } },
        { id: 'cost-change', label: 'Cost scenario', min: -20, max: 20, step: 1, value: change, format: value => `${value > 0 ? '+' : ''}${value}%`, apply(value) { change = value; refresh(); } },
        { id: 'department', label: 'Department', min: 0, max: 6, step: 1, value: department, format: value => value ? departments[value-1] : 'All', apply(value) { department = value; refresh(); } },
      ],
      readout(): ExampleReadout {
        const plan = rows.reduce((sum, row) => sum + row.plan, 0), actual = rows.reduce((sum, row) => sum + row.actual, 0);
        return {
          metrics: [{ label: 'Planned expense', value: usd(plan) }, { label: 'Actual / scenario', value: usd(actual) }, { label: 'Variance vs plan', value: usd(actual-plan), detail: `${((actual-plan)/plan*100).toFixed(1)}% · positive = over budget` }],
          legend: [{ label: 'Plan outline', color: '#64b8e7' }, { label: 'Over plan · raised', color: '#ffb35c' }, { label: 'At / under plan · lowered', color: '#57eed1' }],
          table: { caption: `Synthetic expenses · ${months[month-1]} 2025 · ${change}% cost scenario`, columns: ['Department', 'Plan USD', 'Actual USD', 'Variance USD', 'Variance %'], rows: rows.map(row => [row.department, row.plan, row.actual, row.variance, +(row.variance / row.plan * 100).toFixed(2)]) },
        };
      },
    };
  },
};
export default example;
