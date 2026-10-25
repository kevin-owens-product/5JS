import { particleField } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

const example: ExampleDefinition = {
  id: 'vortex-flow',
  title: 'Vortex flow',
  category: 'Scientific',
  summary: '42,000 particles trace a luminous, layered spiral torus.',
  description: 'Create a seeded field with one layer, then adjust its orbital speed, ripple strength, and particle size live. Particle positions are evaluated in a vertex shader; the seed buffer stays on the GPU.',
  tags: ['Particles', 'GPU animation', 'Seeded'],
  difficulty: 'Starter',
  accent: '#60e8ff',
  camera: [7.5, 6, 10],
  bloom: 0.48,
  previewTime: 4,
  dataNote: 'An analytic orbital pattern for visual exploration; it does not solve fluid dynamics or simulate particle interactions.',
  setup(app) {
    const field = app.add(particleField({
      count: 42000, seed: 108, mode: 'vortex', radius: 4.1,
      speed: 0.45, turbulence: 0.65, pointSize: 2.0,
      colorA: '#65f0ff', colorB: '#6d65ff',
    }));
    field.object.rotation.z = 0.2;
    return { controls: [
      { id: 'speed', label: 'Orbital speed', min: 0, max: 1.6, step: 0.05, value: 0.45, apply: value => field.set({ speed: value }) },
      { id: 'turbulence', label: 'Ripple strength', min: 0, max: 2, step: 0.05, value: 0.65, apply: value => field.set({ turbulence: value }) },
      { id: 'pointSize', label: 'Particle size', min: 1, max: 3.5, step: 0.1, value: 2, apply: value => field.set({ pointSize: value }) },
    ] };
  },
};

export default example;
