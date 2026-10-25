# 5js open-source launch plan

Readiness review: 2026-10-25. The original audit below records the starting point. The user accepted the launch plan, and local alpha preparation has now been implemented. No GitHub repository or npm release has been created yet.

## Implementation status

- Dedicated local Git repository initialized inside `fivejs/`, separate from the enclosing workspace.
- MIT license applied with Kevin Owens as copyright holder; third-party notices added for distributed code.
- Version aligned to `0.1.0-alpha.1`; npm remains private.
- Contributor, compatibility, release, security, and community documents added.
- Pinned CI workflow and manual Pages deployment workflow authored. Their first hosted runs are still pending.
- `prepack` now builds the library. The actual tarball passed a fresh-source build and installation into a separate TypeScript consumer.
- The public build and source archive include licenses and documentation.
- GitHub owner selection is pending between the two signed-in accounts. Repository metadata, first push, private vulnerability reporting setup, Pages activation, and release publication depend on that choice.

Use [the release checklist](RELEASING.md) for execution and [the API reference](API.md) for the current public contract.

## Original audit and launch sequence

## Recommended first release

Launch a public GitHub alpha with a hosted playground, all 32 examples, documented APIs, and a downloadable source archive. Follow with an npm alpha once the package name and clean-install behavior are confirmed. Keep the product description precise: 5js composes Three.js scenes and currently exports four visualization factories; the business recipes use additional example-only helpers.

Recommended defaults to decide before launch:

| Decision | Proposal | Still needed |
| --- | --- | --- |
| GitHub home | A dedicated `5js` repository | Personal account or organization, and exact repository name |
| License | MIT, for permissive reuse | Maintainer's choice and copyright holder name |
| Initial release | `v0.1.0-alpha.1` | Confirm prerelease naming; current manifest is `0.1.0` |
| npm identity | `fivejs`, or an owned scope such as `@your-scope/fivejs` | Package ownership and registry acceptance |
| Support | GitHub issues for bugs; a private vulnerability reporting channel | Maintainer/contact and supported versions |

On the review date, read-only queries to the public npm registry returned `E404` for both `fivejs` and `5js`. This does not reserve either name or establish naming rights. Recheck at release time.

## Readiness at the original audit

| Area | Evidence | Work remaining |
| --- | --- | --- |
| Library | Four factories, ESM output, TypeScript declarations, Three.js externalized | Verify the packed artifact from a fresh source checkout |
| Examples | 32 recipes, including ten Business and ten Analytics, with source views and downloads | Publish the gallery at a stable URL |
| Verification | Latest implementation validation: 100 CPU tests, type consumer check, library/demo builds; all 32 scenes browser-checked | Run these in CI and automate the existing WebGL harnesses |
| Git repository | `fivejs/` is untracked inside the broader workspace's Git repository; no remote configured | Export only this project into its own repository root |
| Licensing | No project `LICENSE`; installed Three.js carries an MIT license | Choose project license, add copyright and dependency notices |
| npm | `private: true`; export map and built declarations exist | Metadata, fresh build on packing, release workflow |
| Documentation | README, example guide, and initial API reference | Contributor guide, compatibility/performance guide, changelog and support policy |
| Automation | No `.github/workflows` | Checks, Pages deployment, and later npm publication |

`private: true` is an npm publication guard. It does not prevent a public GitHub repository or an open-source license.

## 1. Establish the project boundary

Create a clean repository containing this project's source, examples, tests, docs, lockfile, configuration, and approved screenshots. Do not publish the enclosing workspace or its unrelated projects. Keep `node_modules`, local build outputs, generated ZIP/tarballs, and machine-specific files out of Git. Review the exact staged files and initial diff before the first push.

Use a dedicated repository root rather than adding a remote to the enclosing workspace. Then create the initial commit and public GitHub repository under the chosen owner. GitHub documents both Git and GitHub CLI import paths in [Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).

Acceptance: a fresh clone contains only 5js and can run using the documented prerequisites.

## 2. Apply the license and preserve attribution

Add a root `LICENSE` after choosing the license and copyright holder. MIT is a reasonable default for broad reuse; it allows commercial use and modification while requiring preservation of its copyright and license notice. See the [MIT license description](https://choosealicense.com/licenses/mit/). Set the matching SPDX identifier in `package.json`.

Inventory dependencies and assets, and preserve the notices needed for their distribution. In particular, the demo bundles Three.js even though the library build leaves it external. Include third-party notices with the hosted build and downloadable distributions. Document any copied assets and fonts. Keep synthetic example data labeled as such.

Public visibility alone does not grant the reuse rights of an open-source license. See [GitHub's licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

Acceptance: repository, source ZIP, npm artifact, and bundled demo carry the applicable licenses/notices.

## 3. Make installation reproducible

Fill in `repository`, `homepage`, `bugs`, `license`, and the supported Node `engines` range. Retain the current ESM export/type paths and Three.js peer dependency unless consumer testing exposes a reason to change them. The current documented build requirement is Node 22.12+; Python 3 is required to regenerate the example ZIP.

Add a `prepack` build step or equivalent release gate. Today, `npm pack` can use an old local `dist/`, while a clean checkout does not contain that ignored folder. The release must build it deliberately. Keep `private: true` until npm publication is intended.

The npm `files` list currently includes only `dist` and `README.md`. Decide whether to include reference docs in the tarball or link to versioned GitHub documentation; verify the README links work from npm as well as the repository. The runnable example ZIP is a separate, larger source distribution.

From a fresh checkout, run:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:types
npm run build:demo
npm pack --dry-run
```

Then create an actual tarball, install it with the supported Three.js version in a separate consumer project, and verify imports, declarations, rendering, and disposal. A dry-run file listing alone does not prove consumer installation works. Do not claim direct Git URL installation unless it has also been tested; the current README documents building before local-folder installation.

Acceptance: no pre-existing `dist/` or local dependency cache is required for a successful build and consumer install.

## 4. Complete the documentation set

| Document | Purpose | Status |
| --- | --- | --- |
| [README](../README.md) | Value proposition, screenshot, prerequisites, quick start, links, honest limitations | Exists; add public URLs and installation instructions after release |
| [API reference](API.md) | Options/defaults, methods, ownership, update semantics, custom layers | Initial reference added during this review |
| [Example guide](../examples/README.md) | All recipes, exact data encodings, authoring and export behavior | Exists |
| `CONTRIBUTING.md` | Setup, validation, adding an example, PR expectations | To add |
| `docs/COMPATIBILITY.md` | Browser/WebGL2 and Three.js support, framework cleanup, performance guidance | To add; record measured support rather than assumed coverage |
| `CHANGELOG.md` | First alpha contents and later breaking changes | To add |
| `SECURITY.md` | Supported versions and a working private reporting route | To add when reporting channel is configured |
| `CODE_OF_CONDUCT.md` | Community expectations and enforcement contact | Choose with the maintainer |

Keep Markdown in the repository for the first alpha; a documentation website can follow. Distinguish public library APIs from `examples/shared/chart.ts`, which is an internal recipe utility. Include source-backed examples for mounting, composition, parameter changes, teardown, custom Three.js objects, and synthetic analytics assumptions. Link released docs to the corresponding version.

The archive packager now includes `docs/` and supported root community/license files when present. Any future static documentation assets must also be added to its explicit allowlist.

Acceptance: someone unfamiliar with the project can install/build it, render a scene, adapt a recipe, and clean up its resources using only these docs.

## 5. Add GitHub checks and community entry points

Create a CI workflow for pushes and pull requests that performs clean installation, type checks, tests, library build, declaration consumer check, demo build, and package inspection. Use a declared supported Node version and install Python for the ZIP step. Automate `tests/browser.html` and `tests/examples-browser.html` on a runner with WebGL2, collecting failures and screenshots; until then, state that this portion remains a manual release check.

Add bug-report and feature-request templates and a short PR template. Configure required passing checks on the default branch, a dependency-update policy, repository description/topics, and the gallery homepage. Pin workflow actions to reviewed versions or commit SHAs when implementing the workflows.

Acceptance: a clean GitHub runner passes, and the documented contribution path works.

## 6. Publish the playground and examples

Use GitHub Pages with a build workflow. Build with `npm run build:demo` and deploy **`demo-dist/`**, not the library-only `dist/`. Enable the GitHub Actions source in the repository's Pages settings. Vite's [static deployment guide](https://vite.dev/guide/static-deploy) describes this flow and repository subpath handling.

The current demo config uses relative base URLs (`base: './'`) and relative gallery links. Test the actual repository-prefixed URL before changing that configuration. Verify the playground, `/examples/`, standalone example URLs, direct hash links, source viewer, ZIP download, and assets all work under the deployed subpath. Confirm appropriate third-party notices are included in the deployed output.

Acceptance: a visitor can open all 32 examples without running a development server, including by following a shared standalone link.

## 7. Tag the alpha, then publish npm if desired

Align the chosen version across `package.json`, lockfile, UI version text, changelog, tag, and release notes. Re-run validation from the release commit. Create a GitHub prerelease with installation instructions, known limitations, gallery/docs links, and the source archive. This is a complete open-source GitHub launch even if npm publication follows later.

For npm, confirm the package name/owner, remove the private guard deliberately, and use an alpha dist-tag rather than making the experimental version the default stable install. Establish the initial package using the account's supported authenticated publication flow, then configure [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for the exact GitHub repository and workflow. Trusted publishing uses OIDC; current requirements include npm 11.5.1+ and Node 22.14+. GitHub-hosted publication of a public package from a public repository can generate provenance automatically. Recheck requirements when configuring the workflow.

Acceptance: the GitHub tag, deployed demo, release archive, and optional npm version identify the same tested source revision. A fresh external consumer can follow the published instructions successfully.

## Launch completion checklist

- [ ] Repository owner/name, license/copyright holder, and alpha version decided.
- [ ] Dedicated repository created from the reviewed project files.
- [ ] Project license and distribution notices present.
- [ ] Docs and contributor/reporting paths complete.
- [ ] Clean CI and consumer installation pass.
- [ ] Gallery deployed and checked at its real URL.
- [ ] Versioned GitHub prerelease and source archive published.
- [ ] Optional npm alpha published and verified independently.
