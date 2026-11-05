import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "water-leakage-ridges",
  "title": "Water leakage ridges",
  "category": "Cities",
  "summary": "Which districts show a persistent water-balance gap?",
  "question": "Which districts show a persistent water-balance gap?",
  "view": "ridges",
  "unit": "unaccounted water %",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 18,
  "direction": "above",
  "accent": "#f195bd",
  "grain": "One district per weekly interval; supply minus metered use / supply; includes meter error.",
  "source": "synthetic district water balances",
  "rows": [
    {
      "id": "water-leakage-ridges-01",
      "label": "Old town",
      "owner": "Utility planning",
      "evidence": "synthetic district water balances: Old town; W1–W6",
      "next": "Check meter calibration and timing before attributing gaps to leaks (Old town).",
      "values": [
        25.8,
        22.5,
        27.4,
        20.2,
        24.6,
        20.9
      ]
    },
    {
      "id": "water-leakage-ridges-02",
      "label": "Hills",
      "owner": "Utility planning",
      "evidence": "synthetic district water balances: Hills; W1–W6",
      "next": "Check meter calibration and timing before attributing gaps to leaks (Hills).",
      "values": [
        11.0,
        12.1,
        12.5,
        13.4,
        14.2,
        15.1
      ]
    },
    {
      "id": "water-leakage-ridges-03",
      "label": "Harbor",
      "owner": "Utility planning",
      "evidence": "synthetic district water balances: Harbor; W1–W6",
      "next": "Check meter calibration and timing before attributing gaps to leaks (Harbor).",
      "values": [
        15.6,
        17.3,
        20.5,
        18.4,
        22.0,
        23.6
      ]
    },
    {
      "id": "water-leakage-ridges-04",
      "label": "Midtown",
      "owner": "Utility planning",
      "evidence": "synthetic district water balances: Midtown; W1–W6",
      "next": "Check meter calibration and timing before attributing gaps to leaks (Midtown).",
      "values": [
        17.7,
        16.4,
        14.1,
        15.9,
        12.9,
        11.9
      ]
    },
    {
      "id": "water-leakage-ridges-05",
      "label": "Industrial",
      "owner": "Utility planning",
      "evidence": "synthetic district water balances: Industrial; W1–W6",
      "next": "Check meter calibration and timing before attributing gaps to leaks (Industrial).",
      "values": [
        26.3,
        31.6,
        24.4,
        33.9,
        29.1,
        30.5
      ]
    },
    {
      "id": "water-leakage-ridges-06",
      "label": "Garden",
      "owner": "Utility planning",
      "evidence": "synthetic district water balances: Garden; W1–W6",
      "next": "Check meter calibration and timing before attributing gaps to leaks (Garden).",
      "values": [
        7.0,
        8.0,
        9.2,
        10.6,
        10.1,
        8.5
      ]
    }
  ]
};

export default observatory(fixture);
