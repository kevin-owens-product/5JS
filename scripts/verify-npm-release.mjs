import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const core = read('package.json');
const connectors = read('packages/connectors/package.json');
const lock = read('package-lock.json');
assert.match(core.version, /^\d+\.\d+\.\d+-alpha\.\d+$/, 'Only alpha versions may use this release path');
assert.equal(connectors.version, core.version, 'Package versions must match');
assert.equal(lock.version, core.version);
assert.equal(lock.packages[''].version, core.version);
for (const [manifest, name] of [[core, 'relametric'], [connectors, 'relametric-connectors']]) {
  assert.equal(manifest.name, name);
  assert.notEqual(manifest.private, true);
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.repository.url, 'git+https://github.com/kevin-owens-product/Relametric.git');
  assert.deepEqual(manifest.publishConfig, {access:'public',tag:'alpha',registry:'https://registry.npmjs.org/'});
  assert.ok(manifest.scripts.prepack, 'Packing must build from clean source');
}
if (process.env.RELAMETRIC_PUBLISH === 'true') {
  assert.equal(process.env.GITHUB_REPOSITORY, 'kevin-owens-product/Relametric');
  assert.equal(process.env.GITHUB_REF, `refs/tags/v${core.version}`, 'Publish only from the matching version tag');
  execFileSync('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/main'], {cwd:root});
}
console.log(`npm release metadata verified: ${core.version}`);
