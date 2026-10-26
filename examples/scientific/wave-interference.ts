import { AdditiveBlending, BufferAttribute, BufferGeometry, LineSegments, ShaderMaterial } from 'three';
import type { Points } from 'three';
import { particleField, type FiveLayer } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

const example: ExampleDefinition = {
  id: 'wave-interference',
  title: 'Wave interference',
  category: 'Scientific',
  summary: 'A luminous woven surface reveals traveling and radial wave interference.',
  description: 'Explore superposed sinusoidal terms across 36,000 seeded samples. A sparse continuous mesh follows the same analytic mean surface, making the ridges legible between particles; it omits only their small seeded vertical jitter. Change the radial contribution to see the interference pattern shift, or exaggerate the vertical displacement with an ordinary Three.js object transform.',
  tags: ['Waves', 'Particles', 'Object transforms'],
  difficulty: 'Starter',
  accent: '#ffb978',
  camera: [7, 7.5, 10],
  bloom: 0.36,
  previewTime: 5,
  dataNote: 'An illustrative analytic surface, without calibrated units, boundary conditions, or a numerical wave-equation solver.',
  setup(app) {
    const field = particleField({
      count: 36000, seed: 227, mode: 'wave', radius: 4.3,
      speed: 0.7, turbulence: 1.1, pointSize: 1.8,
      colorA: '#ffba70', colorB: '#a194ff',
    });
    const fieldMaterial = (field.object as Points<BufferGeometry, ShaderMaterial>).material;
    const vertices: number[] = [];
    for (let direction = 0; direction < 2; direction++) for (let lane = 0; lane <= 16; lane++) {
      const fixed = lane / 8 - 1;
      for (let step = 0; step < 96; step++) for (const endpoint of [step, step + 1]) {
        const along = endpoint / 48 - 1;
        vertices.push(direction === 0 ? fixed : along, 0, direction === 0 ? along : fixed);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    const material = new ShaderMaterial({
      // Sharing the field's uniforms gives exact phase continuity and pause semantics.
      uniforms: fieldMaterial.uniforms,
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      vertexShader: `
        uniform float uTime; uniform float uRadius; uniform float uTurbulence;
        varying float height;
        void main() {
          float x = position.x, z = position.z, distance = length(vec2(x,z));
          float y = sin(x * 5.0 + uTime * .7) * cos(z * 4.0 - uTime * .5) * .19;
          y += sin(distance * 9.0 - uTime) * .09 * uTurbulence;
          height = clamp(y * 2.0 + .5, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(vec3(x,y,z) * uRadius, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorA; uniform vec3 uColorB; varying float height;
        void main() {
          gl_FragColor = vec4(mix(uColorA,uColorB,height), .27);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    const mesh = new LineSegments(geometry, material);
    mesh.name = 'wave-interference:analytic-mean-grid';
    mesh.frustumCulled = false;
    let disposed = false;
    app.add({
      object: mesh, kind: 'waveProfiles', count: vertices.length / 3,
      update() {}, set() {},
      dispose() { if (disposed) return; disposed = true; mesh.removeFromParent(); geometry.dispose(); material.dispose(); },
    } satisfies FiveLayer<Record<string, never>>);
    // The field remains an ordinary public layer; both use the same vertical scale.
    app.add(field);
    return { controls: [
      { id: 'speed', label: 'Wave speed', min: 0, max: 2, step: 0.05, value: 0.7, apply: value => field.set({ speed: value }) },
      { id: 'radial', label: 'Radial contribution', min: 0, max: 2.2, step: 0.05, value: 1.1, apply: value => field.set({ turbulence: value }) },
      { id: 'height', label: 'Vertical scale', min: 0.35, max: 2, step: 0.05, value: 1, apply: value => { field.object.scale.y = value; mesh.scale.y = value; } },
    ] };
  },
};

export default example;
