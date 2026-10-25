import assert from 'node:assert/strict';
import test from 'node:test';
import { BufferGeometry, Material } from 'three';
import type { Mesh, ShaderMaterial } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import orbital, { orbitalPosition } from '../examples/space/orbital-resonance.js';
import stellar, { stellarLoop } from '../examples/space/stellar-magnetic-field.js';
import neural, { neuralPositions } from '../examples/biology/neural-connectome.js';
import vascular, { vascularSegments } from '../examples/biology/vascular-flow.js';

function setup(example:typeof orbital){
  const layers:FiveLayer<object>[]=[];
  const instance=example.setup({add(layer:FiveLayer<object>){layers.push(layer);return layer;}} as unknown as FiveApp);
  return {layers,instance};
}
function snapshot(layers:FiveLayer<object>[]){
  const values:unknown[]=[];
  for(const layer of layers)layer.object.traverse(object=>{
    values.push(object.position.toArray(),object.quaternion.toArray());
    const attribute=(object as Mesh<BufferGeometry,ShaderMaterial>).geometry?.getAttribute('position');
    if(attribute)values.push(Array.from(attribute.array).slice(0,60));
  });
  return JSON.stringify(values);
}
function finiteGeometry(layers:FiveLayer<object>[]){
  for(const layer of layers)layer.object.traverse(object=>{
    assert.ok([...object.position.toArray(),...object.quaternion.toArray()].every(Number.isFinite));
    const geometry=(object as Mesh).geometry;
    if(geometry)for(const attribute of Object.values(geometry.attributes))assert.ok(Array.from(attribute.array).every(Number.isFinite));
  });
}

for(const example of [orbital,stellar,neural,vascular]){
  test(`${example.id}: actual motion, pause, stable readouts, and all control boundaries`,()=>{
    const {layers,instance}=setup(example);
    assert.equal(instance.controls?.length,3);
    const initial=snapshot(layers),data=JSON.stringify(instance.readout!());
    layers.forEach(layer=>layer.update(.63,.63));
    assert.notEqual(snapshot(layers),initial,'default scene must visibly move');
    const moving=snapshot(layers);
    layers.forEach(layer=>layer.update(1000,0));
    assert.equal(snapshot(layers),moving,'zero delta freezes all moving layers');
    assert.equal(JSON.stringify(instance.readout!()),data,'presentation motion must not manufacture new observations');
    for(const control of instance.controls!)for(const value of [control.min,control.max,control.value]){
      control.apply(value);layers.forEach(layer=>layer.update(.1,.1));finiteGeometry(layers);
      const table=instance.readout!().table;
      assert.ok(table.rows.length>0);
      assert.ok(table.rows.every(row=>row.length===table.columns.length));
      assert.ok(table.rows.flat().filter(value=>typeof value==='number').every(Number.isFinite));
    }
    // Simultaneous minima/maxima expose combined scenario framing/math errors.
    for(const bound of ['min','max'] as const){instance.controls!.forEach(control=>control.apply(control[bound]));finiteGeometry(layers);}
    layers.forEach(layer=>layer.dispose());instance.dispose?.();
  });
  test(`${example.id}: final scene resources are disposed exactly once`,()=>{
    const {layers,instance}=setup(example),resources=new Set<BufferGeometry|Material>(),counts=new Map<BufferGeometry|Material,number>();
    for(const layer of layers)layer.object.traverse(object=>{
      const mesh=object as Mesh;
      if(mesh.geometry)resources.add(mesh.geometry);
      if(mesh.material)for(const material of [mesh.material].flat())resources.add(material);
    });
    assert.ok(resources.size>0);
    for(const resource of resources){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)!+1));}
    layers.forEach(layer=>{layer.dispose();layer.dispose();});instance.dispose?.();
    for(const resource of resources)assert.equal(counts.get(resource),1);
  });
}

test('orbital ellipses close and retain their prescribed semi-axes',()=>{
  for(const e of [0,.16,.5])for(let i=0;i<3;i++){
    const a=orbitalPosition(i,0,e,.3),b=orbitalPosition(i,Math.PI*2,e,.3);
    a.forEach((v,j)=>assert.ok(Math.abs(v-b[j])<1e-12));
    const other=orbitalPosition(i,Math.PI,e,.3);
    assert.ok(Math.abs((a[0]-other[0])/2-[2.25,3.8,5.4][i])<1e-12);
  }
});
test('orbital motion remains continuous across 2400 seconds at a non-dividing period',()=>{
  const {layers,instance}=setup(orbital);
  try{
    instance.controls!.find(control=>control.id==='period-ratio')!.apply(1.35);
    instance.controls!.find(control=>control.id==='eccentricity')!.apply(0);
    instance.controls!.find(control=>control.id==='inclination')!.apply(0);
    const motion=layers.find(layer=>layer.kind==='orbitalResonance')!;
    const body=motion.object.getObjectByName('orbit-body-2')!;
    const period=Number(instance.readout!().table.rows[2][2]);
    assert.equal(period,10.8);
    motion.update(2399.9,2399.9);
    const before=body.position.clone(),radius=before.length(),delta=.2;
    motion.update(2400.1,delta);
    // A circular orbit's chord follows its declared period, regardless of how
    // much playback time has elapsed. This bounds visible travel at the seam.
    const expectedChord=2*radius*Math.sin(Math.PI*delta/period);
    assert.ok(Math.abs(body.position.distanceTo(before)-expectedChord)<1e-9,'crossing the old time boundary must not teleport the outer body');
    motion.update(0,Number.MAX_VALUE);finiteGeometry(layers);
    const finiteState=snapshot(layers);
    motion.update(0,Number.MAX_VALUE);
    assert.equal(snapshot(layers),finiteState,'overflowing elapsed time leaves the finite scene unchanged');
  }finally{layers.forEach(layer=>layer.dispose());instance.dispose?.();}
});
test('stellar loops meet their prescribed sphere and respect geometric extent',()=>{
  for(const reach of [2.8*.62,4.5,5.8])for(const twist of [-1.2,0,1.2]){
    const loop=stellarLoop(reach,.7,twist);
    assert.ok(Math.abs(Math.hypot(...loop[0])-1.05)<1e-12);
    assert.ok(Math.abs(Math.hypot(...loop.at(-1)!)-1.05)<1e-12);
    assert.ok(loop.every(point=>Math.hypot(...point)<=reach+1e-12));
  }
});
test('neural graph coordinates remain separated into their declared hemispheres',()=>{
  for(const spread of [.65,1,1.25]){
    const positions=neuralPositions(spread);assert.equal(positions.length,20);
    positions.forEach((p,i)=>{assert.ok(p.every(Number.isFinite));assert.equal(Math.sign(p[0]),i<10?-1:1);});
  }
});
test('vascular tree conserves prescribed flow at every split and level',()=>{
  for(const total of [40,100,160])for(const split of [.3,.5,.7]){
    const segments=vascularSegments(total,split);assert.equal(segments.length,15);
    for(let depth=0;depth<=3;depth++)assert.ok(Math.abs(segments.filter(s=>s.depth===depth).reduce((sum,s)=>sum+s.flow,0)-total)<1e-10);
    for(const parent of segments.filter(s=>s.depth<3)){
      const children=segments.filter(s=>s.id===`${parent.id}L`||s.id===`${parent.id}R`);
      assert.equal(children.length,2);assert.ok(Math.abs(children[0].flow+children[1].flow-parent.flow)<1e-10);
    }
  }
  assert.throws(()=>vascularSegments(0,.5));assert.throws(()=>vascularSegments(100,1));
});
