# 5js open-source launch plan

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
| Example gallery | [44 recipes](https://kevin-owens-product.github.io/5JS/examples/) |
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

The expanded first alpha has 44 examples across 11 categories, including 20 Business/Analytics recipes and 12 new Space, Biology, Climate, Energy, Cities, and Engineering scenes. These are illustrative models with documented assumptions, not validated domain simulators. The public API remains four visualization factories; recipe-specific geometry helpers are not new package exports.

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
