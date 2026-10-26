# 5js

An experimental TypeScript library for composing scientific, data, and cinematic visualizations on Three.js. The 0.1.0-alpha.1 API supplies a shared scene lifecycle and four visualization layers, plus an interactive playground and 47 examples.

This MIT-licensed alpha is experimental open-source software. It has not been published to npm; `private: true` prevents accidental registry publication. Naming rights and registry acceptance have not been established.

[Source repository](https://github.com/kevin-owens-product/5JS) · [Example gallery](https://kevin-owens-product.github.io/5JS/examples/)

Documentation: [API reference](docs/API.md) · [Example guide](https://github.com/kevin-owens-product/5JS/blob/main/examples/README.md) · [Connector guide](https://github.com/kevin-owens-product/5JS/blob/main/packages/connectors/README.md) · [Compatibility](docs/COMPATIBILITY.md) · [Contributing](https://github.com/kevin-owens-product/5JS/blob/main/CONTRIBUTING.md) · [Release guide](https://github.com/kevin-owens-product/5JS/blob/main/docs/RELEASING.md).

![Conversion reactor example](https://raw.githubusercontent.com/kevin-owens-product/5JS/main/artifacts/business-motion-reactor.jpg)

## Run the playground

Requires Node.js 22.12+ and a browser with WebGL2.

From the cloned or extracted project root:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5185. The playground includes live parameters, palettes, camera orbit, pause, bloom, actual rendering statistics, PNG export, and copyable code for the current experiment. Network data in the playground is synthetic and labeled accordingly. Fonts are optional Google Fonts with system fallbacks; rendering and application code are served locally.

## Example library

Open http://127.0.0.1:5185/examples/ for **47 runnable recipes** across eleven categories: Space, Biology, Climate, Energy, Cities, Engineering, Business, Analytics, Scientific, Data, and Cinematic. The twenty-three Business and Analytics examples combine synthetic-data calculations with live metrics, tables, and current-view CSV exports.

Choose **Decisions** to explore three connected workflows: **Checkout recovery lab**, **Customer impact review**, and **Evidence to roadmap**. They share 99 fictional records spanning customers, products, services, people, interviews, sessions, and checkouts. Select a chart node or a record in the searchable list, inspect its fields and sources, follow a session timeline or fictional interview, and review a proposed action with an owner, measure, baseline, success criterion, and guardrail. Pin evidence or add actions to a local Markdown investigation brief. No external systems are connected, no customers are contacted, and no tasks are created. Basket recovery assumptions and annual customer exposure are not revenue forecasts.

The preceding visual refresh redesigned **17 of the original 44 scenes**: the original ten Analytics recipes, four structured Data compositions, two Scientific scenes, and the Business break-even landscape. Analytics gained retention sails, customer hulls, three zero-baseline demand sails, a concentration weave, geographic demand terrain, and linked relationship and observation views. Data gained community envelopes, branching dependency levels, continuous helix rails, and a lattice with an explicit six-neighbor interior. Projected hypercube faces and an analytic wave mesh reveal structure in the two Scientific scenes. Break-even adds a profit cutaway, reference slices, and an exact zero-profit boundary. The other 27 original recipes were reviewed and retained; the three decision workflows are new additions.

Every category uses the same larger interactive stage. Search or filter, open a scene, adjust its controls, and expand **How to read this scene** for units, encodings, assumptions, and the role of motion. The correlation example's **Explore a pair** control connects signed strands and a floor matrix to raw daily observations; constant variables produce undefined correlations, not zero. Source inspection and standalone views remain available. The [example guide](https://github.com/kevin-owens-product/5JS/blob/main/examples/README.md) describes every recipe and explains how to add your own.

These compositions use the four public layers, custom `FiveLayer` implementations, and example-only helpers for tubes, ribbons, rings, surfaces, glow, and path tracers in `examples/shared/chart.ts`. The helpers do not add factories to the public library API. Tracer motion is illustrative; it does not create transactions, observations, or statistical evidence. Each recipe states which geometry encodes data and which merely connects or highlights it.

The connected examples use `EntityRecord` and `OutcomeExplorer` contracts in `examples/connected/`. `buildEntityRecords()` maps the deterministic fixture into inspectable records and links; a different validated source can supply that adapter boundary. These contracts and the investigation-brief UI belong to the examples project, not the public `fivejs` API. Replacing the fixture also requires appropriate source provenance, units, relationships, and updated synthetic-only UI/export labels. The [example guide](https://github.com/kevin-owens-product/5JS/blob/main/examples/README.md#adapt-a-connected-workflow) explains the integration points.

`npm run package:examples` creates a portable source project at `public/examples/5js-examples.zip`. Unzip it, run `npm ci`, then `npm run dev` to explore or edit. It includes the library source, shared runner, recipes, tests, and build configuration. Node.js 22.12+ is needed to run; Python 3 is only needed to regenerate the ZIP. `npm run build:demo` regenerates the download and includes the original playground, gallery, and standalone runner in the static output.

## Motif connector preview

**Motif** is the working name for the project's next phase. The independent `motif-connectors` workspace package is private and unpublished. It supplies **12 source factories plus an application endpoint**, representing **13 implemented entries in a 39-entry coverage catalog**: PostgreSQL, MySQL/MariaDB, SQLite, DuckDB, MongoDB, BigQuery, Snowflake, Databricks, Stripe, HubSpot, Airtable, JSON, and the application endpoint. Planned entries are explicitly labeled.

Run the local SQLite and JSON fixture demo with Node.js 22.16+:

```sh
npm run demo:connectors
```

Open [http://127.0.0.1:5190](http://127.0.0.1:5190). Credentials and registered queries stay on the server; the browser requests authorized operations and receives typed pages with source provenance, pagination and truncation metadata. Applications own authentication, tenant binding and provider read-only permissions.

Verification includes real SQLite reads and a real DuckDB smoke check. Other provider adapters have local driver/API protocol tests; live cloud accounts have not been certified. The [connector guide](https://github.com/kevin-owens-product/5JS/blob/main/packages/connectors/README.md) documents factory APIs, supported scope, precision and cancellation limits, and the remaining roadmap.

## Build and use the library

```sh
npm run build          # dist/fivejs.js + TypeScript declarations
npm run build:demo     # standalone static playground in demo-dist/
npm run preview       # serve that production playground
```

Install this local folder into another project after building:

```sh
npm install /absolute/path/to/fivejs three@0.180.0
```

```ts
import { createFive, particleField } from 'fivejs';

const container = document.querySelector<HTMLElement>('#canvas')!;
// The container needs a nonzero width and height, e.g. height: 600px.
const app = createFive({ container, bloom: 0.7 });

const particles = app.add(particleField({
  count: 100_000,
  mode: 'vortex',
  colorA: '#c3f96b',
  colorB: '#138872',
}));

particles.set({ turbulence: 1.2, mode: 'galaxy' });
app.setSpeed(0.7);
app.setPaused(false);

// In a component cleanup or when closing the visualization:
app.dispose();
```

Three.js is a peer dependency and is not bundled into `dist/fivejs.js`. The prototype is tested against Three.js r180. The library works without a UI framework; `createFive` requires a browser, while layer construction and validation can be tested in Node.

## Layers

| Factory | What it does | Live parameters |
| --- | --- | --- |
| `particleField(options)` | Seeded particles with analytic vortex, galaxy, and interference-wave motion evaluated in a vertex shader | Mode, radius, speed, turbulence, point size, two colors |
| `networkGraph(options)` | Instanced nodes, weighted edges, grouped deterministic layout, and support for explicit graph data | Node size, rotation speed, edge opacity, two colors |
| `terrain(options)` | Animated procedural heightfield with shader normals, contours, and a wireframe option | Height, frequency, speed, wireframe, two colors |
| `hypercube(options)` | Actual 4D/5D plane rotations followed by successive perspective projection into 3D | Dimensions, size, rotation speed, point size, color |

All factories return a `FiveLayer` with `object`, `kind`, `count`, `update(time, delta)`, `set(options)`, and `dispose()`. The `object` is a normal Three.js Object3D: transform it, group it, or place it in your own scene. When using layers without `createFive`, drive `update()` yourself with elapsed time and nonnegative delta in seconds, and dispose them when finished.

Count means particles for a field, nodes for a graph, `(resolution + 1)²` vertices for terrain, and 16/32 vertices for a 4D/5D hypercube. Live settings are validated before mutation. Structural particle count/seed, graph data/count/radius/seed, and terrain resolution/size/seed require creating a new layer. `hypercube.set({ dimensions: 4 })` safely replaces its geometry.

### Visualize your data

```ts
import { networkGraph } from 'fivejs';

app.add(networkGraph({
  data: {
    nodes: [
      { id: 'research', group: 0, value: 2, position: [-2, 0, 0] },
      { id: 'design', group: 1, value: 1, position: [2, 1, 0] },
      { id: 'engineering', group: 1, value: 3, position: [0, -1, 1] },
    ],
    edges: [
      { source: 'research', target: 'design', weight: 0.6 },
      { source: 'design', target: 'engineering', weight: 1 },
    ],
  },
  edgeOpacity: 0.4,
}));
```

Omitted positions use the seeded grouped layout. `value` controls node radius; `weight` controls edge brightness. IDs must be unique, endpoints must exist, and numeric inputs must be finite. Explicit `data` and synthetic `nodeCount` are mutually exclusive. The implementation snapshots supplied arrays; it does not mutate your data.

### Compose layers and extend Three.js

```ts
import { terrain, hypercube } from 'fivejs';

app.add(terrain({ size: 12, height: 1.2, colorA: '#a3edff' }));
const cube = app.add(hypercube({ dimensions: 5, size: 1.5 }));
cube.object.position.y = 3;
app.resetCamera([10, 7, 12]);
```

`app.scene`, `app.camera`, and `app.renderer` are exposed for Three.js interoperability. Implement `FiveLayer<MyOptions>` to add a custom visualization. The app owns layers you add; resources placed directly into `app.scene` remain your responsibility. A layer can belong to only one app. `app.remove(layer)` disposes it; `app.clear()` disposes every owned layer. Create a new layer to replace one that has been removed.

## Scene API

| Method/property | Behavior |
| --- | --- |
| `createFive({ container, background, bloom, autoRotate, paused, pixelRatio })` | Owns canvas, camera, orbit controls, resizing, render loop, and bloom/output passes |
| `add(layer)` | Adds a layer and returns that layer; repeated addition is idempotent |
| `remove(layer)` / `clear()` | Removes and disposes owned layers |
| `setPaused(boolean)` | Pauses simulation and auto-orbit; manual camera control remains available |
| `setSpeed(0…10)` | Changes the shared clock rate continuously; zero freezes animation |
| `setAutoRotate(boolean)` | Enables camera auto-orbit during playback |
| `setBloom(0…5)` | Sets bloom strength; zero bypasses its passes |
| `resetCamera(position?, target?)` | Resets orbit damping, position, and target |
| `onFrame(callback)` | Observes rendered frames; returns an unsubscribe function |
| `stats` | A snapshot of measured FPS, draw calls, triangles, points, renderable objects, scene time, and backend |
| `capture()` | Resolves a PNG Blob for the canvas, excluding surrounding HTML controls |
| `dispose()` | Stops animation and releases owned GPU resources, controls, observer, and canvas; safe to repeat |

Frame statistics include post-processing geometry and calls; they are not particle or dataset estimates. No benchmark guarantee is made. Pixel ratio is capped at 2 by default; lower it and reduce layer sizes for slower devices. Reduced-motion preferences initialize playback paused and auto-orbit disabled unless explicitly overridden. Simulation is suspended when the document is hidden, and long frame deltas are clamped to avoid jumps.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run test:types
npm run build:demo
npm run test:package
```

With `npm run dev` active, open http://127.0.0.1:5185/tests/browser.html for real WebGL2 lifecycle checks. These exercise four layers together, pause/speed, bloom, geometry replacement, PNG decoding, resizing, ownership, and disposal. CPU tests cover graph validation, deterministic seeds/layouts, mathematical invariants, atomic settings, continuous animation, and resource disposal.

Open http://127.0.0.1:5185/tests/examples-browser.html?review=1 for paginated contact sheets of all 47 actual scene renders. The harness first checks every recipe's nonempty PNG, minimum/midpoint/maximum control values, readouts, and resource cleanup. It also compares rendered pixels before and after motion and after a zero-delta update: every recipe must visibly animate, freeze exactly when paused, and preserve its data during playback. After a successful run, use **Previous page** and **Next page** to inspect 12 captures per page. These checks complement visual review; they do not judge composition or label legibility. For connected workflows, also exercise chart and keyboard-list selection, related-record navigation, cohort changes, and the downloaded brief in the normal gallery.

`npm run test:package` uses Python 3 to check source-archive exclusions, builds from a fresh temporary copy, and installs the tarball into a separate consumer project. It also verifies packaged documentation links and headings. For automated Chromium checks, first run `npx --no-install playwright install chromium`, then `npm run test:browser`. The runner starts its own local server and executes the browser harnesses. GitHub Actions runs these checks on Linux; diagnostics are saved under `artifacts/browser-checks/`.

## Current boundaries

The first implementation makes specific visualizations easier to compose; it does not claim capabilities beyond everything possible in Three.js. It uses WebGL2 vertex shaders, not WebGPU compute. Particle fields and terrain are analytic animation, not physically accurate fluid or terrain simulations. The graph layout is deterministic grouping, not a force-directed solver. Shader-displaced particles and terrain disable CPU raycasting because their CPU geometry does not match rendered positions. Picking, arbitrary point-cloud ingestion, volumetric raymarching, streaming/LOD, and a WebGPU backend are future work.

Construction limits (250,000 particles, 10,000 graph nodes, 100,000 edges, 512 terrain subdivisions) bound input sizes; they are not performance promises. Graph nodes/edges are inspectable through the returned Three.js object, but this version does not include a selection or tooltip system.

## License and community

5js is licensed under [MIT](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for dependencies distributed with the demo. Contributions follow the [contribution guide](https://github.com/kevin-owens-product/5JS/blob/main/CONTRIBUTING.md) and [community conduct policy](https://github.com/kevin-owens-product/5JS/blob/main/CODE_OF_CONDUCT.md). See [security reporting](https://github.com/kevin-owens-product/5JS/blob/main/SECURITY.md) for private vulnerability reports and [the changelog](CHANGELOG.md) for release status.
