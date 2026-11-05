# Architecture and integration boundaries

## Three surfaces

| Surface | Source of truth | Contract |
| --- | --- | --- |
| Rendering library | `src/index.ts`, `src/types.ts`, `src/core.ts`, `src/layers/` | `createRelametric`, four layer factories, public types; exports from `relametric` |
| Connector package | `packages/connectors/src/index.ts`, `server.ts`, `types.ts` | Typed data pages and constrained read adapters; separate browser/server entry points |
| Example applications | `demo/relametric.ts`, `examples/outcomes/`, `examples/connected/`, `examples/catalog.ts` | Domain models, selection, records, calculations, scenarios and briefs; source to adapt, not package exports |

The main library does not depend on a particular connector. A connector does not automatically choose a visualization, infer entity relationships, or decide a business action.

```text
Authorized source
  → server adapter / registered operation gateway
  → DataPage (fields, positional rows, provenance, completeness)
  → application-owned validation and schema mapping
  → domain records + explicit joins + calculations
  → scene + exact records + scenario controls
  → scoped investigation brief for human review
```

Browser-safe JSON/file adapters can also consume supplied snapshots directly. The homepage takes this path with fictional records; it does not exercise live database authentication.

## Rendering lifecycle

`createRelametric` owns its canvas, renderer, resize observer, controls, clock and added layers. `app.remove()` disposes the removed layer; `clear()` disposes all owned layers; `dispose()` releases the app. Do not re-add a disposed layer. Objects added directly to `app.scene` remain caller-owned. Custom layers implement `RelametricLayer` and advance through `update(time, delta)`; zero delta must freeze motion. See [API ownership](API.md#app-methods-and-ownership).

Structural parameters generally require replacement, while supported live settings are validated before mutation. Inspect the factory's exact contract instead of assuming that every construction option works with `set()`.

## Data and trust boundaries

Credentials, provider clients, SQL and tenant binding stay on the server. The browser should submit an approved operation and validated parameters through `endpointConnector`, not arbitrary SQL or provider URLs. Applications must supply authentication, authorization, tenant isolation and provider read-only permissions. The gateway is not an authentication service.

`DataPage.rows` are positional; duplicate field names are permitted. Decimal and large-integer strings preserve precision. Do not coerce identifiers or money to JavaScript numbers without an explicit safe conversion policy. `fetchedAt` is retrieval time, not upstream freshness. `hasMore` and `truncated` must be handled before treating a result as the full population. See [connector limits](../packages/connectors/README.md#limits-continuation-and-cancellation).

## Adapting outcomes

`examples/outcomes/model.ts` defines `OutcomeDataset`, `SourceReceipt`, the fixture loader, validators and calculations. Its domain includes accounts, sessions, checkout attempts, account-week usage, support tickets, interviews and initiatives. `scene.ts` encodes that model visually; `recipe.ts` supplies gallery companions; `demo/relametric.ts` manages the homepage and record dialogs.

Replace the fixture loader with authorized data pages and an explicit mapper. Validate source types, units, precision, unique IDs, foreign keys, observation windows and the expected join grain before calculating. Existing fixture validators are not a complete arbitrary-input schema validator. Keep qualitative counter-evidence and scenario assumptions visible. Update all synthetic labels and provenance accurately when changing the source. Follow [the detailed adaptation guide](../examples/README.md#adapt-the-relametric-decision-lab).

`examples/connected/` is a separate earlier application using `EntityRecord` and `OutcomeExplorer`. Do not combine its 99-record fixture with the 540-record homepage model accidentally.

## Documentation and build boundaries

Connector pages are authored in `connectors/content/*.ts`, rendered through `scripts/generate-connector-pages.ts`, and generated before development/site builds. Edit the authored content, not generated `connectors/*/index.html`. The source ZIP is assembled by `scripts/package-examples.py` using explicit source boundaries. `scripts/prepare-public.mjs` copies public notices and the agent discovery index. `llms.txt` links to source documentation; it does not duplicate the reference.

The static website is built into `demo-dist/`; packages build into `dist/` and `packages/connectors/dist/`. Deployment and npm publication are separate actions. Both packages are publishable alpha candidates; registry publication is separate. [Compatibility](COMPATIBILITY.md) documents rendering constraints; [release instructions](RELEASING.md) define publication checks.

## Connected website navigation

`demo/site.ts` supplies the shared Overview / Examples / Connectors / Playground header, curated outcome journeys and validated source context. `demo/site.css` scopes the shared presentation. Connector pages render the same header statically so it remains usable before JavaScript.

The homepage owns full decision workflows. The gallery discovers recipes. `/demo/playground.html?example=<id>` uses one workspace for all 100 registered recipes and four foundation experiments. The bare Playground route opens Particle field. `demo/foundations/` adapts the four public layers to the recipe contract; `demo/workspace.ts` owns the searchable library, and the gallery runtime owns mounting, controls, source and export. Switching experiments reuses the canvas, preserves settings for this tab session, and pushes browser history. The Explore, Data & evidence, and Code views share one selected experiment. Gallery cards and homepage cards link into this workspace; existing `/examples/run.html?example=<id>` and gallery category/hash links remain supported.

Connector guides link to related recipes with a validated `source` slug. That slug carries an adaptation context and a return link; it never opens a provider connection or changes the synthetic fixture. The scene, source viewer and controls are the same implementation in gallery, standalone and Playground.

## Overview motion previews

The hero and seven featured cards use silent MP4 loops recorded from the actual synthetic recipes. `demo/preview-motion.ts` attaches media sources only while visible, pauses offscreen/hidden-tab playback, and synchronizes the two preview controls. Reduced-motion visitors start with the original stills and may opt in. Playback failures leave the still images and workspace links usable. These previews add no WebGL renderers to the overview.

To refresh assets, open `tests/record-overview-previews.html` through the dev server, record and download the seven WebM clips, then encode each as H.264 MP4 with FFmpeg (`-c:v libx264 -crf 27 -pix_fmt yuv420p -movflags +faststart -an`). Store the curated MP4 files beside the JPEGs in `public/examples/previews/`. Keep the synthetic snapshots and six-second duration; motion illustrates a scene, not elapsed event time. The source archive includes the clips.

## Observation-driven recipe collection

`examples/shared/observatory.ts` owns validation, reference comparisons and eight scene encodings for 43 domain investigations. Each category module owns an explicit typed fixture and its grain/interpretation. `examples/observatories.ts` is lightweight discovery metadata used by the overview and static preview selection; the complete implementations remain in `examples/catalog.ts`. There are 100 recipes and four foundation experiments. `scripts/capture-observatories.mjs` renders the 43 static preview assets from those implementations. No new public library API or provider access is introduced.
