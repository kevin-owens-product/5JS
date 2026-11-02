# Human and agent documentation audit

Review date: 2026-10-26. Baseline: deployed `fd4f87860f76229b34b6fced77a57fa719e36658`. Research and first-party references are in [the ecosystem review](ECOSYSTEM_REVIEW.md).

## Assessment

The baseline has substantial reference material: API defaults and lifecycle, source adaptation, connector scope, per-source samples, compatibility, contribution/security guidance and release checks. The weakness is navigation and consistency, especially for a new contributor or an agent distinguishing public APIs from demo code. It is appropriate for a developer preview, not yet a claim of production or agent certification.

| Area | Baseline evidence / gap | Action in this pass |
| --- | --- | --- |
| First successful use | Setup exists, but the long README mixes feature history, APIs and demo internals | Add a task map, focused quickstart and expected results |
| Architecture | Boundaries scattered through README and example/connector guides | Add a source map and explicit rendering/data/application flow |
| API reference | Exact settings, ownership, cleanup and exported types documented | Retain as canonical; link it from both human and agent entry points |
| Connector documentation | 45 prerendered guides, typed samples and protocol-test limitations | Retain; clarify live guides versus local demo URLs |
| Agent contribution context | No root `AGENTS.md` or `llms.txt` | Add concise repository instructions and a plain-text discovery index |
| Troubleshooting | Failure advice spread across setup and compatibility | Add symptom → check → action table |
| Drift | Contribution guide said 32 examples; compatibility said 44; launch plan used old current counts | Correct current counts; preserve explicitly historical changelog entries |
| Competitive positioning | No comparison or concrete naming-conflict record | Add dated, source-linked review and accurate naming caveat |
| Distribution | Existing package tests check packed links; source archive has explicit inclusion rules | Include the new root agent files in source delivery; prepare `llms.txt` for the static site |

The new documents are source changes. They become public on GitHub after merge and on Pages after a successful deployment; the existence of a local file is not publication evidence.

## Remaining work, in priority order

1. **Identity decision:** resolve the related Cylynx Motif naming overlap before a package release or wider announcement.
2. **Independent onboarding:** ask unfamiliar developers to run a scene, adapt one source and add a recipe without maintainer intervention. Record failures rather than assuming documentation suffices.
3. **Agent evaluation:** run the tasks below in fresh contexts against a pinned commit. Record model/tool versions, completion, diffs and checks. No agent benchmark was run as part of this desk review.
4. **Release-versioned documentation:** once a package release exists, preserve references for each supported version and add real migration notes when contracts change. Do not invent a migration guide before there is a migration.
5. **Framework integration recipes:** add tested React/SSR mounting examples if demand warrants them; today's API has framework-independent lifecycle guidance.
6. **Live-provider and accessibility evidence:** publish a certification matrix from actual environments and perform keyboard/screen-reader/device review. Existing tests are narrower than those claims.
7. **Documentation drift automation:** extend current packaged-link and typed connector-sample checks to all prose, counts and tutorials. Avoid fragile tests of arbitrary wording.

## Suggested agent acceptance tasks

| Task | Evidence required to pass | Common failure to catch |
| --- | --- | --- |
| Add a minimal scene to an existing app | Correct local import/install, mounted sized container, disposal on unmount | Invented `motif` exports or npm availability |
| Add a recipe with one control | Catalog registration, consistent metrics/geometry, pause/disposal checks | Example helper incorrectly exported as public API |
| Adapt a registered read operation | Server-owned credentials/tenant scope, validated parameters, precision/completeness handling | Browser SQL/token exposure or partial totals treated as complete |
| Update a connector guide | Authored content change, regenerated page, typed sample validation | Editing generated HTML only |
| Explain a conversion scenario | Source IDs, denominator, assumption and uncertainty preserved in brief | Modeled extra completions described as observed impact |

Use synthetic data and compare the resulting changes to these criteria. Human review should check behavior and correctness, not just whether the assistant reports success. Record task failures and revise the docs before claiming that the project is agent-ready.

## Validation of this documentation pass

- The quickstart TypeScript sample compiled against the built public library declarations.
- A local link/anchor check resolved 65 relative links across the root entry points and docs.
- The static-site build passed its 46-page connector route/asset verification; its `llms.txt` matched the authored index.
- The source ZIP included the new guides and root agent files; archive regressions passed, including an extracted-project case for agent entry points.
- Fresh-source package checks passed for the rendering and connector packages, including isolated consumer types and runtime exports. The navigation page is named `INDEX.md` to avoid npm automatically including a nested README whose linked guides are outside the small library tarball.

These are local build/documentation checks. They do not establish live-provider compatibility, independent onboarding success or agent task success. No renderer or runtime API was changed by this pass.
