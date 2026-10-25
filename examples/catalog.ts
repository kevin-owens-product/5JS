import vortex from './scientific/vortex-flow.js';
import waves from './scientific/wave-interference.js';
import dimensions from './scientific/dimensional-dance.js';
import lorenz from './scientific/lorenz-attractor.js';
import communities from './data/community-network.js';
import tree from './data/dependency-tree.js';
import helix from './data/double-helix.js';
import lattice from './data/lattice-network.js';
import landscape from './cinematic/neon-landscape.js';
import galaxies from './cinematic/twin-galaxies.js';
import garden from './cinematic/orbital-garden.js';
import summit from './cinematic/crystal-summit.js';
import type { ExampleDefinition } from './types.js';
import budget from './business/budget-variance.js';
import quality from './analytics/data-quality.js';
import orbits from './space/orbital-resonance.js';
import magneticField from './space/stellar-magnetic-field.js';
import connectome from './biology/neural-connectome.js';
import vascular from './biology/vascular-flow.js';
import jetStream from './climate/jet-stream.js';
import oceanGyres from './climate/ocean-gyres.js';
import gridDispatch from './energy/grid-dispatch.js';
import fusionChamber from './energy/fusion-chamber.js';
import transit from './cities/transit-pulse.js';
import canopy from './cities/urban-canopy.js';
import acoustics from './engineering/acoustic-chamber.js';
import turbine from './engineering/turbine-wake.js';

import revenue from './business/revenue-landscape.js';
import funnel from './business/conversion-funnel.js';
import subscription from './business/subscription-bridge.js';
import marketing from './business/marketing-efficiency.js';
import unit from './business/unit-economics.js';
import portfolio from './business/product-portfolio.js';
import capacity from './business/capacity-planning.js';
import inventory from './business/inventory-coverage.js';
import breakeven from './business/break-even.js';
import cohort from './analytics/cohort-retention.js';
import segments from './analytics/customer-segments.js';
import demand from './analytics/demand-scenarios.js';
import pareto from './analytics/pareto-analysis.js';
import geography from './analytics/geographic-demand.js';
import correlation from './analytics/correlation-matrix.js';
import distribution from './analytics/distribution-explorer.js';
import anomalies from './analytics/time-series-anomalies.js';
import experiment from './analytics/ab-experiment.js';
export const examples: ExampleDefinition[] = [
  orbits, magneticField, connectome, vascular, jetStream, oceanGyres, gridDispatch, fusionChamber,
  transit, canopy, acoustics, turbine,
  revenue, cohort, funnel, segments, unit, demand, subscription, correlation,
  marketing, distribution, portfolio, pareto, capacity, anomalies, inventory,
  experiment, budget, geography, breakeven, quality,
  vortex, communities, landscape, waves, tree, galaxies, dimensions, helix, garden, lorenz, lattice, summit,
];
export function findExample(id: string): ExampleDefinition | undefined { return examples.find(example => example.id === id); }
