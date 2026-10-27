# Compatibility and validation

Motif (`fivejs`) is an alpha library. This page distinguishes implementation requirements from environments that have actually been checked. It does not promise a frame rate or a complete browser-support matrix.

## Runtime and package requirements

| Area | Current contract |
| --- | --- |
| Browser renderer | WebGL2; no WebGL1 fallback or WebGPU backend |
| Browser APIs | DOM, canvas, `ResizeObserver`, animation scheduling, and standard Blob APIs |
| JavaScript package | ESM with TypeScript declarations; no CommonJS entry |
| Three.js | Peer range `^0.180.0`; current implementation tested with r180 |
| Development tools | Node.js 22.12+ and npm for core/site; Node.js 22.16+ for the connector package/demo |
| Source ZIP generation and package verification | Python 3, invoked by `npm run package:examples`, `npm run build:demo`, and the archive-regression portion of `npm run test:package` |
| Server rendering | `createFive` requires a mounted browser element; it does not render on a server |

The `@webgpu/types` reference in the declarations supports dependency typing; it does not indicate a WebGPU rendering backend. Three.js remains external to the library bundle, while the static demo bundles its own runtime dependencies.

The local desktop browser checks have exercised all four layers and all 50 gallery recipes. That result is not a verified Safari, Firefox, mobile-device, or GPU compatibility matrix. Record the browser version, OS, GPU/backend, recipe, viewport, and relevant controls when reporting a new environment. Do not infer support solely from a browser's name or nominal WebGL2 availability; device limits and graphics drivers can affect results.

## Application integration and cleanup

Give the container a nonzero width and height before creating the scene. In a component framework, create the app after the element mounts and call `app.dispose()` during cleanup. Repeated mounting without disposal can leave animation loops, observers, and GPU resources alive. Dispose the previous instance before recreating it for a changed container.

The app owns layers added through `app.add()`. `app.remove(layer)` disposes that layer; it cannot be added again after removal. Replace it with a new layer. Objects inserted directly into `app.scene` are outside this ownership system and must be cleaned up by their creator.

Reduced-motion preferences initialize playback paused and camera auto-orbit disabled unless the caller overrides those options. The preference is read at scene construction. Hidden documents receive zero simulation delta. Pausing stops layer motion and auto-orbit while preserving rendering and manual camera interaction.

The demo's copy controls depend on browser clipboard permissions and provide a manual fallback. PNG capture records the WebGL canvas; it does not include surrounding HTML controls, metric cards, or data tables.

## Performance guidance

Start with modest particle/node counts and terrain resolution, then measure on the intended device. The accepted construction maxima—250,000 particles, 10,000 graph nodes, 100,000 edges, and 512 terrain subdivisions—are validation bounds, not interactive performance guarantees.

Reduce pixel ratio before lowering visual fidelity elsewhere; the default is device pixel ratio capped at 2, and callers can choose a lower value. Reduce particle count, terrain resolution, and graph density where needed. Lower bloom strength or set it to zero to bypass its post-processing passes. Recreate a layer when changing settings that are structural rather than supported by `set()`.

Use `app.stats` to observe FPS, draw calls, and rendered primitives. Draw-call and primitive counts include post-processing work; `objects` counts visible renderable objects in the scene. These values are not source-data row counts. Compare identical camera positions, dimensions, scene parameters, and device settings before drawing conclusions.

The gallery prepares previews sequentially using a temporary renderer, then displays still images. Opening an example creates the active scene. Initial preview generation and active-scene frame rate are separate workloads.

## Validation

From a clean checkout:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:types
npm run test:package
npm run build:demo
```

The CPU suite covers data calculations, geometry invariants, validation, animation phase/pause behavior, and resource disposal. The type-consumer check uses the built public declarations. The package check installs the actual packed artifact in a separate consumer project so a local `dist/` folder cannot conceal an incomplete release package.

Install the Chromium runtime once, then run the browser checks:

```sh
npx --no-install playwright install chromium
npm run test:browser
```

On a Linux CI runner, use `npx --no-install playwright install --with-deps chromium` to install its system dependencies too. The runner starts its own Vite server on an ephemeral loopback port and executes the rendering and pressure-test HTML harnesses sequentially in headless Chromium with the SwiftShader software graphics backend. It saves screenshots and diagnostics under `artifacts/browser-checks/`; a separately running development server is not needed.

These checks exercise real rendering. A passing automated run establishes behavior in that runner's browser and graphics backend; it does not establish visual quality on every device. Inspect changed scenes manually as well.

For interactive diagnosis, start `npm run dev` and open:

- `/tests/browser.html`: scene lifecycle, all four layers together, pause/speed, bloom, geometry replacement, capture, resizing, and disposal.
- `/tests/examples-browser.html`: gallery rendering, control boundaries, encoded PNG pixels, analytic readouts, animation/pause, and resource cleanup.
- `/tests/core-pressure.html`: failed initialization, throwing/reentrant cleanup, observer validation, and capture failures.
- `/tests/gallery-pressure.html`: shareable filters/search, invalid routes, browser history, repeated opening, phone layout, reduced motion, and unavailable WebGL.
- `/tests/render-pressure.html`: high-count rendering, repeated resource replacement, and context loss/restoration where supported.

Use `npm run preview` after `npm run build:demo` to inspect the production site. The build output is `demo-dist/`; the library-only `dist/` is not a website. Test direct standalone links and source downloads at the deployed repository subpath, not only at localhost root.

## Known boundaries

There is no built-in picking, tooltip system, arbitrary point-cloud ingestion, streaming/LOD, volumetric raymarching, or WebGPU compute support. Shader-displaced particle and terrain layers disable CPU raycasting because their CPU geometry does not match visible positions. The graph layout is deterministic grouping, not a force solver. Particle and terrain motion is analytic animation rather than a physical simulation.

Business and analytics fixtures are synthetic. Their models and tables demonstrate calculations and visualization techniques; they are not evidence about a real company. See the [example guide](https://github.com/kevin-owens-product/5JS/blob/main/examples/README.md#interpretation-and-checks) for interpretation details and the [API reference](API.md) for exact option contracts.
