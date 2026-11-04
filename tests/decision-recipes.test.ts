import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewPlan } from '../examples/shared/decision-recipe.js';
import { featuredRecipes, recipeShowcase } from '../demo/site.js';
import { findExample } from '../examples/catalog.js';
const rows=[
  {id:'A',label:'Small high share',owner:'Research',eligible:10,affected:9,action:'Interview'},
  {id:'B',label:'Large lower share',owner:'Product',eligible:100,affected:40,action:'Investigate'},
];
test('review capacity ranks counts rather than rates and scenarios never mutate observations',()=>{
  const plan=reviewPlan(rows,0,1,.25);
  assert.deepEqual(plan.map(r=>r.selected),[false,true]);
  assert.deepEqual(plan.map(r=>r.modeled),[0,10]);
  assert.deepEqual(reviewPlan(rows,0,0,1).map(r=>r.modeled),[0,0]);
  assert.deepEqual(reviewPlan(rows,1,2,1).map(r=>r.modeled),[9]);
  assert.deepEqual(rows.map(r=>r.affected),[9,40]);
  assert.throws(()=>reviewPlan(rows,0,1,NaN));
  assert.throws(()=>reviewPlan(rows,3,1,.5));
  assert.throws(()=>reviewPlan([{...rows[0],affected:11}],0,1,.5));
  assert.throws(()=>reviewPlan([rows[0],rows[0]],0,1,.5));
});
test('every featured example resolves to an editable recipe on both entry points',()=>{
  assert.equal(featuredRecipes.length,7);
  for (const item of featuredRecipes) {
    assert.equal(findExample(item.id)?.title,item.title);
    for(const root of ['./','../']) assert.ok(recipeShowcase(root).includes(`${root}demo/playground.html?example=${item.id}`));
  }
});
