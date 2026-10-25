import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export interface CanopySettings { height: number; direction: number; arch: number }
export function cityBuildings(height = 1) {
  if (!Number.isFinite(height) || height < .6 || height > 1.6) throw new RangeError('Building height scale must be 0.6–1.6.');
  return Array.from({ length: 49 }, (_, i) => {
    const x = (i % 7 - 3) * 1.15, z = (Math.floor(i / 7) - 3) * 1.15;
    const h = height * (.35 + 2.5 * Math.exp(-(x*x+z*z)/6) + ((i*19)%9)*.045);
    return { id: `Block ${String(i+1).padStart(2,'0')}`, x, z, height: h, meters: h * 12 };
  });
}
export function canopyHeight(x: number, z: number, height: number, arch: number) {
  return 1.3 + 3.15 * height * Math.exp(-(x*x+z*z)/10) + arch * Math.exp(-x*x/20) + .12 * Math.cos(z*1.1);
}

const example: ExampleDefinition = {
  id: 'urban-canopy', title: 'Urban wind canopy', category: 'Cities',
  summary: 'An illuminated architectural district sits beneath a flowing, translucent air canopy.',
  description: 'Explore a miniature city of layered towers and moving air ribbons. A smooth canopy arches above the skyline; rotate the prevailing direction, reshape the canopy, or change the building scale. The paths are an authored geometric study, making the distinction between a visual design model and a computed wind forecast explicit.',
  tags: ['Architecture', 'Flow canopy', 'Spatial design'], difficulty: 'Advanced', accent: '#9ce7c4',
  camera: [9.5, 8, 12], target: [0, 2, 0], bloom: .42,
  dataNote: 'Synthetic 49-building district. Building elevations use an authored radial profile plus deterministic variation; 1 world unit represents 12 m only for the building table. Air paths follow a separate smooth canopy equation and are not computed from pressure or fluid dynamics. Flow speed, colors, and particle density are illustrative. This is not a wind-comfort, dispersion, structural, or energy assessment.',
  setup(app) {
    let input: CanopySettings = { height: 1, direction: 30, arch: .8 };
    let rows = cityBuildings(input.height);
    function draw(chart: ChartBuilder) {
      chart.box({ x:0,y:-.18,z:0,width:9.4,height:.2,depth:9.4,color:'#183439' });
      for (let i=-4;i<=4;i++) {
        chart.line([[-4.6,-.06,i*1.15],[4.6,-.06,i*1.15]],'#47847a',.4);
        chart.line([[i*1.15,-.06,-4.6],[i*1.15,-.06,4.6]],'#47847a',.4);
      }
      rows.forEach((row,i)=>{
        chart.box({x:row.x,y:row.height/2,z:row.z,width:.69,height:row.height,depth:.69,color:i%3===0?'#326175':'#27595a',opacity:.58});
        const roof: Position[]=[[row.x-.345,row.height,row.z-.345],[row.x+.345,row.height,row.z-.345],[row.x+.345,row.height,row.z+.345],[row.x-.345,row.height,row.z+.345],[row.x-.345,row.height,row.z-.345]];
        chart.line(roof,i%3===0?'#9cb8f0':'#7fe0c1',.7);
        if(i%3===0) for(let level=1;level<=3;level++) chart.line(roof.map(p=>[p[0],p[1]*level/4,p[2]] as Position),'#76b6b6',.3);
      });
      const angle=input.direction*Math.PI/180, ca=Math.cos(angle), sa=Math.sin(angle);
      const world=(u:number,v:number):Position=>{
        const x=u*ca-v*sa,z=u*sa+v*ca;
        return [x,canopyHeight(x,z,input.height,input.arch),z];
      };
      const grid=Array.from({length:33},(_,u)=>Array.from({length:25},(_,v)=>world(-5+u/32*10,-3.9+v/24*7.8)));
      chart.surface(grid,grid.map((row,i)=>row.map(()=>i<16?'#3e9c9a':'#7794bf')),.12);
      for(let lane=0;lane<13;lane++) {
        const v=(lane-6)*.61;
        const path=Array.from({length:65},(_,i)=>world(-5+i/64*10,v+.12*Math.sin(i/64*Math.PI*2+lane)));
        const color=lane%3===0?'#d7f2a1':lane%3===1?'#77e3d6':'#9db4ff';
        chart.tube(path,color,.012,.45);
        chart.flow(path,{color,count:180,speed:.08+lane*.003,size:.037,spread:.045,seed:400+lane});
      }
      chart.label('AUTHORED AIR CANOPY',[-3.8,canopyHeight(-3.8,0,input.height,input.arch)+.5,0],.23,'#bcf2d6');
      chart.label('49-BLOCK DESIGN DISTRICT',[0,-.55,5],.23,'#9abbb6');
    }
    const layer=createChartLayer(draw);app.add(layer);
    function change(patch:Partial<CanopySettings>){const next={...input,...patch};if(!Number.isFinite(next.direction)||next.direction<0||next.direction>180||!Number.isFinite(next.arch)||next.arch<.2||next.arch>1.5)throw new RangeError('Invalid canopy settings.');const buildings=cityBuildings(next.height);input=next;rows=buildings;layer.redraw(draw);}
    return {
      controls:[
        {id:'height',label:'Building scale',min:.6,max:1.6,step:.05,value:1,format:v=>`${v.toFixed(2)}×`,apply:v=>change({height:v})},
        {id:'direction',label:'Air-path heading',min:0,max:180,step:5,value:30,format:v=>`${v}°`,apply:v=>change({direction:v})},
        {id:'arch',label:'Canopy arch',min:.2,max:1.5,step:.05,value:.8,format:v=>v.toFixed(2),apply:v=>change({arch:v})},
      ],
      readout:()=>({
        metrics:[{label:'Buildings',value:'49',detail:'Fixed synthetic district'},{label:'Tallest tower',value:`${Math.max(...rows.map(r=>r.meters)).toFixed(1)} m`,detail:'Geometric scale, not surveyed height'},{label:'Air-path heading',value:`${input.direction}°`,detail:'Authored direction; not measured wind'}],
        table:{caption:'Synthetic building elevations. Air canopy is an independent illustrative geometry.',columns:['Building','X world','Z world','Height m'],rows:rows.map(r=>[r.id,+r.x.toFixed(2),+r.z.toFixed(2),+r.meters.toFixed(2)])},
      }),
    };
  },
};
export default example;
