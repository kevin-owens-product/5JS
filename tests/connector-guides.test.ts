import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { guides, catalogFor } from '../connectors/content/index.js';
import { connectorSlug } from '../connectors/paths.js';
import { escapeHtml, highlight, renderDirectory, renderGuide } from '../connectors/render.js';
import { connectorCatalog } from '../packages/connectors/src/catalog.js';
import * as universal from '../packages/connectors/src/index.js';
import * as server from '../packages/connectors/src/server.js';

test('individual connector guides cover every catalog factory and every homepage destination', () => {
  assert.equal(guides.length, 45);
  assert.equal(new Set(guides.map(guide => guide.slug)).size, guides.length);
  assert.equal(new Set(guides.map(guide => guide.factory)).size, 44);
  for (const entry of connectorCatalog) {
    const matching = guides.filter(guide => guide.catalogName === entry.name);
    assert.ok(matching.length, entry.name);
    assert.deepEqual(new Set(matching.map(guide => guide.factory)), new Set(entry.factories));
    assert.ok(matching.some(guide => guide.slug === connectorSlug(entry.name)), `${entry.name}: homepage link must resolve`);
  }
  for (const guide of guides) {
    assert.match(guide.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(guide.accent, /^#[a-f0-9]{6}$/i);
    assert.equal(typeof { ...universal, ...server }[guide.factory as keyof typeof server], 'function');
    assert.ok(catalogFor(guide).factories.includes(guide.factory));
    assert.equal(guide.capabilities.length, 3);
    assert.ok(guide.prerequisites.length && guide.limitations.length && guide.docs.length);
    assert.ok(Object.values(guide.workflow).every(value => value.length > 20));
    for (const doc of guide.docs) assert.equal(new URL(doc.url).protocol, 'https:');
  }
});

test('every guide has a syntactically valid TypeScript sample using its actual runtime export', () => {
  for (const guide of guides) {
    const sample = guide.sample.code;
    assert.ok(sample.includes(guide.factory), `${guide.slug}: factory absent`);
    assert.ok(sample.includes('.read(') || sample.includes('collectPages('), `${guide.slug}: read absent`);
    assert.match(guide.sample.filename, /^[a-z0-9-]+\.ts$/);
    const source = ts.createSourceFile(guide.sample.filename, sample, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
    const syntax = ts.transpileModule(sample, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, strict: true } });
    assert.deepEqual(syntax.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error) ?? [], [], guide.slug);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(item => ts.isStringLiteral(item.moduleSpecifier));
    const providerImport = imports.find(item => item.importClause?.namedBindings?.getText(source).includes(guide.factory));
    assert.ok(providerImport, `${guide.slug}: missing factory import`);
    assert.equal((providerImport.moduleSpecifier as ts.StringLiteral).text, guide.runtime === 'server' ? 'motif-connectors/server' : 'motif-connectors');
    assert.ok(!/npm install motif-connectors(?:\s|$)/.test(sample), 'The package is not published.');
  }
});

test('prerendered pages expose meaningful content, code and relative navigation before JavaScript runs', () => {
  const directory = renderDirectory();
  assert.equal((directory.match(/data-source-card /g) ?? []).length, 45);
  for (const guide of guides) {
    const html = renderGuide(guide);
    assert.ok(html.includes(`<title>${escapeHtml(guide.name)} connector`));
    assert.ok(html.includes(escapeHtml(guide.headline)));
    assert.ok(html.includes(escapeHtml(guide.description)));
    assert.equal((html.match(/<h1>/g) ?? []).length, 1);
    assert.ok(html.includes(`href="../../?outcome=${guide.outcome}#decision-lab"`));
    assert.ok(html.includes('fictional JSON snapshots'));
    assert.ok(html.includes('private and unpublished'));
    assert.ok(html.includes('id="code-source"'));
    assert.ok(html.includes('id="code-result"'));
    assert.ok(!html.includes('id="panel-source" hidden'));
    assert.ok(!html.includes('id="panel-result" hidden'));
    assert.ok(html.includes('href="../style.css"'));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, `${guide.slug}: duplicate HTML id`);
    for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `${guide.slug}: broken anchor ${match[1]}`);
  }
});

test('syntax highlighting preserves the exact sample and escapes HTML-looking input', () => {
  const raw = `// keep <script> inert\nconst html = '<img src=x onerror="alert(1)">';\nconst n = 12;\n`;
  const rendered = highlight(raw);
  assert.ok(!rendered.includes('<img'));
  assert.ok(!rendered.includes('<script>'));
  assert.equal(rendered.replace(/<\/?span[^>]*>/g, ''), escapeHtml(raw));
  for (const guide of guides) assert.equal(highlight(guide.sample.code).replace(/<\/?span[^>]*>/g, ''), escapeHtml(guide.sample.code), guide.slug);
});
