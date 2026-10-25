import assert from 'node:assert/strict';
import test from 'node:test';
import type { BufferAttribute, BufferGeometry, Material, Mesh, ShaderMaterial } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import transit, { transitService } from '../examples/cities/transit-pulse.js';
import city, { canopyHeight, cityBuildings } from '../examples/cities/urban-canopy.js';
import chamber, { chamberField, chamberNodes } from '../examples/engineering/acoustic-chamber.js';
import turbine, { wakeRadius } from '../examples/engineering/turbine-wake.js';

test('synthetic transit capacity and headway reconcile independently of demand',()=>{
  const base=transitService({speed:36,trains:8,demand:1});
  const doubled=transitService({speed:36,trains:8,demand:1.8});
  for(let i=0;i<base.length;i++){
    assert.ok(Math.abs(base[i].capacity-120*60/base[i].headway)<1e-9);
    assert.equal(base[i].served,Math.min(base[i].demand,base[i].capacity));
    assert.equal(doubled[i].capacity,base[i].capacity);
    assert.equal(doubled[i].demand,Math.round(base[i].demand*1.8));
  }
  const fast=transitService({speed:54,trains:12,demand:1});
  fast.forEach((r,i)=>assert.ok(Math.abs(r.capacity/base[i].capacity-2.25)<1e-12));
  assert.throws(()=>transitService({speed:0,trains:8,demand:1}),/Invalid/);
});

test('urban district heights scale while positions and building identity remain fixed',()=>{
  const base=cityBuildings(),scaled=cityBuildings(1.6);
  assert.equal(base.length,49);assert.equal(new Set(base.map(b=>b.id)).size,49);
  base.forEach((b,i)=>{
    assert.equal(scaled[i].x,b.x);assert.equal(scaled[i].z,b.z);
    assert.ok(Math.abs(scaled[i].height/b.height-1.6)<1e-12);
    assert.equal(b.meters,b.height*12);
    assert.ok(canopyHeight(b.x,b.z,1,.8)>b.height,'default authored canopy clears roofs');
  });
  assert.throws(()=>cityBuildings(NaN),/scale/);
});

test('chamber node locations are exact zeros of the cosine basis',()=>{
  for(let mode=1;mode<=4;mode++){
    const nodes=chamberNodes(mode);assert.equal(nodes.length,mode);
    for(const u of nodes)assert.ok(Math.abs(chamberField(u,.2,.3,mode,2))<1e-12);
    for(const w of nodes)assert.ok(Math.abs(chamberField(.1,.2,w,2,mode))<1e-12);
  }
  assert.ok(Math.abs(chamberField(.15,.5,.2,2,2))<1e-12);
  assert.equal(chamberField(0,0,0,2,2),1);
  assert.throws(()=>chamberNodes(2.4),/integer/);
});

test('wake envelope has a fixed inlet and the stated linear radius growth',()=>{
  for(const growth of [0,.25,.6]){
    assert.equal(wakeRadius(0,growth),2.1);
    assert.equal(wakeRadius(1,growth),2.1*(1+growth));
    assert.ok(Math.abs(wakeRadius(.5,growth)-(wakeRadius(0,growth)+wakeRadius(1,growth))/2)<1e-12);
  }
});

function snapshot(layers:FiveLayer<object>[]){
  const values:number[]=[];
  for(const layer of layers)layer.object.traverse(object=>{
    values.push(...object.position.toArray(),object.rotation.x,object.rotation.y,object.rotation.z);
    const mesh=object as Mesh;
    const positions=mesh.geometry?.getAttribute('position') as BufferAttribute|undefined;
    if(positions)values.push(...Array.from(positions.array));
    for(const mat of mesh.material?[mesh.material].flat():[]){
      if((mat as ShaderMaterial).isShaderMaterial){
        for(const uniform of Object.values((mat as ShaderMaterial).uniforms))if(typeof uniform.value==='number')values.push(uniform.value);
      }
    }
  });
  return values;
}

for(const recipe of [transit,city,chamber,turbine])test(`${recipe.id}: motion, pause, controls and owned disposal`,()=>{
  const layers:FiveLayer<object>[]=[];
  const instance=recipe.setup({add(layer:FiveLayer<object>){layers.push(layer);return layer;}} as unknown as FiveApp);
  const initial=snapshot(layers),readout=JSON.stringify(instance.readout!());
  layers.forEach(l=>l.update(.537,.537));const moving=snapshot(layers);
  assert.notDeepEqual(moving,initial,'actual geometry or shader phase must animate');
  assert.ok(moving.every(Number.isFinite));
  layers.forEach(l=>l.update(900,0));assert.deepEqual(snapshot(layers),moving,'pause freezes visible animation');
  assert.equal(JSON.stringify(instance.readout!()),readout,'presentation time does not invent data');
  for(const control of instance.controls!){
    for(const value of [control.min,control.max,control.value]){
      control.apply(value);
      assert.ok(snapshot(layers).every(Number.isFinite),`${control.id}: finite geometry at ${value}`);
      assert.ok(instance.readout!().table.rows.length>0);
    }
  }
  const resources=new Set<BufferGeometry|Material>();
  layers.forEach(l=>l.object.traverse(o=>{const mesh=o as Mesh;if(mesh.geometry)resources.add(mesh.geometry);for(const m of mesh.material?[mesh.material].flat():[])resources.add(m);}));
  const disposed=new Map<object,number>();
  resources.forEach(resource=>resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)??0)+1)));
  layers.forEach(l=>{l.dispose();l.dispose();});instance.dispose?.();
  assert.equal(disposed.size,resources.size);
  disposed.forEach(count=>assert.equal(count,1));
});
