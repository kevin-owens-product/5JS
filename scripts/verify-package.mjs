import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'fivejs-package-check-'));
const source = join(temporary, 'source');
const consumer = join(temporary, 'consumer');
const npmCommand = process.env.npm_execpath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const npmPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : [];

function npm(args, cwd, capture = false) {
  return execFileSync(npmCommand, [...npmPrefix, ...args], {
    cwd, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    timeout: 240_000, maxBuffer: 10 * 1024 * 1024,
  });
}

try {
  await mkdir(source);
  // A deliberately fresh source checkout: no existing dist or node_modules can
  // hide a missing build hook. Never delete or mutate the developer's checkout.
  const directories = ['src', 'demo', 'examples', 'tests', 'scripts', 'docs'];
  const files = [
    'package.json', 'package-lock.json', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md',
    'tsconfig.json', 'tsconfig.lib.json', 'vite.config.ts', 'vite.demo.config.ts', 'index.html',
  ];
  for (const name of [...directories, ...files]) await cp(resolve(root, name), join(source, name), { recursive: true });
  npm(['ci', '--no-audit', '--no-fund'], source);
  // prepack is responsible for building. This must fail if the public artifact
  // is incomplete, even if npm pack itself would happily emit an empty package.
  npm(['pack', '--pack-destination', temporary], source);
  const tarballs = (await readdir(temporary)).filter(name => name.endsWith('.tgz'));
  assert.equal(tarballs.length, 1, 'Expected exactly one freshly generated npm tarball.');
  const tarball = join(temporary, tarballs[0]);

  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'fivejs-external-consumer-check', version: '0.0.0', private: true, type: 'module' }));
  const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(join(source, 'package-lock.json'), 'utf8'));
  const threeVersion = lock.packages['node_modules/three'].version;
  const typescriptVersion = lock.packages['node_modules/typescript'].version;
  npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball, `three@${threeVersion}`, `typescript@${typescriptVersion}`], consumer);
  const installed = join(consumer, 'node_modules', ...manifest.name.split('/'));
  const packedManifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(packedManifest.name, manifest.name);
  assert.equal(packedManifest.version, manifest.version);
  assert.equal(packedManifest.type, 'module');
  assert.equal(packedManifest.license, 'MIT');
  assert.equal(packedManifest.exports['.'].import, './dist/fivejs.js');
  assert.equal(packedManifest.exports['.'].types, './dist/index.d.ts');
  for (const name of ['dist/fivejs.js', 'dist/index.d.ts', 'dist/core.d.ts', 'dist/types.d.ts', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md', 'docs/API.md', 'docs/COMPATIBILITY.md']) {
    assert.ok((await stat(join(installed, name))).size > 0, `Published package is missing ${name}.`);
  }
  const installedNames = await readdir(installed);
  assert.ok(!installedNames.some(name => ['node_modules', 'tests', 'demo', 'demo-dist', 'artifacts', '.git', '.github'].includes(name)), 'Package contains unintended development files.');

  // Compile the existing public consumer test from outside the repository, so
  // package self-resolution and local devDependencies cannot make it pass.
  const consumerTypes = (await readFile(join(root, 'tests/consumer.mts'), 'utf8')).replaceAll("'fivejs'", JSON.stringify(manifest.name));
  await writeFile(join(consumer, 'consumer.mts'), consumerTypes);
  execFileSync(process.execPath, [join(consumer, 'node_modules/typescript/bin/tsc'), 'consumer.mts', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'es2022', '--strict', '--noEmit'], { cwd: consumer, stdio: 'inherit', timeout: 60_000 });
  await writeFile(join(consumer, 'runtime.mjs'), `
import assert from 'node:assert/strict';
import * as five from ${JSON.stringify(manifest.name)};
assert.deepEqual(Object.keys(five).sort(), ['createFive', 'hypercube', 'networkGraph', 'particleField', 'terrain'].sort());
const layers = [five.particleField({count:8}), five.networkGraph({nodeCount:4}), five.terrain({resolution:4}), five.hypercube({dimensions:4})];
assert.deepEqual(layers.map(layer => layer.count), [8,4,25,16]);
for (const layer of layers) { assert.ok(layer.object.isObject3D); layer.update(1,.1); layer.dispose(); layer.dispose(); }
console.log('PASS · installed tarball exports and layer lifecycle');
`);
  execFileSync(process.execPath, ['runtime.mjs'], { cwd: consumer, stdio: 'inherit', timeout: 60_000 });
  console.log(`PASS · fresh source → ${tarballs[0]} → separate consumer; declarations, license, notices, API reference, and runtime exports verified.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
