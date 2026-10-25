import { BufferAttribute, BufferGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial } from 'three';
import type { FiveLayer } from '../../src/index.js';
import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export interface WakeSettings { turns:number; expansion:number; rotation:number }
export function wakeRadius(fraction:number,expansion:number){return 2.1*(1+expansion*fraction);}
function validate(input:WakeSettings){if(!Number.isFinite(input.turns)||input.turns<1||input.turns>4||!Number.isFinite(input.expansion)||input.expansion<0||input.expansion>.6||!Number.isFinite(input.rotation)||input.rotation<0||input.rotation>2)throw new RangeError('Invalid geometric wake settings.');}

export function createTurbineWake():FiveLayer<WakeSettings>{
  const object=new Group(),rotor=new Group();object.name='turbineWake';rotor.name='rotor';rotor.position.set(-3.7,2.5,0);object.add(rotor);
  const bladeGeometry=new BufferGeometry();
  bladeGeometry.setAttribute('position',new BufferAttribute(new Float32Array([0,.24,0,.08,.8,.28,.07,2.1,.18,0,2.1,-.04,-.08,.8,-.16]),3));
  bladeGeometry.setIndex([0,1,2,0,2,3,0,3,4]);bladeGeometry.computeVertexNormals();
  const bladeMaterial=new MeshBasicMaterial({color:'#b7d7dd',side:DoubleSide,transparent:true,opacity:.9});
  for(let i=0;i<3;i++){const blade=new Mesh(bladeGeometry,bladeMaterial);blade.rotation.x=i*Math.PI*2/3;rotor.add(blade);}
  const hubGeometry=new CylinderGeometry(.22,.34,.75,24),hubMaterial=new MeshBasicMaterial({color:'#9cbdca'}),hub=new Mesh(hubGeometry,hubMaterial);hub.rotation.z=Math.PI/2;rotor.add(hub);
  let input:WakeSettings={turns:2.4,expansion:.25,rotation:.9},disposed=false;
  const path=(fraction:number,phase:number,offset=0):Position=>{
    const angle=phase+fraction*Math.PI*2*input.turns,r=wakeRadius(fraction,input.expansion)+offset;
    return [-3.7+fraction*8.6,2.5+Math.cos(angle)*r,Math.sin(angle)*r];
  };
  function draw(chart:ChartBuilder){
    chart.line([[-5,-.05,-4.2],[5.5,-.05,-4.2],[5.5,-.05,4.2],[-5,-.05,4.2],[-5,-.05,-4.2]],'#254959',.5);
    for(let x=-4;x<=5;x++)chart.line([[x,-.05,-4],[x,-.05,4]],'#244251',.3);
    chart.box({x:-3.7,y:1.05,z:0,width:.14,height:2.1,depth:.14,color:'#5c7e8e'});
    chart.ring([-3.7,2.5,0],2.14,'#95d2dc',.016,'x');
    const colors=['#75e8d4','#8fbbff','#cd9dfa'];
    for(let blade=0;blade<3;blade++){
      const phase=blade*Math.PI*2/3;
      const center=Array.from({length:129},(_,i)=>path(i/128,phase));
      chart.tube(center,colors[blade],.018,.5);
      const sheet=Array.from({length:81},(_,i)=>[path(i/80,phase-.11),path(i/80,phase+.11)]);
      chart.surface(sheet,sheet.map(()=>[colors[blade],colors[blade]]),.16);
      chart.flow(center,{color:colors[blade],count:420,speed:.1,size:.043,spread:.035,seed:700+blade});
      const inner=Array.from({length:129},(_,i)=>path(i/128,phase+.7,-.7));
      chart.flow(inner,{color:colors[blade],count:250,speed:.13,size:.027,spread:.07,seed:730+blade});
    }
    for(let i=0;i<6;i++){
      const fraction=i/5;
      chart.ring([-3.7+fraction*8.6,2.5,0],wakeRadius(fraction,input.expansion),'#32597a',.009,'x');
    }
    chart.flow([[-5.6,2.5,0],[-4.8,2.5,0],[-3.7,2.5,0]],{color:'#b8ebf2',count:180,speed:.14,size:.038,spread:.12,seed:800});
    chart.label('ROTOR',[-3.7,5.05,0],.23,'#d5e7e9');
    chart.label('GEOMETRIC HELICAL WAKE',[.8,6.2,0],.24,'#b2c7ee');
    chart.label('ILLUSTRATIVE / NOT CFD',[.7,-.55,3.5],.2,'#92b0c3');
  }
  const wake=createChartLayer(draw);object.add(wake.object);
  return {
    object,kind:'turbineWake',get count(){return wake.count+4;},
    update(time,delta){if(disposed||!Number.isFinite(delta)||delta<=0)return;rotor.rotation.x=(rotor.rotation.x+delta*input.rotation)%(Math.PI*2);wake.update(time,delta);},
    set(patch){if(disposed)throw new Error('Wake disposed.');const next={...input,...patch};validate(next);const rebuild=next.turns!==input.turns||next.expansion!==input.expansion;input=next;if(rebuild)wake.redraw(draw);},
    dispose(){if(disposed)return;disposed=true;wake.dispose();bladeGeometry.dispose();bladeMaterial.dispose();hubGeometry.dispose();hubMaterial.dispose();object.removeFromParent();object.clear();},
  };
}

const example:ExampleDefinition={
  id:'turbine-wake',title:'Turbine wake sculptor',category:'Engineering',
  summary:'A three-bladed rotor sheds luminous helical sheets into an expanding wake.',
  description:'Follow three twisted wake sheets and downstream tracers behind a rotating turbine. Adjust the helix winding, radial expansion, and rotor playback independently to inspect the construction. Reference hoops expose the expanding cross-section; the blade mesh and wake share one disposable custom layer.',
  tags:['Helical surfaces','Custom geometry','Flow illustration'],difficulty:'Advanced',accent:'#aebaff',
  camera:[10,7.8,14],target:[.6,2.5,0],bloom:.45,
  dataNote:'Authored geometric turbine illustration, not CFD or measured aerodynamics. Wake radius r(t)=2.1×(1+expansion×t), x(t)=−3.7+8.6t, angle(t)=blade phase+2π×turns×t for t in [0,1]. Rotor speed and tracer speed are independent presentation parameters. No velocity deficit, thrust, turbulence, power, or load prediction is modeled. All dimensions are world units.',
  setup(app){
    let input:WakeSettings={turns:2.4,expansion:.25,rotation:.9};const layer=app.add(createTurbineWake());
    const change=(patch:Partial<WakeSettings>)=>{layer.set(patch);input={...input,...patch};};
    return {
      controls:[
        {id:'turns',label:'Wake winding',min:1,max:4,step:.1,value:2.4,format:v=>`${v.toFixed(1)} turns`,apply:v=>change({turns:v})},
        {id:'expansion',label:'Radius growth',min:0,max:.6,step:.05,value:.25,format:v=>`${(v*100).toFixed(0)}%`,apply:v=>change({expansion:v})},
        {id:'rotation',label:'Rotor playback',min:0,max:2,step:.05,value:.9,format:v=>`${v.toFixed(2)} rad/s`,apply:v=>change({rotation:v})},
      ],
      readout:()=>({
        metrics:[{label:'Wake winding',value:`${input.turns.toFixed(1)} turns`,detail:'Three independent helical sheets'},{label:'Exit radius',value:wakeRadius(1,input.expansion).toFixed(2),detail:'World units; inlet radius 2.10'},{label:'Rotor playback',value:`${input.rotation.toFixed(2)} rad/s`,detail:'Presentation; no physical coupling'}],
        table:{caption:'Exact authored wake envelope, in world units. Tracers do not represent measured velocity.',columns:['Wake fraction','X','Radius'],rows:Array.from({length:6},(_,i)=>{const t=i/5;return[t,+(-3.7+8.6*t).toFixed(2),+wakeRadius(t,input.expansion).toFixed(3)];})},
      }),
    };
  },
};
export default example;
