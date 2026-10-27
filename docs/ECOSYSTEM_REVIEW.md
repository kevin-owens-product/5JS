# Ecosystem and differentiation review

Reviewed 2026-10-26 against Motif's deployed source revision `fd4f87860f76229b34b6fced77a57fa719e36658`. This is a bounded desk review of public repositories and first-party documentation, not a hands-on benchmark, exhaustive search, or name clearance.

## Finding

Related projects exist, including one already called **Motif** in graph visualization and investigation. We cannot honestly claim that no open-source project resembles this one. We did not establish an exact equivalent of the current combination, but that is not proof of uniqueness.

Our defensible positioning is an experimental, code-first workspace that connects typed source records to spatial exploration, inspectable evidence and scoped decision briefs for conversion, retention and product choices. The workflow and its authoring experience are the potential distinction. 3D rendering, linked views, connectors and investigation graphs individually are established capabilities.

## Three passes through the landscape

1. **Rendering and interaction:** composable GPU layers, Three.js integration, graph exploration and declarative charts.
2. **Analytics and integration:** database-linked views, streaming tables, reports, dashboards and source adapters.
3. **Investigation and naming:** evidence-linked graph workflows and existing projects using Motif.

Searches included “open source visualization linked data evidence decision graph,” “Motif open source graph visualization library,” and “open source visual analytics investigation linked evidence,” followed by primary repository/docs inspection. Repository descriptions and documented capabilities establish overlap; absence from a README does not establish that a competitor cannot support a workflow. Stars and marketing performance claims were not used as quality scores.

## Alternatives and adjacent projects

| Project / primary source | Established overlap | Implication for this project |
| --- | --- | --- |
| [Cylynx motif.gl](https://github.com/cylynx/motif.gl), [README](https://raw.githubusercontent.com/cylynx/motif.gl/master/README.md) | Browser graph exploration/investigation; graph imports including JSON, CSV and Neo4j; multiple layouts and extensible widgets; same Motif name | Direct naming and product-category overlap. Revisit branding before a registry release or broad promotion; do not imply affiliation. |
| [Mosaic](https://github.com/uwdata/mosaic), [docs](https://idl.uw.edu/mosaic/) | Database-backed coordinated interactive views, selections and DuckDB execution | Closest architectural comparison for linked data exploration. Consider a future integration rather than rebuilding a query coordinator. No Mosaic integration currently exists here. |
| [Perspective](https://github.com/perspective-dev/perspective), [README](https://raw.githubusercontent.com/perspective-dev/perspective/master/README.md) | Interactive grids, pivots and charts over large/streaming data with browser/server query execution | Strong alternative when streaming analytics and user-configurable tables are the central requirement. Motif has no comparable streaming query engine. |
| [Evidence](https://github.com/evidence-dev/evidence), [docs](https://docs.evidence.dev/) | SQL/Markdown data products, connectors, interactive reports and static deployment | Business outcomes plus connectors are not unique. Distinguish the spatial record/evidence workflow from report authoring. Its hosted platform and open framework are separate surfaces. |
| [Observable Framework](https://github.com/observablehq/framework), [docs](https://observablehq.github.io/framework/) | Code-authored data apps with reactive JavaScript, loaders and static-site output | Strong alternative for custom analytical applications. Our focused domain workflows are a starting point, not a general framework superiority claim. |
| [deck.gl](https://github.com/visgl/deck.gl), [docs](https://deck.gl/docs) | Composable GPU data layers, picking, filtering and multiple views | Broad rendering overlap. Choose it for requirements its existing layers address; Motif currently has four specialized public factories and no generic picking API. |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber), [docs](https://r3f.docs.pmnd.rs/getting-started/introduction) | Declarative Three.js scene composition and lifecycle integration with React | Motif's framework-independent convenience layer is a narrower choice, not a replacement for the React/Three.js ecosystem. |
| [3d-force-graph](https://github.com/vasturiano/3d-force-graph) | Three.js graph visualization with force-directed layout and interaction APIs | Prefer it when a force-directed graph is the problem. Motif's network layout is deterministic grouping, not force simulation. |
| [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) | Graph visualization and graph analysis | Graph exploration is an established category. Motif does not provide an equivalent graph-algorithm library. |
| [Vega-Lite](https://github.com/vega/vega-lite), [docs](https://vega.github.io/vega-lite/docs/) | Declarative grammar for interactive multi-view graphics | A better fit for portable chart specifications and conventional analytical encodings; Motif currently relies on TypeScript recipes. |
| [Apache ECharts](https://github.com/apache/echarts) | Interactive browser charts and data visualization | Broad conventional chart coverage is already available. More animated chart examples alone are not a durable distinction. |
| [Apache Superset](https://github.com/apache/superset) | Data exploration and visualization platform | A platform alternative for BI needs. Motif does not supply a production BI administration/authentication system. |

Adjacent integration infrastructure: [Airbyte](https://github.com/airbytehq/airbyte) addresses data movement and connectors. It is not a direct rendering competitor, and licensing varies across its components; do not describe the entire ecosystem as equivalent to this MIT library without reviewing the relevant licenses. Our read adapters do not constitute ELT orchestration, CDC, managed OAuth, scheduled synchronization or a durable cursor store.

Adjacent investigation workflow: [OpenCTI's graph documentation](https://docs.opencti.io/latest/usage/graphs/) describes investigation graphs and relationship exploration in threat intelligence. This establishes that linked entities and investigations also exist outside BI. Its domain, deployment and licensing require separate assessment before reuse.

## Naming finding

Cylynx's repository uses `@cylynx/motif` and describes a graph visualization platform. That is a concrete discovery/confusion risk for a similarly named visualization project regardless of its current activity. The project here remains `kevin-owens-product/5JS`, with `fivejs` and private `motif-connectors` packages. No name change or registry publication is part of this audit. A separate identity decision should consider repository/package search, domains and the intended market; this review does not establish legal availability.

## What to build on, and what to prove

Keep investing in the path from an observed pattern to exact records, contradictory evidence, explicit assumptions, a proposed owner/action, a baseline and a guardrail. Keep those concepts inspectable in exported briefs. Treat this as our product thesis, not a demonstrated competitive advantage.

Before claiming better outcomes, evaluate the same realistic task against a table/report baseline and a suitable linked-view tool. Measure time to a correct explanation, traceability of evidence, denominator/join mistakes, and usefulness of the resulting brief. Include failed tasks and unfamiliar users. No such comparative user study has been completed here.

Before claiming production readiness, certify representative live provider reads, authorization/tenant boundaries, completeness and precision, failure/cancellation behavior, and intended browsers/devices. Existing protocol tests and synthetic examples do not substitute for that work.

## Documentation patterns worth adopting

- [deck.gl docs](https://deck.gl/docs) separate getting started, developer guides, reference, upgrade guidance and examples. Adopt clear entry paths rather than an ever-growing README.
- [React Three Fiber's introduction](https://r3f.docs.pmnd.rs/getting-started/introduction) leads to installation and a first scene and states version compatibility. Make the first successful render and runtime prerequisites explicit.
- [Observable Framework docs](https://observablehq.github.io/framework/) expose project structure, data loading and deployment alongside conceptual guidance. Document where our source mapping ends and application responsibility starts.
- [Mosaic's agent index](https://idl.uw.edu/mosaic/llms.txt) links concepts, examples and API reference in plain text. Provide a small discoverable index backed by canonical docs, not another drifting copy of the API.
- [Vercel AI SDK's AGENTS.md](https://github.com/vercel/ai/blob/main/AGENTS.md) maps packages, development commands and conventions. Apply the structure to our own source and actual npm scripts; do not copy its tooling or assume its agent results transfer to this repository.

These patterns informed this documentation pass. A published instruction file improves discoverability; reliable agent behavior still needs task-based evaluation.
