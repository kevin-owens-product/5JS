import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export function neuralPositions(spread=1): Position[] {
  return Array.from({length:20},(_,index)=>{
    const side=index<10?-1:1,i=index%10,angle=i*2.399963;
    const y=1.7*(1-2*(i+.5)/10),radius=Math.sqrt(Math.max(0,1-(y/1.7)**2));
    return [side*(1.7+Math.cos(angle)*radius*.9*spread),y*spread,Math.sin(angle)*radius*1.5*spread];
  });
}
const example:ExampleDefinition={
  id:'neural-connectome',title:'Neural signal atlas',category:'Biology',
  summary:'Interwoven axons carry light across two translucent neural hemispheres.',
  description:'A synthetic neural atlas combines branching dendrites, curved axons, and traveling signal lights. Open the hemispheres to inspect the pathways, add cross-hemisphere bridges, or slow the pulse flow. Each node and connection is a designed motif, not a measured connectome.',
  tags:['Neural pathways','Branching geometry','Synthetic biology'],difficulty:'Advanced',accent:'#a0e4ee',
  camera:[.5,3.2,12.8],target:[0,0,0],bloom:.55,
  dataNote:'Synthetic 20-node bilateral graph for visualization. The ten nodes in each hemisphere form a closed neighbor ring; the bridge slider connects matching pairs across hemispheres. Dendrites are decorative branches. Tracers use arbitrary cycles per animation second and do not represent measured electrical activity, cognition, or a medical assessment.',
  setup(app){
    let bridges=5,spread=1,speed=1;
    function draw(c:ChartBuilder){
      const nodes=neuralPositions(spread);
      // A translucent contextual shell, not an anatomical segmentation.
      for(const side of [-1,1]){
        const rows:Position[][]=[];
        for(let i=0;i<=16;i++){
          const lat=.025+(Math.PI-.05)*i/16;
          rows.push(Array.from({length:33},(_,j)=>{const lon=j/32*Math.PI*2;return [side*1.7+Math.sin(lat)*Math.cos(lon)*1.1*spread,Math.cos(lat)*2.1*spread,Math.sin(lat)*Math.sin(lon)*1.8*spread];}));
        }
        c.surface(rows,rows.map(row=>row.map(()=>side<0?'#2d697b':'#625b91')),.06);
      }
      nodes.forEach((position,index)=>{
        const color=index<10?'#75e5de':'#c0a3fa';
        c.point(position,color,.07);c.glow(position,color,.5);
        for(let branch=0;branch<3;branch++){
          const a=index*1.1+branch*2.094,side=index<10?-1:1;
          const elbow:Position=[position[0]+side*.18,position[1]+Math.cos(a)*.2,position[2]+Math.sin(a)*.2];
          const tip:Position=[position[0]+side*.42,position[1]+Math.cos(a)*.38,position[2]+Math.sin(a)*.38];
          c.line([position,elbow,tip],color,.42);
          c.line([elbow,[tip[0]-.14,tip[1]+Math.sin(a)*.2,tip[2]+Math.cos(a)*.2]],color,.25);
        }
        const next=nodes[Math.floor(index/10)*10+(index%10+1)%10];
        const middle:Position=[(position[0]+next[0])/2,(position[1]+next[1])/2+.4,(position[2]+next[2])/2-.55];
        c.tube([position,middle,next],color,.012,.32);
        c.flow([position,middle,next],{color,count:65,speed:.14*speed,size:.034,spread:.018,seed:400+index});
      });
      for(let i=0;i<bridges;i++){
        const from=nodes[i],to=nodes[i+10],lift=.25+(i%3)*.26;
        const path:Position[]=[from,[-.65,from[1]+lift,from[2]*.75],[.65,to[1]+lift,to[2]*.75],to];
        c.tube(path,'#f2b4cb',.018,.45);
        c.flow(path,{color:'#ffe0e8',count:110,speed:.1*speed,size:.04,spread:.035,seed:600+i});
      }
      c.label('LEFT HEMISPHERE',[-2.3,2.8*spread,0],.22,'#9ae8e1');
      c.label('RIGHT HEMISPHERE',[2.3,2.8*spread,0],.22,'#c6b3f2');
      c.label('DESIGNED NETWORK · NOT A BRAIN SCAN',[0,-2.65*spread,0],.18,'#8ea5b8');
    }
    const layer=createChartLayer(draw);app.add(layer);const redraw=()=>layer.redraw(draw);
    return{controls:[
      {id:'bridges',label:'Cross-hemisphere bridges',min:0,max:10,step:1,value:bridges,apply(v){bridges=v;redraw();}},
      {id:'spread',label:'Arbor expansion',min:.65,max:1.25,step:.05,value:spread,format:v=>`${v.toFixed(2)}×`,apply(v){spread=v;redraw();}},
      {id:'pulse-speed',label:'Signal travel speed',min:0,max:2,step:.05,value:speed,format:v=>`${v.toFixed(2)}×`,apply(v){speed=v;redraw();}},
    ],readout:()=>({metrics:[{label:'Synthetic nodes',value:'20'},{label:'Axon paths',value:String(20+bridges),detail:'20 ring edges plus selected bridges'},{label:'Cross-hemisphere bridges',value:String(bridges)}],table:{caption:'Synthetic graph coordinates in arbitrary units; not anatomical or clinical data.',columns:['Node','Hemisphere','X','Y','Z','Bridge to opposite node'],rows:neuralPositions(spread).map((p,i)=>[`N${String(i+1).padStart(2,'0')}`,i<10?'Left':'Right',...p.map(v=>+v.toFixed(3)),i%10<bridges?'Yes':'No'])}})};
  },
};
export default example;
