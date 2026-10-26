import { categories, catalogFor, guides, type ConnectorGuide } from './content/index.js';

export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const mark = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 25V7L16 20 28 7v18M4 15l12 12 12-12" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const outcomeNames = { conversion: 'Conversion', retention: 'Retention', product: 'Product decisions' };
const repo = 'https://github.com/kevin-owens-product/5JS';

/** Tokenization is presentation only. Every source fragment is escaped before HTML insertion. */
export function highlight(code: string): string {
  const tokens = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|export|const|let|async|await|function|return|throw|new|if|else|try|catch|finally|type|interface|for|of|undefined|null|true|false)\b|\b\d+(?:\.\d+)?\b/g;
  let result = '', last = 0;
  for (const match of code.matchAll(tokens)) {
    const value = match[0], index = match.index!;
    const kind = value.startsWith('//') || value.startsWith('/*') ? 'comment' : /^["'`]/.test(value) ? 'string' : /^\d/.test(value) ? 'number' : 'keyword';
    result += escapeHtml(code.slice(last, index)) + `<span class="token-${kind}">${escapeHtml(value)}</span>`;
    last = index + value.length;
  }
  return result + escapeHtml(code.slice(last));
}

function shell(title: string, description: string, body: string, detail = false, accent = '#c8f58c') {
  const root = detail ? '../../' : '../';
  return `<!doctype html>
<html lang="en" style="--accent:${escapeHtml(accent)}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0a1012"><title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:type" content="website">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='9' fill='%230a1012'/%3E%3Cpath d='M8 30V10L20 23 32 10v20M8 18l12 13 12-13' fill='none' stroke='%23c8f58c' stroke-width='2.5'/%3E%3C/svg%3E">
<link rel="stylesheet" href="${detail ? '../' : './'}style.css">
</head><body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><a class="brand" href="${root}" aria-label="Motif home">${mark}<span>motif</span></a><nav aria-label="Main navigation"><a href="${root}examples/">Examples <small>50</small></a><a href="${detail ? '../' : './'}" aria-current="${detail ? 'false' : 'page'}">Connectors <small>${guides.length}</small></a><a href="${root}#decision-lab">Decision lab</a><a class="github" href="${repo}">GitHub ↗</a></nav></header>
${body}
<footer class="site-footer"><a class="brand" href="${root}">${mark}<span>motif</span></a><p>Follow the source. Find the pattern.</p><div><a href="${root}LICENSE">MIT license</a><a href="${root}THIRD_PARTY_NOTICES.md">Third-party notices</a><a href="${repo}">Source ↗</a></div></footer>
<script type="module" src="${detail ? '../' : './'}client.ts"></script>
</body></html>`;
}

function card(guide: ConnectorGuide, prefix: string) {
  const category = catalogFor(guide).category;
  return `<a class="source-card" href="${prefix}${guide.slug}/" data-source-card data-category-name="${escapeHtml(category)}" data-search="${escapeHtml([guide.name, category, guide.description, guide.factory, guide.outcome, guide.catalogName].join(' ').toLowerCase())}" style="--source-accent:${escapeHtml(guide.accent)}"><div class="card-top"><span class="source-symbol" aria-hidden="true">${escapeHtml(guide.monogram)}</span><span class="category">${escapeHtml(category)}</span><span class="card-arrow" aria-hidden="true">↗</span></div><h3>${escapeHtml(guide.name)}</h3><p>${escapeHtml(guide.description)}</p><div class="card-bottom"><span>${outcomeNames[guide.outcome]}</span><span>Guide + code</span></div></a>`;
}

export function renderDirectory(): string {
  return shell('Data connectors — Motif', 'Explore 45 Motif connector guides with TypeScript samples, supported operations, and conversion, retention, and product workflows.', `
<main id="main"><section class="directory-hero"><div><p class="eyebrow"><span class="live-dot"></span> THE CONNECTOR LIBRARY</p><h1>Start with your data.<br><em>Build the next insight.</em></h1><p class="hero-description">Databases, warehouses, and the tools your team already uses. Find your source, copy a working pattern, and connect the evidence to a decision.</p><div class="hero-actions"><a class="primary" href="#sources">Find your connector <span>↓</span></a><a class="quiet-link" href="../#decision-lab">Explore the decision lab ↗</a></div></div><div class="directory-numbers"><strong>${guides.length}<span>guides</span></strong><div><span>44 adapter factories</span><span>One typed result contract</span><span>Open source · TypeScript</span></div><p>Grouped catalog entries have individual guides.<br>MySQL and MariaDB share one adapter.</p></div></section>
<section class="directory-intro" aria-label="How the connectors work"><div><span>01</span><p><strong>Read a specific source.</strong> Start with the operations the adapter actually supports.</p></div><div><span>02</span><p><strong>Keep the context.</strong> Preserve fields, exact values, provenance, and completeness.</p></div><div><span>03</span><p><strong>Build a useful workflow.</strong> Join records at the right grain and define a measurable next step.</p></div></section>
<section class="source-library" id="sources" aria-labelledby="library-title"><div class="section-heading"><div><p class="eyebrow">MEET YOUR DATA WHERE IT LIVES</p><h2 id="library-title">A guide for every source.</h2></div><p>Implemented adapters. Specific scopes.<br>Code you can inspect and adapt.</p></div><div id="source-controls" hidden><div class="source-filters" role="group" aria-label="Filter connector categories">${categories.map(category => `<button data-category="${escapeHtml(category)}" aria-pressed="${category === 'All sources'}">${escapeHtml(category)}</button>`).join('')}</div><label class="search-label" for="source-search"><span>Search connectors</span><input id="source-search" type="search" placeholder="Search a source, capability, or outcome…" autocomplete="off"></label></div><div class="results-heading"><p id="source-count" role="status">${guides.length} connector guides</p><span>SETUP · CODE · SUPPORTED SCOPE</span></div><div class="source-grid">${guides.map(guide => card(guide, './')).join('')}</div><div class="no-results" id="no-results" hidden><h3>No matching connectors.</h3><p>Try another source name or clear your filters.</p><button id="reset-sources">Reset filters</button></div></section>
<section class="directory-close"><p class="eyebrow">A SMALL CONTRACT. MANY POSSIBILITIES.</p><h2>Read the records.<br>Keep their meaning.</h2><p>Motif is an experimental, unpublished local package. Provider permissions, authentication, and schema mapping belong to your application. Each guide documents the boundary.</p><a href="./json/" class="primary">Try a credential-free JSON example ↗</a></section></main>`);
}

const resultCode = `import type { DataPage } from 'motif-connectors';

// Pass the page returned by the source sample.
// Do not label a capped or partial page as the whole population.
export function inspectResult(page: DataPage) {
  const complete = !page.page.hasMore && !page.page.truncated;

  return {
    // Keep positional rows: field names may repeat.
    fields: page.fields,
    rows: page.rows,
    complete,
    nextCursor: page.page.nextCursor,
    warnings: page.warnings,
    source: page.provenance,
  };
}

// For a complete analysis, follow supported continuation pages
// with the same query, or narrow a truncated snapshot.
// Preserve decimal and large-integer strings when mapping rows.
// fetchedAt is retrieval time, not the source's freshness.`;
const installCode = `# In the Motif checkout (Node.js 22.16+)
npm ci
npm run build:connectors

# In your application; replace this with your checkout path
npm install /absolute/path/to/fivejs/packages/connectors`;

function codePanel(id: string, title: string, filename: string, description: string, code: string) {
  return `<section class="code-panel" id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}"><div class="code-description"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div><div class="code-window"><div class="code-toolbar"><span class="file-name">${escapeHtml(filename)}</span><div><button hidden data-copy="code-${id}">Copy code</button><button hidden data-download="code-${id}" data-filename="${escapeHtml(filename)}" aria-label="Download ${escapeHtml(filename)}">Download .ts ↓</button></div></div><pre tabindex="0" aria-label="${escapeHtml(title)} TypeScript sample"><code id="code-${id}">${highlight(code)}</code></pre></div></section>`;
}

export function renderGuide(guide: ConnectorGuide): string {
  const catalog = catalogFor(guide);
  const runtime = guide.runtime === 'server' ? 'Server only' : guide.runtime === 'browser' ? 'Browser → your server' : 'Browser or server';
  const related = guides.filter(item => item.slug !== guide.slug).sort((a, b) => Number(b.catalogName === guide.catalogName) - Number(a.catalogName === guide.catalogName) || Number(catalogFor(b).category === catalog.category) - Number(catalogFor(a).category === catalog.category) || Number(b.outcome === guide.outcome) - Number(a.outcome === guide.outcome)).slice(0, 3);
  const entrypoint = guide.runtime === 'server' ? 'motif-connectors/server' : 'motif-connectors';
  return shell(`${guide.name} connector — TypeScript guide | Motif`, guide.description, `
<main id="main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../../">Motif</a><span>/</span><a href="../">Connectors</a><span>/</span><span aria-current="page">${escapeHtml(guide.name)}</span></nav>
<section class="guide-hero"><div><div class="source-heading"><span class="source-symbol" style="--source-accent:${escapeHtml(guide.accent)}" aria-hidden="true">${escapeHtml(guide.monogram)}</span><span>${escapeHtml(guide.name)} <small>+ MOTIF</small></span></div><h1>${escapeHtml(guide.headline)}</h1><p class="hero-description">${escapeHtml(guide.description)}</p><div class="hero-actions"><a class="primary" href="#code">Start with the code <span>↗</span></a><a class="quiet-link" href="#workflow">See the decision workflow ↓</a></div></div><figure class="connection-map" aria-label="${escapeHtml(guide.name)} records become a typed DataPage with fields, values, provenance, and completeness"><div class="connection-kicker">FROM SOURCE TO SOMETHING USEFUL</div><div class="connection-source"><span class="source-symbol" style="--source-accent:${escapeHtml(guide.accent)}">${escapeHtml(guide.monogram)}</span><strong>${escapeHtml(guide.name)}</strong><span class="source-tag">${escapeHtml(catalog.category)}</span></div><div class="connection-arrow" aria-hidden="true"><i></i><span>↓</span><i></i></div><div class="page-packet"><div><span>${mark} DataPage</span><small>TYPED CONTRACT</small></div><dl><dt>fields</dt><dd>names + source types</dd><dt>rows</dt><dd>positional values</dd><dt>provenance</dt><dd>origin + retrieval time</dd><dt>page</dt><dd>continuation + limits</dd></dl></div><figcaption>Map the result into your application's entities.</figcaption></figure></section>
<dl class="guide-facts"><div><dt>Runtime</dt><dd>${runtime}</dd></div><div><dt>Import from</dt><dd><code>${entrypoint}</code></dd></div><div><dt>Factory</dt><dd><code>${escapeHtml(guide.factory)}</code></dd></div><div><dt>Availability</dt><dd>Local package preview</dd></div></dl>
<div class="guide-layout"><aside class="on-this-page"><p>IN THIS GUIDE</p><nav aria-label="On this page"><a href="#scope">Supported operations</a><a href="#code">Setup & code samples</a><a href="#workflow">${outcomeNames[guide.outcome]} workflow</a><a href="#boundaries">Limits & permissions</a><a href="#resources">Provider resources</a></nav><a class="back-link" href="../">← All connectors</a></aside><div class="guide-content">
<section id="scope" class="guide-section"><p class="eyebrow">01 / WHAT YOU CAN READ</p><h2>Start with the supported scope.</h2><p class="section-lead">${escapeHtml(catalog.scope)}.</p><div class="capability-grid">${guide.capabilities.map((capability, i) => `<article><span>0${i + 1}</span><h3>${escapeHtml(capability.title)}</h3><p>${escapeHtml(capability.body)}</p></article>`).join('')}</div></section>
<section id="code" class="guide-section"><p class="eyebrow">02 / FROM IMPORT TO RECORDS</p><h2>A practical starting point.</h2><p class="section-lead">Install the local package, configure your source, then adapt the read to your application's schema.</p><details class="installation" open><summary>Install Motif Connectors locally <span>Node.js 22.16+</span></summary><p>This package is private and unpublished. Use the checkout path below; a registry installation is not available.</p><div class="install-code"><pre tabindex="0" aria-label="Local package installation"><code id="code-install">${escapeHtml(installCode)}</code></pre><button hidden data-copy="code-install">Copy code</button></div></details><div class="prerequisites"><h3>Before running this sample</h3><ul>${guide.prerequisites.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div class="sample-tabs" id="sample-tabs" role="tablist" aria-label="Code examples" hidden><button role="tab" id="tab-source" aria-controls="panel-source" aria-selected="true">Read ${escapeHtml(guide.name)}</button><button role="tab" id="tab-result" aria-controls="panel-result" aria-selected="false" tabindex="-1">Handle the result</button></div>${codePanel('source', guide.sample.title, guide.sample.filename, guide.sample.description, guide.sample.code)}${codePanel('result', 'Keep the result honest.', 'inspect-result.ts', 'Call this helper with the DataPage returned by the read sample. It preserves values and makes completeness visible before you calculate a metric.', resultCode)}<p class="copy-status" id="copy-status" role="status" aria-live="polite"></p><p class="code-note">These samples run in your application. This page does not execute code, collect credentials, or query an account.</p></section>
<section id="workflow" class="workflow guide-section"><p class="eyebrow">03 / ${outcomeNames[guide.outcome].toUpperCase()}</p><h2>${escapeHtml(guide.workflow.question)}</h2><div class="workflow-steps"><div><span>LINK</span><h3>Put the record in context.</h3><p>${escapeHtml(guide.workflow.join)}</p></div><div><span>ACT</span><h3>Choose a next step.</h3><p>${escapeHtml(guide.workflow.action)}</p></div><div><span>MEASURE</span><h3>Check whether it helped.</h3><p>${escapeHtml(guide.workflow.measure)}</p></div></div><a class="quiet-link" href="../../?outcome=${guide.outcome}#decision-lab">Explore the ${outcomeNames[guide.outcome].toLowerCase()} example ↗</a><p class="workflow-note">The linked decision lab uses fictional JSON snapshots. It illustrates the workflow; it is not connected to ${escapeHtml(guide.name)}. Map authorized source records explicitly before using real data.</p></section>
<section id="boundaries" class="guide-section boundaries"><p class="eyebrow">04 / KNOW THE BOUNDARY</p><h2>Build with the limits in view.</h2><ul>${guide.limitations.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p class="validation-note"><span class="live-dot"></span>Implemented and protocol-tested. Live provider-account validation is separate.</p></section>
<section id="resources" class="guide-section resources"><p class="eyebrow">05 / GO DEEPER</p><h2>Keep the source close.</h2><div>${guide.docs.map(doc => `<a href="${escapeHtml(doc.url)}" target="_blank" rel="noreferrer"><span>${escapeHtml(doc.label)}</span><span>↗</span></a>`).join('')}<a href="${repo}/tree/codex/motif-connector-pages/packages/connectors" target="_blank" rel="noreferrer"><span>Motif package reference & source</span><span>↗</span></a></div></section>
</div></div><section class="related"><div class="section-heading"><div><p class="eyebrow">KEEP EXPLORING</p><h2>Other sources. More context.</h2></div><a class="quiet-link" href="../">All ${guides.length} guides ↗</a></div><div class="source-grid">${related.map(item => card(item, '../')).join('')}</div></section></main>`, true, guide.accent);
}
