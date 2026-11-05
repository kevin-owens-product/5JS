import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "experiment-guardrail-bridge",
  "title": "Experiment guardrail bridge",
  "category": "Analytics",
  "summary": "Which experiment variants need performance review before rollout?",
  "question": "Which experiment variants need performance review before rollout?",
  "view": "bridges",
  "unit": "p95 latency ms",
  "periods": [
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6"
  ],
  "reference": 400,
  "direction": "above",
  "accent": "#e0e990",
  "grain": "One variant per day; p95 latency from its own requests; percentiles are not additive.",
  "source": "experiment assignments and telemetry",
  "rows": [
    {
      "id": "experiment-guardrail-bridge-01",
      "label": "Control",
      "owner": "Experimentation",
      "evidence": "experiment assignments and telemetry: Control; D1–D6",
      "next": "Check allocation, sample sizes and error rates before rollout (Control).",
      "values": [
        257.6,
        282.8,
        291.2,
        313.6,
        330.4,
        352.8
      ]
    },
    {
      "id": "experiment-guardrail-bridge-02",
      "label": "Variant A",
      "owner": "Experimentation",
      "evidence": "experiment assignments and telemetry: Variant A; D1–D6",
      "next": "Check allocation, sample sizes and error rates before rollout (Variant A).",
      "values": [
        254.2,
        282.1,
        334.8,
        300.7,
        359.6,
        384.4
      ]
    },
    {
      "id": "experiment-guardrail-bridge-03",
      "label": "Variant B",
      "owner": "Experimentation",
      "evidence": "experiment assignments and telemetry: Variant B; D1–D6",
      "next": "Check allocation, sample sizes and error rates before rollout (Variant B).",
      "values": [
        495.6,
        457.8,
        394.8,
        445.2,
        361.2,
        331.8
      ]
    },
    {
      "id": "experiment-guardrail-bridge-04",
      "label": "Variant C",
      "owner": "Experimentation",
      "evidence": "experiment assignments and telemetry: Variant C; D1–D6",
      "next": "Check allocation, sample sizes and error rates before rollout (Variant C).",
      "values": [
        347.8,
        418.1,
        321.9,
        447.7,
        384.8,
        403.3
      ]
    },
    {
      "id": "experiment-guardrail-bridge-05",
      "label": "Variant D",
      "owner": "Experimentation",
      "evidence": "experiment assignments and telemetry: Variant D; D1–D6",
      "next": "Check allocation, sample sizes and error rates before rollout (Variant D).",
      "values": [
        397.8,
        453.9,
        520.2,
        601.8,
        571.2,
        484.5
      ]
    },
    {
      "id": "experiment-guardrail-bridge-06",
      "label": "Variant E",
      "owner": "Experimentation",
      "evidence": "experiment assignments and telemetry: Variant E; D1–D6",
      "next": "Check allocation, sample sizes and error rates before rollout (Variant E).",
      "values": [
        369.6,
        323.4,
        392.7,
        290.4,
        353.1,
        300.3
      ]
    }
  ],
  "outcome": "product"
};

export default observatory(fixture);
