import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "expansion-signal-bridges",
  "title": "Expansion signal bridges",
  "category": "Business",
  "summary": "Which accounts approach purchased capacity without proven expansion intent?",
  "question": "Which accounts approach purchased capacity without proven expansion intent?",
  "view": "bridges",
  "unit": "capacity used %",
  "periods": [
    "M1",
    "M2",
    "M3",
    "M4",
    "M5",
    "M6"
  ],
  "reference": 75,
  "direction": "above",
  "accent": "#8acbff",
  "grain": "One fictional account per month; peak storage used / purchased storage.",
  "source": "account entitlements and usage",
  "rows": [
    {
      "id": "expansion-signal-bridges-01",
      "label": "Aster",
      "owner": "Account team",
      "evidence": "account entitlements and usage: Aster; M1–M6",
      "next": "Validate workload and budget with the customer; usage is not buying intent (Aster).",
      "values": [
        49.9,
        57.0,
        65.3,
        75.5,
        71.7,
        60.8
      ]
    },
    {
      "id": "expansion-signal-bridges-02",
      "label": "Birch",
      "owner": "Account team",
      "evidence": "account entitlements and usage: Birch; M1–M6",
      "next": "Validate workload and budget with the customer; usage is not buying intent (Birch).",
      "values": [
        91.8,
        80.4,
        97.6,
        72.2,
        87.7,
        74.6
      ]
    },
    {
      "id": "expansion-signal-bridges-03",
      "label": "Cedar",
      "owner": "Account team",
      "evidence": "account entitlements and usage: Cedar; M1–M6",
      "next": "Validate workload and budget with the customer; usage is not buying intent (Cedar).",
      "values": [
        50.6,
        55.5,
        57.2,
        61.6,
        64.9,
        69.3
      ]
    },
    {
      "id": "expansion-signal-bridges-04",
      "label": "Dune",
      "owner": "Account team",
      "evidence": "account entitlements and usage: Dune; M1–M6",
      "next": "Validate workload and budget with the customer; usage is not buying intent (Dune).",
      "values": [
        74.6,
        82.8,
        98.3,
        88.3,
        99.5,
        99.5
      ]
    },
    {
      "id": "expansion-signal-bridges-05",
      "label": "Ember",
      "owner": "Account team",
      "evidence": "account entitlements and usage: Ember; M1–M6",
      "next": "Validate workload and budget with the customer; usage is not buying intent (Ember).",
      "values": [
        85.0,
        78.5,
        67.7,
        76.3,
        61.9,
        56.9
      ]
    },
    {
      "id": "expansion-signal-bridges-06",
      "label": "Fjord",
      "owner": "Account team",
      "evidence": "account entitlements and usage: Fjord; M1–M6",
      "next": "Validate workload and budget with the customer; usage is not buying intent (Fjord).",
      "values": [
        41.4,
        49.7,
        38.3,
        53.2,
        45.8,
        48.0
      ]
    }
  ],
  "outcome": "retention"
};

export default observatory(fixture);
