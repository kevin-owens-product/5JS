import { particleField } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

const example: ExampleDefinition = {
  id: 'wave-interference',
  title: 'Wave interference',
  category: 'Scientific',
  summary: 'A warm particle surface combines traveling and radial waves.',
  description: 'Explore superposed sinusoidal terms across 36,000 seeded samples. Change the radial contribution to see the interference pattern shift, or exaggerate the vertical displacement with an ordinary Three.js object transform.',
  tags: ['Waves', 'Particles', 'Object transforms'],
  difficulty: 'Starter',
  accent: '#ffb978',
  camera: [7, 7.5, 10],
  bloom: 0.36,
  previewTime: 5,
  dataNote: 'An illustrative analytic surface, without calibrated units, boundary conditions, or a numerical wave-equation solver.',
  setup(app) {
    const field = app.add(particleField({
      count: 36000, seed: 227, mode: 'wave', radius: 4.3,
      speed: 0.7, turbulence: 1.1, pointSize: 1.8,
      colorA: '#ffba70', colorB: '#a194ff',
    }));
    return { controls: [
      { id: 'speed', label: 'Wave speed', min: 0, max: 2, step: 0.05, value: 0.7, apply: value => field.set({ speed: value }) },
      { id: 'radial', label: 'Radial contribution', min: 0, max: 2.2, step: 0.05, value: 1.1, apply: value => field.set({ turbulence: value }) },
      { id: 'height', label: 'Vertical scale', min: 0.35, max: 2, step: 0.05, value: 1, apply: value => { field.object.scale.y = value; } },
    ] };
  },
};

export default example;
