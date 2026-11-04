import particles from './foundations/particles.js';
import network from './foundations/network.js';
import terrain from './foundations/terrain.js';
import hypercube from './foundations/hypercube.js';
import type { ExampleDefinition } from '../examples/types.js';
import { html } from './site.js';
export const foundations: ExampleDefinition[]=[particles,network,terrain,hypercube];
export const isFoundation=(id:string)=>foundations.some(item=>item.id===id);
const sources=import.meta.glob<string>('./foundations/*.ts',{query:'?raw',import:'default',eager:true});
export const foundationSource=(id:string)=>sources[`./foundations/${id}.ts`];
const symbols:Record<string,string>={Foundations:'◈',Business:'▥',Analytics:'⌁',Space:'✧',Biology:'❋',Climate:'≋',Energy:'ϟ',Cities:'▦',Engineering:'⌬',Scientific:'∿',Data:'⋈',Cinematic:'✺'};
const foundationPaths:Record<string,string>={particles:'<circle cx="4" cy="5" r="1.5"/><circle cx="12" cy="3" r="1"/><circle cx="7" cy="13" r="2"/><circle cx="15" cy="12" r="1.4"/>',network:'<path d="M4 4 10 9 16 3M10 9l5 7M10 9l-7 7"/><circle cx="4" cy="4" r="2"/><circle cx="10" cy="9" r="2"/><circle cx="16" cy="3" r="1.5"/>',terrain:'<path d="m1 16 5-11 4 6 4-9 5 14H1ZM6 5l2 11m6-14 2 14M3 12h14"/>',hypercube:'<path d="m10 1 8 4v10l-8 4-8-4V5l8-4Zm0 5 4 2v5l-4 2-4-2V8l4-2Zm0-5v5m8-1-4 3m4 7-4-2m-4 6v-4m-8 0 4-2M2 5l4 3"/>'};
const itemIcon=(item:ExampleDefinition)=>foundationPaths[item.id]?`<svg viewBox="0 0 20 20" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true">${foundationPaths[item.id]}</svg>`:symbols[groupFor(item)];
export const groupFor=(item:ExampleDefinition)=>isFoundation(item.id)?'Foundations':item.category;
export function workspaceSidebar(entries:ExampleDefinition[]):string {
 const groups=[...new Set(entries.map(groupFor))];
 return `<aside class="studio-library" aria-label="Experiment library"><div class="studio-library-heading"><span>WORKSPACE</span><strong>Experiment library <small>${entries.length}</small></strong><p>Four foundations. Every domain.</p></div><label class="studio-search"><span aria-hidden="true">⌕</span><input id="studio-search" type="search" placeholder="Find an experiment…" aria-label="Search experiments" autocomplete="off"><kbd>/</kbd></label><label class="studio-filter-label" for="studio-filter">Collection<select id="studio-filter"><option>All experiments</option>${groups.map(group=>`<option>${group}</option>`).join('')}</select></label><div id="studio-count" class="studio-count" role="status">${entries.length} experiments</div><nav class="studio-list" aria-label="Choose an experiment">${groups.map(group=>`<section data-studio-group="${group}"><h2>${group}</h2>${entries.filter(item=>groupFor(item)===group).map(item=>`<a class="studio-item" data-experiment="${item.id}" href="?example=${item.id}" style="--experiment-accent:${item.accent}"><span class="studio-item-icon" aria-hidden="true">${itemIcon(item)}</span><span class="studio-item-copy"><strong>${html(item.title)}</strong><small>${html(item.tags[0]??group)}</small></span><span class="studio-selected" aria-hidden="true">●</span></a>`).join('')}</section>`).join('')}<div id="studio-empty" hidden><strong>No experiments found</strong><p>Try another name or collection.</p><button id="studio-clear">Clear filters</button></div></nav><div class="studio-library-footer"><a href="../connectors/">Connect your data <span aria-hidden="true">→</span></a><span>Alpha · Synthetic & procedural examples</span></div></aside>`;
}
export function bindWorkspace(entries:ExampleDefinition[],navigate:(id:string)=>void,sourceSuffix:string) {
 const input=document.querySelector<HTMLInputElement>('#studio-search')!;
 const select=document.querySelector<HTMLSelectElement>('#studio-filter')!;
 const items=[...document.querySelectorAll<HTMLAnchorElement>('[data-experiment]')];
 const library=document.querySelector<HTMLElement>('.studio-library')!;
 const toggle=document.querySelector<HTMLButtonElement>('#studio-toggle')!;
 function mobileClose(){document.body.classList.remove('studio-library-open');toggle.setAttribute('aria-expanded','false');toggle.lastElementChild!.textContent='Browse';}
 function filter(){
  const query=input.value.toLowerCase().trim();let count=0;
  for(const item of items){const entry=entries.find(e=>e.id===item.dataset.experiment)!;item.hidden=!(select.value==='All experiments'||groupFor(entry)===select.value)||!`${entry.title} ${entry.summary} ${entry.tags.join(' ')}`.toLowerCase().includes(query);if(!item.hidden)count++;}
  document.querySelectorAll<HTMLElement>('[data-studio-group]').forEach(group=>group.hidden=![...group.querySelectorAll<HTMLElement>('[data-experiment]')].some(item=>!item.hidden));
  document.getElementById('studio-empty')!.hidden=count>0;
  document.getElementById('studio-count')!.textContent=`${count} of ${entries.length} experiments`;
 }
 input.addEventListener('input',filter);select.addEventListener('change',filter);
 document.getElementById('studio-clear')!.addEventListener('click',()=>{input.value='';select.value='All experiments';filter();input.focus();});
 for(const item of items){
  item.href=`?example=${item.dataset.experiment}${sourceSuffix}`;
  item.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(item.dataset.experiment!);mobileClose();if(matchMedia('(max-width: 900px)').matches)document.getElementById('viewer-title')!.focus({preventScroll:true});});
 }
 toggle.addEventListener('click',()=>{const open=document.body.classList.toggle('studio-library-open');toggle.setAttribute('aria-expanded',String(open));toggle.lastElementChild!.textContent=open?'Close':'Browse';if(open)input.focus();});
 library.addEventListener('keydown',event=>{
  if(event.key==='Escape'){mobileClose();toggle.focus();return;}
  if(!(event.target instanceof HTMLAnchorElement)||!event.target.matches('[data-experiment]'))return;
  const visible=items.filter(item=>!item.hidden);const index=visible.indexOf(event.target);
  const next=event.key==='ArrowDown'?visible[(index+1)%visible.length]:event.key==='ArrowUp'?visible[(index-1+visible.length)%visible.length]:event.key==='Home'?visible[0]:event.key==='End'?visible.at(-1):undefined;
  if(next){event.preventDefault();next.focus();}
 });
 document.addEventListener('keydown',event=>{if(event.key==='/'&&!(event.target instanceof HTMLInputElement)&&!(event.target instanceof HTMLTextAreaElement)&&!(event.target instanceof HTMLSelectElement)){event.preventDefault();if(matchMedia('(max-width: 900px)').matches){document.body.classList.add('studio-library-open');toggle.setAttribute('aria-expanded','true');toggle.lastElementChild!.textContent='Close';}input.focus();}});
 return {sync(id:string){for(const item of items){const selected=item.dataset.experiment===id;item.classList.toggle('selected',selected);if(selected)item.setAttribute('aria-current','true');else item.removeAttribute('aria-current');} const selectedItem=items.find(item=>item.dataset.experiment===id);if(selectedItem&&!selectedItem.hidden&&!matchMedia('(max-width: 900px)').matches)selectedItem.scrollIntoView({block:'nearest'}); const current=entries.find(e=>e.id===id);document.getElementById('studio-current')!.textContent=current?.title??'Choose an experiment';}};
}
