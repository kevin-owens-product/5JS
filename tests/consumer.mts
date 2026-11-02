// Verify the built package's public declarations under Node's ESM rules.
import { createRelametric, particleField, networkGraph, terrain, hypercube } from 'relametric';
import type { RelametricApp, RelametricLayer, ParticleFieldOptions } from 'relametric';
declare const container: HTMLElement;
const app: RelametricApp = createRelametric({ container });
const particles: RelametricLayer<ParticleFieldOptions> = app.add(particleField({ count: 100 }));
particles.set({ mode: 'wave' });
app.add(networkGraph({ data: { nodes: [{ id: 'a' }], edges: [] } }));
app.add(terrain({ wireframe: true }));
app.add(hypercube({ dimensions: 5 }));
app.onFrame(stats => stats.fps.toFixed(1));
const png: Promise<Blob> = app.capture();
void png;
app.dispose();

import { createFive } from 'relametric';
import type { FiveApp, FiveOptions, FiveStats, FiveLayer } from 'relametric';
const legacyFactory: typeof createRelametric = createFive;
const legacyApp: FiveApp = app;
const legacyLayer: FiveLayer<ParticleFieldOptions> = particles;
const legacyOptions: FiveOptions = { container };
const legacyStats: FiveStats | undefined = undefined;
void [legacyFactory, legacyApp, legacyLayer, legacyOptions, legacyStats];
