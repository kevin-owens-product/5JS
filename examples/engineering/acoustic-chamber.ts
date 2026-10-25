import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, Points, ShaderMaterial } from 'three';
import type { FiveLayer } from '../../src/index.js';
import { createChartLayer } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export interface ChamberSettings { modeX: number; modeZ: number; threshold: number }
/** A scalar cosine basis with zero normal derivative at the six box faces.
 * This is an idealized mode shape, not a calibrated room-acoustics model.
 * Separation into standing factors is described in Feynman III-4, section 4-6:
 * https://www.feynmanlectures.caltech.edu/III_04.html
 */
export function chamberField(u: number, v: number, w: number, modeX: number, modeZ: number) {
  return Math.cos(modeX*Math.PI*u)*Math.cos(Math.PI*v)*Math.cos(modeZ*Math.PI*w);
}
export function chamberNodes(mode: number) {
  if(!Number.isInteger(mode)||mode<1||mode>4)throw new RangeError('Mode must be an integer 1–4.');
  return Array.from({length:mode},(_,i)=>(i+.5)/mode);
}

export function createAcousticChamber(): FiveLayer<ChamberSettings> {
  const object=new Group();object.name='acoustic-chamber';
  const positions:number[]=[],coordinates:number[][]=[];
  for(let x=0;x<36;x++)for(let y=0;y<27;y++)for(let z=0;z<31;z++){
    const u=(x+.5)/36,v=(y+.5)/27,w=(z+.5)/31;
    coordinates.push([u,v,w]);positions.push((u-.5)*8,v*5,(w-.5)*6);
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));
  const field=new BufferAttribute(new Float32Array(coordinates.length),1);geometry.setAttribute('field',field);
  const material=new ShaderMaterial({
    transparent:true,depthWrite:false,blending:AdditiveBlending,
    uniforms:{phase:{value:0},threshold:{value:.25}},
    vertexShader:`attribute float field; varying float vField; varying float vDepth; void main(){vField=field;vec4 p=modelViewMatrix*vec4(position,1.);vDepth=-p.z;gl_Position=projectionMatrix*p;gl_PointSize=clamp(55./max(.4,-p.z),1.,9.);}`,
    fragmentShader:`uniform float phase;uniform float threshold;varying float vField;varying float vDepth;void main(){float radius=length(gl_PointCoord-.5)*2.;if(radius>1.||abs(vField)<threshold)discard;float oscillation=cos(phase);vec3 cool=vec3(.24,.9,1.2);vec3 warm=vec3(1.1,.35,.8);vec3 tint=mix(cool,warm,step(0.,vField*oscillation));float a=pow(1.-radius,1.5)*pow(abs(vField),1.25)*(.25+.75*abs(oscillation))*.8;gl_FragColor=vec4(tint,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,
  });
  const points=new Points(geometry,material);points.frustumCulled=false;object.add(points);
  let settings:ChamberSettings={modeX:2,modeZ:2,threshold:.25},phase=0,disposed=false;
  function calculate(){coordinates.forEach(([u,v,w],i)=>field.setX(i,chamberField(u,v,w,settings.modeX,settings.modeZ)));field.needsUpdate=true;}
  const cage=createChartLayer(chart=>{
    for(const y of [0,5])chart.line([[-4,y,-3],[4,y,-3],[4,y,3],[-4,y,3],[-4,y,-3]],'#6c91ac',.6);
    for(const x of [-4,4])for(const z of [-3,3])chart.line([[x,0,z],[x,5,z]],'#6c91ac',.6);
    chart.label('STANDING MODE / NORMALIZED FIELD',[0,5.6,0],.25,'#c5dbe8');
    chart.label('DARK PLANES = NODES',[0,-.5,3.5],.21,'#9fb8c9');
  });
  object.add(cage.object);calculate();
  return {
    object,kind:'acousticMode',count:coordinates.length,
    update(_time,delta){if(disposed||!Number.isFinite(delta)||delta<=0)return;phase=(phase+delta*1.7)%(Math.PI*2);material.uniforms.phase.value=phase;},
    set(patch){if(disposed)throw new Error('Chamber disposed.');const next={...settings,...patch};chamberNodes(next.modeX);chamberNodes(next.modeZ);if(!Number.isFinite(next.threshold)||next.threshold<.05||next.threshold>.7)throw new RangeError('Threshold must be 0.05–0.7.');settings=next;material.uniforms.threshold.value=settings.threshold;calculate();},
    dispose(){if(disposed)return;disposed=true;cage.dispose();geometry.dispose();material.dispose();object.removeFromParent();object.clear();},
  };
}

const example:ExampleDefinition={
  id:'acoustic-chamber',title:'Acoustic mode chamber',category:'Engineering',
  summary:'A volumetric standing pattern exposes luminous lobes and silent nodal planes.',
  description:'Look inside a transparent chamber of sampled scalar waves. Cyan and magenta identify opposite signs; bright lobes pulse while the nodal planes stay dark. Change the horizontal mode counts and isolate the strongest field regions with the threshold. The display oscillates slowly so the spatial structure can be inspected.',
  tags:['Volumetric field','Standing modes','Shader particles'],difficulty:'Advanced',accent:'#8dbfff',
  camera:[9.5,7,12],target:[0,2.4,0],bloom:.4,
  dataNote:'Idealized normalized cosine pattern: F(u,v,w)=cos(nxπu)cos(πv)cos(nzπw), with u,v,w in [0,1]. Displayed sign and brightness follow F×cos(phase); dark node planes occur at (k+½)/n. Threshold hides samples by |F|, not by measured sound pressure. Chamber dimensions and playback rate are presentation choices; there is no dB scale, physical frequency, absorption, source excitation, or validated room-acoustics prediction.',
  setup(app){
    let input:ChamberSettings={modeX:2,modeZ:2,threshold:.25};const layer=app.add(createAcousticChamber());
    function change(patch:Partial<ChamberSettings>){layer.set(patch);input={...input,...patch};}
    return {
      controls:[
        {id:'mode-x',label:'X mode',min:1,max:4,step:1,value:2,apply:v=>change({modeX:v})},
        {id:'mode-z',label:'Z mode',min:1,max:4,step:1,value:2,apply:v=>change({modeZ:v})},
        {id:'threshold',label:'Field threshold',min:.05,max:.7,step:.05,value:.25,format:v=>`|F| ≥ ${v.toFixed(2)}`,apply:v=>change({threshold:v})},
      ],
      readout:()=>({
        metrics:[{label:'Mode tuple',value:`(${input.modeX}, 1, ${input.modeZ})`,detail:'Cosine factors along X, Y, Z'},{label:'Interior node planes',value:String(input.modeX+1+input.modeZ),detail:'Exact zeros of the spatial basis'},{label:'Volume samples',value:layer.count.toLocaleString('en-US'),detail:'Uniform grid; threshold changes visibility'}],
        legend:[{label:'Negative instantaneous field',color:'#3de6ff'},{label:'Positive instantaneous field',color:'#ff59cc'}],
        table:{caption:'Exact normalized nodal-plane positions; no measured acoustic data.',columns:['Axis','Mode','Node position (0–1)'],rows:[...chamberNodes(input.modeX).map(p=>['X',input.modeX,+p.toFixed(5)]),['Y',1,.5],...chamberNodes(input.modeZ).map(p=>['Z',input.modeZ,+p.toFixed(5)])]},
      }),
    };
  },
};
export default example;
