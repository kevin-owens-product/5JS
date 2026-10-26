import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import type { Points } from 'three';
import { hypercube, type FiveLayer, type HypercubeOptions } from '../../src/index.js';
import { createChartLayer } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

/** Fill the actual square 2-faces using the same projected vertices as the edges. */
function facetedCube(dimensions: 4 | 5, color: string, speed: number): FiveLayer<HypercubeOptions> {
  const cube = hypercube({ dimensions, size: 2.2, speed, color, pointSize: .12 });
  const geometry = new BufferGeometry();
  const material = new MeshBasicMaterial({ color, side: DoubleSide, transparent: true, opacity: dimensions === 4 ? .045 : .025, depthWrite: false, blending: AdditiveBlending });
  const faces = new Mesh(geometry, material);
  faces.name = 'dimensional-dance:projected-square-faces';
  faces.frustumCulled = false;
  let vertexIndices: number[] = [];
  let currentDimensions = dimensions;
  function allocate() {
    vertexIndices = [];
    // Each square varies exactly two coordinates while fixing all others.
    for (let a = 0; a < currentDimensions; a++) for (let b = a + 1; b < currentDimensions; b++) {
      for (let vertex = 0; vertex < 2 ** currentDimensions; vertex++) {
        if ((vertex & (1 << a)) || (vertex & (1 << b))) continue;
        const va = vertex | (1 << a), vb = vertex | (1 << b), vab = vertex | (1 << a) | (1 << b);
        vertexIndices.push(vertex, va, vab, vertex, vab, vb);
      }
    }
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertexIndices.length * 3), 3));
  }
  function syncFaces() {
    const vertices = (cube.object.getObjectByName('hypercube:vertices') as Points).geometry.getAttribute('position');
    const position = geometry.getAttribute('position') as BufferAttribute;
    vertexIndices.forEach((vertex, index) => position.setXYZ(index, vertices.getX(vertex), vertices.getY(vertex), vertices.getZ(vertex)));
    position.needsUpdate = true;
  }
  allocate(); syncFaces();
  const captions = createChartLayer(chart => {
    chart.label(`${dimensions}D → 3D`, [0, -2.3, 0], .28, color);
    chart.label(`${2 ** dimensions} vertices / ${dimensions * 2 ** (dimensions - 1)} edges`, [0, -2.72, 0], .17, '#aebdca');
  });
  cube.object.add(faces, captions.object);
  let disposed = false;
  return {
    object: cube.object, kind: cube.kind, get count() { return cube.count; },
    update(time, delta) { if (disposed || !Number.isFinite(delta) || delta < 0) return; cube.update(time, delta); syncFaces(); },
    set(options) {
      cube.set(options);
      if (options.dimensions !== undefined && options.dimensions !== currentDimensions) { currentDimensions = options.dimensions; allocate(); }
      if (options.color !== undefined) material.color.set(options.color);
      syncFaces();
    },
    dispose() { if (disposed) return; disposed = true; captions.dispose(); geometry.dispose(); material.dispose(); cube.dispose(); },
  };
}

const example: ExampleDefinition = {
  id: 'dimensional-dance',
  title: 'Dimensional dance',
  category: 'Scientific',
  summary: 'Translucent projected faces reveal a cyan tesseract and violet penteract.',
  description: 'Compose two independent layers: 16 vertices and 32 edges on the left; 32 vertices and 80 edges on the right. Both rotate in their original dimensional space before successive perspective projections produce the visible 3D objects. Translucent square faces use those same projected vertices, revealing how surfaces fold across the wire structure.',
  tags: ['4D + 5D', 'Projection', 'Composition'],
  difficulty: 'Intermediate',
  accent: '#c197ff',
  camera: [0, 3.5, 15],
  bloom: 0.5,
  previewTime: 5,
  dataNote: 'A perspective projection of higher-dimensional geometry. Projected edge lengths and crossings vary with orientation; the original hypercube edges remain equal.',
  setup(app) {
    const left = app.add(facetedCube(4, '#61eaff', .6));
    const right = app.add(facetedCube(5, '#cd9bff', -.45));
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
