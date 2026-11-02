# Relametric 0.1.0-alpha.2 — GitHub alpha release

Published on 2026-11-02 as a [GitHub prerelease](https://github.com/kevin-owens-product/5JS/releases/tag/v0.1.0-alpha.2). The [Relametric website](https://kevin-owens-product.github.io/5JS/) is live. Both npm packages remain private and unpublished.

Relametric is an MIT-licensed TypeScript toolkit for connected-data visualization on Three.js. This alpha introduces the Relametric identity, consistent human and agent documentation, and migration aliases for the original public API.

## Included

- Four composable rendering factories and shared scene lifecycle.
- 50 runnable examples, including conversion, retention and product-decision workflows.
- A separate connector library with 44 constrained factories and 45 source guides.
- Source-record inspection, provenance and exported briefs in the example applications.
- Quickstart, API reference, architecture, troubleshooting, contribution/security guidance, AGENTS.md and llms.txt.

## Try it

Use Node 22.16+ and Python 3. Clone the repository at `v0.1.0-alpha.2`, or unpack the validated source archive. Run `npm ci` then `npm run dev`. Follow [getting started](GETTING_STARTED.md) for local-library installation and your first scene. Registry installation is not available yet.

## Migration and limitations

Read [migration notes](MIGRATION.md) for package/import changes and retained aliases. The repository and Pages URLs remain under 5JS. APIs are experimental. Decision workflows use synthetic observations and modeled scenarios; they do not establish real business impact. Most cloud connectors have protocol tests rather than live-account certification. Authentication, authorization, OAuth lifecycle and durable synchronization remain application responsibilities. Example workflows are not additional core package APIs.

## Publication and validation

The annotated tag points to merge commit `09b7925570d1990936d44f64ea56b45542f466b7` from PR #7. [CI passed on Node 22.16.0 and Node 24](https://github.com/kevin-owens-product/5JS/actions/runs/41523167398), and the [Pages workflow succeeded](https://github.com/kevin-owens-product/5JS/actions/runs/41523169228) for that revision.

Headless Chromium with SwiftShader verified the hosted homepage, Business category and correlation-matrix deep link, source inspection and pause, standalone conversion example, connector catalog, PostgreSQL code sample and narrow layout. License, third-party notices, agent index and source ZIP returned valid public content. No page errors were observed. This is a software-renderer smoke check, not device performance certification.

The release includes the source ZIP, both package tarballs and SHA256SUMS. All three public attachments were downloaded without authentication and matched their checksums. A fresh extraction of the source ZIP installed with `npm ci` and built with `npm run build:demo`.

These publication notes were recorded after tagging; the tag retains its original candidate documentation. Use the GitHub release notes for the publication record and [RELEASING.md](RELEASING.md) for future releases.
