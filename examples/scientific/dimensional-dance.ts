import { hypercube } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

const example: ExampleDefinition = {
  id: 'dimensional-dance',
  title: 'Dimensional dance',
  category: 'Scientific',
  summary: 'Compare a cyan 4D tesseract with a violet 5D penteract.',
  description: 'Compose two independent layers: 16 vertices and 32 edges on the left; 32 vertices and 80 edges on the right. Both rotate in their original dimensional space before successive perspective projections produce the visible 3D objects.',
  tags: ['4D + 5D', 'Projection', 'Composition'],
  difficulty: 'Intermediate',
  accent: '#c197ff',
  camera: [0, 3.5, 15],
  bloom: 0.5,
  previewTime: 5,
  dataNote: 'A perspective projection of higher-dimensional geometry. Projected edge lengths and crossings vary with orientation; the original hypercube edges remain equal.',
  setup(app) {
    const left = app.add(hypercube({ dimensions: 4, size: 2.2, speed: 0.6, color: '#61eaff', pointSize: 0.12 }));
    const right = app.add(hypercube({ dimensions: 5, size: 2.2, speed: -0.45, color: '#cd9bff', pointSize: 0.12 }));
    left.object.position.x = -2.65;
    right.object.position.x = 2.65;
    return { controls: [
      { id: 'speed', label: 'Rotation speed', min: 0, max: 2, step: 0.05, value: 1, apply: value => { left.set({ speed: value * 0.6 }); right.set({ speed: value * -0.45 }); } },
      { id: 'size', label: 'Original edge length', min: 1.4, max: 2.6, step: 0.1, value: 2.2, apply: value => { left.set({ size: value }); right.set({ size: value }); } },
      { id: 'separation', label: 'Center separation', min: 4, max: 6.5, step: 0.1, value: 5.3, apply: value => { left.object.position.x = -value / 2; right.object.position.x = value / 2; } },
    ] };
  },
};

export default example;
