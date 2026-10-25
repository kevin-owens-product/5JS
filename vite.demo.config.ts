import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { outDir: 'demo-dist', emptyOutDir: true, rollupOptions: { input: ['index.html', 'examples/index.html', 'examples/run.html'] } }, preview: { port: 5185 } });
