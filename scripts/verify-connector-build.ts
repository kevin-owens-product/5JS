import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, dirname } from 'node:path';
import { guides } from '../connectors/content/index.js';

const root = fileURLToPath(new URL('../demo-dist/', import.meta.url));
const paths = ['connectors/index.html', ...guides.map(guide => `connectors/${guide.slug}/index.html`)];
for (const path of paths) {
  const html = await readFile(resolve(root, path), 'utf8');
  assert.match(html, /<h1>/);
  assert.ok(!html.includes('src="/'), `${path}: absolute script breaks subpath hosting`);
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const href = match[1].replace(/&amp;/g, '&');
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue;
    const route = href.split(/[?#]/)[0];
    const destination = resolve(dirname(resolve(root, path)), route, route.endsWith('/') ? 'index.html' : '');
    assert.ok(!relative(root, destination).startsWith('..'), `${path}: link leaves the static artifact: ${href}`);
    assert.ok(await stat(destination).then(value => value.isFile()).catch(() => false), `${path}: missing static target ${href}`);
  }
  if (path !== 'connectors/index.html') assert.match(html, /motif-connectors/);
}
console.log(`PASS · ${paths.length} prerendered connector pages, assets, and internal links work under a hosting subpath.`);
