import { hypercube, terrain } from '../../src/index.js';
import type { FiveLayer, HypercubeOptions } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

const example: ExampleDefinition = {
  id: 'crystal-summit',
  title: 'Crystal summit',
  category: 'Cinematic',
  summary: 'Higher-dimensional geometry suspended above an icy ridge.',
  description: 'Combine an animated height field with a hovering 5D hypercube. A small layer wrapper adds vertical movement while forwarding updates, parameter changes, and disposal to the original geometry.',
  tags: ['Hypercube', 'Terrain', 'Composition'],
  difficulty: 'Intermediate',
  accent: '#c1dcff',
  camera: [10, 7, 12],
  target: [0, .5, 0],
  bloom: .7,
  previewTime: 5,
  setup(app) {
    const ground = app.add(terrain({
      resolution: 100, size: 10.5, height: 2.2, frequency: .85,
      speed: .18, colorA: '#295785', colorB: '#b9e2f8', seed: 39,
    }));
    ground.object.position.y = -1.5;
    const crystal = hypercube({ dimensions: 5, size: 2, speed: .4, color: '#ffe3ae', pointSize: .075 });
    crystal.object.position.y = 2.6;
    let hoverPhase = 0;
    let hoverAmplitude = .3;
    let disposed = false;
    const hoveringCrystal: FiveLayer<HypercubeOptions> = {
      object: crystal.object,
      kind: 'crystal-summit:hover',
      get count() { return crystal.count; },
      update(time, delta) {
        if (disposed || !Number.isFinite(delta) || delta < 0) return;
        hoverPhase += delta * .65;
        crystal.object.position.y = 2.6 + Math.sin(hoverPhase) * hoverAmplitude;
        crystal.update(time, delta);
      },
      set(options) { crystal.set(options); },
      dispose() { if (!disposed) { disposed = true; crystal.dispose(); } },
    };
    app.add(hoveringCrystal);

    return {
      controls: [
        { id: 'elevation', label: 'Mountain height', min: .3, max: 3, step: .1, value: 2.2,
          apply(value) { ground.set({ height: value }); } },
        { id: 'rotation', label: 'Crystal rotation', min: 0, max: 1.5, step: .05, value: .4,
          apply(value) { crystal.set({ speed: value }); } },
        { id: 'hover', label: 'Hover amplitude', min: 0, max: .8, step: .05, value: .3,
          apply(value) { hoverAmplitude = value; crystal.object.position.y = 2.6 + Math.sin(hoverPhase) * value; } },
      ],
    };
  },
};

export default example;
