import { observatories } from '../examples/observatories.js';
import { connectorCatalog } from '../packages/connectors/src/catalog.js';
import { connectorSlug } from '../connectors/paths.js';

export type SiteArea = 'Overview' | 'Examples' | 'Connectors' | 'Playground';
export type Outcome = 'conversion' | 'retention' | 'product';
export const outcomes: { id: Outcome; title: string; question: string; sources: [string, string][] }[] = [
  { id: 'conversion', title: 'Improve conversion', question: 'Where does intent turn into friction?', sources: [['hubspot', 'HubSpot'], ['google-analytics', 'Google Analytics'], ['postgresql', 'PostgreSQL']] },
  { id: 'retention', title: 'Understand retention', question: 'Which accounts need a closer look?', sources: [['stripe', 'Stripe'], ['zendesk', 'Zendesk'], ['snowflake', 'Snowflake']] },
  { id: 'product', title: 'Make product decisions', question: 'Which opportunities have evidence behind them?', sources: [['amplitude', 'Amplitude'], ['airtable', 'Airtable'], ['google-sheets', 'Google Sheets']] },
];
export function html(value: string): string { return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!); }
const mark = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 26V6h10a7 7 0 0 1 0 14H7m10 0 9 6" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
export function siteHeader(area: SiteArea, root: string): string {
  const routes: [SiteArea,string][] = [['Overview',''],['Examples','examples/'],['Connectors','connectors/'],['Playground','demo/playground.html']];
  return `<header class="rm-header"><a class="rm-logo" href="${root}" aria-label="Relametric home">${mark}<span>relametric</span></a><nav class="rm-navigation" aria-label="Main navigation">${routes.map(([name,path])=>`<a href="${root}${path}"${area===name?' aria-current="page"':''}>${name}</a>`).join('')}</nav><a class="rm-github" href="https://github.com/kevin-owens-product/Relametric">GitHub ↗</a></header>`;
}
export function journeyCards(root: string): string {
  return `<section class="rm-journeys" aria-label="Explore by outcome"><div class="rm-section-heading"><div><span>ONE CONNECTED WORKSPACE</span><h2>Start with the question.</h2></div><p>Explore an example, tune the view, then adapt a source.</p></div><div class="rm-journey-grid">${outcomes.map((item,i)=>`<article class="rm-journey" style="--journey-accent:${['#c3f96b','#b6a0ff','#ffc48f'][i]}"><span class="rm-step">0${i+1} / ${item.id.toUpperCase()}</span><h3>${item.title}</h3><p>${item.question}</p><a class="rm-journey-primary" href="${root}demo/playground.html?example=source-${item.id}">Explore in Playground ↗</a><div class="rm-source-links"><span>Adapt a source</span>${item.sources.map(([slug,name])=>`<a href="${root}connectors/${slug}/">${name} ↗</a>`).join('')}</div><a class="rm-journey-secondary" href="${root}?outcome=${item.id}#decision-lab">Open the full decision workflow →</a></article>`).join('')}</div><div class="rm-explore-more"><a href="${root}examples/">Browse all 100 examples →</a><a href="${root}connectors/">Find your data source →</a><a href="${root}demo/playground.html">Experiment with four rendering layers →</a></div></section>`;
}
const sourceNames = new Map(connectorCatalog.map(entry=>[connectorSlug(entry.name), entry.name]));
for (const [slug,name] of [['mariadb','MariaDB'],['opensearch','OpenSearch'],['intercom','Intercom'],['cube','Cube'],['parquet','Parquet'],['arrow','Apache Arrow'],['csv','CSV'],['dbt','dbt Semantic Layer'],['elasticsearch','Elasticsearch'],['json','JSON snapshots'],['mysql','MySQL'],['zendesk','Zendesk']]) sourceNames.set(slug,name);
export function sourceContext(params: URLSearchParams): { slug: string; name: string } | undefined {
  const slug=params.get('source')??'';const name=sourceNames.get(slug);return name?{slug,name}:undefined;
}
export function sourceQuery(source?: {slug:string}): string { return source ? `&source=${encodeURIComponent(source.slug)}` : ''; }
export function sourceNotice(root: string, source?: {slug:string;name:string}): string {
  return source ? `<aside class="rm-source-context"><div><strong>Adapting ${html(source.name)}</strong><p>This example uses synthetic data. The guide shows how to read your source; mapping and authentication belong to your application.</p></div><a href="${root}connectors/${source.slug}/#code">Return to source guide ↗</a></aside>` : '';
}

export const featuredRecipes = [
  {
    "id": "activation-pathways",
    "title": "Activation pathways",
    "outcome": "conversion",
    "summary": "Find the onboarding step where the most eligible accounts stall.",
    "accent": "#82eacb"
  },
  {
    "id": "payment-routing",
    "title": "Payment routing atlas",
    "outcome": "conversion",
    "summary": "Compare failed payment attempts by route before proposing a recovery test.",
    "accent": "#ffc48f"
  },
  {
    "id": "renewal-runway",
    "title": "Renewal runway",
    "outcome": "retention",
    "summary": "Plan account reviews across the next five renewal windows.",
    "accent": "#b6a0ff"
  },
  {
    "id": "support-escalation",
    "title": "Support escalation orbit",
    "outcome": "retention",
    "summary": "Separate support queues with high unresolved shares from high volumes.",
    "accent": "#ff97a9"
  },
  {
    "id": "feature-adoption",
    "title": "Feature adoption terraces",
    "outcome": "product",
    "summary": "Compare eligible account populations with the accounts yet to adopt.",
    "accent": "#8acbff"
  },
  {
    "id": "interview-coverage",
    "title": "Interview coverage prism",
    "outcome": "product",
    "summary": "Expose gaps in a target interview sample before prioritizing a roadmap.",
    "accent": "#f1c674"
  },
  {
    "id": "performance-friction",
    "title": "Performance friction canyon",
    "outcome": "conversion",
    "summary": "Prioritize slow-session investigations without claiming latency causes abandonment.",
    "accent": "#82d8e8"
  }
];

/** Shared discovery surface, kept lightweight so the overview need not load every recipe. */
export function recipeShowcase(root: string): string {
  return `<section class="rm-recipes" aria-labelledby="recipe-heading"><div class="rm-section-heading"><div><span>EXPLORE BY QUESTION</span><h2 id="recipe-heading">A workspace for every investigation.</h2></div><p>Explore a snapshot. Change the assumptions. Export the records behind your review plan.</p></div><div class="preview-toolbar"><span>Recorded scenes · Synthetic snapshots</span><button type="button" data-preview-motion aria-pressed="false">Play previews</button></div><div class="rm-recipe-grid">${featuredRecipes.map((recipe,i)=>`<a class="rm-recipe-card" href="${root}demo/playground.html?example=${recipe.id}" style="--recipe-accent:${recipe.accent}"><div class="preview-media"><img src="${root}examples/previews/${recipe.id}.jpg" width="640" height="420" loading="lazy" alt="${html(recipe.title)} scene preview"><video data-preview-src="${root}examples/previews/${recipe.id}.mp4" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video></div><div class="rm-recipe-copy"><span class="rm-step">0${i+1} / ${recipe.outcome.toUpperCase()}</span><h3>${recipe.title}</h3><p>${recipe.summary}</p><strong>Open workspace →</strong></div></a>`).join('')}</div><p class="rm-recipe-note">Synthetic snapshots · Explicit scenario assumptions · Editable source · CSV exports</p></section>`;
}

/** All new domain investigations are reachable without mounting a renderer. */
export function observatoryShowcase(root: string): string {
  const domains = [...new Set(observatories.map(item => item.category))];
  return `<section class="rm-observatories" aria-labelledby="observatory-heading"><div class="rm-section-heading"><div><span>43 NEW INVESTIGATIONS / 100 EDITABLE RECIPES</span><h2 id="observatory-heading">Different worlds. Better questions.</h2></div><p>Follow six observations through eight visual forms. Inspect the source, compare a reference, and choose what to investigate next.</p></div><div class="rm-domain-grid">${domains.map(domain => {
    const items = observatories.filter(item => item.category === domain), first = items[0];
    return `<article class="rm-domain"><a class="rm-domain-cover" href="${root}demo/playground.html?example=${first.id}"><img src="${root}examples/previews/${first.id}.jpg" width="640" height="420" loading="lazy" alt="${html(first.title)} rendered from synthetic observations"><span>${domain} <b>${items.length} new</b></span><h3>${html(first.title)} ↗</h3><p>${html(first.question)}</p></a><details><summary>Explore all ${items.length} investigations</summary><ul>${items.map(item=>`<li><a href="${root}demo/playground.html?example=${item.id}">${html(item.title)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></details></article>`;
  }).join('')}</div><p class="rm-recipe-note">Synthetic observations · Adjustable review references · Eight spatial encodings · Source and CSV in every workspace</p><a class="rm-domain-all" href="${root}examples/">Explore all 100 recipes →</a></section>`;
}
