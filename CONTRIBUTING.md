# Contributing to Motif

Motif is an experimental TypeScript library built on Three.js. Contributions can improve its four public layers, its scene lifecycle, documentation, or the 50-example gallery. See the [API reference](docs/API.md) and [example guide](examples/README.md) before choosing where a change belongs.

For task-based entry points, use [the documentation map](docs/INDEX.md). Coding agents should also read [AGENTS.md](AGENTS.md).

## Set up a checkout

Use Node.js 22.16 or newer for all demos, npm, and Python 3. The core library/site alone supports Node.js 22.12+. A browser with WebGL2 is needed to view the playground and run rendering checks. Clone or fork the repository, open its root directory, then run:

```sh
npm ci
npm run dev
```

Open the address printed by Vite, normally `http://127.0.0.1:5185`. The gallery is at `/examples/`. Use `npm ci` with the committed lockfile; update the lockfile deliberately when changing dependencies.

## Choose the right change

Use an issue to describe a bug or discuss a larger API addition before implementing it. Include a small reproduction, expected behavior, actual behavior, browser/OS, Three.js version, and relevant errors. For rendering problems, include the recipe ID, control values, and a screenshot where useful. Keep private information out of public reports.

Public APIs are exported from `src/index.ts`. Helpers under `examples/` are recipe utilities and do not automatically become library APIs. Keep this distinction clear in code and documentation. New public features need a deliberate contract for construction, live settings, ownership, and disposal.

## Develop and validate

The core validation sequence is:

```sh
npm run typecheck
npm test
npm run build
npm run test:types
npm run build:demo
```

`test:types` checks the built package's public declarations, so run the library build first. `build:demo` regenerates the downloadable project and writes the static site to `demo-dist/`; it requires Python 3.

Run `npm run test:package` for the packed-artifact consumer check and `npm run test:browser` for the automated WebGL checks. Follow their setup instructions in [Compatibility and validation](docs/COMPATIBILITY.md#validation) when installing the browser runtime. Include the checks relevant to your change in the pull request. If a check cannot run on your machine, state that and explain why rather than claiming a pass.

For visual changes, also inspect the affected example manually. With the development server running, `/tests/browser.html` exercises the scene lifecycle and `/tests/examples-browser.html` exercises the gallery recipes. Check the actual scene, narrow layouts, control extremes, pause/playback, camera reset, and exported output. A successful shader compilation alone does not establish that the visualization is readable or correctly encoded.

## Code and resource ownership

- Use the existing TypeScript module style, including `.js` import specifiers in `.ts` files.
- Validate a settings patch before changing live state. Reject unsupported structural changes rather than silently ignoring them.
- Drive layer animation through `update(time, delta)`. Zero delta must freeze animation; do not add an independent animation loop that bypasses pause or speed controls.
- Release owned geometries, materials, textures, listeners, and subscriptions. Make cleanup safe to repeat.
- Let the app dispose layers added with `app.add()`. Resources placed directly in the Three.js scene remain the caller's responsibility.
- Add focused tests for meaningful behavior or a regression. Avoid assertions that merely duplicate implementation details.

## Add or change an example

Follow the [recipe authoring instructions](examples/README.md#add-a-recipe). Each example needs a stable, unique ID matching its filename, an appropriate camera, one to three useful controls, and truthful descriptions of its data and visual encodings. Register it in `examples/catalog.ts` so previews, source lookup, and the standalone runner can find it.

Business and analytics examples use synthetic fixtures. Keep model assumptions, units, denominators, rounding, and interpolation explicit. Derive geometry and readouts from the same data so a control change cannot leave stale totals. Decorative motion must not imply that new observations or transactions have occurred.

Update relevant documentation and include a screenshot for changes whose quality depends on appearance. Keep measured performance claims tied to a named environment and workload.

## Submit a pull request

Create a branch in your fork or checkout. Explain the problem, the resulting behavior, and how you verified it. Keep unrelated cleanup separate. Update documentation when an API, example, installation step, or supported behavior changes.

Do not commit dependency folders, generated library/site builds, tarballs, generated source ZIPs, credentials, or local environment files. Review the staged diff before pushing. Maintainers handle version changes, tags, public deployments, and releases through the [release checklist](docs/RELEASING.md).

Contributions are intended for distribution under the project's MIT license. Only contribute code and assets you have the right to distribute, and retain required attribution.
