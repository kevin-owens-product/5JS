# Publishing the npm alpha

The next candidate is `0.1.0-alpha.3`: `relametric` and `relametric-connectors`. Their manifests permit public publication and default to the `alpha` dist-tag. They are not yet published. The GitHub alpha.2 release stays unchanged.

## Current readiness

On 2026-11-03, both public registry lookups returned E404 and `npm whoami` reported no authenticated account on the preparation machine. E404 is not a name reservation or a guarantee that npm will accept the name. An npm maintainer must authenticate and establish ownership at first publication. Do not put a token or one-time code in repository files or chat.

The repository is `kevin-owens-product/Relametric`; Pages is now <https://kevin-owens-product.github.io/Relametric/>. Old release records preserve their original addresses. Updating the git remote does not rename your local folder.

## Validate and pack

Merge the preparation PR and use a clean checkout of its tested main revision. Require the normal CI checks before tagging. Use Node 22.16+ locally, Python 3, and installed Chromium; the publishing workflow uses Node 24 and verifies npm 11.5.1+.

```sh
npm ci
node scripts/verify-npm-release.mjs
npm run typecheck
npm test
npm run build
npm run test:types
npm run test:package
npm run test:browser
npm run build:demo
mkdir -p artifacts/npm
npm pack --pack-destination artifacts/npm
npm pack ./packages/connectors --pack-destination artifacts/npm
npm publish artifacts/npm/relametric-0.1.0-alpha.3.tgz --dry-run --tag alpha --access public
npm publish artifacts/npm/relametric-connectors-0.1.0-alpha.3.tgz --dry-run --tag alpha --access public
```

Package consumer checks install freshly packed artifacts into isolated projects and verify imports, declarations, documentation and runtime contracts. The connector prepack hook now builds its output too. The workflow retains both tarballs and SHA256SUMS. A dry run does not test ownership or registry authorization.

## First publication: authenticated maintainer

Run `npm login` and `npm whoami` in your terminal; verify the intended npm account. Complete npm's required account and two-factor authentication setup. From the tested revision, create and push the new annotated `v0.1.0-alpha.3` tag; never move alpha.2. Publish the exact validated tarballs, handling any npm authentication prompt locally:

```sh
npm publish artifacts/npm/relametric-0.1.0-alpha.3.tgz --tag alpha --access public --registry https://registry.npmjs.org
npm publish artifacts/npm/relametric-connectors-0.1.0-alpha.3.tgz --tag alpha --access public --registry https://registry.npmjs.org
```

These are publication commands, not preparation commands. Local publication does not claim CI provenance. Configure trusted publishing after the packages exist. See npm's [public-package instructions](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/) and [trusted publishers](https://docs.npmjs.com/trusted-publishers/).

## Subsequent releases: GitHub trusted publishing

For each package, configure its npm Trusted Publisher with:

| Setting | Value |
| --- | --- |
| GitHub owner | `kevin-owens-product` |
| Repository | `Relametric` |
| Workflow filename | `npm-publish.yml` |
| Environment | `npm` |
| Allowed action | `npm publish` |

The workflow uses GitHub-hosted runners and OIDC; it contains no npm token. Configuring this file alone does not establish npm-side trust. Match the case and environment exactly. Configure any desired reviewers for the GitHub `npm` environment before use.

In Actions, run **Prepare or publish npm alpha** with `publish=false` first. For an actual release, select the matching version tag and set `publish=true`. The guard checks both manifests, lockfile, alpha version, repository identity, matching tag, and that the revision belongs to main. It then runs the validation suite, packs, dry-runs, uploads artifacts, and publishes with provenance. No push or GitHub release automatically publishes npm packages.

Publication of two packages is not atomic. If one succeeds and the other fails, check both registry versions first. Never republish or change the successful version. Fix authentication if needed and publish only the missing, identical validated tarball; source changes require a new version. Do not blindly rerun both publish commands.

## Verify and announce

Check both exact versions and dist-tags with `npm view`, then install both registry packages and `three@0.180.0` in a fresh consumer. Repeat the declaration/import checks and a browser scene smoke check. Confirm provenance on npm for CI-published versions and verify the alpha tag has not changed `latest`.

Only after registry verification should the quickstart switch to registry install commands. Publish GitHub release notes for the new tag, attach matching artifacts/checksums, update the changelog, and deploy Pages through its workflow. Record exact registry URLs, commit, checks and remaining provider-certification limits. See [the release checklist](RELEASING.md).
