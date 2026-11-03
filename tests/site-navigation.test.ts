import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceContext, sourceNotice, outcomes } from '../demo/site.js';
import { guides } from '../connectors/content/index.js';
import { findExample } from '../examples/catalog.js';

test('source context accepts every real guide and rejects arbitrary paths or markup', () => {
  for (const guide of guides) assert.deepEqual(sourceContext(new URLSearchParams({source:guide.slug})),{slug:guide.slug,name:guide.name},guide.slug);
  for (const source of ['../../secret','<img src=x onerror=alert(1)>','javascript:alert(1)','unknown']) {
    assert.equal(sourceContext(new URLSearchParams({source})),undefined);
  }
  assert.ok(!sourceNotice('../',{slug:'stripe',name:'<script>alert(1)</script>'}).includes('<script>'));
});
test('curated journeys reference actual examples and source guides', () => {
  for (const outcome of outcomes) {
    assert.ok(findExample(`source-${outcome.id}`));
    for (const [slug] of outcome.sources) assert.equal(guides.find(guide=>guide.slug===slug)?.outcome,outcome.id,slug);
  }
});
