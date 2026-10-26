import { scientificColor } from './scientificMath.js';

/** Small deterministic PRNG. Seeds are intentionally independent of Math.random. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function bounded(value: number, name: string, min: number, max: number, integer = false): number {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RangeError(`${name} must be ${integer ? 'an integer' : 'a finite number'} between ${min} and ${max}.`);
  }
  return value;
}

export function colorString(value: string, name: string): string {
  scientificColor(value, name);
  return value;
}

export function rejectStructural(options: object, keys: readonly string[], layer: string): void {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(options, key)) {
      throw new Error(`${layer}.${key} cannot be changed with set(); create a new ${layer} layer instead.`);
    }
  }
}
