import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "satellite-link-bridges",
  "title": "Satellite link bridges",
  "category": "Space",
  "summary": "Which modeled ground links deserve a closer margin review?",
  "question": "Which modeled ground links deserve a closer margin review?",
  "view": "bridges",
  "unit": "link margin dB",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 6,
  "direction": "below",
  "accent": "#e0e990",
  "grain": "One fictional station per pass; illustrative positive link margin, not operational guidance.",
  "source": "synthetic ground-station pass summaries",
  "rows": [
    {
      "id": "satellite-link-bridges-01",
      "label": "Station A",
      "owner": "Communications study",
      "evidence": "synthetic ground-station pass summaries: Station A; S1–S6",
      "next": "Inspect pointing, weather and link-budget assumptions (Station A).",
      "values": [
        8.3,
        9.1,
        9.4,
        10.1,
        10.6,
        11.3
      ]
    },
    {
      "id": "satellite-link-bridges-02",
      "label": "Station B",
      "owner": "Communications study",
      "evidence": "synthetic ground-station pass summaries: Station B; S1–S6",
      "next": "Inspect pointing, weather and link-budget assumptions (Station B).",
      "values": [
        3.3,
        3.6,
        4.3,
        3.9,
        4.6,
        5.0
      ]
    },
    {
      "id": "satellite-link-bridges-03",
      "label": "Station C",
      "owner": "Communications study",
      "evidence": "synthetic ground-station pass summaries: Station C; S1–S6",
      "next": "Inspect pointing, weather and link-budget assumptions (Station C).",
      "values": [
        14.2,
        13.1,
        11.3,
        12.7,
        10.3,
        9.5
      ]
    },
    {
      "id": "satellite-link-bridges-04",
      "label": "Station D",
      "owner": "Communications study",
      "evidence": "synthetic ground-station pass summaries: Station D; S1–S6",
      "next": "Inspect pointing, weather and link-budget assumptions (Station D).",
      "values": [
        6.6,
        7.9,
        6.1,
        8.5,
        7.3,
        7.6
      ]
    },
    {
      "id": "satellite-link-bridges-05",
      "label": "Station E",
      "owner": "Communications study",
      "evidence": "synthetic ground-station pass summaries: Station E; S1–S6",
      "next": "Inspect pointing, weather and link-budget assumptions (Station E).",
      "values": [
        2.3,
        2.7,
        3.1,
        3.5,
        3.4,
        2.8
      ]
    },
    {
      "id": "satellite-link-bridges-06",
      "label": "Station F",
      "owner": "Communications study",
      "evidence": "synthetic ground-station pass summaries: Station F; S1–S6",
      "next": "Inspect pointing, weather and link-budget assumptions (Station F).",
      "values": [
        9.0,
        7.8,
        9.5,
        7.0,
        8.6,
        7.3
      ]
    }
  ]
};

export default observatory(fixture);
