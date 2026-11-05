import { createChartLayer, type ChartBuilder, type Position } from './chart.js';
import type { ExampleCategory, ExampleDefinition } from '../types.js';

export type ObservatoryView = 'ridges' | 'braids' | 'orbits' | 'helix' | 'bridges' | 'matrix' | 'radar' | 'constellation';
export interface ObservationSeries {
  id: string; label: string; owner: string; evidence: string; next: string;
  /** Six explicit synthetic observations, in the units declared by the recipe. */
  values: [number, number, number, number, number, number];
}
export interface ObservatoryConfig {
  id: string; title: string; category: ExampleCategory; summary: string; question: string;
  view: ObservatoryView; unit: string; periods: [string, string, string, string, string, string];
  reference: number; direction: 'above' | 'below'; accent: string; grain: string;
  source: string; rows: ObservationSeries[]; outcome?: string;
}
const encodings: Record<ObservatoryView, string> = {
  ridges: 'X = observation period; Z = series lane; height = metric. Ribbons interpolate between explicit observation knots.',
  braids: 'X = observation period; height = metric; Z separates series. Tracers follow the recorded path; they are not additional records.',
  orbits: 'Each island is one series. Its horizontal ring radius = current value / fixed scale × 0.85. Vertical stems show its six observations in chronological order.',
  helix: 'Each vertical coil is one series. Height = observation period; radius = metric / fixed scale × 0.8. Coils interpolate the six observations.',
  bridges: 'Each lane connects a hollow reference ring to a solid current observation; height = metric. Coral indicates a reference breach.',
  matrix: 'X = observation period; Z = series; column height = metric. The selected observation has a bright outline at its base.',
  radar: 'One spoke per series; radius = metric / fixed scale × 4.5. Stacked contours show the six observation periods from bottom to top. The bright selected contour and reference circle share one height. Polygons join categories for reading, not physical boundaries.',
  constellation: 'X = first observation; Y = observed value; Z = running range through that observation, with separately labeled fixed axes. Trails connect observations in order; bright knots select the current period. The reference plane is a review assumption, not a causal boundary.',
};
const round = (value: number) => Number(value.toFixed(3));
export function validateObservatory(config: ObservatoryConfig): void {
  if (!Number.isFinite(config.reference) || config.reference <= 0 || config.rows.length < 2 || config.rows.length > 8 || config.periods.length !== 6 || new Set(config.periods).size !== 6 || new Set(config.rows.map(r => r.id)).size !== config.rows.length || config.rows.some(r => !r.id || !r.evidence || !r.next || r.values.length !== 6 || r.values.some(v => !Number.isFinite(v) || v < 0))) throw new RangeError('Invalid observatory fixture: unique IDs, six finite nonnegative observations and positive reference required.');
}
/** References are review assumptions. No forecast, impact estimate, or significance test. */
export function observationSlice(config: ObservatoryConfig, period: number, focus: number, referenceFactor: number) {
  validateObservatory(config);
  if (!Number.isInteger(period) || period < 0 || period > 5 || !Number.isInteger(focus) || focus < 0 || focus > config.rows.length || !Number.isFinite(referenceFactor) || referenceFactor < .5 || referenceFactor > 1.5) throw new RangeError('Invalid observation controls.');
  const reference = config.reference * referenceFactor;
  return config.rows.filter((_, i) => !focus || i === focus - 1).map(row => {
    const value = row.values[period], first = row.values[0];
    const history = row.values.slice(0, period + 1);
    return { ...row, value, first, delta: value - first, range: Math.max(...history) - Math.min(...history), reference,
      breach: config.direction === 'above' ? value > reference : value < reference };
  });
}
export function observatory(config: ObservatoryConfig): ExampleDefinition {
  validateObservatory(config);
  const scale = Math.max(config.reference * 1.5, ...config.rows.flatMap(r => r.values));
  const rangeScale = Math.max(1, ...config.rows.map(r => Math.max(...r.values) - Math.min(...r.values)));
  const colors = [config.accent, '#b7a0ff', '#ffbd85', '#7ccef6', '#f395bf', '#d8e992', '#85d5bb', '#b5c6d9'];
  return {
    id: config.id, title: config.title, category: config.category, summary: config.summary,
    description: `${config.question} Inspect a series, move between six observations, and adjust a review reference. Synthetic source: ${config.source}. The evidence table retains series IDs, owners and a proposed next investigation.`,
    tags: [config.view, config.unit, config.outcome ?? config.category, 'Observatory'],
    difficulty: 'Advanced', accent: config.accent, camera: [9, 9, 13], target: [0, 1.4, 0], bloom: .22,
    // Outcome tags aid search; these aggregate views are not joined-record workflows.
    dataNote: `Synthetic teaching fixture; not real operational or scientific measurements. ${config.grain} Units: ${config.unit}. ${encodings[config.view]} The scale is fixed across controls (maximum ${round(scale)} ${config.unit}). Reference = ${config.reference} × chosen multiplier; ${config.direction}-reference values are marked for review, not automatically good or bad. References are illustrative, not safety or industry standards. Periods are discrete snapshots; interpolation and animated tracers are presentation only. Focus filters displayed rows without changing other series or their scale. No causal or predictive inference.`,
    setup(app) {
      let period = 5, focus = 0, referenceFactor = 1;
      let rows = observationSlice(config, period, focus, referenceFactor);
      const height = (v: number) => v / scale * 4;
      const xAt = (i: number) => -4.5 + i * 1.8;
      const lane = (i: number) => -3 + i * 6 / (config.rows.length - 1);
      const draw = (c: ChartBuilder) => {
        c.label(config.title.toUpperCase(), [0, 5.1, 0], .3, config.accent);
        c.label(`${config.periods[period]}  /  ${config.unit}  /  CORAL = REVIEW`, [0, -.7, 4.6], .2);
        c.ring([0, -.22, 0], 5.1, '#284354', .015);
        const motion: Position[] = Array.from({length:65},(_,i)=>[Math.cos(i/64*Math.PI*2)*5.1,-.18,Math.sin(i/64*Math.PI*2)*5.1]);
        c.flow(motion,{color:config.accent,count:65,speed:.055,size:.04,seed:77});
        if (['ridges','braids','matrix'].includes(config.view)) {
          c.frame({x:[-4.5,4.5],y:[0,4],z:[-3.3,3.3],xTicks:config.periods.map((label,i)=>({value:xAt(i),label})),yTicks:[0,.5,1].map(n=>({value:n*4,label:String(round(n*scale))})),yLabel:config.unit});
          c.line([[xAt(period),0,-3.3],[xAt(period),4,-3.3]],'#ecf3e9',.6);
          c.line([[-4.5,height(rows[0].reference),3.3],[4.5,height(rows[0].reference),3.3]],'#ff97a9',.6);
        }
        const radar: Position[] = [];
        rows.forEach(row => {
          const i = config.rows.findIndex(r => r.id === row.id), color = colors[i], flag = row.breach ? '#ff97a9' : color;
          const x = -4 + i * 8 / (config.rows.length - 1), z = lane(i);
          const h = height(row.value), ref = height(row.reference);
          if (config.view === 'ridges' || config.view === 'braids') {
            const path: Position[] = row.values.map((v,t)=>[xAt(t),height(v),z]);
            if(config.view === 'ridges') {
              c.surface(path.map(p=>[[p[0],0,p[2]],p]),path.map(()=>[color,color]),.3);
              c.ribbon(path,.2,color,.55);
            } else c.flow(path,{color,count:65,speed:.075,seed:i+5,size:.035});
            c.tube(path,color,.026,.85);
            path.forEach((p,t)=>c.point(p,t===period?flag:color,t===period?.12:.045));
            c.label(row.label,[5.2,height(row.values[5]),z],.18,color);
          } else if(config.view === 'matrix') {
            row.values.forEach((v,t)=>{
              c.bar({x:xAt(t),z,value:height(v),width:1.08,depth:.65,color:t===period?flag:color,opacity:t===period?.95:.35});
              if(t===period)c.ring([xAt(t),.02,z],.55,'#e6f5f1',.018);
            });
            c.label(row.label,[5.3,.1,z],.17,color);
          } else if(config.view === 'bridges') {
            const path: Position[] = [[x,ref,-2],[x,(ref+h)/2+.3,0],[x,h,2]];
            c.ring([x,ref,-2],.22,'#c9d6dc',.025,'z');
            c.tube(path,flag,.05,.8);c.flow(path,{color:flag,count:30,speed:.13,seed:i+2});
            c.line([[x,0,2],[x,h,2]],flag,.5);c.point([x,h,2],flag,.16);
            c.label(`${round(row.value)}`,[x,h+.35,2],.22,flag);
            c.label(row.label,[x,-.35,2.5],.18,color);
            if(i===0)c.label('REFERENCE → CURRENT',[0,4.5,-1],.2);
          } else if(config.view === 'orbits' || config.view === 'helix') {
            const angle=i/config.rows.length*Math.PI*2;
            const px=Math.cos(angle)*3.2, pz=Math.sin(angle)*3.2;
            if(config.view==='orbits') {
              c.ring([px,.05,pz],Math.max(.025,row.reference/scale*.85),'#5b6f80',.02);
              c.ring([px,.12,pz],Math.max(.025,row.value/scale*.85),flag,.055);
              row.values.forEach((v,t)=>{
                const a=t/6*Math.PI*2, p: Position=[px+Math.cos(a)*.68,height(v),pz+Math.sin(a)*.68];
                c.line([[p[0],0,p[2]],p],color,.4);c.point(p,t===period?flag:color,t===period?.11:.055);
              });
            } else {
              const path: Position[]=[];
              for(let k=0;k<=80;k++) {
                const t=k/80*5, a=t/5*Math.PI*4, j=Math.min(4,Math.floor(t)), value=row.values[j]+(row.values[j+1]-row.values[j])*(t-j);
                path.push([px+Math.cos(a)*value/scale*.8,t*.7,pz+Math.sin(a)*value/scale*.8]);
              }
              c.tube(path,color,.035);c.flow(path,{color,count:55,speed:.08,seed:i+31});
              const a=period/5*Math.PI*4;
              c.point([px+Math.cos(a)*row.value/scale*.8,period*.7,pz+Math.sin(a)*row.value/scale*.8],flag,.13);
              c.ring([px,period*.7,pz],Math.max(.025,row.reference/scale*.8),'#9eb5c4',.014);
            }
            c.label(row.label,[px,-.3,pz],.19,color);
            c.label(`${round(row.value)} ${config.unit}`,[px,-.57,pz],.16,flag);
          } else if(config.view==='radar') {
            const a=i/config.rows.length*Math.PI*2-Math.PI/2;
            const level=.3+period*.48;
            const p: Position=[Math.cos(a)*row.value/scale*4.5,level,Math.sin(a)*row.value/scale*4.5];
            const trail: Position[]=row.values.map((v,t)=>[Math.cos(a)*v/scale*4.5,.3+t*.48,Math.sin(a)*v/scale*4.5]);
            c.tube(trail,color,.025,.55);c.flow(trail,{color,count:30,speed:.06,seed:i+12,size:.03});
            radar.push(p);
            c.line([[0,level,0],[Math.cos(a)*4.5,level,Math.sin(a)*4.5]],'#526978',.6);
            c.tube([[0,level,0],p[0]===0&&p[2]===0?[.001,level,0]:p],flag,.04);
            c.point(p,flag,.13);
            c.label(`${row.label} · ${round(row.value)}`,[Math.cos(a)*5,level,Math.sin(a)*5],.19,color);
          } else {
            const path: Position[] = row.values.map((v,t)=>{
              const history=row.values.slice(0,t+1);
              return [row.first/scale*8-4,height(v),(Math.max(...history)-Math.min(...history))/rangeScale*6-3];
            });
            const p=path[period];
            if(path.some(point=>point.some((v,j)=>v!==path[0][j]))) { c.tube(path,color,.035,.65);c.flow(path,{color,count:45,speed:.08,seed:i+44}); }
            path.forEach((point,t)=>c.point(point,t===period?flag:color,t===period?.14:.045));
            c.label(row.label,[p[0]+.25,p[1]+.25,p[2]],.18,flag);
          }
        });
        if(config.view==='radar') {
          c.ring([0,.3+period*.48,0],rows[0].reference/scale*4.5,'#c9d6dc',.022);
          for(let t=0;t<6;t++){
            const contour:Position[]=config.rows.map((r,i)=>{const a=i/config.rows.length*Math.PI*2-Math.PI/2;return [Math.cos(a)*r.values[t]/scale*4.5,.3+t*.48,Math.sin(a)*r.values[t]/scale*4.5];});
            if(!focus)c.line([...contour,contour[0]],'#77998d',.25);
            c.label(config.periods[t],[-5,.3+t*.48,0],.15,'#92ada5');
          }
          if(radar.length>2)c.line([...radar,radar[0]],config.accent,.6);
        }
        if(config.view==='constellation'){
          const ref=height(rows[0].reference);
          c.surface([[[-4,ref,-3],[4,ref,-3]],[[-4,ref,3],[4,ref,3]]],[['#d69aa7','#d69aa7'],['#d69aa7','#d69aa7']],.08);
          c.label(`REFERENCE ${round(rows[0].reference)}`,[-3,ref,3],.17,'#ff97a9');
          c.frame({x:[-4,4],y:[0,4],z:[-3,3],xLabel:'FIRST OBSERVATION',yLabel:'CURRENT',zLabel:'RANGE',xTicks:[0,.5,1].map(n=>({value:n*8-4,label:String(round(n*scale))})),yTicks:[0,.5,1].map(n=>({value:n*4,label:String(round(n*scale))})),zTicks:[0,1].map(n=>({value:n*6-3,label:String(round(n*rangeScale))}))});
        }
      };
      const layer=createChartLayer(draw);app.add(layer);
      const change=(p:number,f:number,r:number)=>{
        const next=observationSlice(config,p,f,r);
        period=p;focus=f;referenceFactor=r;rows=next;layer.redraw(draw);
      };
      return {
        controls:[
          {id:'period',label:'Observation',min:0,max:5,step:1,value:period,format:v=>config.periods[v],apply:v=>change(v,focus,referenceFactor)},
          {id:'series',label:'Inspect series',min:0,max:config.rows.length,step:1,value:focus,format:v=>v?config.rows[v-1].label:'All series',apply:v=>change(period,v,referenceFactor)},
          {id:'reference',label:'Review reference multiplier',min:.5,max:1.5,step:.05,value:referenceFactor,format:v=>`${round(config.reference*v)} ${config.unit}`,apply:v=>change(period,focus,v)},
        ],
        readout:()=>({metrics:[
          {label:'Observation',value:config.periods[period],detail:config.grain},
          {label:'Series for review',value:`${rows.filter(r=>r.breach).length} / ${rows.length}`,detail:`Strictly ${config.direction} ${round(rows[0].reference)} ${config.unit}; illustrative reference`},
          {label:'Evidence records in scope',value:String(rows.length*6),detail:'Six synthetic observations per series; current values below'},
        ],legend:[{label:'Reference breach · investigate',color:'#ff97a9'},{label:'Reference',color:'#c9d6dc'},...rows.map(r=>({label:r.label,color:colors[config.rows.findIndex(v=>v.id===r.id)]}))],table:{
          caption:`${config.question} Synthetic ${config.source} ${config.grain} Current: ${config.periods[period]}. Delta is current minus first observation in ${config.unit}; no causal claim.`,
          columns:['Series ID','Series','Owner','Evidence group','Current '+config.unit,'First '+config.unit,'Delta '+config.unit,'Review reference '+config.unit,'Review',...config.periods.map(p=>`${p} ${config.unit}`),'Next investigation'],
          rows:rows.map(r=>[r.id,r.label,r.owner,r.evidence,r.value,r.first,round(r.delta),round(r.reference),r.breach?'Investigate':'Within reference',...r.values,r.next]),
        }}),
      };
    },
  };
}
