import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "mission-power-matrix",
  "title": "Mission power matrix",
  "category": "Space",
  "summary": "Which instrument loads approach a fictional review reference?",
  "question": "Which instrument loads approach a fictional review reference?",
  "view": "matrix",
  "unit": "power draw W",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 80,
  "direction": "above",
  "accent": "#82eacb",
  "grain": "One instrument per mission phase; illustrative average power draw; not a flight model.",
  "source": "synthetic subsystem budgets",
  "rows": [
    {
      "id": "mission-power-matrix-01",
      "label": "Imager",
      "owner": "Mission design study",
      "evidence": "synthetic subsystem budgets: Imager; S1–S6",
      "next": "Check duty cycles and simultaneous loads before sizing reserves (Imager).",
      "values": [
        53.3,
        59.1,
        70.2,
        63.0,
        75.4,
        80.6
      ]
    },
    {
      "id": "mission-power-matrix-02",
      "label": "Radio",
      "owner": "Mission design study",
      "evidence": "synthetic subsystem budgets: Radio; S1–S6",
      "next": "Check duty cycles and simultaneous loads before sizing reserves (Radio).",
      "values": [
        49.6,
        45.8,
        39.5,
        44.5,
        36.1,
        33.2
      ]
    },
    {
      "id": "mission-power-matrix-03",
      "label": "Heater",
      "owner": "Mission design study",
      "evidence": "synthetic subsystem budgets: Heater; S1–S6",
      "next": "Check duty cycles and simultaneous loads before sizing reserves (Heater).",
      "values": [
        89.3,
        107.3,
        82.7,
        115.0,
        98.8,
        103.6
      ]
    },
    {
      "id": "mission-power-matrix-04",
      "label": "Compute",
      "owner": "Mission design study",
      "evidence": "synthetic subsystem budgets: Compute; S1–S6",
      "next": "Check duty cycles and simultaneous loads before sizing reserves (Compute).",
      "values": [
        55.4,
        63.2,
        72.4,
        83.8,
        79.5,
        67.5
      ]
    },
    {
      "id": "mission-power-matrix-05",
      "label": "Radar",
      "owner": "Mission design study",
      "evidence": "synthetic subsystem budgets: Radar; S1–S6",
      "next": "Check duty cycles and simultaneous loads before sizing reserves (Radar).",
      "values": [
        123.2,
        107.8,
        130.9,
        96.8,
        117.7,
        100.1
      ]
    },
    {
      "id": "mission-power-matrix-06",
      "label": "Navigation",
      "owner": "Mission design study",
      "evidence": "synthetic subsystem budgets: Navigation; S1–S6",
      "next": "Check duty cycles and simultaneous loads before sizing reserves (Navigation).",
      "values": [
        32.2,
        35.4,
        36.4,
        39.2,
        41.3,
        44.1
      ]
    }
  ]
};

export default observatory(fixture);
