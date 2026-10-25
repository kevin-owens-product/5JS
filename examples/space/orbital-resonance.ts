import { BufferAttribute, BufferGeometry, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import type { FiveLayer } from '../../src/index.js';
import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

const COLORS = ['#7be7e0', '#bd9aff', '#ffc17f'];
const RADII = [2.25, 3.8, 5.4];
export function orbitalPosition(index: number, phase: number, eccentricity: number, inclination: number): Position {
  const radius = RADII[index];
  const x = radius * (Math.cos(phase) - eccentricity);
  const z = radius * Math.sqrt(1 - eccentricity ** 2) * Math.sin(phase);
  const tilt = (index - 1) * inclination;
  return [x, z * Math.sin(tilt), z * Math.cos(tilt)];
}

const example: ExampleDefinition = {
  id: 'orbital-resonance', title: 'Orbital resonance loom', category: 'Space',
  summary: 'Three moving worlds weave a luminous choreography of orbital ratios.',
  description: 'Follow three orbiting bodies with fading comet tails. Thin paths show their complete ellipses; a woven ribbon of position pairs reveals the repetition created by the outer period ratio. Change that ratio, stretch the ellipses, or open the orbital planes.',
  tags: ['Orbit choreography', 'Moving trails', 'Custom layer'], difficulty: 'Advanced', accent: '#a8b8ff',
  camera: [8.3, 7.1, 12.8], target: [-.8, 0, 0], bloom: .55,
  dataNote: 'Synthetic kinematic model, not a gravity integration or real ephemeris. Radii are 2.25, 3.8, and 5.4 arbitrary units. The inner period is 8 animation seconds, middle period 12, and outer period is 8 × the chosen ratio. Bodies advance uniformly in ellipse parameter, not according to Kepler time. Sizes, glow, and the woven comparison path are illustrative.',
  setup(app) {
    let ratio = 2, eccentricity = .16, inclination = .3, elapsed = 0, disposed = false;
    const periods = () => [8, 12, 8 * ratio];
    const chart = createChartLayer(draw); app.add(chart);
    function draw(c: ChartBuilder) {
      c.point([0,0,0], '#fff0b4', .48); c.glow([0,0,0], '#ffcf77', 2.4);
      c.ring([0,0,0], .65, '#b18347', .014, 'x'); c.ring([0,0,0], .69, '#b18347', .014, 'z');
      for (let i=0;i<3;i++) {
        const path = Array.from({length:161},(_,k)=>orbitalPosition(i,k/160*Math.PI*2,eccentricity,inclination));
        c.tube(path,COLORS[i],.014,.45);
        c.label(`${['INNER','MIDDLE','OUTER'][i]} · ${periods()[i].toFixed(1)} s`,[-RADII[i]*(1+eccentricity),.55,0],.21,COLORS[i]);
      }
      // Samples of midpoint geometry show relative phase repetition, not a third body's orbit.
      const weave = Array.from({length:321},(_,k)=>{
        const a=orbitalPosition(0,k/320*Math.PI*12,eccentricity,inclination);
        const b=orbitalPosition(2,k/320*Math.PI*12/ratio,eccentricity,inclination);
        return a.map((v,j)=>(v+b[j])*.5) as Position;
      });
      c.line(weave,'#476d91',.55);
      c.label('RELATIVE PHASE WEAVE',[-.8,-1.8,0],.2,'#95b2cc');
      for(let i=0;i<60;i++) {
        const angle=i*2.399963, r=7+(i%7)*.24;
        c.point([Math.cos(angle)*r,Math.sin(i*1.71)*2.4,Math.sin(angle)*r],i%3?'#22334b':'#5b7193',.015);
      }
    }
    const object = new Group(); object.name='orbital-resonance:bodies';
    const bodyGeometry = new SphereGeometry(.18,16,12);
    const bodies = COLORS.map((color,i)=>{
      const body=new Mesh(bodyGeometry,new MeshBasicMaterial({color})); body.name=`orbit-body-${i}`; object.add(body); return body;
    });
    const tails=COLORS.map(color=>{
      const geometry=new BufferGeometry(); geometry.setAttribute('position',new BufferAttribute(new Float32Array(180*3),3));
      const colors=new Float32Array(180*3);
      for(let k=0;k<180;k++) colors.set([k/179,k/179,k/179],k*3);
      geometry.setAttribute('color',new BufferAttribute(colors,3));
      const line=new Line(geometry,new LineBasicMaterial({color,vertexColors:true,transparent:true,opacity:.85})); line.frustumCulled=false; object.add(line); return line;
    });
    function positionBodies() {
      bodies.forEach((body,i)=>{
        const phase=elapsed/periods()[i]*Math.PI*2+i*1.3;
        body.position.fromArray(orbitalPosition(i,phase,eccentricity,inclination));
        const attribute=tails[i].geometry.getAttribute('position') as BufferAttribute;
        for(let k=0;k<180;k++) attribute.setXYZ(k,...orbitalPosition(i,phase-(179-k)/179*1.7,eccentricity,inclination));
        attribute.needsUpdate=true;
      });
    }
    positionBodies();
    const motion: FiveLayer<Record<string,never>> = {
      object,kind:'orbitalResonance',count:3,
      update(_time,delta){
        if(disposed||!Number.isFinite(delta)||delta<=0)return;
        const nextElapsed=elapsed+delta;
        if(!Number.isFinite(nextElapsed))return;
        // A shared wrap is not periodic for every selectable orbit ratio.
        elapsed=nextElapsed;positionBodies();
      },set(){},
      dispose(){if(disposed)return;disposed=true;bodyGeometry.dispose();bodies.forEach(body=>body.material.dispose());tails.forEach(tail=>{tail.geometry.dispose();tail.material.dispose();});object.removeFromParent();object.clear();},
    };
    app.add(motion);
    const redraw=()=>{chart.redraw(draw);positionBodies();};
    return {
      controls:[
        {id:'period-ratio',label:'Outer / inner period',min:1.25,max:3,step:.05,value:ratio,format:v=>`${v.toFixed(2)} : 1`,apply(v){ratio=v;redraw();}},
        {id:'eccentricity',label:'Ellipse eccentricity',min:0,max:.5,step:.02,value:eccentricity,apply(v){eccentricity=v;redraw();}},
        {id:'inclination',label:'Plane opening',min:0,max:.8,step:.02,value:inclination,format:v=>`${(v*180/Math.PI).toFixed(0)}°`,apply(v){inclination=v;redraw();}},
      ],
      readout:()=>({metrics:[{label:'Outer / inner period',value:`${ratio.toFixed(2)} : 1`},{label:'Bodies',value:'3',detail:'Synthetic motion, arbitrary distance units'},{label:'Ellipse eccentricity',value:eccentricity.toFixed(2)}],table:{caption:'Prescribed kinematic orbits; animation seconds, arbitrary length units.',columns:['Body','Semi-major axis','Period seconds','Plane tilt degrees'],rows:RADII.map((r,i)=>[['Inner','Middle','Outer'][i],r,periods()[i],+((i-1)*inclination*180/Math.PI).toFixed(2)])}}),
    };
  },
};
export default example;
