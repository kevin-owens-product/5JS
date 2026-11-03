import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const base = 'https://kevin-owens-product.github.io/Relametric/';
const root = new URL('../demo-dist/', import.meta.url);
const files = ['index.html','examples/index.html','examples/run.html','demo/playground.html','connectors/index.html'];
for (const entry of await readdir(new URL('connectors/',root), {withFileTypes:true})) {
  if (entry.isDirectory()) files.push(`connectors/${entry.name}/index.html`);
}
const image = await readFile(new URL('relametric-social.png', root));
assert.equal(image.subarray(1,4).toString(),'PNG');
assert.equal(image.readUInt32BE(16),1200);assert.equal(image.readUInt32BE(20),630);
for (const file of files) {
  const html = await readFile(new URL(file,root),'utf8');
  const metadata = key => {
    const tag = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]+)"`));
    assert.ok(tag, `${file}: missing ${key}`);return tag[1];
  };
  for (const key of ['og:title','og:description','og:image:alt','twitter:title','twitter:description','twitter:image:alt']) metadata(key);
  assert.equal(metadata('og:image'),base+'relametric-social.png');
  assert.equal(metadata('twitter:image'),base+'relametric-social.png');
  assert.equal(metadata('twitter:card'),'summary_large_image');
  const route = file.replace(/index\.html$/,'');
  assert.equal(metadata('og:url'),base+route);
  assert.ok(html.includes(`<link rel="canonical" href="${base+route}">`));
}
console.log(`PASS · ${files.length} static sharing previews and 1200×630 image under /Relametric/.`);
