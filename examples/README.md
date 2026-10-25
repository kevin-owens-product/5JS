# 5js example library

Thirty-two editable recipes include twenty business and analytics examples, plus particles, higher-dimensional geometry, graph data, terrain, and custom Three.js layers. Each recipe powers both its gallery preview and its interactive viewer.

## Run locally

From the project root:

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5185/examples/**. If Vite reports another port, use that address.

Open one recipe directly with `/examples/run.html?example=id`, for example:

```text
http://127.0.0.1:5185/examples/run.html?example=orbital-garden
```

The gallery supports category filters, text search, keyboard navigation, live controls, pause, camera reset, PNG capture, and source inspection. Reduced-motion preferences start animation paused. Rendering requires WebGL2.

For a production build, run `npm run build:demo`, then `npm run preview`; the gallery remains at `/examples/`.

## Catalog

| Recipe and source | Category | Learning concept |
| --- | --- | --- |
| [Revenue landscape](business/revenue-landscape.ts) | Business | Luminous revenue rivers; exact monthly crest heights and an uplift scenario |
| [Conversion funnel](business/conversion-funnel.ts) | Business | A conversion reactor with count-proportional gate areas and attrition branches |
| [Subscription bridge](business/subscription-bridge.ts) | Business | An orbital MRR exchange; balance-ring areas, change streams, and exact NRR |
| [Marketing efficiency](business/marketing-efficiency.ts) | Business | An attribution network with dollar-proportional tube areas and channel ROAS |
| [Unit economics](business/unit-economics.ts) | Business | A profit engine routing revenue, expenses, retained profit, and funding gaps |
| [Product portfolio](business/product-portfolio.ts) | Business | A product constellation with quantitative positions and scenario trails |
| [Capacity planning](business/capacity-planning.ts) | Business | A factory circuit with utilization reactors and visible overload arcs |
| [Inventory coverage](business/inventory-coverage.ts) | Business | A supply constellation with coverage gauges and conditional replenishment routes |
| [Break-even landscape](business/break-even.ts) | Business | Continuous profit terrain with a traced zero-profit contour |
| [Budget tension field](business/budget-variance.ts) | Business | Spending petals whose footprint area encodes expense and outer-edge height encodes variance |
| [Cohort retention](analytics/cohort-retention.ts) | Analytics | Observed cohort ages, missing future periods, and weighted retention |
| [Customer segments](analytics/customer-segments.ts) | Analytics | Rule-based segmentation of synthetic customer observations |
| [Demand scenarios](analytics/demand-scenarios.ts) | Analytics | Separate historical observations from explicit what-if paths |
| [Pareto analysis](analytics/pareto-analysis.ts) | Analytics | Ranked contributions and cumulative share with a defined denominator |
| [Geographic demand](analytics/geographic-demand.ts) | Analytics | Longitude, latitude, and order counts for fictional city demand |
| [Correlation matrix](analytics/correlation-matrix.ts) | Analytics | Calculate Pearson correlations from the selected observations |
| [Distribution explorer](analytics/distribution-explorer.ts) | Analytics | Bin observations and inspect their frequency distribution |
| [Time-series anomalies](analytics/time-series-anomalies.ts) | Analytics | Flag residuals against an explicit baseline and threshold |
| [A/B experiment](analytics/ab-experiment.ts) | Analytics | Inspect observed group rates and differences without causal claims |
| [Data quality audit](analytics/data-quality.ts) | Analytics | Distinguish overlapping validation flags from affected records |
| [Vortex flow](scientific/vortex-flow.ts) | Scientific | Seeded shader particles and live field parameters |
| [Wave interference](scientific/wave-interference.ts) | Scientific | Analytic wave terms and object transforms |
| [Dimensional dance](scientific/dimensional-dance.ts) | Scientific | Compose 4D and 5D perspective projections |
| [Lorenz attractor](scientific/lorenz-attractor.ts) | Scientific | Numerical integration, custom geometry, and trajectory playback |
| [Community network](data/community-network.ts) | Data | Explicit groups, hubs, and weighted edges |
| [Dependency tree](data/dependency-tree.ts) | Data | Position a hierarchy from its topology |
| [Double helix](data/double-helix.ts) | Data | Parametric coordinates and cross-strand connections |
| [Lattice network](data/lattice-network.ts) | Data | Construct a regular grid with nearest-neighbor edges |
| [Neon landscape](cinematic/neon-landscape.ts) | Cinematic | Compose matching surface and wireframe layers |
| [Twin galaxies](cinematic/twin-galaxies.ts) | Cinematic | Independent palettes, transforms, and shared controls |
| [Orbital garden](cinematic/orbital-garden.ts) | Cinematic | Custom torus layers, nested networks, and resource ownership |
| [Crystal summit](cinematic/crystal-summit.ts) | Cinematic | Wrap an existing layer with pause-aware hover animation |

The stable recipe ID is its filename without `.ts`. Display titles can change without breaking saved routes: **Budget tension field**, for example, keeps the ID `budget-variance`.

## Reading the animated business scenes

The ten Business recipes combine exact scenario calculations with animated spatial compositions. Their controls update the data, geometry, metrics, and table together. Playback advances illustrative light tracers; it does not create new observations or change financial totals. Pause, playback speed, and reduced-motion settings apply to those tracers.

Read each recipe's encoding note before comparing sizes. Revenue river crests use a fixed dollar height, and their monthly knots are the actual samples. Conversion gate **interior area** is proportional to people, so radius follows the square root of the count. Marketing and unit-economics **tube cross-sectional area** is proportional to USD. Subscription balance rings and change tubes use two separately stated scales. Particle number, speed, glow size, and decorative hub positions do not represent people, transactions, or elapsed business time.

Factory gauges map the inner turn to 0–100% utilization and the outer turn to 100–200%; their moving light does not simulate jobs or queues. Inventory gauges map one turn to 60 days, with gold threshold beacons and replenishment routes lit only when the stated reorder rule fires. These pulses are proposed routes, not shipments. Product constellation positions encode growth, margin, and revenue; constant-size halos and curved trails are presentation, not historical observations.

The break-even terrain evaluates the profit formula between its 36 tabulated price/volume samples. Its gold contour marks zero profit, with moving lights used only to reveal the surface. Budget petals have equal angular spans: their footprint area viewed from above is proportional to actual expense, a blue outline marks planned expense, and the outer-edge height relative to the plan plane shows signed variance. The sloped interior is a visual connection, not an additional metric.

## Project map

- [catalog.ts](catalog.ts) imports recipes and defines their gallery order.
- [types.ts](types.ts) defines `ExampleDefinition`, `ExampleInstance`, and slider controls.
- [gallery/main.ts](gallery/main.ts) runs the gallery and standalone viewer.
- [gallery/runtime.ts](gallery/runtime.ts) mounts recipes, frames cameras, and releases instances.
- [gallery/sources.ts](gallery/sources.ts) loads the actual recipe files as raw text.
- [shared/chart.ts](shared/chart.ts) supplies example-only geometry, text, flow animation, and resource ownership.
- [../src/index.ts](../src/index.ts) exports the 5js library; [../README.md](../README.md) documents its API.

Recipe modules avoid browser globals at import time. The shared chart helper draws camera-facing text labels only when a browser canvas is available; Node tests exercise the same numeric geometry without text textures. Their `setup(app)` functions can run against a small app substitute in CPU tests; browser work belongs in the shared runner.

## Add a recipe

Create a module such as `cinematic/aurora-wave.ts` and default-export an `ExampleDefinition`:

```ts
import { particleField } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

const example: ExampleDefinition = {
  id: 'aurora-wave',
  title: 'Aurora wave',
  category: 'Cinematic',
  summary: 'A slow, luminous particle surface.',
  description: 'Adjust a seeded wave field through a live layer parameter.',
  tags: ['Particles', 'Waves'],
  difficulty: 'Starter',
  accent: '#8ce9b5',
  camera: [7, 7, 11],
  bloom: .4,
  previewTime: 4,
  setup(app) {
    const field = app.add(particleField({
      count: 20_000, mode: 'wave', radius: 4, seed: 42,
      speed: .4, colorA: '#a9f5bd', colorB: '#357fce',
    }));
    return { controls: [{
      id: 'speed', label: 'Wave speed',
      min: 0, max: 2, step: .05, value: .4,
      apply(value) { field.set({ speed: value }); },
    }] };
  },
};

export default example;
```

Then import it in `catalog.ts` and add it to the exported `examples` array:

```ts
import aurora from './cinematic/aurora-wave.js';
// Add aurora to the existing examples array.
```

Keep the ID unique and identical to the filename: source lookup uses that correspondence. Use `.js` import specifiers in TypeScript, matching the existing modules. Metadata supplies the card, viewer, filters, and standalone route; no new HTML file is needed.

## Controls and lifecycle

Return one to three meaningful controls from `setup`. Each control needs a unique ID, label, numeric bounds, positive step, initial value, and `apply(value)`. Match initial values to the constructed layers and keep them on the slider's step grid. Call `layer.set()` for supported live changes, or edit the layer's ordinary Three.js object transform.

An optional control `format(value)` presents a percentage, currency, or category label instead of a raw slider number. An optional instance `readout()` supplies metric cards, legend entries, and a table; the viewer refreshes these after every control change. Compute the chart and readout from the same rows so filtering cannot leave stale summaries. The [shared chart helper](shared/chart.ts) supplies the geometry and animation used by analytical and Business recipes. It belongs to the examples project and is not exported by the public `fivejs` package.

The shared viewer supplies playback speed, bloom, auto-orbit, and pause. New instances start from recipe defaults. Structural options such as particle count generally require a new layer; see the library API before exposing them as controls.

Layers added with `app.add()` belong to the app. Switching examples clears and disposes those layers. A custom layer must dispose its own geometries, materials, and nested layers exactly once. The orbital garden demonstrates this ownership pattern.

Return an optional instance `dispose()` only for resources outside app-owned layers, such as event listeners, subscriptions, or callbacks. The runner calls it before clearing layers. Keep cleanup safe to repeat, and avoid disposing the entire shared app inside a recipe.

Animate custom layers in `update(time, delta)` by integrating `delta`. When `delta` is zero, motion must stop. Using wall-clock time or an independent animation loop would bypass pause and playback speed. Manual control edits may still update a paused scene.

## Shared scene helper

`createChartLayer(build)` returns a normal `FiveLayer` plus `redraw(build)`. Coordinates are world units. Construct the layer before adding it so TypeScript retains the extra `redraw` method:

```ts
const layer = createChartLayer(chart => {
  const path: [number, number, number][] = [[-3, 0, 0], [0, 2, 1], [3, 0, 0]];
  chart.tube(path, '#63d7bd', .04, .6);
  chart.flow(path, { color: '#d9fff3', count: 180, speed: .12, seed: 42 });
});
app.add(layer);
```

Import this utility from the recipe's relative `../shared/chart.js` path. Its builder provides:

| Helper | Geometry and behavior |
| --- | --- |
| `frame`, `label`, `line`, `point`, `box`, `bar` | Axes, camera-facing labels, reference geometry, and signed columns |
| `tube(points, color, radius, opacity)` | A tube along a centripetal Catmull–Rom path; radius is a world-unit radius, not a data conversion |
| `ribbon(points, width, color, opacity)` | A strip following a path with horizontal width |
| `ring(center, radius, color, tube, axis, arc)` | A ring or partial arc; `axis` is its normal (`x`, `y`, or `z`), and `arc` is in radians up to one turn |
| `surface(rows, colors, opacity)` | A mesh from a rectangular grid of 3D positions and a matching grid of colors |
| `glow(position, color, size)` | A soft luminous point used as a visual accent |
| `flow(points, options)` | Seeded moving tracers along a path; options include color, count, speed, size, spread, and seed |

A flow's `speed` is cycles per animation second; its `count` is a rendering choice from 0 to 5,000 particles per path. The helper advances flow positions from `delta`, so zero delta freezes motion. Curves interpolate the supplied path points; use explicit knots, references, and readouts when viewers need exact measurements. Do not treat interpolation or visual particle density as additional source data.

`redraw()` builds replacement geometry before releasing the old scene, preserving the previous scene if construction fails. It retains the layer's accumulated animation phase. Redraw and disposal release owned geometries, materials, label textures, and animation callbacks. Text sprites use an owned quad per chart, so preview cleanup cannot invalidate another renderer's labels.

## Framing and previews

Choose a camera and optional target that frame the complete scene near a 1.5–1.6 landscape aspect ratio. Test the extreme control values too. The shared runner increases camera distance for portrait viewports; camera reset restores the recipe's framing. Keep important geometry clear of the viewer's controls.

A recipe must already contain visible geometry after setup, even while paused. `previewTime` selects its still-preview phase. The runner advances all owned layers in small integration steps before capture, so custom delta-based animation appears in thumbnails too.

Gallery thumbnails are actual WebGL renders of these recipes. Startup uses one temporary offscreen renderer to prepare them sequentially, captures PNG images, and disposes each mounted recipe. The temporary renderer and its host are disposed when preparation finishes or fails. Cards then display still images instead of maintaining multiple animated canvases.

## Source and copy behavior

**Explore the source**, **Copy recipe**, and **Download .ts** expose the actual TypeScript module used by the viewer. They preserve the recipe defaults; moving sliders does not rewrite the module or serialize the current camera. PNG capture records the current canvas image, including chart-axis labels but excluding HTML metric cards and the table. **Download data CSV** exports the current table after filters and scenario controls; it preserves numeric values and adds context columns for the example, data notes, period/view caption, and selected controls. Model-generated scenarios are labeled in the recipe and table.

An individual `.ts` download depends on its relative library imports, shared example types, and any example helpers it uses. Use it within this project, or adapt those imports in your application. **Download examples** provides the project with its library source and shared runner. **Copy link** copies the local example URL, not a hosted deployment.

## Interpretation and checks

All twenty Business and Analytics recipes use explicit synthetic fixtures. They are reusable visualization and calculation examples, not evidence about a real company. Units, grain, denominators, and scenario assumptions are described in each recipe. Business values are USD where stated. Cohort cells for unobserved ages are omitted; rule-based segments are not machine-learned clusters; demand envelopes are scenarios, not statistical confidence intervals; observed A/B differences are not causal or significance conclusions. Tables and metric readouts update with the controls.

The original Data examples use synthetic graphs and coordinates. The double helix is illustrative geometry, not a molecular model. Vortex and wave examples use analytic visual patterns; they do not solve fluid dynamics or the wave equation. Cinematic scenes are stylized compositions.

The Lorenz example precomputes 18,000 trajectory samples using fourth-order Runge–Kutta integration, then replays that finite path. Its controls change presentation speed, tail length, and rotation; they do not run a real-time parameter solver or alter the differential equations. Individual recipe `dataNote` fields give further context.

Run `npm run typecheck` and `npm test` after adding a recipe. CPU tests should cover useful invariants, live controls, zero-delta pause behavior, and resource disposal. Also inspect its real browser render, portrait framing, control extremes, and standalone URL.

Open `/tests/examples-browser.html` to verify all 32 gallery recipes in WebGL2, including control boundaries, PNG pixels, analytic readouts, and geometry/texture cleanup.
