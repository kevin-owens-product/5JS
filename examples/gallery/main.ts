import { examples, findExample } from '../catalog.js';
import type { ExampleDefinition } from '../types.js';
import { exampleCategories } from '../types.js';
import type { FiveApp } from '../../src/index.js';
import { cameraFor, cameraScale, downloadBlob, makeRenderer, mountExample } from './runtime.js';
import type { MountedExample } from './runtime.js';
import { sourceFor } from './sources.js';
import { dataCsv } from './dataExport.js';
import './style.css';

const standalone = location.pathname.endsWith('/run.html');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const categories = ['All', ...exampleCategories];
const icon = (name: string) => {
  const paths: Record<string, string> = {
    arrow: '<path d="M5 11 11 5M5 5h6v6"/>',
    play: '<path d="m5 3 8 5-8 5Z"/>', pause: '<path d="M5 3v10M11 3v10"/>',
    close: '<path d="m4 4 8 8m0-8-8 8"/>', code: '<path d="m5 4-4 4 4 4m6-8 4 4-4 4M9 2 7 14"/>',
    search: '<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5"/>',
    reset: '<path d="M3 5a6 6 0 1 1-1 5M3 1v4h4"/>',
    down: '<path d="M8 1v9m-4-4 4 4 4-4M2 12v3h12v-3"/>',
  };
  return `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
};
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const number = (n: number) => String(n).padStart(2, '0');

document.getElementById('app')!.innerHTML = `
<header class="topbar"><a class="brand" href="../" aria-label="5js playground">5<span>js</span></a><span class="brand-divider"></span><a class="brand-section" href="./">Example library</a><nav aria-label="Main navigation"><a href="../">Playground ${icon('arrow')}</a><a class="download-all" href="./5js-examples.zip" download>Download examples ${icon('down')}</a></nav></header>
<main id="gallery" ${standalone ? 'hidden' : ''}>
  <section class="intro"><div><div class="eyebrow"><span class="live-dot"></span>THE 5JS COLLECTION · V0.1.0-ALPHA.1</div><h1>Start somewhere<br><span>extraordinary.</span></h1><p>Small, working examples for big visual ideas.<br>Explore a scene. Change a parameter. Make it your own.</p></div><div class="intro-side"><span class="big-number">${number(examples.length)}</span><span class="intro-caption">RUNNABLE EXPERIMENTS<br>${exampleCategories.length} DOMAINS TO EXPLORE</span><div class="discipline-line"><i></i><i></i><i></i><i></i><i></i></div></div></section>
  <section class="collection" aria-label="Example collection"><div class="collection-tools"><div class="filters" role="group" aria-label="Filter by category">${categories.map((category,i)=>`<button data-filter="${category}" aria-pressed="${i===0}" class="filter ${i===0?'selected':''}">${category}<span>${category==='All'?examples.length:examples.filter(x=>x.category===category).length}</span></button>`).join('')}</div><label class="search">${icon('search')}<input type="search" id="search" placeholder="Find an idea…" aria-label="Search examples" autocomplete="off"><kbd>/</kbd></label></div><div class="collection-meta"><span id="result-count" role="status">${examples.length} examples</span><span>REAL RENDERS. EDITABLE RECIPES.</span></div>
  <div class="cards" id="cards">${examples.map((example,i)=>`<article class="card" data-card="${example.id}" style="--accent:${example.accent}"><a class="card-link" href="#${example.id}" aria-label="Open ${example.title}"><div class="card-image"><img id="preview-${example.id}" alt="" width="480" height="300" hidden><span class="preview-state" id="preview-state-${example.id}">Preparing live preview</span><span class="card-no">${number(i+1)}</span><span class="card-open">${icon('arrow')}</span><span class="card-discipline">${example.category}</span></div><div class="card-body"><div class="card-title"><h2>${example.title}</h2><span>${icon('arrow')}</span></div><p>${example.summary}</p><div class="card-tags">${example.tags.slice(0,2).map(tag=>`<span>${tag}</span>`).join('')}<span class="difficulty">${example.difficulty}</span></div></div></a></article>`).join('')}</div>
  <div class="empty" id="empty" hidden><h2>No examples match that search.</h2><p>Try “particles”, “graph”, or another category.</p><button id="clear-search">Reset filters</button></div></section>
  <section class="closing-note"><div><span class="eyebrow">BUILT TO BE TAKEN APART</span><h2>The interesting part is what you change.</h2></div><p>Every example includes the recipe that powers it, a standalone view, and a few useful controls. The downloadable project includes the shared runner and library source.</p></section>
  <footer><span>5js · Built on Three.js · WebGL2</span><span><a href="../LICENSE">MIT license</a> · <a href="../THIRD_PARTY_NOTICES.md">Third-party notices</a></span></footer>
</main>
<dialog id="viewer" class="viewer ${standalone?'standalone':''}" aria-labelledby="viewer-title"><header class="viewer-header"><div><span class="eyebrow" id="viewer-category"></span><h2 id="viewer-title"></h2></div><div class="viewer-nav"><button id="previous" aria-label="Previous example">←</button><span id="viewer-index"></span><button id="next" aria-label="Next example">→</button><button id="close" aria-label="Close example">${icon('close')}</button>${standalone?'<a href="./" class="back-link">All examples ↗</a>':''}</div></header>
<div class="viewer-content"><section class="stage" aria-label="Interactive example"><div id="stage"></div><div class="stage-top"><span>LIVE EXAMPLE</span><span>DRAG TO ORBIT · SCROLL TO ZOOM</span></div><div class="stage-error" id="stage-error" hidden></div><div class="stage-bottom"><button id="play" class="round-button" aria-label="Pause animation">${icon('pause')}</button><span id="fps" class="stage-stat">— FPS</span><span id="primitives" class="stage-stat"></span><div class="stage-actions"><button id="reset" aria-label="Reset camera" title="Reset camera">${icon('reset')}</button><button id="capture" aria-label="Save PNG" title="Save PNG">${icon('down')} PNG</button></div></div></section>
<aside class="example-info"><span class="eyebrow">INSIDE THE EXAMPLE</span><p class="description" id="description"></p><p class="data-note" id="data-note" hidden></p><div class="example-controls" id="example-controls"></div><div class="shared-controls"><label for="scene-speed">Playback speed <output id="scene-speed-value">1.00×</output></label><input id="scene-speed" type="range" min="0" max="2" step="0.05" value="1"><label for="scene-bloom">Bloom <output id="scene-bloom-value"></output></label><input id="scene-bloom" type="range" min="0" max="2" step="0.01"><label class="orbit-label"><input id="orbit" type="checkbox"> Auto-orbit camera</label></div><a id="standalone-link" class="standalone-link" target="_blank" rel="noopener">Open standalone ${icon('arrow')}</a></aside></div>
<section id="data-panel" class="data-panel" aria-label="Example data and metrics" hidden><div class="data-heading"><span class="eyebrow">SYNTHETIC DATA · CURRENT VIEW</span><button id="download-data">Download data CSV</button></div><div id="metrics" class="metrics" aria-live="polite"></div><div id="legend" class="chart-legend"></div><details id="data-details"><summary>Inspect the data <span id="data-row-count"></span></summary><div class="data-table-wrap" tabindex="0" aria-label="Scrollable data table"><table id="data-table"></table></div></details></section><details class="source-section" id="source-section"><summary>${icon('code')} Explore the source <span>TYPESCRIPT RECIPE</span></summary><div class="source-tools"><span>This is the module running above. Shared types, chart helpers, and runner are in the download.</span><button id="copy-source">Copy recipe</button><button id="download-source">Download .ts</button><button id="copy-link">Copy link</button></div><pre tabindex="0" aria-label="Example TypeScript source"><code id="source"></code></pre></details></dialog>
<div id="toast" class="toast" role="status" hidden></div>`;

const requestedCategory = new URLSearchParams(location.search).get('category');
let category = categories.includes(requestedCategory ?? '') ? requestedCategory! : 'All';
get<HTMLInputElement>('search').value = new URLSearchParams(location.search).get('q') ?? '';
let toastTimer: ReturnType<typeof setTimeout>;
function notify(message: string) { clearTimeout(toastTimer); const toast=get('toast'); (get<HTMLDialogElement>('viewer').open?get('viewer'):document.body).append(toast);toast.textContent=message;toast.hidden=false;toastTimer=setTimeout(()=>toast.hidden=true,3500); }
function filter(syncUrl = true) {
  const query=get<HTMLInputElement>('search').value.toLowerCase().trim();
  let count=0;
  for(const example of examples) {
    const matches=(category==='All'||example.category===category) && `${example.title} ${example.summary} ${example.tags.join(' ')} ${example.category} ${example.description}`.toLowerCase().includes(query);
    document.querySelector<HTMLElement>(`[data-card="${example.id}"]`)!.hidden=!matches;
    if(matches) count++;
  }
  get('result-count').textContent=`${count} ${count===1?'example':'examples'}`;
  get('empty').hidden=count>0;
  if (syncUrl && !standalone) {
    const url = new URL(location.href);
    if (category === 'All') url.searchParams.delete('category'); else url.searchParams.set('category', category);
    const search = get<HTMLInputElement>('search').value.trim();
    if (search) url.searchParams.set('q', search); else url.searchParams.delete('q');
    if (url.href !== location.href) history.replaceState(null, '', url);
  }
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button=>{const selected=button.dataset.filter===category;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
}
filter();
get('search').addEventListener('input',()=>filter());
window.addEventListener('popstate',()=>{
  const params=new URLSearchParams(location.search), requested=params.get('category');
  category=categories.includes(requested??'')?requested!:'All';
  get<HTMLInputElement>('search').value=params.get('q')??'';
  filter(false);
});
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter!;filter();}));
get('clear-search').addEventListener('click',()=>{category='All';get<HTMLInputElement>('search').value='';filter();});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!get<HTMLDialogElement>('viewer').open && !(event.target instanceof HTMLInputElement)){event.preventDefault();get('search').focus();}});

const dialog=get<HTMLDialogElement>('viewer');
let app: FiveApp | undefined;
let mounted: MountedExample | undefined;
let active: ExampleDefinition | undefined;
let stopStats: (()=>void)|undefined;
let resizeObserver: ResizeObserver|undefined;
let paused=reducedMotion;
let previousScale=1;
let opening=false;

function updatePlayback() { app?.setPaused(paused); get('play').innerHTML=icon(paused?'play':'pause');get('play').setAttribute('aria-label',paused?'Play animation':'Pause animation'); }
function fitCamera() { if(!app||!active)return; const box=get('stage').getBoundingClientRect(); app.resetCamera(cameraFor(active,box.width,box.height),active.target);previousScale=cameraScale(active,box.width,box.height); }
function cleanup() {
  const observer=resizeObserver, stop=stopStats, instance=mounted, renderer=app;
  resizeObserver=undefined;stopStats=undefined;mounted=undefined;app=undefined;active=undefined;
  const errors:unknown[]=[];
  for(const release of [()=>observer?.disconnect(),()=>stop?.(),()=>instance?.dispose?.(),()=>renderer?.dispose()]) {
    try { release(); } catch(error) { errors.push(error); }
  }
  if(errors.length) {
    console.warn('Example cleanup reported errors.',new AggregateError(errors));
    notify('This example reported a cleanup error. You can open another example.');
  }
}

function refreshReadout() {
  const data=mounted?.readout?.();
  get('data-panel').hidden=!data;
  if(!data)return;
  const metrics=get('metrics'); metrics.replaceChildren();
  for(const metric of data.metrics) {
    const card=document.createElement('div');card.className='metric';
    const label=document.createElement('span');label.textContent=metric.label;
    const value=document.createElement('strong');value.textContent=metric.value;
    card.append(label,value);
    if(metric.detail){const detail=document.createElement('small');detail.textContent=metric.detail;card.append(detail);}
    metrics.append(card);
  }
  const legend=get('legend');legend.replaceChildren();
  for(const item of data.legend??[]) {
    const entry=document.createElement('span');const swatch=document.createElement('i');swatch.style.backgroundColor=item.color;
    entry.append(swatch,document.createTextNode(item.label));legend.append(entry);
  }
  get('data-row-count').textContent=`${data.table.rows.length} ${data.table.rows.length===1?'row':'rows'}`;
  const table=get<HTMLTableElement>('data-table');table.replaceChildren();
  table.createCaption().textContent=data.table.caption;
  const heading=table.createTHead().insertRow();
  for(const column of data.table.columns){const cell=document.createElement('th');cell.scope='col';cell.textContent=column;heading.append(cell);}
  const body=table.createTBody();
  for(const row of data.table.rows){const tr=body.insertRow();for(const value of row)tr.insertCell().textContent=String(value);}
}

function show(example: ExampleDefinition) {
  opening=true;
  if(!dialog.open){if(standalone)dialog.show();else dialog.showModal();}
  get('stage-error').hidden=true;
  get('data-panel').hidden=true;
  dialog.classList.remove('has-data');
  try {
    mounted?.dispose?.(); mounted=undefined;
    active=example;
    document.title=`${example.title} · 5js examples`;
    dialog.dataset.example=example.id;dialog.dataset.category=example.category;dialog.classList.toggle('immersive', !['Analytics', 'Data'].includes(example.category));dialog.dataset.status='loading';
    get('viewer-category').textContent=`${example.category} / ${example.difficulty}`;
    get('viewer-title').textContent=example.title;
    get('viewer-index').textContent=`${number(examples.indexOf(example)+1)} / ${examples.length}`;
    get('description').textContent=example.description;
    get('data-note').hidden=!example.dataNote;get('data-note').textContent=example.dataNote??'';
    document.querySelector<HTMLElement>('.example-info')!.scrollTop=0;
    dialog.scrollTop=0;
    get<HTMLAnchorElement>('standalone-link').href=`./run.html?example=${example.id}`;
    get('source').textContent=sourceFor(example.id);
    get<HTMLDetailsElement>('source-section').open=false;
    get<HTMLDetailsElement>('data-details').open=false;
    if(!app) {
      app=makeRenderer(get('stage'));
      let last=0;
      stopStats=app.onFrame(stats=>{if(performance.now()-last<250)return;last=performance.now();get('fps').textContent=`${Math.round(stats.fps)} FPS`;get('primitives').textContent=`${stats.drawCalls} DRAW CALLS`;});
      resizeObserver=new ResizeObserver(()=>{
        if(!active||!app)return;
        const box=get('stage').getBoundingClientRect();const factor=cameraScale(active,box.width,box.height);
        if(Math.abs(factor-previousScale)<0.001)return;
        const target=active.target??[0,0,0];
        const position=app.camera.position.toArray().map((value,i)=>target[i]+(value-target[i])*factor/previousScale) as [number,number,number];
        app.resetCamera(position,target);previousScale=factor;
      });resizeObserver.observe(get('stage'));
    }
    app.setBloom(example.bloom);app.setSpeed(1);app.setAutoRotate(false);
    mounted=mountExample(example,app);
    dialog.classList.toggle('has-data', Boolean(mounted.readout));
    refreshReadout();
    paused=reducedMotion;updatePlayback();fitCamera();
    get<HTMLInputElement>('scene-speed').value='1';get('scene-speed-value').textContent='1.00×';
    get<HTMLInputElement>('scene-bloom').value=String(example.bloom);get('scene-bloom-value').textContent=example.bloom.toFixed(2);
    get<HTMLInputElement>('orbit').checked=false;
    const controls=get('example-controls');controls.replaceChildren();
    for(const control of mounted.controls??[]) {
      const row=document.createElement('div');row.className='control';
      const label=document.createElement('label');label.htmlFor=`control-${control.id}`;label.textContent=control.label;
      const output=document.createElement('output');output.textContent=control.format?.(control.value)??String(control.value);output.setAttribute('for',`control-${control.id}`);
      const input=document.createElement('input');input.type='range';input.id=`control-${control.id}`;input.min=String(control.min);input.max=String(control.max);input.step=String(control.step);input.value=String(control.value);if(control.format)input.setAttribute('aria-valuetext',control.format(control.value));
      label.append(output);row.append(label,input);controls.append(row);
      input.addEventListener('input',()=>{try{control.apply(Number(input.value));const precision=String(control.step).split('.')[1]?.length??0;output.value=control.format?.(Number(input.value))??Number(input.value).toFixed(precision);if(control.format)input.setAttribute('aria-valuetext',control.format(Number(input.value)));refreshReadout();}catch(error){notify(error instanceof Error?error.message:'Unable to update this setting.');}});
    }
    dialog.dataset.status='ready';
  } catch(error) {
    get('stage-error').textContent=`This example could not start. ${error instanceof Error?error.message:'WebGL2 may be unavailable.'}`;
    get('stage-error').hidden=false;dialog.dataset.status='error';
    console.error(error);cleanup();
  } finally { opening=false; }
}
function navigate(id:string) {
  if(standalone){history.replaceState(null,'',`?example=${id}`);const example=findExample(id);if(example)show(example);}
  else if(location.hash===`#${id}`){const example=findExample(id);if(example)show(example);}
  else location.hash=id;
}
function route() {
  const id=standalone?new URLSearchParams(location.search).get('example'):location.hash.slice(1);
  if(!id){if(standalone){location.replace('./');return;}if(dialog.open)dialog.close();return;}
  const example=findExample(id);
  if(example){show(example);return;}
  if(standalone){location.replace('./');return;}
  if (dialog.open) dialog.close();
  notify('Example not found. Choose one from the collection.');
}
window.addEventListener('hashchange',route);
get('close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('cancel',event=>{if(standalone){event.preventDefault();location.href='./';}});
dialog.addEventListener('click',event=>{if(event.target===dialog&&!standalone){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{if(opening)return;cleanup();if(standalone){location.href='./';return;}history.replaceState(null,'',location.pathname+location.search);document.title='5js — Example library';});
get('previous').addEventListener('click',()=>{if(active)navigate(examples[(examples.indexOf(active)+examples.length-1)%examples.length].id);});
get('next').addEventListener('click',()=>{if(active)navigate(examples[(examples.indexOf(active)+1)%examples.length].id);});
get('play').addEventListener('click',()=>{paused=!paused;updatePlayback();});
get('reset').addEventListener('click',fitCamera);
get<HTMLInputElement>('scene-speed').addEventListener('input',event=>{const value=Number((event.target as HTMLInputElement).value);app?.setSpeed(value);get('scene-speed-value').textContent=`${value.toFixed(2)}×`;});
get<HTMLInputElement>('scene-bloom').addEventListener('input',event=>{const value=Number((event.target as HTMLInputElement).value);app?.setBloom(value);get('scene-bloom-value').textContent=value.toFixed(2);});
get<HTMLInputElement>('orbit').addEventListener('change',event=>app?.setAutoRotate((event.target as HTMLInputElement).checked));
get('capture').addEventListener('click',async()=>{if(!app||!active)return;const renderer=app;const id=active.id;const button=get<HTMLButtonElement>('capture');button.disabled=true;try{downloadBlob(await renderer.capture(),`5js-${id}.png`);notify('PNG exported.');}catch{notify('Unable to export PNG.');}finally{button.disabled=false;}});
get('download-source').addEventListener('click',()=>{if(active)downloadBlob(new Blob([sourceFor(active.id)],{type:'text/typescript'}),`${active.id}.ts`);});
get('copy-source').addEventListener('click',async()=>{if(!active)return;try{await navigator.clipboard.writeText(sourceFor(active.id));notify('Recipe copied. Use it inside the downloaded examples project.');}catch{const range=document.createRange();range.selectNodeContents(get('source'));const selection=getSelection();selection?.removeAllRanges();selection?.addRange(range);notify('Source selected. Press ⌘C or Ctrl+C to copy.');}});
get('download-data').addEventListener('click',()=>{if(!active||!mounted?.readout)return;const table=mounted.readout().table;downloadBlob(new Blob(['\ufeff'+dataCsv(table,{example:active.title,notes:active.dataNote??'',controls:(mounted.controls??[]).map(control=>{const value=Number(get<HTMLInputElement>(`control-${control.id}`).value);return `${control.label}: ${control.format?.(value)??value}`;}).join('; ')})],{type:'text/csv;charset=utf-8'}),`5js-${active.id}-data.csv`);});
get('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);notify('Example link copied.');}catch{notify('Copy the example URL from your address bar.');}});

let previewApp: FiveApp|undefined;
let previewHost: HTMLElement|undefined;
let stopped=false;
const imageUrls:string[]=[];
async function previews() {
  previewHost=document.createElement('div');previewHost.className='preview-renderer';previewHost.setAttribute('aria-hidden','true');previewHost.inert=true;document.body.append(previewHost);
  try {
    previewApp=makeRenderer(previewHost);
    previewApp.renderer.setPixelRatio(1);
    for(const example of examples) {
      if(stopped)break;
      let instance:MountedExample|undefined;
      try {
        previewApp.setBloom(example.bloom);
        instance=mountExample(example,previewApp,true);
        previewApp.resetCamera(example.camera,example.target);
        const blob=await previewApp.capture();
        if(stopped)break;
        const url=URL.createObjectURL(blob);imageUrls.push(url);
        const image=get<HTMLImageElement>(`preview-${example.id}`);image.src=url;image.hidden=false;get(`preview-state-${example.id}`).hidden=true;
      } catch(error) {get(`preview-state-${example.id}`).textContent='Open to explore';console.warn(`Preview failed: ${example.id}`,error);}
      finally {instance?.dispose?.();}
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    }
    document.body.dataset.previews='ready';
  } catch(error) {
    document.querySelectorAll('.preview-state').forEach(element=>element.textContent='WebGL2 preview unavailable');console.warn(error);
  } finally {previewApp?.dispose();previewApp=undefined;previewHost?.remove();previewHost=undefined;}
}
window.addEventListener('pagehide',event=>{if(event.persisted)return;stopped=true;cleanup();imageUrls.forEach(URL.revokeObjectURL);});
route();
if(!standalone)void previews();
