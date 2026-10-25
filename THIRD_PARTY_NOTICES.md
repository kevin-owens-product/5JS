# Third-party notices

5js is built on Three.js. This file accompanies the project license; it does not replace the licenses supplied with independently installed dependencies.

## Three.js r180 (`three@0.180.0`)

Project: https://threejs.org/

Source: https://github.com/mrdoob/three.js

The playground and example gallery bundle Three.js and its OrbitControls, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, and supporting shader/pass modules. The library build leaves `three` and `three/*` external, with Three.js installed as a peer dependency.

The following notice is reproduced from the installed Three.js package's `LICENSE`:

```text
The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Three.js TypeScript definitions (`@types/three@0.180.0`)

Source: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/three

The public declarations refer to Three.js types. The definitions and their transitive dependencies are installed as separate npm packages, with their own license files; they are not bundled into the demo's JavaScript. The installed `@types/three` license reads:

```text
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE
```

## Vite runtime helper (`vite@7.3.7`)

Source: https://github.com/vitejs/vite

The static build includes Vite's generated module-preload helper. The following Vite core notice is reproduced from the installed package's `LICENSE.md`; build-tool dependencies that are not emitted into the site remain separately installed development tools.

```text
MIT License

Copyright (c) 2019-present, VoidZero Inc. and Vite contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fonts and development tools

The playground's stylesheet optionally requests DM Sans and IBM Plex Mono from Google Fonts. Font files are served by Google and are not vendored into this repository, npm artifact, source ZIP, or static build. System font fallbacks remain available when those requests fail. The example gallery uses system fonts.

Development and test dependencies are listed in `package-lock.json` and retain their own license files in installed packages. They are not included as vendored `node_modules` in the source ZIP or npm artifact. Reassess these notices when adding bundled dependencies or local third-party assets.

## Distribution

`scripts/prepare-public.mjs` copies the root `LICENSE` and this file to `public/LICENSE` and `public/THIRD_PARTY_NOTICES.md`. Vite copies those files into `demo-dist/`, placing the notices beside the hosted playground. The source ZIP includes the root files, and the npm package includes them through its explicit file list.
