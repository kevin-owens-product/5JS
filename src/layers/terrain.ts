import { DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import type { FiveLayer, TerrainOptions } from '../types.js';
import { bounded, colorString, rejectStructural, seededRandom } from './dataMath.js';
import { scientificColor } from './scientificMath.js';

/** Animated analytic height field with shader contours; this does not model physical terrain erosion. */
export function terrain(options: TerrainOptions = {}): FiveLayer<TerrainOptions> {
  const config = {
    resolution: options.resolution ?? 160, size: options.size ?? 12,
    height: options.height ?? 2.2, frequency: options.frequency ?? 0.85,
    speed: options.speed ?? 0.5, wireframe: options.wireframe ?? false,
    colorA: options.colorA ?? '#39eddc', colorB: options.colorB ?? '#9c67ff', seed: options.seed ?? 42,
  };
  bounded(config.resolution, 'resolution', 2, 512, true);
  bounded(config.size, 'size', 0.1, 10_000);
  bounded(config.seed, 'seed', 0, 0xffffffff, true);
  const validateAppearance = (value: typeof config) => {
    bounded(value.height, 'height', 0, 1_000);
    bounded(value.frequency, 'frequency', 0.01, 20);
    bounded(value.speed, 'speed', -10, 10);
    if (typeof value.wireframe !== 'boolean') throw new TypeError('wireframe must be a boolean.');
    colorString(value.colorA, 'colorA'); colorString(value.colorB, 'colorB');
  };
  validateAppearance(config);
  const geometry = new PlaneGeometry(config.size, config.size, config.resolution, config.resolution);
  geometry.rotateX(-Math.PI / 2);
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uHeight: { value: config.height }, uFrequency: { value: config.frequency },
      uSeed: { value: seededRandom(config.seed)() * 100 }, uSize: { value: config.size },
      uGrid: { value: Math.min(config.resolution, 72) },
      uColorA: { value: scientificColor(config.colorA, 'colorA') }, uColorB: { value: scientificColor(config.colorB, 'colorB') },
    },
    vertexShader: `
      uniform float uTime; uniform float uHeight; uniform float uFrequency; uniform float uSeed; uniform float uSize;
      varying vec2 vUv; varying float vHeight; varying vec3 vNormal;
      float field(vec2 p) {
        p *= uFrequency;
        float t = uTime * 0.22;
        float broad = sin(p.x * 0.74 + uSeed + t) * cos(p.y * 0.63 - t * 0.7);
        float ridge = sin(p.x * 1.37 + p.y * 0.91 + uSeed * 0.37 - t * 0.9);
        float detail = cos(p.y * 2.8 - p.x * 1.6 + t * 1.2 + uSeed);
        return broad * 0.58 + ridge * 0.28 + detail * 0.1;
      }
      float elevation(vec2 p) {
        vec2 edge = abs(p) / (uSize * 0.5);
        float envelope = 1.0 - smoothstep(0.72, 1.0, max(edge.x, edge.y));
        return field(p) * uHeight * (0.35 + 0.65 * envelope);
      }
      void main() {
        vUv = uv;
        vec3 p = position; p.y = elevation(p.xz);
        float epsilon = max(0.001, uSize / 800.0);
        float dx = elevation(p.xz + vec2(epsilon, 0.0)) - elevation(p.xz - vec2(epsilon, 0.0));
        float dz = elevation(p.xz + vec2(0.0, epsilon)) - elevation(p.xz - vec2(0.0, epsilon));
        vNormal = normalize(vec3(-dx, 2.0 * epsilon, -dz));
        vHeight = p.y / max(uHeight, 0.001);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA; uniform vec3 uColorB; uniform float uGrid;
      varying vec2 vUv; varying float vHeight; varying vec3 vNormal;
      void main() {
        vec3 color = mix(uColorA, uColorB, smoothstep(-0.65, 0.7, vHeight));
        float light = 0.42 + 0.58 * max(0.0, dot(normalize(vNormal), normalize(vec3(-0.5, 1.0, 0.7))));
        vec2 gridUv = vUv * uGrid;
        vec2 grid = abs(fract(gridUv - 0.5) - 0.5) / max(fwidth(gridUv), vec2(0.0001));
        float gridLine = 1.0 - min(min(grid.x, grid.y), 1.0);
        float contourValue = vHeight * 10.0;
        float contour = abs(fract(contourValue - 0.5) - 0.5) / max(fwidth(contourValue), 0.0001);
        float contourLine = 1.0 - min(contour, 1.0);
        color *= 0.3 + light * 0.5;
        color += mix(uColorA, vec3(0.8, 0.95, 1.0), 0.25) * gridLine * 0.23;
        color += mix(uColorB, vec3(1.0), 0.3) * contourLine * 0.23;
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: DoubleSide, wireframe: config.wireframe, toneMapped: false,
  });
  const object = new Mesh(geometry, material);
  object.name = '5js-terrain';
  // CPU geometry is flat; visible heights are evaluated in the vertex shader.
  object.frustumCulled = false;
  object.raycast = () => {};
  object.position.y = -0.8;
  let disposed = false;
  return {
    object, kind: 'terrain', count: geometry.getAttribute('position').count,
    update(_time, delta) {
      if (disposed || !Number.isFinite(delta) || delta < 0) return;
      material.uniforms.uTime.value += delta * config.speed;
    },
    set(patch) {
      if (disposed) throw new Error('Cannot update a disposed terrain layer.');
      rejectStructural(patch, ['resolution', 'size', 'seed'], 'terrain');
      const next = { ...config, ...patch };
      validateAppearance(next);
      Object.assign(config, next);
      material.uniforms.uHeight.value = config.height;
      material.uniforms.uFrequency.value = config.frequency;
      material.uniforms.uColorA.value.copy(scientificColor(config.colorA, 'colorA'));
      material.uniforms.uColorB.value.copy(scientificColor(config.colorB, 'colorB'));
      material.wireframe = config.wireframe;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose(); material.dispose(); object.removeFromParent();
    },
  };
}
