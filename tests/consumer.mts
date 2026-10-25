// Verify the built package's public declarations under Node's ESM rules.
import { createFive, particleField, networkGraph, terrain, hypercube } from 'fivejs';
import type { FiveApp, FiveLayer, ParticleFieldOptions } from 'fivejs';
declare const container: HTMLElement;
const app: FiveApp = createFive({ container });
const particles: FiveLayer<ParticleFieldOptions> = app.add(particleField({ count: 100 }));
particles.set({ mode: 'wave' });
app.add(networkGraph({ data: { nodes: [{ id: 'a' }], edges: [] } }));
app.add(terrain({ wireframe: true }));
app.add(hypercube({ dimensions: 5 }));
app.onFrame(stats => stats.fps.toFixed(1));
const png: Promise<Blob> = app.capture();
void png;
app.dispose();
