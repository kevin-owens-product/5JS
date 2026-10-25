import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export function stellarLoop(reach: number, azimuth: number, twist: number): Position[] {
  const start=Math.asin(Math.sqrt(1.05/reach));
  return Array.from({length:65},(_,i)=>{
    const theta=start+(Math.PI-2*start)*i/64;
    const r=reach*Math.sin(theta)**2, phi=azimuth+twist*Math.cos(theta);
    return [r*Math.sin(theta)*Math.cos(phi),r*Math.cos(theta),r*Math.sin(theta)*Math.sin(phi)];
  });
}
const example: ExampleDefinition = {
  id:'stellar-magnetic-field',title:'Stellar magnetic ballet',category:'Space',
  summary:'A luminous star wrapped in twisted, particle-filled magnetic arches.',
  description:'Orbit a glowing stellar core inside a three-dimensional cage of meridional loops. Cool and warm tracers sweep in opposite directions. Stretch the corona, twist its lobes, and change the illustrative travel speed to inspect the nested structure.',
  tags:['Field geometry','Corona','Particle arcs'],difficulty:'Advanced',accent:'#ffb18d',
  camera:[9,6.2,12.8],target:[0,0,0],bloom:.65,
  dataNote:'Illustrative stellar-field geometry, not an observed star or a magnetic-field solver. Each loop uses r = L sin²θ with an added azimuthal twist; endpoints meet a unit-scale sphere. Loop colors denote opposite presentation directions. Particle counts and speeds do not encode field strength, temperature, charge, or a physical current.',
  setup(app){
    let reach=4.5,twist=.55,speed=1;
    function draw(c:ChartBuilder){
      c.point([0,0,0],'#6c3a31',1.02);c.glow([0,0,0],'#ffb476',2.8);
      for(let k=0;k<7;k++){
        const y=-.85+k*.285,r=Math.sqrt(Math.max(.01,1.04-y*y));
        c.ring([0,y,0],r,k%2?'#794b3b':'#f1a86e',.009);
      }
      for(let band=0;band<3;band++) for(let i=0;i<12;i++){
        const extent=reach*(.62+band*.19),color=i%2?'#77d3f0':'#ffae87';
        const path=stellarLoop(extent,i/12*Math.PI*2+band*.13,twist);
        c.tube(path,color,.009+band*.003,.22+band*.11);
        c.flow(i%2?path:[...path].reverse(),{color,count:80,speed:speed*(.055+band*.022),size:.035,spread:.025,seed:200+band*12+i});
      }
      c.glow([0,1.02,0],'#d4edff',.75);c.glow([0,-1.02,0],'#ffb696',.75);
      c.label('SYNTHETIC STELLAR FIELD',[0,-3.15,0],.23,'#b0becb');
      c.label('TWISTED CORONA',[0,3.25,0],.23,'#b6cddd');
    }
    const layer=createChartLayer(draw);app.add(layer); const redraw=()=>layer.redraw(draw);
    return{controls:[
      {id:'coronal-reach',label:'Coronal reach',min:2.8,max:5.8,step:.1,value:reach,format:v=>`${v.toFixed(1)} units`,apply(v){reach=v;redraw();}},
      {id:'loop-twist',label:'Loop twist',min:-1.2,max:1.2,step:.05,value:twist,format:v=>`${v.toFixed(2)} rad`,apply(v){twist=v;redraw();}},
      {id:'trace-speed',label:'Tracer speed',min:0,max:2,step:.05,value:speed,format:v=>`${v.toFixed(2)}×`,apply(v){speed=v;redraw();}},
    ],readout:()=>({metrics:[{label:'Nested loops',value:'36'},{label:'Outer extent',value:`${reach.toFixed(1)} units`},{label:'Loop twist',value:`${twist.toFixed(2)} rad`}],table:{caption:'Geometric loop families; arbitrary units, no physical field measurements.',columns:['Family','Loops','Maximum radius','Tracer cycles / second'],rows:[0,1,2].map(b=>[b+1,12,+(reach*(.62+b*.19)).toFixed(3),+(speed*(.055+b*.022)).toFixed(4)])}})};
  },
};
export default example;
