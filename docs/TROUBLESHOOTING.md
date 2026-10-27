# Troubleshooting

| Symptom | Check | Next step |
| --- | --- | --- |
| `npm ci` rejects the runtime | `node --version`; root and connector package engines | Use Node 22.16+ for all demos. Keep the committed lockfile; do not delete it to hide an error. |
| Local URL does not load | Vite's printed address and terminal errors | Use its actual port; 5185 is the default, not a guarantee. |
| Missing connector HTML | Was the generator run? | Use `npm run dev` or `npm run prepare:connectors`; edit `connectors/content/`, not generated HTML. |
| Blank or zero-size canvas | Container size, mount timing, WebGL2 and browser console | Give the mounted container an explicit height. Check [requirements](COMPATIBILITY.md#runtime-and-package-requirements). |
| Scene appears frozen | Reduced-motion preference, pause and playback speed | Reduced motion starts paused. Use playback controls if desired; do not override the user's preference globally. |
| Layers disappear after removal | Ownership/lifecycle | `remove()` disposes the layer. Construct a replacement. |
| Import or declaration resolution fails | Build output and import spelling | Run `npm run build` before installing the rendering package by path. Use `fivejs`, not an assumed `motif` registry package. |
| Server connector used in browser | Entry point and bundler imports | Keep `motif-connectors/server` in server code. Use registered application operations in the browser. |
| Connector demo fails on SQLite | Node version | Use Node 22.16+ and `npm run demo:connectors`. |
| Unexpected totals | Grain, joins, filters, `hasMore`, `truncated` | Inspect the exact data pages; finish supported pagination or narrow the query. Do not label partial totals complete. |
| Lost precision | Source driver and value mapping | Preserve decimal/large-integer strings. Normalization cannot recover already-rounded input. |
| Clipboard copy fails | Browser clipboard permission | Select and copy the visible sample manually, or use its download control. |
| Static site has broken assets | Build output and hosting base | Deploy `demo-dist/`, check the configured base in `vite.demo.config.ts`, and verify direct routes under the repository subpath. |
| Browser test cannot find Chromium | Installed Playwright runtime | Run `npx --no-install playwright install chromium`; Linux CI uses `--with-deps`. |
| ZIP/site build cannot find Python | `python3 --version` | Install Python 3, then rerun the build. |

If a problem remains, report the commit, Node/browser/OS versions, recipe or connector, minimal synthetic reproduction, expected/actual behavior and relevant error. Never include tokens or customer records in an issue. Use [private reporting](../SECURITY.md) for vulnerabilities. See [validation](COMPATIBILITY.md#validation) for diagnostic harnesses and [contributing](../CONTRIBUTING.md) for change verification.
