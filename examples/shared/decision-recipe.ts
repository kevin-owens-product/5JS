import { createChartLayer, type ChartBuilder, type Position } from './chart.js';
import type { ExampleDefinition } from '../types.js';

export interface DecisionRow { id: string; label: string; owner: string; eligible: number; affected: number; action: string }
export interface DecisionRecipe {
  id: string; title: string; outcome: string; summary: string; accent: string; unit: string; note: string;
  view: string; rows: DecisionRow[];
}
/** Scenario arithmetic, not a prediction. Each selected group consumes one review slot. */
export function reviewPlan(rows: readonly DecisionRow[], focus: number, capacity: number, addressable: number) {
  if (!Number.isInteger(focus) || focus < 0 || focus > rows.length || !Number.isInteger(capacity) || capacity < 0 || capacity > rows.length || !Number.isFinite(addressable) || addressable < 0 || addressable > 1) throw new RangeError('Invalid review scenario.');
  if (new Set(rows.map(row => row.id)).size !== rows.length || rows.some(row => !Number.isInteger(row.eligible) || !Number.isInteger(row.affected) || row.eligible <= 0 || row.affected < 0 || row.affected > row.eligible)) throw new RangeError('Invalid snapshot counts or duplicate record IDs.');
  const scoped = focus ? rows.slice(focus - 1, focus) : [...rows];
  const selected = new Set([...scoped].sort((a,b) => b.affected - a.affected || a.id.localeCompare(b.id)).slice(0,capacity).map(row => row.id));
  return scoped.map(row => ({...row, selected:selected.has(row.id), share:row.affected / row.eligible, modeled:selected.has(row.id) ? Math.floor(row.affected * addressable) : 0}));
}
export function decisionRecipe(config: DecisionRecipe): ExampleDefinition {
  const encoding: Record<string,string> = { lanes:'Coral arc fraction = affected / eligible; lanes are schematic paths.', routes:'Coral arc fraction = failed / eligible attempts; paths are schematic routes, not transaction flows.', runway:'Paired mint and coral bars show unaffected and affected accounts, respectively, at 25 accounts per height unit; weeks run left to right.', orbit:'Coral arc fraction = unresolved / eligible tickets; the mint circle is a full 100% reference.', terraces:'Each of 20 tiles represents five percentage points; the coral share is rounded up to the next tile. Exact values remain in the table.', prism:'Each point is one planned interview slot. Coral slots are unfilled; mint slots are filled.', canyon:'Ridge control-point height above its base = slow-session share × 4; smooth surfaces interpolate between control points, not additional observations.' };
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  return {
    id:config.id, title:config.title, category:config.outcome === 'product' ? 'Analytics' : 'Business',
    summary:config.summary, description:`${config.summary} Select a group, allocate investigation slots, and compare a clearly labeled addressable-share scenario. The table preserves record IDs, denominators, owners, and next actions.`,
    tags:[config.outcome,'Investigation planning','Scenario'], difficulty:'Advanced', accent:config.accent,
    camera:[6.8,7.5,12.5], target:[0,1,0], bloom:.32,
    dataNote:`Synthetic snapshot. ${config.note} ${encoding[config.view]} The same counts drive the scene and table. Positions arrange groups; they do not encode time or distance unless labeled. Review slots select groups by affected count, not inferred impact or financial value. Modeled addressable count = floor(affected × assumed share) for selected groups only. Equal effort per group is an assumption. Motion is an inspection guide, never new events.`,
    setup(app) {
      let focus=0, capacity=2, addressable=.25;
      let model=reviewPlan(config.rows,focus,capacity,addressable);
      const draw=(chart: ChartBuilder) => {
        chart.ring([0,-.18,0],5.2,'#254255',.018);
        chart.label(config.title.toUpperCase(),[0,4.1,0],.32,config.accent);
        chart.label('SNAPSHOT  /  CORAL = AFFECTED  /  RING = REVIEW',[0,-.55,3.6],.18,'#a7bdca');
        model.forEach(row => {
          const i=config.rows.findIndex(item=>item.id===row.id), x=-4+i*2;
          let p: Position=[x,.3,0];
          if(config.view==='orbit' || config.view==='prism') {
            const angle=i/5*Math.PI*2-Math.PI/2;
            p=[Math.cos(angle)*3.5,.5,Math.sin(angle)*3.5];
          }
          const [px,py,pz]=p;
          const color=row.selected ? config.accent : '#526778';
          chart.ring([px,py-.15,pz],.68,color,row.selected?.04:.015);
          if (config.view==='lanes') {
            const path: Position[]=[[px,py,-2],[px,py+.6,-1],[px,py+2,1.4]];
            chart.ribbon(path,.58,'#245867',.45);
            chart.tube(path,color,.025);
            chart.flow(path,{color:config.accent,count:50,speed:.18,seed:i+30});
            chart.ring([px,py+2,1.4],.48,'#ff97a9',.055,'z',row.share*Math.PI*2);
            chart.label(pct(row.share),[px,py+2,1.55],.24);
          } else if (config.view==='routes') {
            const path: Position[]=[[0,.25,-3],[px*.4,2,-1.5],[px,.5,1]];
            chart.tube(path,color,.025);chart.flow(path,{color,count:65,speed:.15,seed:i+5});
            chart.ring([px,.65,1],.52,'#355365',.045,'z');
            chart.ring([px,.65,1.03],.52,'#ff97a9',.065,'z',row.share*Math.PI*2);
          } else if (config.view==='runway') {
            chart.box({x:px,y:py,z:0,width:1.3,height:.12,depth:4,color:'#28475d',opacity:.4});
            chart.bar({x:px,z:-.6,value:(row.eligible-row.affected)/25,width:.65,depth:.6,color:'#69ceba',opacity:.6});
            chart.bar({x:px,z:.7,value:row.affected/25,width:.65,depth:.6,color:'#ff97a9'});
            chart.label('1 HEIGHT UNIT = 25 ACCOUNTS',[0,3.5,-2],.18,'#a7bdca');
          } else if (config.view==='orbit') {
            chart.ring([px,py+.7,pz],.6,'#69ceba',.06,'z');
            chart.ring([px,py+.7,pz+.03],.6,'#ff97a9',.075,'z',row.share*Math.PI*2);
            chart.tube([[0,.2,0],[px*.5,1.8,pz*.5],[px,py,pz]],color,.025,.65);
          } else if (config.view==='terraces') {
            for(let k=0;k<20;k++) chart.box({x:px+(k%4-.5*3)*.28,y:py+.12+Math.floor(k/4)*.35,z:0,width:.22,height:.23,depth:.6,color:k/20<row.share?'#ff97a9':'#69ceba'});
            chart.label('20 TILES = 100% · ROUNDED UP TO 5pp',[0,3.5,-2],.18,'#a7bdca');
          } else if (config.view==='prism') {
            for(let k=0;k<row.eligible;k++) chart.point([px+(k%4-1.5)*.25,py+Math.floor(k/4)*.25,pz],k<row.affected?'#ff97a9':'#69ceba',.065);
            chart.tube([[px,py,pz],[0,2.9,0]],color,.015,.45);
          } else {
            chart.ribbon([[px,py,-2],[px,py+row.share*4,0],[px,py,2]],.8,'#ff97a9',.45);
            chart.tube([[px,py,-2],[px,py+row.share*4,0],[px,py,2]],color,.025);
            chart.label('RIDGE HEIGHT = SLOW SESSION SHARE × 4',[0,3.5,-2],.18,'#a7bdca');
          }
          chart.label(row.label,[px,-.05,pz+1.5],.21,color);
          chart.label(`${row.affected}/${row.eligible} · ${pct(row.share)}`,[px,-.34,pz+1.5],.18,'#ddedf2');
          if(row.selected) chart.glow([px,py,pz],color,.8);
        });
        // A constant inspection orbit provides motion without altering snapshot counts.
        const orbit: Position[]=Array.from({length:65},(_,i)=>[Math.cos(i/64*Math.PI*2)*5.1,.02,Math.sin(i/64*Math.PI*2)*5.1]);
        chart.flow(orbit,{color:config.accent,count:90,speed:.08,size:.035,seed:19});
      };
      const layer=createChartLayer(draw);app.add(layer);
      const change=(nextFocus:number,nextCapacity:number,nextAddressable:number)=>{
        const next=reviewPlan(config.rows,nextFocus,nextCapacity,nextAddressable);
        focus=nextFocus;capacity=nextCapacity;addressable=nextAddressable;model=next;layer.redraw(draw);
      };
      return {
        controls:[
          {id:'focus',label:'Inspect group',min:0,max:config.rows.length,step:1,value:focus,format:v=>v?config.rows[v-1].label:'All groups',apply:v=>change(v,capacity,addressable)},
          {id:'capacity',label:'Group review slots',min:0,max:config.rows.length,step:1,value:capacity,apply:v=>change(focus,v,addressable)},
          {id:'addressable',label:'Assumed addressable share',min:0,max:1,step:.05,value:addressable,format:pct,apply:v=>change(focus,capacity,v)},
        ],
        readout:()=>({metrics:[
          {label:`Affected ${config.unit}`,value:String(model.reduce((n,r)=>n+r.affected,0)),detail:'Observed synthetic snapshot; not a prediction'},
          {label:'Groups selected for review',value:String(model.filter(r=>r.selected).length),detail:'Ranked by affected count; equal review effort assumed'},
          {label:'Modeled addressable count',value:String(model.reduce((n,r)=>n+r.modeled,0)),detail:`${pct(addressable)} assumption; not measured improvement`},
        ],legend:[{label:'Affected',color:'#ff97a9'},{label:'Remainder',color:'#69ceba'},{label:'Selected review ring',color:config.accent}],table:{caption:`Synthetic ${config.unit}. ${config.note} Export retains review proposals and scenario assumptions.`,columns:['Record','Group','Owner','Eligible','Affected','Affected %','Review','Assumed share %','Modeled addressable','Next investigation'],rows:model.map(r=>[r.id,r.label,r.owner,r.eligible,r.affected,Number((r.share*100).toFixed(1)),r.selected?'Selected':'Not selected',addressable*100,r.modeled,r.action])}}),
      };
    },
  };
}
