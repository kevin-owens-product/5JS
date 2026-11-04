// Run against the local dev server: node scripts/capture-marketing.mjs
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
const base = process.env.RELAMETRIC_PREVIEW_URL || 'http://127.0.0.1:5185/';
try {
  await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('#load-status')?.textContent?.includes('All seven source snapshots complete'));
  await page.screenshot({path:'relametric-overview.png'});
  for(const mode of ['conversion','retention','product']) {
    await page.locator(`[data-decision="${mode}"]`).click();
    await page.locator('.decision-heading').scrollIntoViewIfNeeded();
    await page.evaluate(()=>document.querySelector('.decision-heading').scrollIntoView({block:'start'}));
    await page.waitForTimeout(1000);
    await page.screenshot({path:`relametric-${mode}.png`});
  }
  await page.goto(new URL('connectors/',base).href);
  await page.waitForFunction(()=>document.documentElement.dataset.connectorReady==='true');
  await page.screenshot({path:'relametric-connectors.png'});
  const shot=(await readFile('relametric-conversion.png')).toString('base64');
  await page.setViewportSize({width:1200,height:630});
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#0b1113;color:#edf3ee;font-family:Arial,sans-serif}.card{height:630px;padding:48px;position:relative;overflow:hidden;background:radial-gradient(ellipse at 90% 90%,#223326,transparent 60%)}.brand{font-size:30px;font-weight:700;letter-spacing:-1.5px}.brand span{color:#c3f96b;font-weight:400;margin-right:12px}.tag{margin-top:54px;color:#c3f96b;font-size:13px;letter-spacing:2px}h1{font-size:62px;line-height:1.04;letter-spacing:-3px;margin:20px 0;width:620px;position:relative;z-index:2}h1 em{font-style:normal;color:#c3f96b}p{font-size:20px;line-height:1.5;color:#afc1bc;width:500px}.image{position:absolute;left:660px;top:118px;width:640px;height:380px;overflow:hidden;border:1px solid #405244;border-radius:12px;box-shadow:0 30px 70px #0008;transform:rotate(-4deg)}img{height:100%;width:100%;object-fit:cover;object-position:40% 50%}.footer{position:absolute;bottom:38px;left:48px;right:48px;display:flex;justify-content:space-between;border-top:1px solid #344039;padding-top:24px;color:#bbc8be;font-size:14px}.pill{color:#c3f96b}</style></head><body><div class="card"><div class="brand"><span>R</span>relametric</div><div class="tag">OPEN SOURCE · TYPESCRIPT · THREE.JS</div><h1>Follow the data.<br><em>Find the next move.</em></h1><p>Explore conversion, retention and product decisions through connected evidence.</p><div class="image"><img src="data:image/png;base64,${shot}" alt="Relametric conversion workspace with synthetic data"></div><div class="footer"><span>61 experiments &nbsp; / &nbsp; Editable TypeScript &nbsp; / &nbsp; MIT licensed</span><span class="pill">Experimental alpha · Synthetic demo data</span></div></div></body></html>`);
  await page.locator('img').evaluate(img=>img.decode());
  await page.screenshot({path:'relametric-social.png'});
  console.log('Captured six repository-root marketing images, including a 1200×630 social card.');
} finally { await browser.close(); }
