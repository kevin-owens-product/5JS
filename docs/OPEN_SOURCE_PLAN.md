# Relametric publication readiness

Review date: 2026-11-02. Relametric is the user-selected replacement name. This review records the release work; it does not rename the repository, APIs or packages, merge PRs, deploy, or publish to npm.

## Candidate implementation update

The local 0.1.0-alpha.2 candidate now uses Relametric across source, examples and guides. Package names and ESM output have changed, old public API names have compatibility aliases, and Node 22.16+ is the common minimum. Migration and alpha notes are in [MIGRATION.md](MIGRATION.md) and [ALPHA_RELEASE.md](ALPHA_RELEASE.md). The repository/Pages addresses remain unchanged, packages remain private, and publication is still pending. The review and task list below describe the pre-implementation baseline.

## Current evidence

- GitHub metadata confirms `kevin-owens-product/5JS` is public. The source carries the MIT license with Kevin Owens as copyright holder: the project is already open source.
- Draft [PR #7](https://github.com/kevin-owens-product/5JS/pull/7) remains open and unmerged at `0f5c5838c11a090d4c15687098c61cff7d849b01`. It contains human onboarding, architecture/troubleshooting, ecosystem review, `AGENTS.md`, and `llms.txt`. These improvements are not yet on main.
- Both manifests retain `private: true`, version `0.1.0-alpha.1`, and the old names `fivejs` / `motif-connectors`. No npm publication workflow exists in the checked-out source; CI and manual Pages workflows do exist.
- Existing contribution, conduct, security, license/notices, API, compatibility and release guides provide a substantial foundation. Current CI results and live deployment were not rerun or revalidated in this review.
- The rendering package exports four visualization factories. The gallery's 50 recipes and its decision-workflow helpers are not 50 reusable public library APIs. The connector package documents 44 factories / 39 catalog entries and the site has 45 guides; those counts describe different things.

## Name screening

Exact web searches for Relametric and Relametrics found no matching project. GitHub repository searches returned zero matches for both. npm registry requests for `relametric`, `relametric-connectors`, `@relametric/core` and `@relametric/connectors` returned HTTP 404. Spaced-name searches did not establish a same-name visualization project. This is bounded discovery, not proof of uniqueness or registry acceptance. No domain ownership, npm scope ownership, or trademark clearance was established. Recheck before publication.

## Existing alternatives and positioning

See [the detailed ecosystem review](ECOSYSTEM_REVIEW.md) for the broader comparison. Primary sources revisited for this review:

| Alternative | Relevant overlap | Recommended positioning |
| --- | --- | --- |
| [Mosaic](https://github.com/uwdata/mosaic) | Database-backed linked views and coordinated selections, with DuckDB execution | Closest architectural comparison; investigate integration before building a competing query coordinator. |
| [Perspective](https://github.com/perspective-dev/perspective) | Interactive analytics, grids, charts and large/streaming datasets | Prefer it when configurable analytical tables and streaming computation are the main need. |
| [Evidence](https://github.com/evidence-dev/evidence) | SQL/Markdown business intelligence and interactive reports | Connectors plus business examples are already an established category. |
| [deck.gl](https://deck.gl/docs) | Composable GPU data layers, picking, highlighting and filtering | Strong rendering alternative; do not claim superior scale without measurements. |
| [Cylynx motif.gl](https://github.com/cylynx/motif.gl) | Graph exploration and investigation, imports and extensible widgets | Confirms the original Motif naming conflict and adjacent workflow overlap. |

Proposed positioning: **Relametric is an experimental TypeScript toolkit for exploring connected data and tracing visual findings back to records, evidence and decisions.** The distinction to demonstrate is the complete workflow, not animation or a claim to have invented linked visualization. No comparative performance or outcome benchmark was performed.

## Work before a Relametric public alpha

1. **Complete identity migration.** Change the authored site/guide content, README and agent docs, metadata, download names and examples together. Decide package identity before changing imports. Suggested unscoped layout: `relametric` and `relametric-connectors`, pending actual registry acceptance. Inventory `createFive` / `FiveLayer` and either retain documented compatibility aliases or explicitly document an alpha API rename. Keep historical release records intact. A GitHub repository rename is separate and requires updating Pages base paths and verifying links; GitHub source redirects do not prove Pages migration works.
2. **Deliver the public promise.** Clearly distinguish core factories, connectors and example-only decision helpers. Either expose and test a small reusable linked-selection/record/brief API, or describe those workflows as runnable application examples. A package rename alone does not make the entire homepage experience an installable library.
3. **Merge and publish documentation.** Finish PR #7 and reconcile it with the rebrand. Provide one tested first-render tutorial, one real-source adapter tutorial, one conversion/retention/product workflow, and canonical API/lifecycle/security references. Keep `AGENTS.md` and `llms.txt` consistent with real exports and install commands. Run fresh-context human/agent onboarding before claiming agent readiness.
4. **Validate the exact candidate.** Follow [RELEASING.md](RELEASING.md): clean install, types, unit tests, build, consumer declarations, packed-artifact installation, browser harness and demo build. Verify representative narrow-screen, keyboard/reduced-motion and export workflows. Review dependency notices and the source/package contents for unintended files. Align runtime policy: the current CI floor is Node 22.12 while connectors declare 22.16; deliberately test the documented minima.
5. **Publish a GitHub prerelease and Pages.** Use a version not already released, tag the tested commit, attach the validated source archive, and deploy the matching site. Verify hosted category/hash routes, standalone examples, connector guides, downloads and notices. Confirm repository reporting and branch-check settings rather than relying solely on documentation claims.
6. **Publish npm separately.** Complete connector repository/homepage/bugs metadata and ensure a clean-package build cannot distribute stale files. Establish the publishing owner, intentionally remove `private`, configure release permissions and provenance, and use an `alpha` dist-tag. Install the exact registry version in a clean consumer before advertising registry installation.

For npm trusted publishing, the [current official documentation](https://docs.npmjs.com/trusted-publishers/) requires npm 11.5.1+ and Node 22.14.0+. Use a compatible release runner (for example Node 24 with an explicitly verified npm version), exact repository/workflow trust configuration, and appropriate OIDC permissions. Registry-side configuration is required; a YAML file alone does not authorize publishing. Recheck these requirements at execution time.

## What can remain experimental

A clearly labeled alpha need not certify every cloud provider or complete a comparative user study. It must disclose those limits. Current protocol tests do not certify production provider accounts, managed OAuth, incremental sync, or enterprise tenant isolation. Keep server credentials and authorization under application control, and label synthetic records and modeled outcomes. Broader live-provider certification, device/accessibility testing and task-based comparisons are gates for stronger claims, not reasons to pretend the project cannot be open source yet.

---

# Motif open-source launch plan

Readiness review: 2026-10-25. The original audit below records the starting point. The user accepted the launch plan, and local alpha preparation has now been implemented. The source is now published at https://github.com/kevin-owens-product/5JS. npm publication remains a separate milestone.

## Implementation status

- Dedicated local Git repository initialized inside `fivejs/`, separate from the enclosing workspace.
- MIT license applied with Kevin Owens as copyright holder; third-party notices added for distributed code.
- Version aligned to `0.1.0-alpha.1`; npm remains private.
- Contributor, compatibility, release, security, and community documents added.
- Pinned CI and manual Pages workflows are active. Checks cover Node 22.12.0 and 24, with automated Chromium WebGL verification. See workflow history below for results on each source revision.
- `prepack` now builds the library. The actual tarball passed a fresh-source build and installation into a separate TypeScript consumer.
- The public build and source archive include licenses and documentation.
- GitHub owner confirmed as `kevin-owens-product`; existing empty `5JS` repository reused. Source pushed, metadata configured, private vulnerability reporting enabled, and Pages set to Actions deployment. The release gates below define the remaining steps for each publication.

Use [the release checklist](RELEASING.md) for execution and [the API reference](API.md) for the current public contract.

## Publication destinations

| Deliverable | Destination |
| --- | --- |
| Source and issues | [kevin-owens-product/5JS](https://github.com/kevin-owens-product/5JS) |
| Hosted playground | [GitHub Pages](https://kevin-owens-product.github.io/5JS/) |
| Example gallery | [50 recipes](https://kevin-owens-product.github.io/5JS/examples/) |
| Versioned alpha | [GitHub releases](https://github.com/kevin-owens-product/5JS/releases) |
| CI evidence | [Checks](https://github.com/kevin-owens-product/5JS/actions/workflows/ci.yml) |
| Deployment evidence | [Pages workflow](https://github.com/kevin-owens-product/5JS/actions/workflows/pages.yml) |

The workflow and release pages are the authoritative records for successful publication. A prepared link or local build is not deployment evidence.

## Release gates

1. Review only the dedicated project source, tests, docs, lockfile, license/notices, and selected documentation assets. Keep generated output, credentials, local environment files, and the enclosing workspace outside Git.
2. Require clean installation, type checks, CPU tests, library/demo builds, declaration consumer checks, fresh-source package installation, and WebGL browser checks. Check the exact release commit in GitHub Actions.
3. Deploy `demo-dist/` through the manual Pages workflow. Verify the actual repository subpath, category/hash links, standalone pages, source viewer, downloadable source ZIP, and license files.
4. Tag the tested commit with `v0.1.0-alpha.1`, create a GitHub prerelease, and attach the runnable source ZIP. Keep the tag and deployed source aligned.
5. Maintain required default-branch checks and use issues and pull requests for contributions. See [CONTRIBUTING.md](../CONTRIBUTING.md).

The current working tree has 50 examples across 11 categories, including 26 Business/Analytics recipes and 12 new Space, Biology, Climate, Energy, Cities, and Engineering scenes. These are illustrative models with documented assumptions, not validated domain simulators. The public API remains four visualization factories; recipe-specific geometry helpers are not new package exports.

## Later npm milestone

Keep `private: true` until the maintainer chooses a package identity and registry publication. Verify ownership and name acceptance; a missing registry entry is not a reservation. Then establish authenticated publication, choose an `alpha` dist-tag, configure trusted publishing and provenance where supported, and verify installation from the registry in a clean consumer. Recheck current npm requirements at that time.

## Documentation

- [README](../README.md): setup, library usage, and public links.
- [API reference](API.md): current types, defaults, ownership, and lifecycle.
- [Example guide](../examples/README.md): all recipes, interpretation, controls, and authoring.
- [Compatibility](COMPATIBILITY.md): measured validation and known boundaries.
- [Release guide](RELEASING.md): repeatable build, deployment, and publication procedure.
- [Changelog](../CHANGELOG.md): versioned contents and limitations.
- [Security](../SECURITY.md) and [Code of Conduct](../CODE_OF_CONDUCT.md): reporting routes and community expectations.
