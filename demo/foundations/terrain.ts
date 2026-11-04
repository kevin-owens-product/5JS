import { paletteControl } from './palette.js';
import { terrain } from '../../src/index.js';
import type { ExampleDefinition } from '../../examples/types.js';
export default {
  id:'terrain',title:'Procedural terrain',category:'Scientific',difficulty:'Starter',accent:'#c3f96b',
  summary:'Explore contours in an evolving procedural landscape.',
  description:'Change elevation and wave frequency on a 160 × 160 grid. Use wireframe to inspect the underlying mesh.',
  tags:['Foundation','Terrain'],camera:[9,7,10],bloom:.45,
  dataNote:'Seeded procedural height field, not a map of observed geography. Elevation and motion are generated visual patterns.',
  setup(app) {
    const layer=terrain({resolution:160,size:12,height:1.8,frequency:1,wireframe:true,colorA:'#c3f96b',colorB:'#138872',seed:42});app.add(layer);
    return {controls:[paletteControl(({colorA,colorB})=>layer.set({colorA,colorB})),
      {id:'height',label:'Elevation',min:.1,max:4,step:.1,value:1.8,apply:v=>layer.set({height:v})},
      {id:'frequency',label:'Wave frequency',min:.2,max:3,step:.05,value:1,apply:v=>layer.set({frequency:v})},
      {id:'wireframe',label:'Wireframe',min:0,max:1,step:1,value:1,format:v=>v?'On':'Off',apply:v=>layer.set({wireframe:Boolean(v)})},
    ]};
  },
} satisfies ExampleDefinition;
