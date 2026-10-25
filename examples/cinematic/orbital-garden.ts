import { Group, Mesh, MeshBasicMaterial, TorusGeometry } from 'three';
import { networkGraph, particleField } from '../../src/index.js';
import type { FiveLayer } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

interface OrbitOptions { speed: number }

/** A regular Three.js mesh and a 5js layer can share one lifecycle. */
function orbit(radius: number, initialPhase: number, tilt: number, color: string, seed: number): FiveLayer<OrbitOptions> {
  const object = new Group();
  object.name = 'orbital-garden:orbit';
  object.rotation.set(tilt, 0, tilt * .45);
  const geometry = new TorusGeometry(radius, .012, 4, 160);
  const material = new MeshBasicMaterial({ color, transparent: true, opacity: .45 });
  const ring = new Mesh(geometry, material);
  ring.rotation.x = Math.PI / 2;
  const planet = networkGraph({
    nodeCount: 32, radius: .38, nodeSize: .06, speed: .5,
    edgeOpacity: .55, colorA: color, colorB: '#f0f6ff', seed,
  });
  planet.object.name = 'orbital-garden:planet';
  object.add(ring, planet.object);
  let phase = initialPhase;
  let speed = .55;
  let disposed = false;
  function positionPlanet() { planet.object.position.set(Math.cos(phase) * radius, 0, Math.sin(phase) * radius); }
  positionPlanet();

  return {
    object,
    kind: 'orbital-garden:orbit',
    count: planet.count,
    update(time, delta) {
      if (disposed || !Number.isFinite(delta) || delta < 0) return;
      phase += delta * speed / Math.sqrt(radius);
      positionPlanet();
      planet.update(time, delta);
    },
    set(options) {
      if (disposed) throw new Error('Cannot update a disposed orbital layer.');
      if (options.speed !== undefined) {
        if (!Number.isFinite(options.speed) || options.speed < 0 || options.speed > 3) {
          throw new RangeError('Orbital speed must be between 0 and 3.');
        }
        speed = options.speed;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      planet.dispose();
      geometry.dispose();
      material.dispose();
      object.removeFromParent();
    },
  };
}

const example: ExampleDefinition = {
  id: 'orbital-garden',
  title: 'Orbital garden',
  category: 'Cinematic',
  summary: 'Network planets circle a luminous particle core.',
  description: 'Build a custom layer from Three.js torus paths and miniature network layers. The custom update integrates delta time, so orbiting planets respect playback speed and pause. Each orbit owns and disposes its geometry and nested graph.',
  tags: ['Custom layers', 'Networks', 'Lifecycle'],
  difficulty: 'Advanced',
  accent: '#9ce5c0',
  camera: [8, 8, 12],
  target: [0, 0, 0],
  bloom: .7,
  previewTime: 3,
  dataNote: 'Decorative seeded networks; orbital motion is an artistic animation.',
  setup(app) {
    const core = app.add(particleField({
      count: 12_000, mode: 'vortex', radius: .8, speed: .45, turbulence: .45,
      pointSize: 1.8, colorA: '#fff4c4', colorB: '#b3e596', seed: 17,
    }));
    core.object.rotation.x = .35;
    const paths = [
      app.add(orbit(2.3, .3, .12, '#ffd0a0', 11)),
      app.add(orbit(3.65, 2.5, -.28, '#a8f2d7', 29)),
      app.add(orbit(5, 4.8, .4, '#a8c5ff', 53)),
    ];

    return {
      controls: [
        { id: 'orbit-speed', label: 'Orbit speed', min: 0, max: 2, step: .05, value: .55,
          apply(value) { paths.forEach(path => path.set({ speed: value })); } },
        { id: 'core-motion', label: 'Core turbulence', min: 0, max: 1.5, step: .05, value: .45,
          apply(value) { core.set({ turbulence: value }); } },
        { id: 'core-size', label: 'Core radius', min: .5, max: 1.2, step: .05, value: .8,
          apply(value) { core.set({ radius: value }); } },
      ],
    };
  },
};

export default example;
