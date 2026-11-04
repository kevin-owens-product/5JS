import { particleField } from '../../src/index.js';
import type { ExampleDefinition } from '../../examples/types.js';
export default {
  id:'particles', title:'Particle field', category:'Scientific', difficulty:'Starter', accent:'#c3f96b',
  summary:'Shape a hundred thousand points with three analytic motion fields.',
  description:'Explore a shader-driven field of 100,000 points. Switch between vortex, galaxy, and wave motion, then tune turbulence and color.',
  tags:['Foundation','Particles'], camera:[0,2,12], bloom:.35,
  dataNote:'Procedural points generated from seed 42. These motion fields are visual patterns, not a physical fluid simulation or observed events.',
  setup(app) {
    const layer=particleField({count:100_000,mode:'vortex',radius:4,turbulence:.6,pointSize:1.4,colorA:'#c3f96b',colorB:'#138872',seed:42});app.add(layer);
    const modes=['vortex','galaxy','wave'] as const;
    const palettes=[['#c3f96b','#138872'],['#b69aff','#5a54ff'],['#ffd397','#e75938'],['#a3edff','#2475cc']];
    return {controls:[
      {id:'mode',label:'Motion field',min:0,max:2,step:1,value:0,format:v=>['Vortex','Galaxy','Wave'][v],apply:v=>layer.set({mode:modes[v]})},
      {id:'turbulence',label:'Turbulence',min:0,max:2,step:.05,value:.6,apply:v=>layer.set({turbulence:v})},
      {id:'palette',label:'Color palette',min:0,max:3,step:1,value:0,format:v=>['Chlorophyll','Ultraviolet','Solar flare','Glacier'][v],apply:v=>layer.set({colorA:palettes[v][0],colorB:palettes[v][1]})},
    ]};
  },
} satisfies ExampleDefinition;
