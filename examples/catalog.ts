import expansion0 from './business/checkout-device-river.js';
import expansion1 from './business/trial-value-clock.js';
import expansion2 from './business/renewal-engagement-radar.js';
import expansion3 from './business/expansion-signal-bridges.js';
import expansion4 from './business/refund-reason-ridges.js';
import expansion5 from './business/pricing-plan-observatory.js';
import expansion6 from './business/delivery-promise-orbits.js';
import expansion7 from './business/service-handoff-matrix.js';
import expansion8 from './analytics/search-zero-results.js';
import expansion9 from './analytics/research-confidence-map.js';
import expansion10 from './analytics/feature-depth-braids.js';
import expansion11 from './analytics/experiment-guardrail-bridge.js';
import expansion12 from './analytics/notification-fatigue.js';
import expansion13 from './analytics/accessibility-friction.js';
import expansion14 from './analytics/instrumentation-drift.js';
import expansion15 from './analytics/cohort-return-compass.js';
import expansion16 from './engineering/api-tail-latency.js';
import expansion17 from './engineering/deploy-error-braids.js';
import expansion18 from './engineering/queue-backpressure.js';
import expansion19 from './engineering/build-critical-path.js';
import expansion20 from './engineering/cache-efficiency-orbits.js';
import expansion21 from './data/pipeline-freshness.js';
import expansion22 from './data/join-coverage-radar.js';
import expansion23 from './data/query-cost-landscape.js';
import expansion24 from './data/schema-contract-constellation.js';
import expansion25 from './climate/watershed-rainfall.js';
import expansion26 from './climate/urban-heat-observatory.js';
import expansion27 from './climate/soil-moisture-compass.js';
import expansion28 from './climate/air-sensor-divergence.js';
import expansion29 from './energy/battery-cycle-atlas.js';
import expansion30 from './energy/solar-curtailment.js';
import expansion31 from './energy/charging-demand-orbits.js';
import expansion32 from './energy/grid-reserve-bridges.js';
import expansion33 from './cities/transit-transfer-braids.js';
import expansion34 from './cities/water-leakage-ridges.js';
import expansion35 from './cities/permit-backlog-matrix.js';
import expansion36 from './cities/public-space-access.js';
import expansion37 from './biology/assay-response-ribbons.js';
import expansion38 from './biology/habitat-observation-orbits.js';
import expansion39 from './biology/bioreactor-oxygen-coils.js';
import expansion40 from './space/telescope-signal-ridges.js';
import expansion41 from './space/satellite-link-bridges.js';
import expansion42 from './space/mission-power-matrix.js';
import decision0 from './business/activation-pathways.js';
import decision1 from './business/payment-routing.js';
import decision2 from './business/renewal-runway.js';
import decision3 from './business/support-escalation.js';
import decision4 from './analytics/feature-adoption.js';
import decision5 from './analytics/interview-coverage.js';
import decision6 from './business/performance-friction.js';
import checkoutRecovery from './business/checkout-recovery.js';
import sourceConversion from './business/source-conversion.js';
import sourceRetention from './analytics/source-retention.js';
import sourceProduct from './analytics/source-product.js';
import customerHealth from './business/customer-health.js';
import evidenceRoadmap from './analytics/evidence-to-roadmap.js';
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
  decision0, decision1, decision2, decision3, decision4, decision5, decision6,
  expansion0, expansion1, expansion2, expansion3, expansion4, expansion5, expansion6, expansion7, expansion8, expansion9, expansion10, expansion11, expansion12, expansion13, expansion14, expansion15, expansion16, expansion17, expansion18, expansion19, expansion20, expansion21, expansion22, expansion23, expansion24, expansion25, expansion26, expansion27, expansion28, expansion29, expansion30, expansion31, expansion32, expansion33, expansion34, expansion35, expansion36, expansion37, expansion38, expansion39, expansion40, expansion41, expansion42,
  checkoutRecovery, customerHealth, evidenceRoadmap, sourceConversion, sourceRetention, sourceProduct,
  orbits, magneticField, connectome, vascular, jetStream, oceanGyres, gridDispatch, fusionChamber,
  transit, canopy, acoustics, turbine,
  revenue, cohort, funnel, segments, unit, demand, subscription, correlation,
  marketing, distribution, portfolio, pareto, capacity, anomalies, inventory,
  experiment, budget, geography, breakeven, quality,
  vortex, communities, landscape, waves, tree, galaxies, dimensions, helix, garden, lorenz, lattice, summit,
];
export function findExample(id: string): ExampleDefinition | undefined { return examples.find(example => example.id === id); }
