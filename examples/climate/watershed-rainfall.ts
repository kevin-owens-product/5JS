import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "watershed-rainfall",
  "title": "Watershed rainfall ribbons",
  "category": "Climate",
  "summary": "Which fictional catchments receive concentrated rainfall across observations?",
  "question": "Which fictional catchments receive concentrated rainfall across observations?",
  "view": "braids",
  "unit": "rainfall mm",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 80,
  "direction": "above",
  "accent": "#b6a0ff",
  "grain": "One catchment per weekly interval; accumulated rainfall depth; not flood risk.",
  "source": "illustrative catchment observations",
  "rows": [
    {
      "id": "watershed-rainfall-01",
      "label": "Upper basin",
      "owner": "Hydrology study",
      "evidence": "illustrative catchment observations: Upper basin; W1–W6",
      "next": "Compare soil moisture and runoff observations before interpreting (Upper basin).",
      "values": [
        53.1,
        49.1,
        42.3,
        47.7,
        38.7,
        35.6
      ]
    },
    {
      "id": "watershed-rainfall-02",
      "label": "Tributary",
      "owner": "Hydrology study",
      "evidence": "illustrative catchment observations: Tributary; W1–W6",
      "next": "Compare soil moisture and runoff observations before interpreting (Tributary).",
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
      "id": "watershed-rainfall-03",
      "label": "Forest",
      "owner": "Hydrology study",
      "evidence": "illustrative catchment observations: Forest; W1–W6",
      "next": "Compare soil moisture and runoff observations before interpreting (Forest).",
      "values": [
        71.8,
        81.9,
        93.8,
        108.6,
        103.0,
        87.4
      ]
    },
    {
      "id": "watershed-rainfall-04",
      "label": "Valley",
      "owner": "Hydrology study",
      "evidence": "illustrative catchment observations: Valley; W1–W6",
      "next": "Compare soil moisture and runoff observations before interpreting (Valley).",
      "values": [
        79.5,
        69.6,
        84.5,
        62.5,
        76.0,
        64.6
      ]
    },
    {
      "id": "watershed-rainfall-05",
      "label": "Lowland",
      "owner": "Hydrology study",
      "evidence": "illustrative catchment observations: Lowland; W1–W6",
      "next": "Compare soil moisture and runoff observations before interpreting (Lowland).",
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
      "id": "watershed-rainfall-06",
      "label": "Estuary",
      "owner": "Hydrology study",
      "evidence": "illustrative catchment observations: Estuary; W1–W6",
      "next": "Compare soil moisture and runoff observations before interpreting (Estuary).",
      "values": [
        31.2,
        34.6,
        41.0,
        36.9,
        44.1,
        47.1
      ]
    }
  ]
};

export default observatory(fixture);
