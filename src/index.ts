/// <reference types="@webgpu/types" preserve="true" />
export { createRelametric } from './core.js';
export type { RelametricApp, RelametricOptions, RelametricStats } from './core.js';
export { particleField } from './layers/particleField.js';
export { networkGraph } from './layers/networkGraph.js';
export { terrain } from './layers/terrain.js';
export { hypercube } from './layers/hypercube.js';
export type * from './types.js';

// Compatibility aliases for pre-Relametric source consumers.
export { createRelametric as createFive } from './core.js';
export type { RelametricApp as FiveApp, RelametricOptions as FiveOptions, RelametricStats as FiveStats } from './core.js';
export type { RelametricLayer as FiveLayer } from './types.js';
