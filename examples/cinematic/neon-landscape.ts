import { particleField, terrain } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

/** Match the seed and height field to place a bright wire grid over a dark surface. */
const example: ExampleDefinition = {
  id: 'neon-landscape',
  title: 'Neon landscape',
  category: 'Cinematic',
  summary: 'A luminous grid over a rolling midnight landscape.',
  description: 'Compose two matching height fields: a dark surface and a raised neon wireframe. A sparse particle wave adds an atmospheric layer. Both surfaces share their controls so the grid follows the land.',
  tags: ['Terrain', 'Composition', 'Bloom'],
  difficulty: 'Intermediate',
  accent: '#d98cff',
  camera: [10, 7, 13],
  target: [0, -.3, 0],
  bloom: .65,
  previewTime: 4,
  setup(app) {
    const settings = { resolution: 104, size: 13, height: 2.1, frequency: .7, speed: .3, seed: 71 };
    const surface = app.add(terrain({ ...settings, colorA: '#102b51', colorB: '#442153' }));
    const grid = app.add(terrain({ ...settings, wireframe: true, colorA: '#45dbff', colorB: '#f392ff' }));
    // Equal shader heights plus a small offset avoid a coplanar wireframe overlay.
    grid.object.position.y = surface.object.position.y + .025;
    const mist = app.add(particleField({
      count: 9_000, mode: 'wave', radius: 6, speed: .15, turbulence: .15,
      pointSize: 1.1, colorA: '#e5baff', colorB: '#2972a5', seed: 13,
    }));
    mist.object.position.y = 2.4;

    return {
      controls: [
        { id: 'elevation', label: 'Elevation', min: .2, max: 3.2, step: .1, value: settings.height,
          apply(value) { surface.set({ height: value }); grid.set({ height: value }); } },
        { id: 'frequency', label: 'Ridge frequency', min: .25, max: 1.8, step: .05, value: settings.frequency,
          apply(value) { surface.set({ frequency: value }); grid.set({ frequency: value }); } },
        { id: 'land-motion', label: 'Terrain motion', min: 0, max: 1.5, step: .05, value: settings.speed,
          apply(value) { surface.set({ speed: value }); grid.set({ speed: value }); } },
      ],
    };
  },
};

export default example;
