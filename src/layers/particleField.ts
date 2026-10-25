import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial, Sphere, Vector3,
} from 'three';
import type { FiveLayer, ParticleFieldOptions } from '../types.js';
import { finiteRange, integerRange, scientificColor, seededRandom } from './scientificMath.js';

const defaults: Required<ParticleFieldOptions> = {
  count: 60000, mode: 'vortex', radius: 3.8, speed: 0.5, turbulence: 0.55,
  pointSize: 2.2, colorA: '#4de4ff', colorB: '#5f5bff', seed: 42,
};

function validate(options: Required<ParticleFieldOptions>): void {
  integerRange(options.count, 'count', 1, 250000);
  integerRange(options.seed, 'seed', 0, 0xffffffff);
  if (!['vortex', 'galaxy', 'wave'].includes(options.mode)) throw new RangeError('mode must be vortex, galaxy, or wave.');
  finiteRange(options.radius, 'radius', 0.01, 10000);
  finiteRange(options.speed, 'speed', -20, 20);
  finiteRange(options.turbulence, 'turbulence', 0, 3);
  finiteRange(options.pointSize, 'pointSize', 0.1, 100);
  scientificColor(options.colorA, 'colorA');
  scientificColor(options.colorB, 'colorB');
}

const vertexShader = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uMode;
  uniform float uRadius;
  uniform float uTurbulence;
  uniform float uPointSize;
  varying float vColor;
  varying float vBrightness;
  const float TAU = 6.28318530718;

  void main() {
    float t = uTime;
    float r = sqrt(aSeed.x);
    float angle = aSeed.y * TAU;
    float noise = aSeed.z * 2.0 - 1.0;
    vec3 p;

    if (uMode < 0.5) {
      // A stratified spiral torus: hundreds of orbital filaments remain coherent.
      float band = floor(aSeed.z * 11.0) / 11.0;
      float orbit = angle + t * (0.28 + 0.26 / (0.3 + r));
      float coil = angle * 3.0 + band * TAU + t * 0.22;
      float tube = 0.075 + 0.24 * r;
      float ring = 0.57 + tube * cos(coil);
      ring += sin(orbit * 5.0 + t + aSeed.w * TAU) * 0.025 * uTurbulence;
      p = vec3(cos(orbit) * ring, tube * sin(coil), sin(orbit) * ring);
      p.y += noise * 0.055 + sin(orbit * 2.0 + t * 0.3) * 0.06 * uTurbulence;
      vColor = fract(band + r * 0.4);
      vBrightness = 0.65 + 0.55 * pow(1.0 - r, 2.0);
    } else if (uMode < 1.5) {
      // Five spiral arms with a bright central bulge and differential rotation.
      float arm = floor(aSeed.y * 5.0) * TAU / 5.0;
      float orbit = arm + r * 4.8 - t * 0.17 / (0.3 + r);
      float scatter = noise * (0.08 + r * 0.38) * (0.5 + uTurbulence);
      orbit += scatter;
      float radius = pow(aSeed.x, 0.65);
      p = vec3(cos(orbit) * radius, (aSeed.w - 0.5) * (0.045 + 0.13 * (1.0 - r)), sin(orbit) * radius);
      p.y += sin(orbit * 2.0 + t * 0.4) * r * 0.07 * uTurbulence;
      vColor = r;
      vBrightness = 0.62 + 0.9 * pow(1.0 - r, 3.0);
    } else {
      // Superposed traveling waves evaluated analytically, without CPU uploads.
      float x = (aSeed.x * 2.0 - 1.0);
      float z = (aSeed.y * 2.0 - 1.0);
      float distance = length(vec2(x, z));
      float y = sin(x * 5.0 + t * 0.7) * cos(z * 4.0 - t * 0.5) * 0.19;
      y += sin(distance * 9.0 - t) * 0.09 * uTurbulence;
      y += (aSeed.z - 0.5) * 0.025;
      p = vec3(x, y, z);
      vColor = clamp(y * 2.0 + 0.5, 0.0, 1.0);
      vBrightness = 0.65 + 0.4 * pow(max(0.0, sin(distance * 9.0 - t)), 8.0);
    }

    vec4 mvPosition = modelViewMatrix * vec4(p * uRadius, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float perspective = projectionMatrix[2][3] == -1.0 ? 14.0 / max(0.2, -mvPosition.z) : 1.0;
    gl_PointSize = clamp(uPointSize * (0.65 + aSeed.w * 0.7) * perspective, 1.0, 100.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vColor;
  varying float vBrightness;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float halo = pow(1.0 - d, 2.0);
    float core = exp(-d * d * 18.0);
    vec3 color = mix(uColorA, uColorB, vColor);
    color = mix(color, vec3(0.88, 0.97, 1.0), core * 0.45);
    gl_FragColor = vec4(color * vBrightness, (halo * 0.7 + core * 0.3) * 0.72);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * A GPU animated field. count and seed are fixed at construction; recreate the
 * layer to change either. All other options can be changed atomically with set().
 * pointSize is in framebuffer pixels at a reference camera distance of 14 units.
 * Animation integrates delta seconds, so changing speed preserves the phase.
 */
export function particleField(options: ParticleFieldOptions = {}): FiveLayer<ParticleFieldOptions> {
  let settings = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof ParticleFieldOptions)[]) {
    if (options[key] !== undefined) Object.assign(settings, { [key]: options[key] });
  }
  validate(settings);
  const random = seededRandom(settings.seed);
  const seeds = new Float32Array(settings.count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = random();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(settings.count * 3), 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));
  geometry.boundingSphere = new Sphere(new Vector3(), settings.radius * 2);
  const uniforms = {
    uTime: { value: 0 }, uMode: { value: ['vortex', 'galaxy', 'wave'].indexOf(settings.mode) },
    uRadius: { value: settings.radius }, uTurbulence: { value: settings.turbulence },
    uPointSize: { value: settings.pointSize },
    uColorA: { value: scientificColor(settings.colorA, 'colorA') },
    uColorB: { value: scientificColor(settings.colorB, 'colorB') },
  };
  const material = new ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true,
    depthWrite: false, blending: AdditiveBlending,
  });
  const object = new Points(geometry, material);
  object.name = 'fivejs:particleField';
  // Shader-generated positions cannot be used for Three.js's CPU raycasting.
  object.raycast = () => {};
  let disposed = false;
  let phase = 0;
  return {
    object, kind: 'particleField', count: settings.count,
    update(_time: number, delta: number): void {
      if (disposed || !Number.isFinite(delta) || delta < 0) return;
      const nextPhase = phase + delta * settings.speed;
      // Uniforms are 32-bit floats; keep invalid frame input out of the shader.
      if (!Number.isFinite(Math.fround(nextPhase))) return;
      phase = nextPhase;
      uniforms.uTime.value = phase;
    },
    set(next: Partial<ParticleFieldOptions>): void {
      if (disposed) throw new Error('Cannot update a disposed particle field.');
      const proposed = { ...settings };
      for (const key of Object.keys(defaults) as (keyof ParticleFieldOptions)[]) {
        if (next[key] !== undefined) Object.assign(proposed, { [key]: next[key] });
      }
      validate(proposed);
      if (proposed.count !== settings.count || proposed.seed !== settings.seed) {
        throw new Error('Particle count and seed are immutable. Recreate the particleField layer to change them.');
      }
      settings = proposed;
      uniforms.uMode.value = ['vortex', 'galaxy', 'wave'].indexOf(settings.mode);
      uniforms.uRadius.value = settings.radius;
      uniforms.uTurbulence.value = settings.turbulence;
      uniforms.uPointSize.value = settings.pointSize;
      uniforms.uColorA.value.copy(scientificColor(settings.colorA, 'colorA'));
      uniforms.uColorB.value.copy(scientificColor(settings.colorB, 'colorB'));
      geometry.boundingSphere!.radius = settings.radius * 2;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      object.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
