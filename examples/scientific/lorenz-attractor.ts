import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Line,
  LineBasicMaterial, Points, ShaderMaterial,
} from 'three';
import type { FiveLayer } from '../../src/index.js';
import type { ExampleDefinition } from '../types.js';

type State = readonly [number, number, number];
const SIGMA = 10, RHO = 28, BETA = 8 / 3;
const STEP = 0.005, SAMPLE_COUNT = 18000;

/**
 * Lorenz, E. N. (1963), “Deterministic Nonperiodic Flow,” equations 25–27.
 * Original paper: https://cdanfort.w3.uvm.edu/research/lorenz-1963.pdf
 * DOI: https://doi.org/10.1175/1520-0469(1963)020<0130:DNF>2.0.CO;2
 * Equations and classical parameters also verified in MIT's runnable lesson:
 * https://computationalthinking.mit.edu/Fall23/climate_science/predicting_the_weather/
 * This recipe uses classical RK4, rather than the paper's integration scheme.
 */
export function lorenzDerivative([x, y, z]: State): [number, number, number] {
  return [SIGMA * (y - x), x * (RHO - z) - y, x * y - BETA * z];
}

/** Deterministic raw (x,y,z) states, including the first state after burn-in. */
export function sampleLorenzTrajectory(samples = SAMPLE_COUNT, step = STEP, burnIn = 1000): Float64Array {
  if (!Number.isInteger(samples) || samples < 2 || samples > 50000) throw new RangeError('samples must be an integer between 2 and 50000.');
  if (!Number.isFinite(step) || step < 0.0005 || step > 0.01) throw new RangeError('step must be between 0.0005 and 0.01.');
  if (!Number.isInteger(burnIn) || burnIn < 0 || burnIn > 5000) throw new RangeError('burnIn must be an integer between 0 and 5000.');
  const result = new Float64Array(samples * 3);
  let state: [number, number, number] = [1, 1, 1];
  const offset = (derivative: State, amount: number): [number, number, number] => [
    state[0] + derivative[0] * amount,
    state[1] + derivative[1] * amount,
    state[2] + derivative[2] * amount,
  ];
  for (let i = 0; i < burnIn + samples; i++) {
    if (i >= burnIn) result.set(state, (i - burnIn) * 3);
    if (i === burnIn + samples - 1) break;
    const k1 = lorenzDerivative(state);
    const k2 = lorenzDerivative(offset(k1, step / 2));
    const k3 = lorenzDerivative(offset(k2, step / 2));
    const k4 = lorenzDerivative(offset(k3, step));
    state = state.map((value, axis) => value + step * (k1[axis] + 2 * k2[axis] + 2 * k3[axis] + k4[axis]) / 6) as [number, number, number];
    if (state.some(value => !Number.isFinite(value))) throw new Error('Lorenz integration diverged.');
  }
  return result;
}

interface LorenzOptions { speed: number; trail: number; rotationSpeed: number }

/** A custom layer follows the same ownership and lifecycle contract as built-ins. */
export function createLorenzLayer(): FiveLayer<LorenzOptions> {
  const raw = sampleLorenzTrajectory();
  const positions = new Float32Array(SAMPLE_COUNT * 3);
  const colors = new Float32Array(SAMPLE_COUNT * 3);
  const color = new Color();
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const [x, y, z] = raw.subarray(i * 3, i * 3 + 3);
    // Uniform scaling plus a rigid reorientation: original z points upward.
    positions.set([x * 0.14, (z - 25) * 0.14, -y * 0.14], i * 3);
    color.setHSL(0.49 + Math.min(1, z / 50) * 0.3, 0.88, 0.65);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  const object = new Group();
  object.name = 'example:lorenz-attractor';
  const position = new BufferAttribute(positions, 3);
  const vertexColors = new BufferAttribute(colors, 3);
  function trajectoryGeometry() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', position);
    geometry.setAttribute('color', vertexColors);
    geometry.computeBoundingSphere();
    return geometry;
  }
  const backgroundGeometry = trajectoryGeometry();
  const trailGeometry = trajectoryGeometry();
  const backgroundMaterial = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.12, depthWrite: false, blending: AdditiveBlending });
  const trailMaterial = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false, blending: AdditiveBlending });
  const background = new Line(backgroundGeometry, backgroundMaterial);
  const trail = new Line(trailGeometry, trailMaterial);
  const markerGeometry = new BufferGeometry();
  markerGeometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
  const markerMaterial = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(105.0 / max(0.2, -viewPosition.z), 4.0, 40.0);
      }
    `,
    fragmentShader: /* glsl */ `
      void main() {
        float distance = length(gl_PointCoord - 0.5) * 2.0;
        if (distance > 1.0) discard;
        gl_FragColor = vec4(0.8, 0.98, 1.0, pow(1.0 - distance, 1.4));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const marker = new Points(markerGeometry, markerMaterial);
  // Moving one point changes its bounding sphere each frame; disabling this
  // object's frustum test avoids recomputing a trivial bound.
  marker.frustumCulled = false;
  object.add(background, trail, marker);
  let config: LorenzOptions = { speed: 0.8, trail: 2800, rotationSpeed: 0.035 };
  let playback = 0, rotation = 0, disposed = false;

  function showTrail() {
    const head = Math.floor(6000 + playback / STEP) % SAMPLE_COUNT;
    const start = Math.max(0, head - config.trail + 1);
    trailGeometry.setDrawRange(start, head - start + 1);
    const markerPosition = markerGeometry.getAttribute('position') as BufferAttribute;
    markerPosition.setXYZ(0, positions[head * 3], positions[head * 3 + 1], positions[head * 3 + 2]);
    markerPosition.needsUpdate = true;
  }
  showTrail();
  return {
    object, kind: 'lorenzTrajectory', count: SAMPLE_COUNT,
    update(_time, delta) {
      if (disposed || !Number.isFinite(delta) || delta < 0) return;
      // Playback loops a stored approximation; it does not restart integration.
      const nextPlayback = playback + delta * config.speed;
      const nextRotation = rotation + delta * config.rotationSpeed;
      if (!Number.isFinite(nextPlayback) || !Number.isFinite(nextRotation)) return;
      playback = nextPlayback % (SAMPLE_COUNT * STEP);
      rotation = nextRotation % (Math.PI * 2);
      object.rotation.y = rotation;
      showTrail();
    },
    set(options) {
      if (disposed) throw new Error('Cannot update a disposed Lorenz layer.');
      const next = { ...config, ...options };
      if (!Number.isFinite(next.speed) || next.speed < 0 || next.speed > 3) throw new RangeError('speed must be between 0 and 3.');
      if (!Number.isInteger(next.trail) || next.trail < 100 || next.trail > SAMPLE_COUNT) throw new RangeError('trail must be an integer between 100 and 18000.');
      if (!Number.isFinite(next.rotationSpeed) || next.rotationSpeed < 0 || next.rotationSpeed > 0.3) throw new RangeError('rotationSpeed must be between 0 and 0.3.');
      config = next;
      showTrail();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      object.removeFromParent();
      backgroundGeometry.dispose(); trailGeometry.dispose(); markerGeometry.dispose();
      backgroundMaterial.dispose(); trailMaterial.dispose(); markerMaterial.dispose();
    },
  };
}

const example: ExampleDefinition = {
  id: 'lorenz-attractor',
  title: 'Lorenz attractor',
  category: 'Scientific',
  summary: 'Follow a numerical trajectory through the classic butterfly attractor.',
  description: 'Build a custom FiveLayer from Three.js geometry. Classical fourth-order Runge–Kutta integration computes 18,000 states once; a bright tail and marker replay the sampled trajectory above a faint complete path. Color follows the original z coordinate.',
  tags: ['Custom layer', 'Numerical integration', 'Chaos'],
  difficulty: 'Advanced',
  accent: '#98dfff',
  camera: [0, 1.4, 13],
  bloom: 0.42,
  previewTime: 4,
  dataNote: 'σ=10, ρ=28, β=8/3; RK4 step 0.005, initial state (1,1,1), 1,000-step burn-in. Playback loops a finite 90-unit approximation; presentation speed and rotation do not change the equations. It is not a weather forecast.',
  setup(app) {
    const layer = app.add(createLorenzLayer());
    return { controls: [
      { id: 'speed', label: 'Trajectory playback', min: 0, max: 3, step: 0.1, value: 0.8, apply: value => layer.set({ speed: value }) },
      { id: 'trail', label: 'Tail samples', min: 600, max: 6000, step: 100, value: 2800, apply: value => layer.set({ trail: value }) },
      { id: 'rotation', label: 'Presentation rotation', min: 0, max: 0.3, step: 0.005, value: 0.035, apply: value => layer.set({ rotationSpeed: value }) },
    ] };
  },
};

export default example;
