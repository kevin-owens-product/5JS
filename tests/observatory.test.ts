import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { examples } from '../examples/catalog.js';
import { observatoryShowcase } from '../demo/site.js';
import { observatories } from '../examples/observatories.js';
import { observationSlice, validateObservatory, type ObservatoryConfig } from '../examples/shared/observatory.js';
import { fixture } from '../examples/business/checkout-device-river.js';
import type { RelametricApp, RelametricLayer } from '../src/index.js';

test('100 recipes have unique routes, actual editable source and discovery entries', () => {
  assert.equal(examples.length,100);
  assert.equal(new Set(examples.map(e=>e.id)).size,100);
  assert.equal(observatories.length,43);
  for(const item of observatories) {
    const recipe=examples.find(e=>e.id===item.id)!;
    assert.equal(recipe.title,item.title);
    assert.ok(observatoryShowcase('./').includes(`./demo/playground.html?example=${item.id}`));
    const source=readFileSync(new URL(`../examples/${item.category.toLowerCase()}/${item.id}.ts`,import.meta.url),'utf8');
    assert.ok(source.includes(item.id) && source.includes('values'));
  }
});
test('reference review respects direction, equality, scope, and first-observation baseline',()=>{
  const config: ObservatoryConfig={...fixture,reference:20,rows:[
    {...fixture.rows[0],values:[10,30,15,20,25,40]},
    {...fixture.rows[1],values:[30,20,10,15,25,20]},
  ]};
  const snapshot=JSON.stringify(config);
  const current=observationSlice(config,5,0,1);
  assert.deepEqual(current.map(r=>[r.value,r.delta,r.range,r.breach]),[[40,30,30,false],[20,-10,20,false]]);
  assert.deepEqual(observationSlice(config,0,0,1).map(r=>[r.range,r.delta,r.breach]),[[0,0,true],[0,0,false]]);
  assert.deepEqual(observationSlice({...config,direction:'above'},5,0,1).map(r=>r.breach),[true,false]);
  assert.equal(observationSlice(config,2,2,.5)[0].value,10);
  assert.equal(observationSlice(config,2,2,.5)[0].reference,10);
  assert.equal(JSON.stringify(config),snapshot);
  for(const args of [[NaN,0,1],[6,0,1],[1,3,1],[1,1,Infinity],[1,1,.4],[1.5,0,1]])assert.throws(()=>observationSlice(config,...args as [number,number,number]),RangeError);
  assert.throws(()=>validateObservatory({...config,rows:[config.rows[0],config.rows[0]]}),RangeError);
  assert.throws(()=>validateObservatory({...config,reference:0}),RangeError);
});
for(const item of observatories)test(`${item.id}: every control changes readouts, rejects invalid changes, and disposes`,()=>{
  const recipe=examples.find(e=>e.id===item.id)!;
  const layers: RelametricLayer<any>[]=[];
  const instance=recipe.setup({add(layer:RelametricLayer<any>){layers.push(layer);return layer;}} as RelametricApp);
  const initial=JSON.stringify(instance.readout!());
  for(const control of instance.controls!) {
    control.apply(control.min);
    const atMin=JSON.stringify(instance.readout!());
    control.apply(control.max);
    assert.notEqual(JSON.stringify(instance.readout!()),atMin);
    const before=JSON.stringify(instance.readout!());
    assert.throws(()=>control.apply(NaN),RangeError);
    assert.equal(JSON.stringify(instance.readout!()),before,'invalid input preserves data');
    control.apply(control.value);
  }
  assert.equal(JSON.stringify(instance.readout!()),initial);
  layers[0].update(1,1);
  assert.equal(JSON.stringify(instance.readout!()),initial,'animation never changes observations');
  const readout=instance.readout!();
  assert.equal(readout.table.rows.length,6);
  assert.ok(readout.table.rows.every(r=>r.length===readout.table.columns.length));
  layers.forEach(l=>{l.dispose();l.dispose();assert.equal(l.object.children.length,0);});
});
