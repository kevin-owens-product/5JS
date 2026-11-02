# Relametric 0.1.0-alpha.2 — release candidate

Status: prepared source candidate; not a published GitHub release or npm package.

Relametric is an MIT-licensed TypeScript toolkit for connected-data visualization on Three.js. This alpha introduces the Relametric identity, consistent human and agent documentation, and migration aliases for the original public API.

## Included

- Four composable rendering factories and shared scene lifecycle.
- 50 runnable examples, including conversion, retention and product-decision workflows.
- A separate connector library with 44 constrained factories and 45 source guides.
- Source-record inspection, provenance and exported briefs in the example applications.
- Quickstart, API reference, architecture, troubleshooting, contribution/security guidance, AGENTS.md and llms.txt.

## Try it

Use Node 22.16+ and Python 3. Clone the repository at the release tag once published, or unpack the validated source archive. Run `npm ci` then `npm run dev`. Follow [getting started](GETTING_STARTED.md) for local-library installation and your first scene. Registry installation is not available yet.

## Migration and limitations

Read [migration notes](MIGRATION.md) for package/import changes and retained aliases. The repository and Pages URLs remain under 5JS. APIs are experimental. Decision workflows use synthetic observations and modeled scenarios; they do not establish real business impact. Most cloud connectors have protocol tests rather than live-account certification. Authentication, authorization, OAuth lifecycle and durable synchronization remain application responsibilities. Example workflows are not additional core package APIs.

## Release gate

Follow [RELEASING.md](RELEASING.md). Record the candidate commit, exact CI results, artifact checksums, browser environment and verified hosted URLs before turning these notes into a published prerelease. Do not mark the release published from a local build alone.
