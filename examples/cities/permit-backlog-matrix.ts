import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "permit-backlog-matrix",
  "title": "Permit backlog matrix",
  "category": "Cities",
  "summary": "Which permit queues hold the oldest open work?",
  "question": "Which permit queues hold the oldest open work?",
  "view": "matrix",
  "unit": "median age days",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 30,
  "direction": "above",
  "accent": "#e0e990",
  "grain": "One permit class per weekly snapshot; median age of currently open cases.",
  "source": "synthetic permit records",
  "rows": [
    {
      "id": "permit-backlog-matrix-01",
      "label": "Residential",
      "owner": "Civic services",
      "evidence": "synthetic permit records: Residential; W1–W6",
      "next": "Inspect case complexity and missing documents before reallocating staff (Residential).",
      "values": [
        22.1,
        24.2,
        25.0,
        26.9,
        28.3,
        30.2
      ]
    },
    {
      "id": "permit-backlog-matrix-02",
      "label": "Commercial",
      "owner": "Civic services",
      "evidence": "synthetic permit records: Commercial; W1–W6",
      "next": "Inspect case complexity and missing documents before reallocating staff (Commercial).",
      "values": [
        37.7,
        41.9,
        49.7,
        44.6,
        53.4,
        57.0
      ]
    },
    {
      "id": "permit-backlog-matrix-03",
      "label": "Electrical",
      "owner": "Civic services",
      "evidence": "synthetic permit records: Electrical; W1–W6",
      "next": "Inspect case complexity and missing documents before reallocating staff (Electrical).",
      "values": [
        21.2,
        19.6,
        16.9,
        19.1,
        15.5,
        14.2
      ]
    },
    {
      "id": "permit-backlog-matrix-04",
      "label": "Plumbing",
      "owner": "Civic services",
      "evidence": "synthetic permit records: Plumbing; W1–W6",
      "next": "Inspect case complexity and missing documents before reallocating staff (Plumbing).",
      "values": [
        19.7,
        23.7,
        18.3,
        25.4,
        21.8,
        22.9
      ]
    },
    {
      "id": "permit-backlog-matrix-05",
      "label": "Events",
      "owner": "Civic services",
      "evidence": "synthetic permit records: Events; W1–W6",
      "next": "Inspect case complexity and missing documents before reallocating staff (Events).",
      "values": [
        9.4,
        10.7,
        12.2,
        14.2,
        13.4,
        11.4
      ]
    },
    {
      "id": "permit-backlog-matrix-06",
      "label": "Renovation",
      "owner": "Civic services",
      "evidence": "synthetic permit records: Renovation; W1–W6",
      "next": "Inspect case complexity and missing documents before reallocating staff (Renovation).",
      "values": [
        41.4,
        36.3,
        44.0,
        32.6,
        39.6,
        33.7
      ]
    }
  ]
};

export default observatory(fixture);
