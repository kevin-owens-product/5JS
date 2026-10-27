import { Color, SRGBColorSpace } from 'three';

/** Capture supported own options once, before validation or allocation. */
export function optionSnapshot<T extends object>(value: T, keys: readonly (keyof T)[], name: string): Partial<T> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an options object.`);
  }
  const result: Partial<T> = {};
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const entry = value[key];
    if (entry !== undefined) result[key] = entry;
  }
  return result;
}

export function finiteRange(value: number, name: string, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be a finite number between ${min} and ${max}.`);
  }
  return value;
}

export function integerRange(value: number, name: string, min: number, max: number): number {
  finiteRange(value, name, min, max);
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer.`);
  return value;
}

/** A small reproducible PRNG; it never reads or modifies Math.random. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Three.js supports CSS named, hex, RGB, and HSL colors (without alpha). */
export function scientificColor(value: string, name: string): Color {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a CSS color string.`);
  const css = value.trim().toLowerCase();
  let valid = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(css)
    || Object.prototype.hasOwnProperty.call(Color.NAMES, css);
  const rgb = css.match(/^rgb\(\s*(\d+(?:\.\d+)?)(%?)\s*,\s*(\d+(?:\.\d+)?)(%?)\s*,\s*(\d+(?:\.\d+)?)(%?)\s*\)$/);
  if (rgb) {
    const percentage = rgb[2] === '%';
    valid = rgb[4] === rgb[2] && rgb[6] === rgb[2]
      && [rgb[1], rgb[3], rgb[5]].every((n) => Number(n) <= (percentage ? 100 : 255));
    if (valid) {
      const denominator = percentage ? 100 : 255;
      return new Color().setRGB(Number(rgb[1]) / denominator, Number(rgb[3]) / denominator, Number(rgb[5]) / denominator, SRGBColorSpace);
    }
  }
  const hsl = css.match(/^hsl\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/);
  if (hsl) {
    valid = Number.isFinite(Number(hsl[1])) && Number(hsl[2]) <= 100 && Number(hsl[3]) <= 100;
    if (valid) return new Color().setHSL(Number(hsl[1]) / 360, Number(hsl[2]) / 100, Number(hsl[3]) / 100, SRGBColorSpace);
  }
  if (!valid) throw new TypeError(`${name} must be a valid CSS hex, named, rgb(), or hsl() color without alpha.`);
  return new Color(css);
}

export interface HypercubeTopology {
  vertices: number[][];
  edges: [number, number][];
  edgeDimensions: number[];
}

/** Every pair differing in exactly one bit forms one n-cube edge. */
export function hypercubeTopology(dimensions: 4 | 5): HypercubeTopology {
  if (dimensions !== 4 && dimensions !== 5) throw new RangeError('dimensions must be 4 or 5.');
  const vertices = Array.from({ length: 2 ** dimensions }, (_, vertex) =>
    Array.from({ length: dimensions }, (_, dimension) => ((vertex >> dimension) & 1) ? 1 : -1));
  const edges: [number, number][] = [];
  const edgeDimensions: number[] = [];
  for (let vertex = 0; vertex < vertices.length; vertex++) {
    for (let dimension = 0; dimension < dimensions; dimension++) {
      const other = vertex ^ (1 << dimension);
      if (vertex < other) {
        edges.push([vertex, other]);
        edgeDimensions.push(dimension);
      }
    }
  }
  return { vertices, edges, edgeDimensions };
}

/** Orthogonal plane rotations in the original space, before projection. */
export function rotateHypercubeVertex(vertex: readonly number[], time: number): number[] {
  if (vertex.length !== 4 && vertex.length !== 5) throw new RangeError('A vertex must have 4 or 5 coordinates.');
  if (!Number.isFinite(time) || vertex.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new RangeError('Vertex coordinates and time must be finite.');
  }
  const rotated = [...vertex];
  const planes: [number, number, number, number][] = [
    [0, 3, 0.43, 0.38], [1, 3, 0.27, 0.21], [2, 3, 0.19, -0.34],
    [0, 1, 0.11, 0.13], [1, 2, 0.07, 0.25],
  ];
  if (vertex.length === 5) planes.push([0, 4, 0.31, 0.42], [2, 4, 0.23, -0.24], [3, 4, 0.17, 0.17]);
  for (const [a, b, rate, phase] of planes) {
    const angle = time * rate + phase;
    const c = Math.cos(angle), s = Math.sin(angle);
    const va = rotated[a], vb = rotated[b];
    rotated[a] = va * c - vb * s;
    rotated[b] = va * s + vb * c;
  }
  if (rotated.some((coordinate) => !Number.isFinite(coordinate))) throw new RangeError('Rotation exceeds the finite coordinate range.');
  return rotated;
}

/** Perspective reduction nD → (n−1)D, repeated until three coordinates remain. */
export function projectHypercubeVertex(vertex: readonly number[], size: number): [number, number, number] {
  if (vertex.length !== 4 && vertex.length !== 5) throw new RangeError('A vertex must have 4 or 5 coordinates.');
  finiteRange(size, 'size', 0.01, 10000);
  if (vertex.some((coordinate) => !Number.isFinite(coordinate))) throw new RangeError('Vertex coordinates must be finite.');
  let projected = [...vertex];
  while (projected.length > 3) {
    // The camera lies beyond the bounding sphere, even after the first reduction.
    const cameraDistance = projected.length === 5 ? 5 : 5.5;
    const depth = projected[projected.length - 1];
    if (cameraDistance - depth < 0.001) throw new RangeError('Vertex lies beyond the perspective camera.');
    const scale = cameraDistance / (cameraDistance - depth);
    projected = projected.slice(0, -1).map((coordinate) => coordinate * scale);
    if (projected.some((coordinate) => !Number.isFinite(coordinate))) throw new RangeError('Projection exceeds the finite coordinate range.');
  }
  const result: [number, number, number] = [projected[0] * (size / 2), projected[1] * (size / 2), projected[2] * (size / 2)];
  if (result.some((coordinate) => !Number.isFinite(coordinate))) throw new RangeError('Projection exceeds the finite coordinate range.');
  return result;
}
