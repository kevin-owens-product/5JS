# Changelog

## Unreleased

- Add the independent, private and unpublished `motif-connectors` package under the Motif working name: 12 source factories plus an application endpoint, covering 13 implemented entries in a 39-entry catalog. See the [connector guide](https://github.com/kevin-owens-product/5JS/blob/main/packages/connectors/README.md) for supported scope and planned providers.
- Add typed data pages, explicit pagination/truncation, and an authorized operation gateway with server-owned credentials, queries and tenant binding. Run `npm run demo:connectors` for the SQLite/JSON fixture demo at [http://127.0.0.1:5190](http://127.0.0.1:5190), using Node.js 22.16+.
- Verify connector contracts with local tests, real SQLite reads and a real DuckDB smoke check; other provider integrations are protocol-tested without live cloud credentials.

- Add three connected decision workflows for checkout recovery, customer impact reviews, and evidence-to-roadmap research, bringing the gallery to 47 recipes.
- Connect 99 synthetic customers, products, services, people, interviews, sessions, and checkouts through scene selection, a keyboard-accessible record inspector, scenario filters, and local investigation briefs with proposed owners, evidence, measures, and guardrails.
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
