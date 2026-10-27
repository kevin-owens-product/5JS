import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// This runner is for CI. It executes the same inspectable harnesses used for
// manual WebGL checks, rather than maintaining a second set of assertions.
const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = resolve(root, 'artifacts/browser-checks');
const checks = [
  { name: 'lifecycle', path: '/tests/browser.html', timeout: 60_000 },
  { name: 'examples', path: '/tests/examples-browser.html', timeout: 210_000 },
  { name: 'core-pressure', path: '/tests/core-pressure.html', timeout: 60_000 },
  { name: 'gallery-pressure', path: '/tests/gallery-pressure.html', timeout: 300_000 },
  { name: 'connected-pressure', path: '/tests/connected-pressure.html', timeout: 300_000 },
  { name: 'motif-pressure', path: '/tests/motif-browser.html', timeout: 120_000 },
  { name: 'render-pressure', path: '/tests/render-pressure.html', timeout: 210_000 },
];
await mkdir(artifacts, { recursive: true });
let server;
let browser;
const summaries = [];

try {
  server = await createServer({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
  });
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address !== 'string', 'Vite must listen on a local TCP port.');
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });

  for (const check of checks) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 1 });
    const messages = [];
    const pageErrors = [];
    page.on('console', message => messages.push(`[${message.type()}] ${message.text()}`));
    page.on('pageerror', error => { pageErrors.push(error); messages.push(`[pageerror] ${error.stack ?? error}`); });
    page.on('requestfailed', request => messages.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText}`));
    let error;
    let results = '';
    try {
      const response = await page.goto(`${origin}${check.path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      assert.equal(response?.status(), 200, `${check.name}: harness did not load.`);
      await page.waitForFunction(() => /^(PASS|FAIL) —/.test(document.title), undefined, { timeout: check.timeout });
      results = await page.locator('#results').innerText();
      assert.match(await page.title(), /^PASS —/, `${check.name}: ${results}`);
      assert.equal(pageErrors.length, 0, `${check.name}: uncaught browser error(s): ${pageErrors.join('\n')}`);
      if (check.name === 'examples') {
        const counts = results.match(/ALL (\d+)\/(\d+) EXAMPLE BROWSER CHECKS PASSED/);
        assert.ok(counts && Number(counts[1]) >= 47 && counts[1] === counts[2], 'Every gallery recipe must pass.');
      } else if (check.name.endsWith('-pressure')) {
        assert.match(results, /ALL \d+(?:\/\d+)?(?: (?:CORE|RENDER))? PRESSURE CHECKS PASSED/);
      } else {
        assert.match(results, /ALL \d+ BROWSER CHECKS PASSED/);
      }
    } catch (failure) {
      error = failure;
      results ||= await page.locator('#results').innerText({ timeout: 2_000 }).catch(() => 'No harness result was available.');
    } finally {
      await writeFile(resolve(artifacts, `${check.name}.txt`), `${results}\n${error ? `\nRUNNER FAILURE: ${error.stack ?? error}\n` : ''}`);
      await writeFile(resolve(artifacts, `${check.name}-console.txt`), messages.join('\n'));
      await page.screenshot({ path: resolve(artifacts, `${check.name}.png`), fullPage: true }).catch(captureError => {
        console.error(`Could not capture ${check.name} diagnostics: ${captureError.message}`);
      });
      await page.close();
    }
    summaries.push({ name: check.name, passed: !error, ...(error && { error: error.message }) });
    console.log(`${error ? 'FAIL' : 'PASS'} · ${check.name}\n${results}`);
  }
  await writeFile(resolve(artifacts, 'summary.json'), `${JSON.stringify(summaries, null, 2)}\n`);
  assert.ok(summaries.every(check => check.passed), `Browser verification failed; inspect ${artifacts}.`);
} catch (error) {
  await writeFile(resolve(artifacts, 'runner-error.txt'), String(error.stack ?? error));
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
}
