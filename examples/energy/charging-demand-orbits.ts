import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "charging-demand-orbits",
  "title": "Charging demand orbits",
  "category": "Energy",
  "summary": "Which charging hubs sustain high occupied-time shares?",
  "question": "Which charging hubs sustain high occupied-time shares?",
  "view": "orbits",
  "unit": "utilization %",
  "periods": [
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6"
  ],
  "reference": 70,
  "direction": "above",
  "accent": "#b6a0ff",
  "grain": "One hub per daily interval; occupied connector minutes / available connector minutes.",
  "source": "synthetic charging session summaries",
  "rows": [
    {
      "id": "charging-demand-orbits-01",
      "label": "Central",
      "owner": "Mobility planning",
      "evidence": "synthetic charging session summaries: Central; D1–D6",
      "next": "Inspect queue time and failed sessions before adding capacity (Central).",
      "values": [
        96.8,
        89.4,
        77.1,
        86.9,
        70.5,
        64.8
      ]
    },
    {
      "id": "charging-demand-orbits-02",
      "label": "Airport",
      "owner": "Mobility planning",
      "evidence": "synthetic charging session summaries: Airport; D1–D6",
      "next": "Inspect queue time and failed sessions before adding capacity (Airport).",
      "values": [
        61.1,
        73.4,
        56.5,
        78.6,
        67.6,
        70.9
      ]
    },
    {
      "id": "charging-demand-orbits-03",
      "label": "Retail",
      "owner": "Mobility planning",
      "evidence": "synthetic charging session summaries: Retail; D1–D6",
      "next": "Inspect queue time and failed sessions before adding capacity (Retail).",
      "values": [
        42.1,
        48.1,
        55.1,
        63.7,
        60.5,
        51.3
      ]
    },
    {
      "id": "charging-demand-orbits-04",
      "label": "Highway",
      "owner": "Mobility planning",
      "evidence": "synthetic charging session summaries: Highway; D1–D6",
      "next": "Inspect queue time and failed sessions before adding capacity (Highway).",
      "values": [
        86.2,
        75.5,
        91.6,
        67.8,
        82.4,
        70.1
      ]
    },
    {
      "id": "charging-demand-orbits-05",
      "label": "Campus",
      "owner": "Mobility planning",
      "evidence": "synthetic charging session summaries: Campus; D1–D6",
      "next": "Inspect queue time and failed sessions before adding capacity (Campus).",
      "values": [
        39.6,
        43.4,
        44.7,
        48.2,
        50.7,
        54.2
      ]
    },
    {
      "id": "charging-demand-orbits-06",
      "label": "Depot",
      "owner": "Mobility planning",
      "evidence": "synthetic charging session summaries: Depot; D1–D6",
      "next": "Inspect queue time and failed sessions before adding capacity (Depot).",
      "values": [
        74.6,
        82.8,
        98.3,
        88.3,
        99.5,
        99.5
      ]
    }
  ]
};

export default observatory(fixture);
