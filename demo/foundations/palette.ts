import type { ExampleControl } from '../../examples/types.js';
export function paletteControl(apply:(colors:{colorA:string;colorB:string;color:string})=>void):ExampleControl {
  const colors=[['#c3f96b','#138872'],['#b69aff','#5a54ff'],['#ffd397','#e75938'],['#a3edff','#2475cc']];
  return {id:'palette',label:'Color palette',min:0,max:3,step:1,value:0,format:v=>['Chlorophyll','Ultraviolet','Solar flare','Glacier'][v],apply:v=>{if(!Number.isInteger(v)||!colors[v])throw new RangeError('Unknown palette.');const [colorA,colorB]=colors[v];apply({colorA,colorB,color:colorA});}};
}
