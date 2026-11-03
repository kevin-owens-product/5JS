import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('npm release guard rejects inconsistent metadata and unauthorized publishing refs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'relametric-release-guard-'));
  try {
    mkdirSync(join(directory, 'scripts'));
    mkdirSync(join(directory, 'packages/connectors'), { recursive: true });
    copyFileSync('scripts/verify-npm-release.mjs', join(directory, 'scripts/verify-npm-release.mjs'));
    const files = ['package.json', 'package-lock.json', 'packages/connectors/package.json'];
    const originals = files.map(file => readFileSync(file, 'utf8'));
    const reset = () => files.forEach((file, index) => writeFileSync(join(directory, file), originals[index]));
    const run = (extra: Record<string, string> = {}) => spawnSync(process.execPath, ['scripts/verify-npm-release.mjs'], {
      cwd: directory, encoding: 'utf8', env: { ...process.env, RELAMETRIC_PUBLISH: 'false', ...extra },
    });
    reset();
    assert.equal(run().status, 0);
    const invalid = [
      ['package.json', (p: any) => { p.version = '0.1.0'; }],
      ['packages/connectors/package.json', (p: any) => { p.version = '0.1.0-alpha.999'; }],
      ['package-lock.json', (p: any) => { p.packages[''].version = '0.0.0'; }],
      ['package.json', (p: any) => { p.private = true; }],
      ['package.json', (p: any) => { p.publishConfig.tag = 'latest'; }],
      ['packages/connectors/package.json', (p: any) => { p.repository.url = 'git+https://github.com/other/repo.git'; }],
    ] as const;
    for (const [file, mutate] of invalid) {
      reset();
      const path = join(directory, file); const data = JSON.parse(readFileSync(path, 'utf8')); mutate(data);
      writeFileSync(path, JSON.stringify(data));
      assert.notEqual(run().status, 0, file);
    }
    reset();
    assert.notEqual(run({ RELAMETRIC_PUBLISH: 'true', GITHUB_REPOSITORY: 'other/repo', GITHUB_REF: 'refs/heads/main' }).status, 0);
    assert.notEqual(run({ RELAMETRIC_PUBLISH: 'true', GITHUB_REPOSITORY: 'kevin-owens-product/Relametric', GITHUB_REF: 'refs/heads/main' }).status, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
