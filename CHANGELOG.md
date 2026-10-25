# Changelog

## Unreleased — 0.1.0-alpha.1

The first public alpha is being prepared. This entry describes the intended release contents and does not mean a GitHub release or npm package has already been published. The API remains experimental.

### Library

- Shared WebGL2 scene lifecycle with camera orbit, resizing, pause, playback speed, bloom, measured render statistics, and PNG capture.
- Four composable layers: shader-driven particle fields, deterministic network graphs, procedural terrain, and projected 4D/5D hypercubes.
- Explicit graph-data input, validated live settings, seeded generation, resource ownership, and repeatable disposal.
- ESM library output and TypeScript declarations with Three.js as an external peer dependency.

### Examples

- Interactive playground and 32 runnable recipes: ten Business, ten Analytics, four Scientific, four Data, and four Cinematic.
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
