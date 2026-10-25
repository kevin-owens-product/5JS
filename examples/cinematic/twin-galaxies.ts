import { particleField } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

const example: ExampleDefinition = {
  id: 'twin-galaxies',
  title: 'Twin galaxies',
  category: 'Cinematic',
  summary: 'Two tilted spiral fields in warm and cool light.',
  description: 'Give two particle layers independent palettes and transforms, then control them together. Their spiral animation is an artistic field, not a gravitational simulation.',
  tags: ['Particles', 'Composition', 'Transforms'],
  difficulty: 'Starter',
  accent: '#ffb581',
  camera: [0, 3, 14],
  bloom: .65,
  previewTime: 6,
  setup(app) {
    const settings = { count: 24_000, mode: 'galaxy' as const, radius: 2.6, speed: .35, turbulence: .25, pointSize: 2 };
    const warm = app.add(particleField({ ...settings, colorA: '#ffe5ba', colorB: '#f06440', seed: 23 }));
    const cool = app.add(particleField({ ...settings, colorA: '#d0faff', colorB: '#258ee9', seed: 89 }));
    warm.object.position.set(-3.25, -.2, 0);
    cool.object.position.set(3.25, .4, -.4);
    warm.object.rotation.set(1.05, 0, -.3);
    cool.object.rotation.set(.95, 0, .4);

    return {
      controls: [
        { id: 'flow', label: 'Spiral speed', min: 0, max: 1.4, step: .05, value: settings.speed,
          apply(value) { warm.set({ speed: value }); cool.set({ speed: value }); } },
        { id: 'separation', label: 'Separation', min: 2.4, max: 4.1, step: .05, value: 3.25,
          apply(value) { warm.object.position.x = -value; cool.object.position.x = value; } },
        { id: 'tilt', label: 'Opposing tilt', min: -.6, max: .8, step: .05, value: .3,
          apply(value) { warm.object.rotation.z = -value; cool.object.rotation.z = value + .1; } },
      ],
    };
  },
};

export default example;
