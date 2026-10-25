# Releasing 5js

The first milestone is a public GitHub alpha with a hosted example gallery and downloadable source. npm publication is a separate maintainer decision. Keep `private: true` until that decision is made. This checklist does not itself publish anything.

## Prepare a release candidate

Choose the version and record the intended changes in [CHANGELOG.md](../CHANGELOG.md). For the first alpha, the planned version is `0.1.0-alpha.1`. Keep the manifest, lockfile, UI version text, changelog, tag, and release notes consistent. Do not reuse an existing release tag for a different commit.

Work from a clean checkout of the dedicated 5js repository. Review the files that will be public: source, tests, docs, configuration, lockfile, license/notices, and selected documentation assets. Do not include enclosing workspace files, dependencies, local environment files, or generated build directories in the source commit.

Before publishing, confirm:

- The repository owner/name, project license, and copyright holder are correct.
- Project and applicable dependency notices are present in each distribution.
- Installation and documentation links refer to the intended version and destination.
- Vulnerability and community reporting routes work as described.
- There are no uncommitted changes needed by the release.

## Validate from clean source

Use the declared Node version and Python 3, then run:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:types
npm run test:package
npm run test:browser
npm run build:demo
```

Install the browser runtime using the instructions in [Compatibility and validation](COMPATIBILITY.md#validation) before the browser check. Confirm the GitHub checks pass for the exact release commit. A local run does not substitute for a clean CI run.

Inspect the actual tarball produced by `npm pack`, even when the current milestone only publishes GitHub source. Verify its code, declarations, metadata, license/notices, and documentation links. The package consumer check should install that artifact rather than importing the working tree. Confirm the source ZIP includes the docs and licenses and can be unpacked, installed with `npm ci`, and run independently.

Manually inspect representative scenes and any examples changed since the previous release. Check control extremes, pause, narrow framing, source viewing, data/PNG downloads, and standalone links. Record the environment and remaining limitations rather than broadening compatibility claims without evidence.

## Deploy the gallery

The production site is built with `npm run build:demo`. Deploy **`demo-dist/`**, not the library-only `dist/`, through the repository's Pages workflow. Keep the deployed revision associated with the release commit.

Verify the actual hosted URL, including its repository subpath:

- Playground and gallery load with their assets.
- Category filters and direct example hash links work.
- Standalone `examples/run.html?example=…` links work when opened directly.
- Source inspection and the source ZIP download work.
- License and third-party notices are included in the deployed output.

Do not mark the gallery as published until the workflow succeeds and the public URL has been checked. A queued deployment is not a successful deployment.

## Publish a GitHub prerelease

1. Create an annotated version tag, such as `v0.1.0-alpha.1`, pointing to the tested commit.
2. Push the tag and create a GitHub release marked **prerelease**. Verify the selected tag points to that same commit.
3. Write release notes from the relevant changelog entry. Include installation/build instructions, gallery and versioned documentation links, known limitations, and the validation performed.
4. Attach the generated `5js-examples.zip` source project. If distributing a package tarball too, attach the exact validated tarball and explain that registry installation is not yet available.
5. Download the published attachment and verify that it corresponds to the local validated artifact. Check the release links from a fresh browser session.

After publication, change the corresponding changelog heading from Unreleased to the actual version/date in a subsequent development commit, or make that edit before tagging when the release date is already settled. Keep a new Unreleased section for subsequent work. Do not rewrite the tagged commit to change the release record.

## Optional npm alpha

Do this only when maintainers choose to publish to npm. Confirm the package name and owning account or organization, complete repository/license/support metadata, and validate the current registry authentication requirements. Remove the private guard deliberately and commit that change before building the npm release candidate. If this differs from an already published GitHub tag, use a new release version and tag for the changed source.

Use an alpha distribution tag for the experimental release so it does not become the default stable installation. Configure trusted publication for the exact GitHub repository and release workflow when the package/account setup supports it. Keep release credentials out of source and logs. A workflow file alone does not establish the registry-side trust configuration.

After publication, install the exact released version and supported Three.js version into a fresh consumer project. Verify imports, declarations, rendering, and disposal, then update installation instructions to use that published version. Record the public package URL and ensure the package, GitHub tag, gallery, and source archive identify the intended tested revision.

## If a release check fails

Stop that release and fix the candidate before publishing. Preserve failure evidence and distinguish a code failure from unavailable infrastructure. If an already published release needs a correction, publish a new version and describe the issue; do not silently replace a versioned artifact or move its tag.
