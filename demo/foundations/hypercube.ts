import { paletteControl } from './palette.js';
import { hypercube } from '../../src/index.js';
import type { ExampleDefinition } from '../../examples/types.js';
export default {
  id:'hypercube',title:'5D hypercube',category:'Scientific',difficulty:'Starter',accent:'#c3f96b',
  summary:'Rotate a projection of five-dimensional geometry.',
  description:'Follow 32 vertices and 80 edges through a rotating projection from five dimensions into three.',
  tags:['Foundation','Geometry'],camera:[0,1,11],target:[0,-.7,0],bloom:.6,
  dataNote:'A mathematical projection of a 5D hypercube. Apparent edge lengths vary with projection; they are not measurements of a changing physical object.',
  setup(app) {
    const layer=hypercube({dimensions:5,size:2.4,speed:.65,color:'#c3f96b'});app.add(layer);
    return {controls:[paletteControl(({color})=>layer.set({color})),{id:'rotation',label:'Rotation rate',min:0,max:2,step:.05,value:.65,apply:v=>layer.set({speed:v})}]};
  },
} satisfies ExampleDefinition;
