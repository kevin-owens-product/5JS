import { defineConfig } from 'vite';
import { guides } from './connectors/content/index.js';

export default defineConfig({
  base: './',
  build: {
    outDir: 'demo-dist', emptyOutDir: true,
    rollupOptions: {
      input: ['index.html', 'demo/playground.html', 'examples/index.html', 'examples/run.html',
        'connectors/index.html', ...guides.map(guide => `connectors/${guide.slug}/index.html`)],
    },
  },
  preview: { port: 5185 },
});
