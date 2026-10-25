import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export interface VascularSegment { id:string; depth:number; flow:number; from:Position; to:Position }
export function vascularSegments(total=100,split=.5):VascularSegment[]{
  if(!Number.isFinite(total)||total<=0||!Number.isFinite(split)||split<=0||split>=1)throw new RangeError('Positive flow and a split strictly between zero and one are required.');
  const segments:VascularSegment[]=[{id:'root',depth:0,flow:total,from:[0,-3.6,0],to:[0,-2.5,0]}];
  for(let depth=1;depth<=3;depth++){
    for(const parent of segments.filter(segment=>segment.depth===depth-1)) for(const side of [-1,1]){
      const width=3.5/2**(depth-1),to:Position=[parent.to[0]+side*width*.55,-2.5+depth*1.65,parent.to[2]+Math.sin(depth*2+parent.to[0])*.45];
      segments.push({id:`${parent.id}${side<0?'L':'R'}`,depth,flow:parent.flow*(side<0?split:1-split),from:parent.to,to});
    }
  }
  return segments;
}
const example:ExampleDefinition={
  id:'vascular-flow',title:'Vascular transport forest',category:'Biology',
  summary:'Branching supply and return vessels meet in glowing capillary gardens.',
  description:'Explore a paired transport tree where every split conserves the prescribed flow. Scarlet supply paths branch toward eight terminals; blue return paths bring the same flow back. Tiny terminal loops connect the systems. Change throughput and branch balance to reshape their tube areas.',
  tags:['Branching transport','Conservation','Particle circulation'],difficulty:'Advanced',accent:'#f49fb5',
  camera:[7,5.4,12.8],target:[0,-.1,0],bloom:.5,
  dataNote:'Synthetic transport tree, not anatomical data or a hemodynamic simulation. Each split sends s × parent flow left and (1−s) × parent flow right. Supply and return branch tube cross-sectional areas are proportional to prescribed flow: radius = 0.23 × sqrt(flow/100). Return branches carry the same amounts. The five fixed-width terminal loops at each leaf are decorative connectors, not quantitative flow encodings. Flow units are arbitrary; no pressure, viscosity, oxygenation, or patient state is modeled. Tracer speed is illustrative.',
  setup(app){
    let total=100,split=.5,speed=1;
    const artery=(p:Position):Position=>[p[0]-.23,p[1],p[2]+.45];
    const vein=(p:Position):Position=>[p[0]+.23,p[1],p[2]-.45];
    function draw(c:ChartBuilder){
      const segments=vascularSegments(total,split);
      for(const segment of segments){
        const radius=.23*Math.sqrt(segment.flow/100);
        for(const isReturn of [false,true]){
          const map=isReturn?vein:artery,from=map(segment.from),to=map(segment.to),color=isReturn?'#76beef':'#f596ac';
          const middle:Position=[from[0]*.62+to[0]*.38,from[1]*.45+to[1]*.55,(from[2]+to[2])*.5];
          const path=[from,middle,to];
          c.tube(path,color,radius,.38);
          c.flow(isReturn?[...path].reverse():path,{color,count:65,speed:.13*speed,size:.034,spread:radius*.5,seed:800+segment.id.length+(isReturn?60:0)});
        }
      }
      const leaves=segments.filter(segment=>segment.depth===3);
      leaves.forEach((leaf,index)=>{
        const from=artery(leaf.to),to=vein(leaf.to);
        for(let loop=0;loop<5;loop++){
          const a=loop/5*Math.PI*2;
          const path:Position[]=[from,[leaf.to[0]+Math.cos(a)*.38,leaf.to[1]+.35+Math.sin(a)*.22,leaf.to[2]+.25],[leaf.to[0]+Math.cos(a)*.3,leaf.to[1]+.6,leaf.to[2]-.15],to];
          c.tube(path,'#b0b8e1',.012,.4);
          c.flow(path,{color:'#d6d3ff',count:15,speed:.18*speed,size:.027,spread:.01,seed:900+index*5+loop});
        }
        c.glow([leaf.to[0],leaf.to[1]+.3,leaf.to[2]],'#d3b8e9',.55);
      });
      c.label('SUPPLY',[-2.4,-3.55,1],.24,'#ffb0c0');c.label('RETURN',[2.4,-3.55,-.5],.24,'#97d8ff');
      c.label('EIGHT SYNTHETIC TERMINALS',[0,3.8,0],.23,'#c4bfe2');
    }
    const layer=createChartLayer(draw);app.add(layer);const redraw=()=>layer.redraw(draw);
    return{controls:[
      {id:'throughput',label:'Total prescribed flow',min:40,max:160,step:5,value:total,format:v=>`${v} units/min`,apply(v){total=v;redraw();}},
      {id:'split',label:'Left branch share',min:.3,max:.7,step:.02,value:split,format:v=>`${(v*100).toFixed(0)}%`,apply(v){split=v;redraw();}},
      {id:'tracer-speed',label:'Tracer travel speed',min:0,max:2,step:.05,value:speed,format:v=>`${v.toFixed(2)}×`,apply(v){speed=v;redraw();}},
    ],readout:()=>({metrics:[{label:'Prescribed flow',value:`${total} units/min`},{label:'Terminal total',value:`${vascularSegments(total,split).filter(s=>s.depth===3).reduce((sum,s)=>sum+s.flow,0).toFixed(1)} units/min`,detail:'Equal to supply and return totals'},{label:'Terminal pairs',value:'8'}],table:{caption:'Synthetic supply branches; return branches carry identical flow in the reverse direction.',columns:['Branch','Depth','Flow units/min','Tube radius'],rows:vascularSegments(total,split).map(s=>[s.id,s.depth,+s.flow.toFixed(5),+(.23*Math.sqrt(s.flow/100)).toFixed(5)])}})};
  },
};
export default example;
