# Changelog

## Unreleased

- Add a human documentation map, focused quickstart, architecture and troubleshooting guides, root agent instructions and a plain-text documentation index. Record the ecosystem/naming review and correct stale current example counts.

- Introduce Motif as the working project name and homepage brand at `/`. Keep the `fivejs` import, `createFive`, `FiveLayer`, package output and `kevin-owens-product/5JS` repository unchanged. Move the original playground to `/demo/playground.html`; retain the gallery at `/examples/`.
- Add the homepage decision lab at `/#decision-lab`, with conversion, retention and product routes. Read seven fictional snapshots through actual JSON connectors: 36 accounts, 144 sessions, 144 checkouts, 144 usage observations, 24 support tickets, 45 interviews and three initiatives, totaling 540 records. Expose source fields, provenance, joins and completeness; no live provider accounts are queried.
- Connect 3D evidence selection to navigable source-record dialogs, all four retention observation weeks, initiative-specific interview context, scenario controls and local investigation briefs. Product briefs retain the selected initiative's evidence, owner, measure and guardrail; scenarios do not change historical observations or claim validated impact.
- Add `source-conversion` (Conversion observatory), `source-retention` (Retention horizon) and `source-product` (Opportunity constellation) companion recipes with an **Open the decision workspace** link. The gallery now has 50 recipes, including 26 Business/Analytics recipes and six in the Decisions collection. Document source adaptation through `examples/outcomes/` and the homepage controller.
- Add the independent, private and unpublished `motif-connectors` package: all 39 catalog entries have constrained implementations through 44 factories. Coverage includes databases, warehouses, CRM/commerce/support, product analytics, BI/semantic APIs and JSON/CSV/Arrow/Parquet. See the [connector guide](https://github.com/kevin-owens-product/5JS/blob/main/packages/connectors/README.md) for per-factory scope; PostHog uses pinned named SQL Endpoints, not a general query proxy.
- Add a searchable `/connectors/` directory and 45 shareable `/connectors/<slug>/` guides covering those 44 factories; MySQL/MariaDB have separate guides. Prerender setup, TypeScript samples, runtime/limits, provider resources and related workflow links so content remains readable without JavaScript; add copy/download enhancements. Generate guide HTML before development/builds from authored TypeScript, include the sources/generator in the example ZIP, and retain local installation instructions for the unpublished package.
- Add typed data pages, explicit pagination/truncation, and an authorized operation gateway with server-owned credentials, queries and tenant binding. Run `npm run demo:connectors` for the SQLite/JSON fixture demo at [http://127.0.0.1:5190](http://127.0.0.1:5190), using Node.js 22.16+.
- Verify connector contracts with local tests, real SQLite reads, a real DuckDB smoke check and an Arrow/Parquet roundtrip. Other provider integrations use mocked driver/API protocols and SDK typechecks where applicable; live cloud accounts have not been certified. Document precision, pagination, cost, cancellation and lifecycle limits.

- Add the earlier Checkout recovery lab, Customer impact review and Evidence to roadmap workflows using a separate 99-record synthetic fixture of customers, products, services, people, interviews, sessions and checkouts. Support scene selection, a keyboard-accessible record inspector, scenario filters and local briefs with proposed owners, evidence, measures and guardrails.
- Keep recorded observations, qualitative counter-evidence, exposure, and explicit scenario assumptions distinct; add linked-data, selection, brief-export, picking, and workflow browser checks.

- Make custom-layer initialization transactional and complete resource cleanup even when a custom disposer throws; stop frames that dispose their scene.
- Validate JavaScript option objects and graph-data snapshots before mutation; keep oversized deltas and sparse coordinates out of live GPU state.
- Reconcile decimal-price break-even with operating profit and reject rounded-zero or nonfinite business-model denominators/results.
- Preserve gallery category/search state in URLs, dismiss stale scenes for invalid links, and give phone controls full-width tracks.
- Repair documentation links in packed artifacts and prevent source archives from following symlinks or including hidden/ignored local files.
- Add adversarial API, rendering, navigation, numeric, and archive regression coverage.

## 0.1.0-alpha.1 — 2026-10-25

First GitHub alpha. The API remains experimental; npm publication is a separate milestone.

### Library

- Shared WebGL2 scene lifecycle with camera orbit, resizing, pause, playback speed, bloom, measured render statistics, and PNG capture.
- Four composable layers: shader-driven particle fields, deterministic network graphs, procedural terrain, and projected 4D/5D hypercubes.
- Explicit graph-data input, validated live settings, seeded generation, resource ownership, and repeatable disposal.
- ESM library output and TypeScript declarations with Three.js as an external peer dependency.

### Examples

- Interactive playground and 44 runnable recipes: two each in Space, Biology, Climate, Energy, Cities, and Engineering; ten Business; ten Analytics; four Scientific; four Data; and four Cinematic.
- Twelve domain scenes: orbital systems, stellar loops, neural pathways, vascular transport, jet belts, ocean gyres, renewable dispatch, fusion geometry, transit, urban airflow, acoustic modes, and turbine wakes.
- Animated business scenes using revenue rivers, conversion gates, profit flows, supply networks, utilization gauges, portfolio trajectories, budget petals, and profit terrain.
- Search/filter navigation, live parameters, source inspection, standalone URLs, PNG capture, synthetic-data tables, current-view CSV export, and a downloadable source project.
- Explicit quantitative encodings and model assumptions; decorative motion leaves analytic readouts unchanged.

### Documentation and release preparation

- API reference, example authoring guide, contribution instructions, compatibility guidance, and release checklist.
- Automated calculation/lifecycle tests and browser harnesses covering the core renderer and example gallery.

### Known limitations

- WebGL2 only; no WebGPU backend, built-in picking/tooltips, streaming/LOD, or general volumetric rendering.
- Graph layout and analytic particle/terrain motion are specialized techniques rather than general physical simulation.
- No broad browser/device certification or frame-rate guarantee.
- npm publication is a separate milestone; the package remains private until maintainers explicitly enable it.
