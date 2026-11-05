import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "public-space-access",
  "title": "Public space access compass",
  "category": "Cities",
  "summary": "Which fictional neighborhoods lack nearby public space?",
  "question": "Which fictional neighborhoods lack nearby public space?",
  "view": "radar",
  "unit": "covered blocks %",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 75,
  "direction": "below",
  "accent": "#82eacb",
  "grain": "One neighborhood per planning scenario; blocks within a modeled walk threshold / blocks; no demographic inference.",
  "source": "synthetic pedestrian network scenarios",
  "rows": [
    {
      "id": "public-space-access-01",
      "label": "Northside",
      "owner": "Urban planning",
      "evidence": "synthetic pedestrian network scenarios: Northside; S1–S6",
      "next": "Validate paths, entrances and access hours with residents (Northside).",
      "values": [
        67.2,
        74.6,
        88.6,
        79.5,
        95.1,
        99.5
      ]
    },
    {
      "id": "public-space-access-02",
      "label": "Southbank",
      "owner": "Urban planning",
      "evidence": "synthetic pedestrian network scenarios: Southbank; S1–S6",
      "next": "Validate paths, entrances and access hours with residents (Southbank).",
      "values": [
        75.5,
        69.8,
        60.2,
        67.8,
        55.0,
        50.6
      ]
    },
    {
      "id": "public-space-access-03",
      "label": "Old town",
      "owner": "Urban planning",
      "evidence": "synthetic pedestrian network scenarios: Old town; S1–S6",
      "next": "Validate paths, entrances and access hours with residents (Old town).",
      "values": [
        85.5,
        99.5,
        79.2,
        99.5,
        94.6,
        99.2
      ]
    },
    {
      "id": "public-space-access-04",
      "label": "Midtown",
      "owner": "Urban planning",
      "evidence": "synthetic pedestrian network scenarios: Midtown; S1–S6",
      "next": "Validate paths, entrances and access hours with residents (Midtown).",
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
      "id": "public-space-access-05",
      "label": "Hills",
      "owner": "Urban planning",
      "evidence": "synthetic pedestrian network scenarios: Hills; S1–S6",
      "next": "Validate paths, entrances and access hours with residents (Hills).",
      "values": [
        53.8,
        47.0,
        57.1,
        42.2,
        51.4,
        43.7
      ]
    },
    {
      "id": "public-space-access-06",
      "label": "Harbor",
      "owner": "Urban planning",
      "evidence": "synthetic pedestrian network scenarios: Harbor; S1–S6",
      "next": "Validate paths, entrances and access hours with residents (Harbor).",
      "values": [
        52.4,
        57.6,
        59.3,
        63.8,
        67.3,
        71.8
      ]
    }
  ]
};

export default observatory(fixture);
