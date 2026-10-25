import { createFive } from '../../src/index.js';
import type { FiveApp, FiveLayer } from '../../src/index.js';
import type { ExampleDefinition, ExampleInstance } from '../types.js';

export interface MountedExample extends ExampleInstance { layers: FiveLayer<object>[] }

/** Keep preview rendering, viewer and browser checks on the same setup path. */
export function mountExample(example: ExampleDefinition, app: FiveApp, preview = false): MountedExample {
  const layers: FiveLayer<object>[] = [];
  const context = new Proxy(app, {
    get(target, key) {
      if (key === 'add') return <P extends object>(layer: FiveLayer<P>) => { layers.push(layer); return target.add(layer); };
      return Reflect.get(target, key);
    },
  });
  let instance: ExampleInstance = {};
  try {
    instance = example.setup(context);
    if (preview) {
      const duration = example.previewTime ?? 4;
      // Small integration steps also work with custom layers that clamp delta.
      for (let t = 0; t < duration; t += 1 / 30) for (const layer of layers) layer.update(t, 1 / 30);
    }
  } catch (error) { try { instance.dispose?.(); } finally { app.clear(); } throw error; }
  let disposed = false;
  return { ...instance, layers, dispose() {
    if (disposed) return;
    disposed = true;
    try { instance.dispose?.(); } finally { app.clear(); }
  } };
}

export function cameraFor(example: ExampleDefinition, width: number, height: number): [number, number, number] {
  const target = example.target ?? [0, 0, 0];
  const scale = cameraScale(example, width, height);
  return example.camera.map((value, i) => target[i] + (value - target[i]) * scale) as [number, number, number];
}

/** Analytical axes extend beyond the plotted geometry; reserve room on narrow canvases. */
export function cameraScale(example: ExampleDefinition, width: number, height: number): number {
  const margin = example.category === 'Business' || example.category === 'Analytics' ? 1.35 : 1;
  return Math.max(1, margin * height / Math.max(1, width));
}

export function makeRenderer(container: HTMLElement) {
  return createFive({ container, background: '#070a0e', bloom: 0.45, paused: true, autoRotate: false, pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5) });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
