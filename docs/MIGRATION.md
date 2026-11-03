# Migrating to Relametric

The 0.1.0-alpha.2 release renames 5js/Motif to Relametric. Both packages remain unpublished on npm. Install the built local package or validated tarball as described in the quickstart; do not assume `npm install relametric` resolves this project.

| Before | Now |
| --- | --- |
| `fivejs` | `relametric` |
| `motif-connectors` | `relametric-connectors` |
| `createFive` | `createRelametric` |
| `FiveApp`, `FiveOptions`, `FiveStats`, `FiveLayer` | `RelametricApp`, `RelametricOptions`, `RelametricStats`, `RelametricLayer` |
| `dist/fivejs.js` | `dist/relametric.js` |
| `demo/motif.ts` and `.css` | `demo/relametric.ts` and `.css` |
| `5js-examples.zip` | `relametric-examples.zip` |

The new package continues exporting `createFive` and the four `Five*` types as compatibility aliases. The old npm package name and direct internal file paths are not aliases. Update your dependency and import specifiers. Rendering settings, four layer factories, cleanup responsibilities and connector operations retain their behavior.

```ts
import { createRelametric, networkGraph } from 'relametric';
import type { RelametricLayer } from 'relametric';
```

The repository is now `kevin-owens-product/Relametric`, and Pages uses `https://kevin-owens-product.github.io/Relametric/`. Update bookmarks and git remotes. The local checkout folder may remain `fivejs`. Existing example IDs and category/hash links remain stable. Historical release and audit documents retain their original URLs and names.

The npm preparation candidate is `0.1.0-alpha.3`, distinct from the published GitHub alpha.2 tag. Both packages now have public alpha publishing configuration, but this does not mean they are already available in the registry. See [npm publication](NPM_PUBLISHING.md).

## What the alpha includes

The rendering library exports `particleField`, `networkGraph`, `terrain` and `hypercube` plus lifecycle/types. The separate connector package supplies typed source adapters and server operation support. The 50 recipes, record inspectors, linked-selection controllers and decision briefs are application examples in the source download, not additional public library exports. See [architecture](ARCHITECTURE.md) and [example adaptation](../examples/README.md).
