# Getting started

## Run the complete project

Use Node.js **22.16+** for all demos, npm, and Python 3 for static-site/source-archive builds. The rendering library and website alone support Node.js 22.12+. A browser with WebGL2 is required for scenes. No API keys are needed for the supplied fictional datasets.

```sh
git clone https://github.com/kevin-owens-product/5JS.git
cd 5JS
npm ci
npm run dev
```

Open the address printed by Vite (normally `http://127.0.0.1:5185/`). You should see the Motif homepage. Vite may choose another port if that port is occupied.

1. Open **Explore the decision lab**. Choose conversion, retention, or product decisions.
2. Select evidence, inspect the linked source records, and compare an explicit scenario assumption.
3. Export an investigation brief. It should retain the selected scope, evidence, owner, measure, and guardrail. It is a local file, not a task sent to another system.
4. Open `/examples/` to explore the 50 recipes, or `/connectors/` for source-specific code.

The homepage uses 540 fictional records. A displayed recovery opportunity is a modeled scenario, not measured revenue improvement. The earlier connected recipes use a separate 99-record fixture.

## Use the rendering library in your app

Neither `fivejs` nor `motif-connectors` has been published by this project to npm. Build the checkout, then install it by local path:

```sh
# In the cloned repository:
npm run build

# In your existing application (replace the absolute path):
npm install /absolute/path/to/5JS three@0.180.0
```

Create a container in your application's HTML:

```html
<div id="visualization" style="width: 100%; height: 480px"></div>
```

Run this TypeScript after that element mounts, using your application's bundler:

```ts
import { createFive, networkGraph } from 'fivejs';

const container = document.querySelector<HTMLElement>('#visualization');
if (!container) throw new Error('Missing visualization container');
const app = createFive({ container, autoRotate: false, bloom: 0 });
app.add(networkGraph({
  data: {
    nodes: [
      { id: 'account', position: [-2, 0, 0] },
      { id: 'checkout', position: [2, 0, 0] },
    ],
    edges: [{ source: 'account', target: 'checkout', weight: 1 }],
  },
}));

// Call during component unmount or when replacing this scene.
export function cleanup() { app.dispose(); }
```

Expected result: two linked nodes. This is a rendering example; the graph does not automatically fetch records, add a tooltip, or produce a decision brief. Those behaviors live in the example application. See [the API](API.md) for options and [architecture](ARCHITECTURE.md) for the integration boundaries.

## Run a connector without a cloud account

From the repository root, in a separate terminal:

```sh
npm run demo:connectors
```

Open `http://127.0.0.1:5190`. The server reads local SQLite and JSON fixtures through registered operations. Its demo authorization is not production authentication. For your application, build with `npm run build:connectors`, install the local `packages/connectors` directory, and follow [the connector reference](../packages/connectors/README.md).

## Build a static site

```sh
npm run build:demo
npm run preview
```

Open the preview URL printed by Vite. `demo-dist/` contains the website; `dist/` contains the rendering library only. GitHub Pages hosts static files, so live database access requires your separately deployed, authorized server. Use [troubleshooting](TROUBLESHOOTING.md) if setup fails.
