# Working on Motif

## Read first

This repository is an experimental TypeScript/Three.js project. Motif is the working brand; the rendering package/import is `fivejs`, with `createFive` and `FiveLayer`. The separate `motif-connectors` package is also private and unpublished. Do not invent registry installation commands or rename APIs to match the brand.

Read [docs/INDEX.md](docs/INDEX.md) to select the relevant guide, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for boundaries, and [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow. Follow the checked-out source and manifests over assumptions about a newer website.

## Where to change things

- Rendering exports: `src/index.ts`; contracts: `src/types.ts`; lifecycle: `src/core.ts`; factories: `src/layers/`.
- Connector contracts and adapters: `packages/connectors/src/`. Browser entry: `index.ts`; server entry: `server.ts`. Reference: `packages/connectors/README.md`.
- Homepage: `demo/motif.ts`; shared outcome model and scenes: `examples/outcomes/`.
- Earlier connected workflow: `examples/connected/` (separate fixture/contracts).
- Recipes: `examples/catalog.ts` and category folders; authoring: `examples/README.md`.
- Connector landing pages: `connectors/content/*.ts`; regenerate with `npm run prepare:connectors`. Never edit generated HTML as the source of truth.
- CI and publication: `.github/workflows/`, `scripts/`, `docs/RELEASING.md`.

## Setup and checks

Use npm with the committed lockfile. Node 22.12+ supports the website/core; Node 22.16+ is needed for the connector demo/package. Python 3 is needed for source archives and package verification.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:types
```

`test:types` needs the prior library build. For site, guide, archive or packaging changes, run `npm run build:demo` and `npm run test:package`. For rendering or interaction changes, install Chromium with `npx --no-install playwright install chromium`, then run `npm run test:browser`; the runner starts its own server. Also inspect changed views manually, including narrow layouts, reduced motion, controls and exports. See `docs/COMPATIBILITY.md` for harness routes. For documentation-only edits, verify links, source/API claims and applicable samples; run packaging checks when changing distributed documentation.

Report commands actually run and any failures or unverified environments. Passing mock tests is not live-provider certification; a passing software-renderer test is not a device performance benchmark.

## Invariants

- Keep TypeScript `.js` import specifiers. Validate settings before mutation.
- Animate through the shared clock; zero delta freezes motion. Release GPU resources, listeners and observers. Preserve app/layer ownership and repeatable cleanup.
- Keep example helpers and outcome UI separate from public exports unless an API change is deliberate and documented.
- Preserve positional data, exact numeric strings, provenance and completeness. Validate join grain and source mappings before aggregating.
- Keep credentials, provider URLs, SQL and tenant binding on the server. Applications own authentication and authorization. Do not add an arbitrary query proxy.
- Keep fictional observations, modeled scenarios and measured outcomes clearly distinguished. Visual motion must not fabricate records or evidence.
- Never commit credentials, local data, dependency folders, generated builds, tarballs or generated source ZIPs.

Consult [docs/ECOSYSTEM_REVIEW.md](docs/ECOSYSTEM_REVIEW.md) before claiming novelty: Cylynx already uses Motif for a related graph tool. Do not claim the name is available or that no alternatives exist. Use [docs/RELEASING.md](docs/RELEASING.md) for explicitly requested publishing work; preparing a build is not evidence of deployment.
