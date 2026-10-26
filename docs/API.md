# 5js API reference

This reference describes the 0.1.0-alpha.1 API. The source is public on GitHub; the package is not published to npm; install a built checkout using the [local setup instructions](../README.md#build-and-use-the-library). Imports below assume that local package is installed as `fivejs`.

The public entry point is [src/index.ts](https://github.com/kevin-owens-product/5JS/blob/main/src/index.ts). It exports `createFive`, four layer factories, and their TypeScript interfaces. Gallery recipes and `examples/shared/chart.ts` are example utilities, not public package exports.

## Create a scene

```ts
import { createFive, particleField } from 'fivejs';

const container = document.querySelector<HTMLElement>('#visualization');
if (!container) throw new Error('Missing visualization container');
const app = createFive({ container, bloom: 0.6 });
const field = app.add(particleField({ count: 30_000, mode: 'galaxy' }));

field.set({ speed: 0.3, colorA: '#b3e8ff' });
app.resetCamera([0, 3, 12], [0, 0, 0]);

// Call when the component or page no longer needs this scene.
function cleanup() {
  app.dispose();
}
```

Give the container a measurable size, for example `height: 600px; width: 100%`. `createFive(options: FiveOptions): FiveApp` creates and owns the canvas, WebGL2 renderer, camera, orbit controls, resize observer, animation loop, and post-processing passes.

| `FiveOptions` property | Default | Meaning and accepted values |
| --- | --- | --- |
| `container: HTMLElement` | Required | Browser element that receives the canvas |
| `background?: string` | `'#05070e'` | Color in the formats described below |
| `bloom?: number` | `0.65` | Finite strength from 0 to 5; zero disables bloom passes |
| `autoRotate?: boolean` | `true`, except with reduced motion | Camera auto-orbit during playback |
| `paused?: boolean` | `false`, except with reduced motion | Initially pause the simulation |
| `pixelRatio?: number` | Device ratio capped at 2 | Explicit finite ratio from 0.25 to 3 |

Without explicit overrides, `prefers-reduced-motion: reduce` starts paused and disables auto-orbit. The preference is read at construction. The default perspective camera starts at `[0, 2, 12]`, points toward `[0, 0, 0]`, and has a 45° field of view.

## App methods and ownership

| Method or property | Contract |
| --- | --- |
| `add<P extends object>(layer: FiveLayer<P>): FiveLayer<P>` | Adds and returns the same layer; adding it again to the same app is harmless |
| `remove(layer): void` | Removes and **disposes** an owned layer; a layer the app does not own is ignored |
| `clear(): void` | Removes and disposes all owned layers |
| `setPaused(paused: boolean): void` | Stops simulation time and auto-orbit; rendering and manual camera interaction continue |
| `setSpeed(speed: number): void` | Finite shared clock multiplier from 0 to 10; zero freezes animation |
| `setAutoRotate(enabled: boolean): void` | Sets auto-orbit preference; orbit runs only during active playback |
| `setBloom(strength: number): void` | Finite strength from 0 to 5 |
| `resetCamera(position?, target?): void` | Resets orbit damping and camera; defaults are `[0, 2, 12]` and `[0, 0, 0]`; tuples must be finite and distinct |
| `onFrame(callback: (stats: FiveStats) => void): () => void` | Calls the observer after each rendered frame; returns an unsubscribe function |
| `capture(): Promise<Blob>` | Renders and encodes the canvas as a PNG Blob; excludes HTML controls and tables |
| `dispose(): void` | Stops the loop and releases owned layers, controls, GPU resources, observer, and canvas; safe to call repeatedly |
| `scene`, `camera`, `renderer` | Readonly references to the underlying Three.js objects; their own APIs remain accessible |
| `stats: FiveStats` | A fresh statistics snapshot |

A layer and its root Object3D belong to at most one app. Different layer wrappers cannot share an owned or retired root. The app captures the root at addition and releases that same root even if caller code later replaces the wrapper property. Once removed or cleared, create a new layer instead of reusing it. Use the app's removal methods for attached layers; do not dispose an attached layer directly. Dispose an unattached layer yourself. Objects and resources added directly to `app.scene` are your responsibility.

If an initial custom-layer update throws, `add()` rolls back scene attachment and ownership so the caller can repair or dispose the layer. `remove()`, `clear()`, and `dispose()` attempt all relevant cleanup even when a custom disposer throws, then report failures in an `AggregateError`. A disposed app remains terminal even after such an error; repeated disposal is harmless. A custom update or frame observer may dispose its app, and the current frame stops. `onFrame()` rejects non-functions immediately.

All app methods except repeated `dispose()` reject calls after disposal. Reading an exposed Three.js reference does not make its disposed resources usable again.

`FiveStats` contains `fps`, `drawCalls`, `triangles`, `points`, `objects`, `time`, and `renderer: 'WebGL2'`. `time` is accumulated simulation time in seconds. Draw calls and rendered primitive counts include post-processing work; `objects` counts visible renderable objects in the scene. These are renderer observations, not source-data record counts or performance guarantees. Observers continue to run while paused because rendering continues.

## Shared layer contract

```ts
interface FiveLayer<P extends object = Record<string, unknown>> {
  readonly object: import('three').Object3D;
  readonly kind: string;
  readonly count: number;
  update(time: number, delta: number): void;
  set(options: Partial<P>): void;
  dispose(): void;
}
```

All four factories accept an optional options object and return a `FiveLayer` parameterized by that factory's options interface. `object` can be positioned or scaled with Three.js. `kind` identifies the layer. `count` has the layer-specific meaning listed below.

Factories and `set()` require non-null, non-array option objects. Supported own properties are read once before validation; inherited and unknown keys are ignored. Undefined values retain defaults/current settings, except structural-key rejection still applies where documented. Numeric null values are invalid.

`set()` validates supported values before changing the live configuration. Invalid inputs throw. Structural settings require a replacement layer unless stated otherwise. `set()` after disposal throws; built-in `dispose()` methods are idempotent.

The app calls `update(time, delta)` in seconds. It supplies `delta = 0` when paused, hidden, or speed is zero. Raw frame intervals are capped at 0.05 seconds before the shared speed multiplier is applied. Built-in layers integrate `delta` and ignore `time`; changing speed preserves their current phase, and passing a large `time` is not a seek operation. Negative built-in layer speeds reverse their own animation; the app's shared speed remains nonnegative.

When using a layer with your own Three.js renderer, call `update()` from your own loop with finite, nonnegative delta seconds, render its `object`, and call `dispose()` when finished. Nonfinite, negative, or overflowing deltas are ignored without poisoning the previous animation state. No second update loop is needed for a layer already attached to `createFive`.

Colors accept CSS named colors, three- or six-digit hex, comma-separated `rgb()` values (0–255 or all percentages), and comma-separated `hsl()`. Alpha colors, CSS variables, and newer CSS color functions are not accepted by this version. Numeric ranges below are inclusive; all numbers must be finite.

## `particleField(options?: ParticleFieldOptions)`

Shader-generated particles with analytic vortex, galaxy, or interference-wave motion. `kind` is `'particleField'`; `count` is the number of particles. Point size is a framebuffer-pixel parameter at a reference camera distance of 14 world units and is attenuated by distance.

| Option | Default | Range / behavior |
| --- | --- | --- |
| `count` | `60000` | Integer 1–250000; construction only |
| `mode` | `'vortex'` | `'vortex'`, `'galaxy'`, or `'wave'` |
| `radius` | `3.8` | 0.01–10000 world-unit scale |
| `speed` | `0.5` | −20–20 |
| `turbulence` | `0.55` | 0–3 |
| `pointSize` | `2.2` | 0.1–100 |
| `colorA` | `'#4de4ff'` | First palette endpoint |
| `colorB` | `'#5f5bff'` | Second palette endpoint |
| `seed` | `42` | Integer 0–4294967295; construction only |

Changing `count` or `seed` through `set()` throws. Passing their existing values is accepted. Every other listed option can change live. CPU raycasting is disabled because the vertex shader computes visible positions.

## `networkGraph(options?: NetworkGraphOptions)`

Instanced nodes and weighted line edges with a deterministic grouped layout. `kind` is `'networkGraph'`; `count` is the node count. Without `data`, it generates a synthetic graph for demonstration.

| Option | Default | Range / behavior |
| --- | --- | --- |
| `data` | Generated graph | `GraphData`; mutually exclusive with an explicitly supplied `nodeCount` |
| `nodeCount` | `280` | Integer 1–10000 for synthetic generation |
| `radius` | `4.2` | 0.01–10000; layout scale for nodes without positions |
| `nodeSize` | `0.045` | 0.001–10; base node-radius scale |
| `speed` | `0.35` | −10–10; rotates the graph as a whole |
| `seed` | `42` | Integer 0–4294967295 |
| `edgeOpacity` | `0.22` | 0–1 |
| `colorA` | `'#56f5df'` | First palette endpoint |
| `colorB` | `'#a98aff'` | Second palette endpoint |

`set()` accepts `nodeSize`, `speed`, `edgeOpacity`, and colors. Including `data`, `nodeCount`, `radius`, or `seed` in a patch throws, even if its value is unchanged. Replace the layer to change these structural settings.

```ts
import { networkGraph } from 'fivejs';
import type { GraphData } from 'fivejs';

const data: GraphData = {
  nodes: [
    { id: 'source', group: 0, value: 4, position: [-2, 0, 0] },
    { id: 'destination', group: 1, value: 1, position: [2, 1, 0] },
  ],
  edges: [{ source: 'source', target: 'destination', weight: 0.8 }],
};
const graph = networkGraph({ data, speed: 0 });
```

| Data field | Contract |
| --- | --- |
| `GraphData.nodes` | 1–10000 nodes |
| `GraphData.edges` | 0–100000 edges |
| `GraphNode.id: string` | Unique, nonempty identifier |
| `GraphNode.group?: number` | Integer 0–1000000; omitted group is 0 |
| `GraphNode.value?: number` | 0–1000000; omitted value is 1 |
| `GraphNode.position?: [number, number, number]` | Each coordinate −1000000–1000000; omitted positions receive a seeded layout |
| `GraphEdge.source`, `GraphEdge.target` | Must name existing node IDs |
| `GraphEdge.weight?: number` | 0–1000000; omitted weight is 1 |

The factory copies the supplied records and position tuples. Later mutations of the input arrays do not update the rendered graph. Layout preserves supplied local positions, but the layer's animation rotates the root object; use `speed: 0` when orientation should stay fixed.

Node radius is `nodeSize × (0.55 + 1.25 × sqrt(value / maxValue))`. Edge color brightness is multiplied by `0.25 + 0.75 × weight / maxWeight`; these normalized encodings are not direct area or width scales. A maximum of zero falls back to 1. Colors interpolate by group, or by node order if there is one group. Edges have no arrowheads. The layout is not a force simulation.

## `terrain(options?: TerrainOptions)`

An animated procedural heightfield with shader normals, grid lines, and contours. `kind` is `'terrain'`; `count` is `(resolution + 1)²` vertices. The square mesh is centered in local X/Z and starts with `object.position.y = -0.8`.

| Option | Default | Range / behavior |
| --- | --- | --- |
| `resolution` | `160` | Integer 2–512 subdivisions per side; construction only |
| `size` | `12` | 0.1–10000 world-unit side length; construction only |
| `height` | `2.2` | 0–1000 amplitude scale |
| `frequency` | `0.85` | 0.01–20 |
| `speed` | `0.5` | −10–10 |
| `wireframe` | `false` | Boolean |
| `colorA` | `'#39eddc'` | First palette endpoint |
| `colorB` | `'#9c67ff'` | Second palette endpoint |
| `seed` | `42` | Integer 0–4294967295; construction only |

`set()` accepts height, frequency, speed, wireframe, and colors. Including resolution, size, or seed in a patch throws, even if unchanged. CPU geometry remains flat; visible elevation is shader-generated, so CPU raycasting is disabled. This is analytic animation, not a physical erosion simulation or an elevation-data importer.

## `hypercube(options?: HypercubeOptions)`

4D or 5D rotations followed by successive perspective projections into 3D. `kind` is `'hypercube'`; `count` is 16 vertices for 4D or 32 for 5D.

| Option | Default | Range / behavior |
| --- | --- | --- |
| `dimensions` | `5` | `4` or `5` |
| `size` | `3.4` | 0.01–10000; original edge length before projection |
| `speed` | `0.65` | −20–20 |
| `color` | `'#72eaff'` | Edge/point palette color |
| `pointSize` | `0.09` | 0.001–100; distance-attenuated point-rendering scale |

All options can change live. `set({ dimensions: 4 })` replaces the topology and owned geometry while preserving animation phase. Projected screen dimensions vary during rotation; `size` does not mean a fixed 3D bounding-box width.

## Add a custom layer

A custom layer can wrap ordinary Three.js geometry. It must own and release the resources it creates, honor zero delta, and validate patches before changing state. This minimal factory implements the public interface:

```ts
import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three';
import type { FiveLayer } from 'fivejs';

function spinningCube(): FiveLayer<{ speed: number }> {
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial({ color: '#9cebd0' });
  const object = new Mesh(geometry, material);
  let speed = 0.4;
  let disposed = false;

  return {
    object,
    kind: 'spinningCube',
    count: 1,
    update(_time, delta) {
      if (!disposed && Number.isFinite(delta) && delta >= 0) {
        object.rotation.y += delta * speed;
      }
    },
    set(patch) {
      if (disposed) throw new Error('Layer has been disposed');
      const next = patch.speed ?? speed;
      if (!Number.isFinite(next) || Math.abs(next) > 10) {
        throw new RangeError('speed must be between -10 and 10');
      }
      speed = next;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      object.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}

// With an existing FiveApp:
// const cube = app.add(spinningCube());
// cube.set({ speed: 0.8 });
// app.remove(cube); // disposes it; create a new cube to add again
```

For more involved compositions, the [example guide](https://github.com/kevin-owens-product/5JS/blob/main/examples/README.md) describes the gallery's recipe interface and example-only tubes, surfaces, labels, and particle flows. Those helpers demonstrate custom layers; they are not additional public 5js factories.

## Compatibility and limits

- Runtime: browser with WebGL2, `ResizeObserver`, and standard canvas APIs. Call `createFive` after mounting a browser element; it cannot render on a server. Layer construction can be exercised in Node without a WebGL context.
- Package: ESM with TypeScript declarations. Three.js is a peer dependency, external to the library bundle. The current peer range is `^0.180.0`, and the prototype is tested with r180. No CommonJS entry is provided.
- Local development: Node.js 22.12+ is the documented baseline. Python 3 is required for regenerating the downloadable example ZIP and checking its exclusion rules with `npm run test:package`.
- Rendering: WebGL2, not WebGPU compute. Maximum accepted counts bound input sizes; they do not promise an interactive frame rate. Lower counts, resolution, pixel ratio, and bloom for slower devices.
- Features not implemented: built-in picking/tooltips, arbitrary point-cloud ingestion, volumetric raymarching, streaming/LOD, and a WebGPU backend. Analytic motion and synthetic example data do not represent physical or business measurements.

See the [validation instructions](../README.md#validation) for CPU/type checks and browser lifecycle checks. The [example browser harness](https://github.com/kevin-owens-product/5JS/blob/main/tests/examples-browser.html) separately verifies all gallery recipes.
