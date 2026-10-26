# 5js example library

Forty-seven editable recipes span eleven categories, including twenty-three business and analytics examples and twelve Space, Biology, Climate, Energy, Cities, and Engineering scenes. Three new decision workflows connect source records to proposed investigations. The collection also covers particles, higher-dimensional geometry, graph data, terrain, and custom Three.js layers. Each recipe powers both its gallery preview and its interactive viewer. The preceding visual refresh redesigned seventeen of the original forty-four scenes: the original ten Analytics recipes, four Data recipes, two Scientific recipes, and the Business break-even landscape. The other twenty-seven original scenes were reviewed and retained.

## Run locally

From the project root:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5185/examples/**. If Vite reports another port, use that address.

Open one recipe directly with `/examples/run.html?example=id`, for example:

```text
http://127.0.0.1:5185/examples/run.html?example=orbital-garden
```

The gallery supports category filters, text search, keyboard navigation, live controls, pause, camera reset, PNG capture, and source inspection. **Decisions** filters the three connected workflows across Business and Analytics; it is a collection filter, not a twelfth category. Every category uses the same larger stage, including scenes with metrics and tables. Expand **How to read this scene** to inspect a recipe’s units, encodings, and assumptions; these notes start collapsed so controls remain easy to reach. Connected workflows keep these settings under **Scenario & display**. Reduced-motion preferences start animation paused. Rendering requires WebGL2.

For a production build, run `npm run build:demo`, then `npm run preview`; the gallery remains at `/examples/`.

## Catalog

| Recipe and source | Category | Learning concept |
| --- | --- | --- |
| [Checkout recovery lab](business/checkout-recovery.ts) | Business | Inspect recorded blockers and propose owner investigations with explicit recovery assumptions |
| [Customer impact review](business/customer-health.ts) | Business | Prioritize capacity-limited customer reviews from observed abandonment and linked service evidence |
| [Evidence to roadmap](analytics/evidence-to-roadmap.ts) | Analytics | Trace supporting, mixed, and contradicting interviews into measurable proposed tests |
| [Orbital resonance loom](space/orbital-resonance.ts) | Space | Prescribed period ratios, elliptical paths, and a woven phase comparison |
| [Stellar magnetic ballet](space/stellar-magnetic-field.ts) | Space | Nested twisted loops and directional tracers around a sphere |
| [Neural signal atlas](biology/neural-connectome.ts) | Biology | A bilateral graph, branching dendrites, and adjustable hemisphere bridges |
| [Vascular transport forest](biology/vascular-flow.ts) | Biology | Conserved binary flow splits and tube cross-sectional area encoding |
| [Jet-stream atlas](climate/jet-stream.ts) | Climate | Parametric spherical bands with adjustable latitude meanders |
| [Ocean gyre observatory](climate/ocean-gyres.ts) | Climate | Layered counter-rotating curves and a basin cutaway |
| [Renewable dispatch network](energy/grid-dispatch.ts) | Energy | Proportional supply allocation, conserved MW, and visible shortfalls |
| [Fusion chamber cutaway](energy/fusion-chamber.ts) | Energy | Closed toroidal helices, integer winding counts, and a cutaway shell |
| [Transit pulse](cities/transit-pulse.ts) | Cities | Synthetic headway and capacity calculations with schematic train motion |
| [Urban wind canopy](cities/urban-canopy.ts) | Cities | Deterministic district geometry and illustrative air paths |
| [Acoustic mode chamber](engineering/acoustic-chamber.ts) | Engineering | A sampled signed cosine field, node planes, and threshold visibility |
| [Turbine wake sculptor](engineering/turbine-wake.ts) | Engineering | Expanding helical geometry and independent rotor animation |
| [Revenue landscape](business/revenue-landscape.ts) | Business | Luminous revenue rivers; exact monthly crest heights and an uplift scenario |
| [Conversion funnel](business/conversion-funnel.ts) | Business | A conversion reactor with count-proportional gate areas and attrition branches |
| [Subscription bridge](business/subscription-bridge.ts) | Business | An orbital MRR exchange; balance-ring areas, change streams, and exact NRR |
| [Marketing efficiency](business/marketing-efficiency.ts) | Business | An attribution network with dollar-proportional tube areas and channel ROAS |
| [Unit economics](business/unit-economics.ts) | Business | A profit engine routing revenue, expenses, retained profit, and funding gaps |
| [Product portfolio](business/product-portfolio.ts) | Business | A product constellation with quantitative positions and scenario trails |
| [Capacity planning](business/capacity-planning.ts) | Business | A factory circuit with utilization reactors and visible overload arcs |
| [Inventory coverage](business/inventory-coverage.ts) | Business | A supply constellation with coverage gauges and conditional replenishment routes |
| [Break-even landscape](business/break-even.ts) | Business | A profit cutaway, reference slices, and an exact zero-profit boundary |
| [Budget tension field](business/budget-variance.ts) | Business | Spending petals whose footprint area encodes expense and outer-edge height encodes variance |
| [Cohort retention](analytics/cohort-retention.ts) | Analytics | Retention sails ending at the observed frontier, an age cross-section, and weighted retention |
| [Customer segments](analytics/customer-segments.ts) | Analytics | Faceted segment hulls around exact revenue, engagement, and tenure coordinates |
| [Demand scenarios](analytics/demand-scenarios.ts) | Analytics | A fixed historical spine unfolding into three zero-baseline crystalline sails |
| [Pareto analysis](analytics/pareto-analysis.ts) | Analytics | A revenue-to-cumulative-share weave with separate scales and a coverage plane |
| [Geographic demand](analytics/geographic-demand.ts) | Analytics | Triangulated demand terrain anchored to fictional city coordinates and exact order counts |
| [Correlation matrix](analytics/correlation-matrix.ts) | Analytics | Signed relationship strands, a floor matrix, and a focused raw-observation chamber |
| [Distribution explorer](analytics/distribution-explorer.ts) | Analytics | Vaulted bin chambers with exact histogram sections and one replaying spark per request |
| [Time-series anomalies](analytics/time-series-anomalies.ts) | Analytics | A waveform corridor with residual bridges and explicit threshold boundaries |
| [A/B experiment](analytics/ab-experiment.ts) | Analytics | Population domes with visitor-proportional surface areas and exact conversion caps |
| [Data quality audit](analytics/data-quality.ts) | Analytics | Individual record routes through overlapping checks and distinct pass/review exits |
| [Vortex flow](scientific/vortex-flow.ts) | Scientific | Seeded shader particles and live field parameters |
| [Wave interference](scientific/wave-interference.ts) | Scientific | An analytic mean-surface mesh synchronized with the particle wave |
| [Dimensional dance](scientific/dimensional-dance.ts) | Scientific | Projected square faces sharing the rotating 4D/5D wireframe vertices |
| [Lorenz attractor](scientific/lorenz-attractor.ts) | Scientific | Numerical integration, custom geometry, and trajectory playback |
| [Community network](data/community-network.ts) | Data | Community envelopes, emphasized hub links, and tracers on selected connections |
| [Dependency tree](data/dependency-tree.ts) | Data | Radial branching levels and pulses following existing parent-child edges |
| [Double helix](data/double-helix.ts) | Data | Continuous helical rails, highlighted paired rungs, and traveling samples |
| [Lattice network](data/lattice-network.ts) | Data | Layer slices, axial pulses, and a highlighted six-neighbor interior |
| [Neon landscape](cinematic/neon-landscape.ts) | Cinematic | Compose matching surface and wireframe layers |
| [Twin galaxies](cinematic/twin-galaxies.ts) | Cinematic | Independent palettes, transforms, and shared controls |
| [Orbital garden](cinematic/orbital-garden.ts) | Cinematic | Custom torus layers, nested networks, and resource ownership |
| [Crystal summit](cinematic/crystal-summit.ts) | Cinematic | Wrap an existing layer with pause-aware hover animation |

The stable recipe ID is its filename without `.ts`. Display titles can change without breaking saved routes: **Budget tension field**, for example, keeps the ID `budget-variance`.

## Connected decision workflows

Select **Decisions**, or open `/examples/?category=Decisions`, to start with a practical question. These three recipes share one deterministic fixture of **99 records**: six customers, fifteen people (twelve customer participants and three internal owners), three products, three services, twelve interviews, thirty-six sessions, and twenty-four checkouts. All names, quotes, behavior, and values are fictional. The seven entity kinds use stable IDs and linked relationships rather than independent chart-only summaries.

| Workflow | Question and interpretation |
| --- | --- |
| **Checkout recovery lab** · Recover failed checkouts | Which recorded checkout blockers should an owner investigate first? Abandoned baskets rank by observed amount. The green value is amount × an explicit recovery-fraction assumption; it is not observed recovery, a forecast, or expected revenue. Completed baskets are excluded from exposure. |
| **Customer impact review** · Prioritize customer reviews | Which customers should named owners review within the available capacity? The queue ranks abandoned-session count, then annual customer value, then ID. Active sessions are not treated as abandonment. Annual value is counted once per affected account and is exposure, not lost revenue, churn probability, or expected recovery. Capacity limits the proposed worklist, not observed exposure. |
| **Evidence to roadmap** · Turn evidence into a test | What should be investigated or tested next? Twelve interviews cover checkout interruptions, setup friction, and status interpretation. Supporting, mixed, and contradicting records remain visible by default. Counts distinguish interviews, participants, and customers. Evidence for a problem does not validate a proposed solution; task baselines still need measurement before comparison. |

Use the workflow as a sequence from evidence to a reviewable next step:

1. Select a visible node, or use the searchable **Follow the evidence** record list with the keyboard. Hover identifies chart targets; dragging still orbits the camera. **Scenario & display** holds cohort and presentation controls.
2. Read **Inspect record** for source fields, evidence basis, and stable IDs. Follow **Linked records** to the customer, person, product, service, checkout, interview, or session. Sessions show ordered event timelines; interviews show their complete, explicitly fictional quotes. **Back** retraces selections. **Browse all 99 records** exposes the full fixture even when a scenario filter narrows the scene.
3. Examine **Propose a measurable action**. Every proposal names an internal owner and states its rationale, measure, observed baseline, success criterion, guardrail, caveat, and exact evidence IDs. Expand its evidence to check conflicting as well as supporting records. These are proposed investigations, not completed work or automated recommendations to accept.
4. Choose **Pin as evidence** on records and **Add to brief** on proposals, then **Download investigation brief**. The Markdown file includes the selected scope, action details, source IDs, fields, quotes, timelines, and assumptions. If controls change, a saved action keeps its earlier scope until you choose **Update brief with this scope**. Brief selections live only in the current viewer; download before closing or switching recipes.

The viewer produces a local file. It does not contact customers, send messages, create external tasks, or write to CRM, analytics, research, or issue-tracking systems. No real customers or production data are connected. Moving guides trace existing relationships; they do not create new sessions or imply causal links.

## Adapt a connected workflow

The adapter boundary lives in [connected/types.ts](connected/types.ts), [connected/fixture.ts](connected/fixture.ts), and [connected/explorer.ts](connected/explorer.ts). These are example-project utilities, not additions to the four public `fivejs` layer factories.

- `createConnectedData()` supplies a fresh deterministic `ConnectedDataset`. Replace that source with a validated snapshot or an application adapter while preserving the calculation grain: one session belongs to one customer, person, and product; one checkout belongs to one session; interviews retain their participant and source-session IDs.
- `buildEntityRecords(data)` normalizes the domain data into `EntityRecord[]`: stable IDs, kind, label, summary, fields, related-ID links, evidence with a stated basis, and optional timelines. Use an equivalent mapper for another domain. Validate source freshness, keys, relationships, units, and missing outcomes before calculating a workflow; the fixture mapper is not a general data-quality validator.
- `createOutcomeExplorer({ records, view, targets, onSelect, initialId })` connects the model to the viewer. `view()` returns the current question, summary, scope, candidate record IDs, and `OutcomeAction[]`. `targets()` supplies record IDs with scene positions; `onSelect()` redraws emphasis. The explorer validates unique IDs and resolved record links. Its shared selection drives both the scene and inspector, and `refresh()` reconciles selection after cohort changes.
- Return `connected: explorer` from the recipe instance, add an `outcome` label to its definition, and keep `readout()`, geometry, candidates, and actions derived from the same filtered records. Dispose the explorer in the instance cleanup; app-owned layers remain the runner's responsibility. The shared [outcome UI](gallery/outcomes.ts) and [brief formatter](connected/brief.ts) handle inspection and local export.

The present evidence-basis types and shared viewer/brief copy explicitly describe synthetic observations and fictional interviews. Adapting this to real records also requires accurate provenance labels and copy, appropriate access handling, and application-owned loading/error states. Replacing fixture arrays alone does not provide a production connector, live refresh, authentication, or external-action execution.

## Reading the animated business scenes

The ten original Business recipes combine exact scenario calculations with animated spatial compositions; the two additional connected workflows are described above. Their controls update the data, geometry, metrics, and table together. Playback advances illustrative light tracers; it does not create new observations or change financial totals. Pause, playback speed, and reduced-motion settings apply to those tracers.

Read each recipe's encoding note before comparing sizes. Revenue river crests use a fixed dollar height, and their monthly knots are the actual samples. Conversion gate **interior area** is proportional to people, so radius follows the square root of the count. Marketing and unit-economics **tube cross-sectional area** is proportional to USD. Subscription balance rings and change tubes use two separately stated scales. Particle number, speed, glow size, and decorative hub positions do not represent people, transactions, or elapsed business time.

Factory gauges map the inner turn to 0–100% utilization and the outer turn to 100–200%; their moving light does not simulate jobs or queues. Inventory gauges map one turn to 60 days, with gold threshold beacons and replenishment routes lit only when the stated reorder rule fires. These pulses are proposed routes, not shipments. Product constellation positions encode growth, margin, and revenue; constant-size halos and curved trails are presentation, not historical observations.

The break-even cutaway evaluates the profit formula between its 36 marked price/volume samples. Height uses a fixed $30,000 per world unit; cyan and magenta distinguish gains and losses around a visible zero-profit plane. Side walls and the $50-price and 1,500-unit slice curtains connect that plane to the actual profit surface. The gold boundary marks continuous zero profit, while the readout rounds required units upward. Its downward curtain projects the boundary onto a reference floor; the curtain's depth does not encode a loss. Moving contour lights reveal the formula and do not imply demand or profitability probabilities.

Budget petals have equal angular spans: their footprint area viewed from above is proportional to actual expense, a blue outline marks planned expense, and the outer-edge height relative to the plan plane shows signed variance. The sloped interior is a visual connection, not an additional metric.

## Reading the Analytics observatories

The ten original Analytics scenes use fixed synthetic observations or explicit scenario formulas; **Evidence to roadmap** adds the connected workflow described above. Controls recompute the current geometry, metrics, and table together. Animated guides expose relationships and reading order; they do not add observations, establish statistical significance, or change the data during playback.

**Correlation matrix** links three views. Cyan upper strands show positive Pearson correlations and coral lower strands show negative ones; strand width and floor-tile lightness increase with `|r|`. Tower positions are categorical, and each tower trace is normalized within its own variable and trailing window. **Explore a pair** selects two variables for the observation chamber: X and Y show their raw units, while depth follows day order. The trailing-window control uses 12–36 days. **Minimum network |r|** filters strands and floor cells, but the selected pair's observations and coefficient remain inspectable even below the cutoff. Constant 99.9% uptime yields **Undefined**, never zero; undefined cells are retained, with gray marking them outside the focus highlight. The gold focus accent and moving lights are presentation, not another measure. Correlation does not imply causation.

**Cohort retention** places exact monthly rates or customer counts on sail crests and stops at each cohort's observed frontier. Weighted retention uses eligible original customers; future ages remain absent. **Customer segments** places every account at its revenue, engagement, and tenure coordinates. Faceted convex hulls enclose displayed accounts under explicit classification rules; they are spatial extents, not density estimates or confidence regions.

**Demand scenarios** keeps historical values fixed and unfolds low/base/high futures into three crystalline sails. Each sail starts at zero and its crest meets every exact monthly demand value on a shared, fixed 0–3,000 unit scale. Month spacing is linear. Depth separates alternatives and remains separated even at zero spread; it does not encode likelihood. Facets and cross-sections interpolate the monthly knots. Growth, seasonality, and spread are explicit assumptions, not probability estimates. **Geographic demand** anchors a triangulated canopy to displayed city order counts. Intermediate triangles and contours are interpolation, not additional observations; longitude/latitude use linear degree spacing, not a distance-preserving map. Mesh edges are not transport routes.

**Pareto analysis** joins a dollar-scaled revenue ridge to a separately scaled cumulative-share spine. Hidden products remain in the selected-segment denominator. Ribbon interiors carry no extra metric.

**Distribution explorer** opens each bin into a ribbed vault. Its central outlined rectangle preserves the exact bin width and count or density height; in density mode, that section's area represents the included probability mass. The curved roof, depth, and volume have no analytical meaning. Exactly one spark represents each of the 96 requests, replaying from a suspended rail into its bin while preserving its latency on X. Vertical packing, paths, and replay timing are inspection aids. Density is normalized over included observations in units of `1/ms`; excluded requests use a separate orange dock rather than a latency coordinate. The scene does not smooth a continuous density estimate between bins.

**Time-series anomalies** separates the known baseline from observations, or zero from residuals. Bridges identify strict `|observed − baseline| > threshold` flags. Threshold surfaces are configurable rules, not confidence or prediction intervals. Depth separates the two lanes; time runs along X.

**A/B experiment** arranges the two variants and three device segments into six hemispherical population domes. Hemisphere surface area is proportional to eligible visitors, with a fixed radius scale across filters. Each spark represents one visitor; the bright spherical cap occupies the conversion-rate share of the dome's surface and contains exactly the converted visitors. Dome **base elevation** encodes the selected rate or count; the apex and volume carry no additional metric. Overall rates divide summed conversions by summed visitors. Anonymous spark positions are an equal-area arrangement, not visitor features, and bridge lights are inspection guides rather than participant transitions.

**Data quality audit** replays each fixed record through its actual missing-field, duplicate, and amount-check branches. Flags can overlap; the final review exit counts an affected record once. Route height is categorical, and replay speed is not throughput.

## Reading the Data and Scientific compositions

The four Data scenes retain their explicit synthetic graph topology and existing controls. **Community network** groups 210 nodes into five envelopes; bowed bridges emphasize the existing hub-to-hub links. Envelope surfaces are grouping aids, not graph edges. **Dependency tree** preserves all 121 nodes and 120 parent-child edges; depth guides separate its four levels, and pulses run from parents toward children. Neither animation measures traffic or latency.

**Double helix** retains 168 nodes and 84 paired rungs. Continuous rails follow the same helical parameterization, and the height control stretches the entire composition while preserving connections. This is illustrative geometry, not a molecular model. **Lattice network** retains 216 nodes and 540 nearest-neighbor edges. Translucent slices separate its six levels; a highlighted interior node exposes six axis-aligned neighbors. Pulses follow existing axial links, and the cell-height control stretches the whole lattice. Tracer counts and speeds do not encode graph weights or physical interactions.

**Dimensional dance** fills the tesseract's 24 and penteract's 80 square faces using the same projected vertices as their wireframes. Projection changes visible lengths and crossings; it does not change the original equal-edge geometry. **Wave interference** overlays a continuous mesh on the particle field's analytic mean surface, omitting only the particles' small seeded vertical jitter. Both share the same wave phase and vertical scale. These are example compositions, not additional public layer factories.

## Reading the domain scenes

The twelve Space, Biology, Climate, Energy, Cities, and Engineering recipes use synthetic or idealized models, not measured datasets. Each recipe's `dataNote`, legend, metrics, and table explain its assumptions and units. Readouts describe the implemented geometry or calculation; they do not establish scientific validation. Tracer density, glow, and playback speed are presentation choices unless an encoding explicitly states otherwise.

Space scenes prescribe orbital periods and twisted stellar loops: ellipse parameters advance uniformly, rather than following a gravity solver, and the stellar curve uses `r = L sin²θ` plus an authored twist. Biology scenes build a synthetic bilateral graph and a transport tree. The tree conserves flow at each split and uses `radius ∝ sqrt(flow)` so branch cross-sectional area encodes flow; decorative terminal loops have fixed width. Neither scene represents anatomical or patient data.

Climate paths are authored globe bands and basin loops, not weather or ocean predictions. The fusion chamber uses closed integer-winding toroidal curves, not computed magnetic fields. Renewable dispatch calculates `served = min(demand, available supply)` and allocates MW proportionally; its tube areas encode dispatched MW and its district arcs encode served demand. It does not solve electrical power flow.

Transit calculates departures, headway, and capacity from synthetic train counts, speed, and route length; its animation runs at 60× clock time. The urban canopy's air paths are illustrative, independent of its building-height table. The acoustic chamber samples a normalized cosine product with exact node planes, without a physical frequency or dB scale. Turbine wakes are expanding geometric helices, without aerodynamic or power predictions. Inspect these formulas in the source before adapting a scene to real observations.

## Project map

- [catalog.ts](catalog.ts) imports recipes and defines their gallery order.
- [types.ts](types.ts) defines `ExampleDefinition`, `ExampleInstance`, slider controls, and the category list.
- [gallery/main.ts](gallery/main.ts) runs the gallery and standalone viewer.
- [gallery/runtime.ts](gallery/runtime.ts) mounts recipes, frames cameras, and releases instances.
- [gallery/sources.ts](gallery/sources.ts) loads the actual recipe files as raw text.
- [shared/chart.ts](shared/chart.ts) supplies example-only geometry, text, flow animation, and resource ownership.
- [connected/types.ts](connected/types.ts), [connected/fixture.ts](connected/fixture.ts), and [connected/explorer.ts](connected/explorer.ts) define the linked-record model, fictional source, and shared selection contract.
- [gallery/outcomes.ts](gallery/outcomes.ts) renders linked records and proposals; [connected/brief.ts](connected/brief.ts) exports the local investigation brief.
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

The current categories are Space, Biology, Climate, Energy, Cities, Engineering, Business, Analytics, Scientific, Data, and Cinematic. Place a recipe in the matching lowercase directory. To introduce another category, extend `exampleCategories` in `types.ts` and add its directory to the raw-source glob in `gallery/sources.ts`, then register the recipe in `catalog.ts`. Update the catalog documentation and expected example/category counts in the checks. A directory omitted from the source glob can render a scene while leaving its source viewer unavailable.

## Controls and lifecycle

Return one to three meaningful controls from `setup`. Each control needs a unique ID, label, numeric bounds, positive step, initial value, and `apply(value)`. Match initial values to the constructed layers and keep them on the slider's step grid. Call `layer.set()` for supported live changes, or edit the layer's ordinary Three.js object transform.

An optional control `format(value)` presents a percentage, currency, or category label instead of a raw slider number. An optional instance `readout()` supplies metric cards, legend entries, and a table; the viewer refreshes these after every control change. Compute the chart and readout from the same rows so filtering cannot leave stale summaries. The [shared chart helper](shared/chart.ts) supplies geometry and animation used by analytical, Business, and domain recipes. It belongs to the examples project and is not exported by the public `fivejs` package.

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

An individual `.ts` download depends on its relative library imports, shared example types, and any example helpers it uses. Use it within this project, or adapt those imports in your application. **Download examples** provides the project with its library source and shared runner. **Copy link** copies the current example URL: a localhost address remains local, while a deployed gallery produces its deployed URL.

## Interpretation and checks

All twenty-three Business and Analytics recipes use explicit synthetic fixtures. They are reusable visualization and calculation examples, not evidence about a real company. Units, grain, denominators, and scenario assumptions are described in each recipe. Business values are USD where stated. Cohort cells for unobserved ages are omitted; rule-based segments are not machine-learned clusters; demand envelopes are scenarios, not statistical confidence intervals; observed A/B differences are not causal or significance conclusions. Connected proposals preserve evidence and assumptions without claiming validated impact. Tables and metric readouts update with the controls.

Data examples use synthetic graphs and coordinates. Vortex and wave examples use analytic visual patterns; they do not solve fluid dynamics or the wave equation. Cinematic scenes are stylized compositions.

The Lorenz example precomputes 18,000 trajectory samples using fourth-order Runge–Kutta integration, then replays that finite path. Its controls change presentation speed, tail length, and rotation; they do not run a real-time parameter solver or alter the differential equations. Individual recipe `dataNote` fields give further context.

Run `npm run typecheck` and `npm test` after adding a recipe. CPU tests should cover useful invariants, live controls, zero-delta pause behavior, and resource disposal. Also inspect its real browser render, portrait framing, control extremes, and standalone URL.

Open `/tests/examples-browser.html` to verify all 47 gallery recipes in WebGL2. The harness checks nonempty PNG pixels; minimum, midpoint, and maximum values for each control; analytical readouts; and geometry/texture cleanup. Every recipe also receives a positive-delta update that must visibly change its rendered pixels, followed by a zero-delta update that must leave the rendered image identical. Presentation motion must preserve its readout data.

For visual review, open **http://127.0.0.1:5185/tests/examples-browser.html?review=1** with the development server running. After all checks pass, the page shows contact sheets made from the actual WebGL captures. Use **Previous page** and **Next page** to review 12 scenes at a time across four pages. These are default-scene captures, not screenshots of every control combination. Inspect normal viewers and portrait layouts separately for framing, labels, and useful interactions; a pixel-change assertion cannot establish visual quality.

Open `/tests/connected-pressure.html` to exercise linked inspection, keyboard tabs and focus, scoped brief exports, selection reconciliation, cleanup, a 375px layout, and empty-state recovery. It runs in the CI browser suite. The empty-state check uses an explicitly injected fixture because the authored production filter combinations all contain records.

For connected workflows, also select a chart node and a keyboard-list entry, follow linked sessions and interviews, change the cohort, pin a record, add a proposal, and inspect the downloaded Markdown brief. Confirm that its owner, evidence IDs, saved scope, measure, baseline, success criterion, and guardrail match the selected proposal. The CPU suite checks fixture integrity and useful workflow invariants, including distinct-customer counting, retained counter-evidence, filtered source validity, selection emphasis, pause, and disposal.
