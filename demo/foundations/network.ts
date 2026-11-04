import { paletteControl } from './palette.js';
import { networkGraph } from '../../src/index.js';
import type { ExampleDefinition } from '../../examples/types.js';
export default {
  id:'network',title:'Network atlas',category:'Data',difficulty:'Starter',accent:'#c3f96b',
  summary:'Explore the structure between 420 connected points.',
  description:'Inspect a seeded spatial network. Tune connection visibility to reveal its structure.',
  tags:['Foundation','Graph'],camera:[0,2,13],bloom:.55,
  dataNote:'Synthetic spatial proximity graph with 420 nodes, seed 42. Edges show generated proximity, not real customer relationships or inferred causality.',
  setup(app) {
    const layer=networkGraph({nodeCount:420,radius:4.2,edgeOpacity:.2,colorA:'#c3f96b',colorB:'#138872',seed:42});app.add(layer);
    return {controls:[paletteControl(({colorA,colorB})=>layer.set({colorA,colorB})),{id:'edge-opacity',label:'Connection opacity',min:0,max:1,step:.025,value:.2,apply:v=>layer.set({edgeOpacity:v})}]};
  },
} satisfies ExampleDefinition;
