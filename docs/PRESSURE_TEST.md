# 5js pressure test — 2026-10-26

## Assessment and scope

The alpha's normal examples were working, but failure injection and boundary tests exposed defects in cleanup, input validation, calculations, navigation, and packaging. The fixes and regression tests are on `codex/pressure-test`; the existing `v0.1.0-alpha.1` release and deployed gallery have not been replaced.

The baseline was release commit `79666eab89dc4e7c3f18aa8443be75a08cc2ab0a`. Independent reviews covered the public lifecycle, numerical/layer implementation, business calculations, gallery interaction/accessibility, artifact boundaries, dependencies, and GitHub publication. Browser observations use the local Chromium-based in-app browser. CI uses Linux Chromium with SwiftShader. Local CPU observations below used Node 22.23.4 on macOS arm64.

## Confirmed defects and repairs

| Area | Reproduction and consequence | Repair and regression evidence |
| --- | --- | --- |
| Custom-layer lifecycle | Initial update throws after attaching a layer; one throwing disposer interrupts cleanup; reentrant disposal tears down resources twice. Gallery cleanup also stopped before releasing its renderer. | Roll back failed attachment/ownership; attempt all cleanup and aggregate errors; terminal disposal guard; stop an in-progress frame after disposal. Gallery always releases the renderer and can reopen another scene after a cleanup error. |
| Object ownership | Two different layer wrappers can share one Object3D and silently move it between apps. | Claim the object root as well as the wrapper, retain the attached root for cleanup, and reject aliases of owned/retired roots. |
| JavaScript input boundaries | Accessor-backed options/data can change between validation and use; sparse position tuples and malformed option objects are inconsistently accepted. | Snapshot supported own fields once before mutation/allocation. Reject malformed tuples and option containers; prove invalid multi-field changes leave previous state intact. |
| Numerical stability | Oversized deltas poison graph transforms or shader time; the data PRNG loses its intended 32-bit progression after millions of calls. | Reject overflowing state transitions, include derived shader arithmetic bounds, and wrap integer seed state on every step. Check five million matching PRNG draws and randomized rotation invariants. |
| Business calculations | With price 20, unit cost 19.8, and fixed cost 100, profit is zero at 500 units but break-even was reported as 501. Valid tiny-capacity/revenue inputs round denominators to zero. | Reconcile whole-unit boundaries against the same operating-profit model, normalize only machine roundoff, and reject zero/nonfinite derived denominators or results. Ordinary fractional thresholds still round upward. |
| Gallery routes | Switching categories retains the previous category URL; search is absent from copied links; an invalid hash can leave an unrelated scene open. | Round-trip category/query through the URL, restore filters during history navigation, and dismiss stale scenes for missing examples. |
| Phone controls | The 375px layout squeezes sliders into two narrow columns. | Use full-width controls on phones; verify the stage, data, and source remain usable without horizontal overflow. |
| Packed documentation | Twelve relative link occurrences reference files absent from the npm tarball. | Use repository URLs for omitted files and validate retained links/headings inside the actually installed package, including negative missing-target fixtures. |
| Source ZIP boundary | A harmless fixture demonstrates inclusion of hidden docs, nested dependencies, and an external symlink target. | Exclude hidden/generated/dependency and Git-ignored files, reject symlinks, validate containment, and require notices. Six regression cases also ensure rejection preserves an earlier archive. The published ZIP had no evidence of such an exposure. |

## Validation coverage

- All **166 CPU tests** and type checks pass locally, including 13 adversarial layer tests, calculation regressions, and a repeatable sweep of **459 combined min/middle/max states across all 20 Business/Analytics recipes**. The sweep checks finite geometry/data, complete tables, and presentation motion that leaves metrics unchanged.
- The original browser harness checks all four layers together, pause/speed, bloom, geometry replacement, PNG decoding, resizing, ownership, and disposal. The gallery rendering harness checks **44/44 recipes**, including control boundaries and cleanup.
- Added browser harnesses pass **14 lifecycle-failure checks, 11 gallery checks, and 10 render-pressure checks** locally. They test failing/reentrant custom code; category/search/history; 20 viewer reopen cycles; 375px layout; reduced motion; unavailable WebGL; custom cleanup errors; maximum-size rendering; 20 GPU resource churn cycles; and explicit context loss/restoration.
- Context recovery is checked using `WEBGL_lose_context` when available. Existing layers and post-processing must render afterward, the paused image must match within a small pixel tolerance, and geometry/texture counters must return to baseline. Unsupported recovery is reported explicitly rather than counted as passed.
- Fresh-source packaging installs and tests the actual tarball in a separate TypeScript consumer. Source archive tests and packaged link checks run through `npm run test:package`.
- The public release tag, uploaded source ZIP checksum, successful release CI, and Pages deployment all refer to the same original release revision. npm remains deliberately unpublished.

## Bounded load observations

These are measurements of one local run, not performance commitments. Typed-array totals exclude JavaScript objects, driver memory, post-processing targets, and other GPU allocations.

| Workload | CPU construction | Attached typed-array bytes |
| --- | ---: | ---: |
| 250,000 particles | 11.35 ms | 7,000,000 |
| 10,000 graph nodes + 100,000 edges | 76.43 ms | 5,840,000 approximately |
| Terrain at 512 subdivisions | 48.29 ms | 14,710,000 approximately |

Real WebGL checks separately render 250,000 particles and the 512-subdivision terrain at 320×240, verify visible PNG pixels and submitted primitive counts, and release each layer before the next workload. Twenty four-layer rebuild/clear cycles return geometry/texture counts to the warmed baseline. These probes establish bounded allocation and recovery behavior in that environment; they do not measure interaction at production screen sizes.

## Security and compatibility limits

The public npm advisory audit reported zero vulnerabilities on the review date. The bounded published-archive scan found no common private-key/provider-token patterns, traversal entries, symlinks, or embedded dependencies. Neither check is a security certification.

PR CI uses read-only permissions and pinned actions; the manual Pages workflow grants deployment permissions only after verification. Both Node checks are required on main for non-admins. Secret scanning and push protection are enabled. Automatic Dependabot security updates are currently disabled, so dependency updates remain a maintainer task.

Safari, Firefox, Windows, actual mobile hardware, long-duration heap profiling, and broad GPU/driver coverage remain unverified. A 375px iframe is a layout test, not a mobile-device benchmark. The domain examples remain synthetic/idealized visual models, not validated scientific or medical simulators.

## Reproduce

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:types
npm run test:package
npm run build:demo
npx --no-install playwright install chromium
npm run test:browser
```

The browser runner starts its own server and saves results, console diagnostics, and screenshots to `artifacts/browser-checks/`. For interactive inspection, start `npm run dev` and open the harnesses listed in [Compatibility and validation](COMPATIBILITY.md#validation). See the pull request checks for results on the final branch revision; local evidence alone does not establish CI success.
