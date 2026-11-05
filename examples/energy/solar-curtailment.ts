import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "solar-curtailment",
  "title": "Solar curtailment ridges",
  "category": "Energy",
  "summary": "Which sites lose generation opportunity during congested intervals?",
  "question": "Which sites lose generation opportunity during congested intervals?",
  "view": "ridges",
  "unit": "curtailed MWh",
  "periods": [
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6"
  ],
  "reference": 50,
  "direction": "above",
  "accent": "#82eacb",
  "grain": "One site per daily interval; curtailed energy, not its share of available generation.",
  "source": "synthetic generation dispatch records",
  "rows": [
    {
      "id": "solar-curtailment-01",
      "label": "Mesa",
      "owner": "Dispatch study",
      "evidence": "synthetic generation dispatch records: Mesa; D1–D6",
      "next": "Compare available generation and network constraints (Mesa).",
      "values": [
        19.7,
        21.8,
        25.9,
        23.3,
        27.8,
        29.8
      ]
    },
    {
      "id": "solar-curtailment-02",
      "label": "Coast",
      "owner": "Dispatch study",
      "evidence": "synthetic generation dispatch records: Coast; D1–D6",
      "next": "Compare available generation and network constraints (Coast).",
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
      "id": "solar-curtailment-03",
      "label": "Ridge",
      "owner": "Dispatch study",
      "evidence": "synthetic generation dispatch records: Ridge; D1–D6",
      "next": "Compare available generation and network constraints (Ridge).",
      "values": [
        63.0,
        75.7,
        58.3,
        81.1,
        69.7,
        73.0
      ]
    },
    {
      "id": "solar-curtailment-04",
      "label": "Valley",
      "owner": "Dispatch study",
      "evidence": "synthetic generation dispatch records: Valley; D1–D6",
      "next": "Compare available generation and network constraints (Valley).",
      "values": [
        29.6,
        33.8,
        38.8,
        44.8,
        42.6,
        36.1
      ]
    },
    {
      "id": "solar-curtailment-05",
      "label": "Desert",
      "owner": "Dispatch study",
      "evidence": "synthetic generation dispatch records: Desert; D1–D6",
      "next": "Compare available generation and network constraints (Desert).",
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
      "id": "solar-curtailment-06",
      "label": "Prairie",
      "owner": "Dispatch study",
      "evidence": "synthetic generation dispatch records: Prairie; D1–D6",
      "next": "Compare available generation and network constraints (Prairie).",
      "values": [
        50.6,
        55.5,
        57.2,
        61.6,
        64.9,
        69.3
      ]
    }
  ]
};

export default observatory(fixture);
