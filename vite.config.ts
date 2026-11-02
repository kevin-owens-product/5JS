import { defineConfig } from 'vite';
export default defineConfig(({ command }) => ({
  publicDir: command === 'build' ? false : 'public',
  server: { port: 5185 },
  build: { lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'relametric' }, rollupOptions: { external: (id) => id === 'three' || id.startsWith('three/') } }
}));
