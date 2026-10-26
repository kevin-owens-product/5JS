import {
  ACESFilmicToneMapping, PerspectiveCamera, Scene, SRGBColorSpace, Vector2, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { finiteRange, scientificColor } from './layers/scientificMath.js';
import type { FiveLayer } from './types.js';
import type { Object3D } from 'three';

export interface FiveOptions {
  container: HTMLElement;
  background?: string;
  bloom?: number;
  autoRotate?: boolean;
  paused?: boolean;
  pixelRatio?: number;
}

export interface FiveStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  points: number;
  objects: number;
  time: number;
  renderer: 'WebGL2';
}

export interface FiveApp {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly stats: FiveStats;
  add<P extends object>(layer: FiveLayer<P>): FiveLayer<P>;
  remove<P extends object>(layer: FiveLayer<P>): void;
  clear(): void;
  setBloom(strength: number): void;
  setAutoRotate(enabled: boolean): void;
  setPaused(paused: boolean): void;
  setSpeed(speed: number): void;
  resetCamera(position?: [number, number, number], target?: [number, number, number]): void;
  onFrame(callback: (stats: FiveStats) => void): () => void;
  capture(): Promise<Blob>;
  dispose(): void;
}

const owners = new WeakMap<object, object>();
const retired = new WeakSet<object>();
const rootOwners = new WeakMap<Object3D, object>();
const retiredRoots = new WeakSet<Object3D>();

/** Create a WebGL2 scene and own its canvas, animation loop, controls and layers. */
export function createFive(options: FiveOptions): FiveApp {
  if (typeof window === 'undefined' || !options?.container?.appendChild) {
    throw new TypeError('createFive requires a browser and an HTML container.');
  }
  const { container } = options;
  const background = scientificColor(options.background ?? '#05070e', 'background');
  const bloomStrength = finiteRange(options.bloom ?? 0.65, 'bloom', 0, 5);
  const pixelRatio = finiteRange(options.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2), 'pixelRatio', 0.25, 3);
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.info.autoReset = false;
  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.setAttribute('aria-label', 'Motif visualization; drag to orbit and scroll to zoom');
  canvas.tabIndex = 0;
  container.appendChild(canvas);

  const scene = new Scene();
  scene.background = background;
  const camera = new PerspectiveCamera(45, 1, 0.05, 2000);
  camera.position.set(0, 2, 12);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 1;
  controls.maxDistance = 100;
  controls.autoRotateSpeed = 0.35;
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), bloomStrength, 0.55, 0.35);
  bloom.enabled = bloomStrength > 0;
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);

  const layers = new Set<FiveLayer<object>>();
  const roots = new Map<FiveLayer<object>, Object3D>();
  const callbacks = new Set<(stats: FiveStats) => void>();
  const owner = {};
  let disposed = false;
  let paused = options.paused ?? reduceMotion;
  let autoRotate = options.autoRotate ?? !reduceMotion;
  let speed = 1;
  let time = 0;
  let previous = 0;
  let fpsStart = 0;
  let frames = 0;
  let stats: FiveStats = { fps: 0, drawCalls: 0, triangles: 0, points: 0, objects: 0, time: 0, renderer: 'WebGL2' };

  function alive() { if (disposed) throw new Error('This 5js scene has been disposed. Create a new scene to continue.'); }
  function reportCleanupErrors(errors: unknown[], message: string) {
    if (errors.length) throw new AggregateError(errors, message);
  }
  function releaseLayer(layer: FiveLayer<object>, errors: unknown[]) {
    if (!layers.delete(layer)) return;
    const root = roots.get(layer)!;
    roots.delete(layer);
    owners.delete(layer);
    retired.add(layer);
    rootOwners.delete(root);
    retiredRoots.add(root);
    // A consumer may have grouped the object after adding it. Detach from its
    // current parent, and still attempt resource cleanup if an event throws.
    try { root.removeFromParent(); } catch (error) { errors.push(error); }
    try { layer.dispose(); } catch (error) { errors.push(error); }
  }
  function resize() {
    if (disposed) return;
    const { width, height } = container.getBoundingClientRect();
    const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function draw() {
    renderer.info.reset();
    composer.render();
    let objects = 0;
    scene.traverseVisible(object => {
      if ('isMesh' in object || 'isPoints' in object || 'isLine' in object) objects++;
    });
    stats = { ...stats, time, objects, drawCalls: renderer.info.render.calls,
      points: renderer.info.render.points, triangles: renderer.info.render.triangles };
  }

  function frame(now: number) {
    if (disposed) return;
    const rawDelta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    const delta = paused || document.hidden ? 0 : rawDelta * speed;
    time += delta;
    for (const layer of [...layers]) {
      if (disposed) return;
      if (layers.has(layer)) layer.update(time, delta);
    }
    if (disposed) return;
    controls.autoRotate = autoRotate && !paused && !document.hidden && speed > 0;
    controls.update(rawDelta * speed);
    draw();
    frames++;
    if (now - fpsStart >= 500) {
      stats.fps = fpsStart ? frames * 1000 / (now - fpsStart) : 0;
      frames = 0;
      fpsStart = now;
    }
    for (const callback of [...callbacks]) {
      if (disposed) return;
      if (callbacks.has(callback)) callback({ ...stats });
    }
  }
  renderer.setAnimationLoop(frame);

  const app: FiveApp = {
    scene, camera, renderer,
    get stats() { return { ...stats }; },
    add<P extends object>(layer: FiveLayer<P>) {
      alive();
      if (!layer || (typeof layer !== 'object' && typeof layer !== 'function')) {
        throw new TypeError('add() expects a FiveLayer with an Object3D, update() and dispose().');
      }
      if (retired.has(layer)) throw new Error('This layer has been disposed. Create a new layer before adding it.');
      const existing = owners.get(layer);
      if (existing && existing !== owner) throw new Error('A layer can only belong to one 5js scene at a time.');
      if (layers.has(layer)) return layer;
      if (existing) throw new Error('This layer is still rolling back a failed initialization.');
      // The wrapper may expose a getter or later mutate its object property.
      // Ownership and cleanup must refer to the root actually attached here.
      const root = layer.object;
      if (!root?.isObject3D || typeof layer.update !== 'function' || typeof layer.dispose !== 'function') {
        throw new TypeError('add() expects a FiveLayer with an Object3D, update() and dispose().');
      }
      if (retiredRoots.has(root)) throw new Error('This Object3D root has been disposed. Create a new root before adding it.');
      if (rootOwners.has(root)) throw new Error('An Object3D root can only belong to one layer at a time.');
      const previousParent = root.parent;
      owners.set(layer, owner);
      layers.add(layer);
      roots.set(layer, root);
      rootOwners.set(root, layer);
      try {
        scene.add(root);
        layer.update(time, 0);
      } catch (error) {
        // Ownership transfers only after successful initialization. Keep the
        // caller's layer reusable rather than disposing it on a failed add.
        layers.delete(layer);
        roots.delete(layer);
        const errors = [error];
        // Retain claims during attachment events: a rollback listener must not
        // claim this root in another scene before the old parent is restored.
        if (!retiredRoots.has(root)) {
          try { root.removeFromParent(); } catch (rollbackError) { errors.push(rollbackError); }
          try { previousParent?.add(root); } catch (rollbackError) { errors.push(rollbackError); }
        }
        owners.delete(layer);
        if (rootOwners.get(root) === layer) rootOwners.delete(root);
        if (errors.length > 1) throw new AggregateError(errors, 'Layer initialization and attachment rollback failed.');
        throw error;
      }
      return layer;
    },
    remove(layer) {
      alive();
      const errors: unknown[] = [];
      releaseLayer(layer, errors);
      reportCleanupErrors(errors, 'Layer cleanup failed.');
    },
    clear() {
      alive();
      const errors: unknown[] = [];
      for (const layer of [...layers]) releaseLayer(layer, errors);
      reportCleanupErrors(errors, 'One or more layers failed to clean up.');
    },
    setBloom(strength) { alive(); bloom.strength = finiteRange(strength, 'bloom', 0, 5); bloom.enabled = strength > 0; },
    setAutoRotate(enabled) { alive(); autoRotate = Boolean(enabled); },
    setPaused(value) { alive(); paused = Boolean(value); previous = 0; },
    setSpeed(value) { alive(); speed = finiteRange(value, 'speed', 0, 10); },
    resetCamera(position = [0, 2, 12], target = [0, 0, 0]) {
      alive();
      if (position.length !== 3 || target.length !== 3 || [...position, ...target].some(v => !Number.isFinite(v))) {
        throw new TypeError('Camera position and target must each contain three finite coordinates.');
      }
      if (position.every((v, i) => v === target[i])) throw new RangeError('Camera position must differ from its target.');
      // Reset pending orbit damping so switching scenes does not retain motion.
      controls.reset();
      camera.position.fromArray(position);
      controls.target.fromArray(target);
      camera.lookAt(controls.target);
      const rotating = controls.autoRotate;
      controls.autoRotate = false;
      controls.update(0);
      controls.autoRotate = rotating;
    },
    onFrame(callback) {
      alive();
      if (typeof callback !== 'function') throw new TypeError('onFrame() expects a callback function.');
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
    async capture() {
      alive();
      draw();
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The canvas could not be encoded as PNG.')), 'image/png');
      });
    },
    dispose() {
      if (disposed) return;
      // Mark terminal before invoking user-defined cleanup: a layer may call
      // dispose() again, or throw, and neither may leave the app half alive.
      disposed = true;
      const errors: unknown[] = [];
      const attempt = (cleanup: () => void) => { try { cleanup(); } catch (error) { errors.push(error); } };
      attempt(() => renderer.setAnimationLoop(null));
      attempt(() => observer.disconnect());
      for (const layer of [...layers]) releaseLayer(layer, errors);
      callbacks.clear();
      attempt(() => controls.dispose());
      attempt(() => renderPass.dispose());
      attempt(() => bloom.dispose());
      attempt(() => output.dispose());
      attempt(() => composer.dispose());
      attempt(() => renderer.dispose());
      attempt(() => renderer.forceContextLoss());
      attempt(() => canvas.remove());
      reportCleanupErrors(errors, 'One or more resources failed to clean up.');
    },
  };
  return app;
}
