// Regenerate static previews from the actual registered recipes (no live data).
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const metadata=await readFile(resolve(root,'examples/observatories.ts'),'utf8');
const ids=[...metadata.matchAll(/"id": "([a-z0-9-]+)"/g)].map(match=>match[1]);
const server=await createServer({root,server:{host:'127.0.0.1',port:0,open:false},logLevel:'error'});
let browser;
try {
  await server.listen();
  const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:960,height:630},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mkdir(resolve(root,'public/examples/previews'),{recursive:true});
  for(const id of ids) {
    await page.goto(`${origin}/tests/observatory-preview.html?example=${id}`);
    await page.waitForSelector('body[data-ready=true]');
    await page.screenshot({path:resolve(root,`public/examples/previews/${id}.jpg`),type:'jpeg',quality:82});
    console.log(`Captured ${id}`);
  }
  if(errors.length)throw new Error(errors.join('\n'));
} finally {await browser?.close();await server.close();}
