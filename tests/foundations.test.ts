import test from 'node:test';
import assert from 'node:assert/strict';
import particles from '../demo/foundations/particles.js';
import network from '../demo/foundations/network.js';
import terrain from '../demo/foundations/terrain.js';
import hypercube from '../demo/foundations/hypercube.js';
import type { ExampleDefinition } from '../examples/types.js';
import type { RelametricApp, RelametricLayer } from '../src/index.js';
for(const example of [particles,network,terrain,hypercube] as ExampleDefinition[])test(`${example.id} foundation supports control extremes and shared layer lifecycle`,()=>{
 const layers:RelametricLayer<object>[]=[];
 const app={add(layer:RelametricLayer<object>){layers.push(layer);return layer;}} as unknown as RelametricApp;
 const instance=example.setup(app);
 assert.equal(layers.length,1);
 for(const control of instance.controls??[])for(const v of [control.min,Math.round((control.min+control.max)/2/control.step)*control.step,control.max,control.value])control.apply(v);
 for(const layer of layers){layer.update(1,.016);layer.update(1,0);layer.dispose();layer.dispose();}
});
