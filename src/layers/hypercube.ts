import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Group,
  LineBasicMaterial, LineSegments, Points, ShaderMaterial,
} from 'three';
import type { FiveLayer, HypercubeOptions } from '../types.js';
import {
  finiteRange, hypercubeTopology, projectHypercubeVertex, rotateHypercubeVertex, scientificColor,
} from './scientificMath.js';

const defaults: Required<HypercubeOptions> = {
  dimensions: 5, size: 3.4, speed: 0.65, color: '#72eaff', pointSize: 0.09,
};

function validate(options: Required<HypercubeOptions>): void {
  if (options.dimensions !== 4 && options.dimensions !== 5) throw new RangeError('dimensions must be 4 or 5.');
  finiteRange(options.size, 'size', 0.01, 10000);
  finiteRange(options.speed, 'speed', -20, 20);
  finiteRange(options.pointSize, 'pointSize', 0.001, 100);
  scientificColor(options.color, 'color');
}

/**
 * A rotating tesseract (4D) or penteract (5D). Rotations act in the original
 * space; successive perspective projections reduce to 3D. size is the original
 * hypercube edge length, before projection. count reports vertices (16 or 32).
 * Animation integrates delta seconds, so changing speed preserves the phase.
 */
export function hypercube(options: HypercubeOptions = {}): FiveLayer<HypercubeOptions> {
  let settings = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof HypercubeOptions)[]) {
    if (options[key] !== undefined) Object.assign(settings, { [key]: options[key] });
  }
  validate(settings);
  let topology = hypercubeTopology(settings.dimensions);
  const object = new Group();
  object.name = 'fivejs:hypercube';
  const color = scientificColor(settings.color, 'color');
  const lineMaterial = new LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.8,
    depthWrite: false, blending: AdditiveBlending,
  });
  const pointMaterial = new ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uSize: { value: settings.pointSize } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uSize;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float attenuation = projectionMatrix[2][3] == -1.0 ? 350.0 / max(0.2, -mvPosition.z) : 30.0;
        gl_PointSize = clamp(uSize * attenuation, 2.0, 100.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float glow = pow(1.0 - d, 1.3);
        gl_FragColor = vec4(mix(uColor, vec3(1.0), glow * 0.7), glow);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const lines = new LineSegments(new BufferGeometry(), lineMaterial);
  const points = new Points(new BufferGeometry(), pointMaterial);
  lines.name = 'hypercube:edges';
  points.name = 'hypercube:vertices';
  object.add(lines, points);
  let disposed = false;
  let phase = 0;

  function writeColors(): void {
    const colors = lines.geometry.getAttribute('color') as BufferAttribute;
    const white = new Color('#f2fbff');
    for (let i = 0; i < topology.edges.length; i++) {
      const edgeColor = color.clone().lerp(white, topology.edgeDimensions[i] / settings.dimensions * 0.5);
      colors.setXYZ(i * 2, edgeColor.r, edgeColor.g, edgeColor.b);
      colors.setXYZ(i * 2 + 1, edgeColor.r, edgeColor.g, edgeColor.b);
    }
    colors.needsUpdate = true;
  }

  function allocate(): void {
    const pointGeometry = new BufferGeometry();
    pointGeometry.setAttribute('position', new BufferAttribute(new Float32Array(topology.vertices.length * 3), 3).setUsage(DynamicDrawUsage));
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute('position', new BufferAttribute(new Float32Array(topology.edges.length * 6), 3).setUsage(DynamicDrawUsage));
    lineGeometry.setAttribute('color', new BufferAttribute(new Float32Array(topology.edges.length * 6), 3));
    lines.geometry.dispose();
    points.geometry.dispose();
    lines.geometry = lineGeometry;
    points.geometry = pointGeometry;
    writeColors();
  }

  function renderVertices(): void {
    const positions = topology.vertices.map((vertex) =>
      projectHypercubeVertex(rotateHypercubeVertex(vertex, phase), settings.size));
    const vertexAttribute = points.geometry.getAttribute('position') as BufferAttribute;
    const edgeAttribute = lines.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < positions.length; i++) vertexAttribute.setXYZ(i, ...positions[i]);
    for (let i = 0; i < topology.edges.length; i++) {
      const [a, b] = topology.edges[i];
      edgeAttribute.setXYZ(i * 2, ...positions[a]);
      edgeAttribute.setXYZ(i * 2 + 1, ...positions[b]);
    }
    vertexAttribute.needsUpdate = true;
    edgeAttribute.needsUpdate = true;
    lines.geometry.computeBoundingSphere();
    points.geometry.computeBoundingSphere();
  }

  allocate();
  renderVertices();
  return {
    object, kind: 'hypercube',
    get count(): number { return topology.vertices.length; },
    update(_time: number, delta: number): void {
      if (disposed || !Number.isFinite(delta) || delta < 0) return;
      const nextPhase = phase + delta * settings.speed;
      if (!Number.isFinite(nextPhase)) return;
      phase = nextPhase;
      renderVertices();
    },
    set(next: Partial<HypercubeOptions>): void {
      if (disposed) throw new Error('Cannot update a disposed hypercube.');
      const proposed = { ...settings };
      for (const key of Object.keys(defaults) as (keyof HypercubeOptions)[]) {
        if (next[key] !== undefined) Object.assign(proposed, { [key]: next[key] });
      }
      validate(proposed);
      const dimensionsChanged = proposed.dimensions !== settings.dimensions;
      settings = proposed;
      color.copy(scientificColor(settings.color, 'color'));
      pointMaterial.uniforms.uColor.value.copy(color);
      pointMaterial.uniforms.uSize.value = settings.pointSize;
      if (dimensionsChanged) {
        topology = hypercubeTopology(settings.dimensions);
        allocate();
      } else writeColors();
      renderVertices();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      object.removeFromParent();
      lines.geometry.dispose();
      points.geometry.dispose();
      lineMaterial.dispose();
      pointMaterial.dispose();
    },
  };
}
