import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "service-handoff-matrix",
  "title": "Service handoff matrix",
  "category": "Business",
  "summary": "Which handoffs delay a customer reaching a specialist?",
  "question": "Which handoffs delay a customer reaching a specialist?",
  "view": "matrix",
  "unit": "median wait hours",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 8,
  "direction": "above",
  "accent": "#b6a0ff",
  "grain": "One service queue per week; median wait among completed handoffs.",
  "source": "service requests and assignments",
  "rows": [
    {
      "id": "service-handoff-matrix-01",
      "label": "Intake",
      "owner": "Service operations",
      "evidence": "service requests and assignments: Intake; W1–W6",
      "next": "Inspect uncompleted handoffs as well as completed wait times (Intake).",
      "values": [
        3.5,
        3.3,
        2.8,
        3.2,
        2.6,
        2.4
      ]
    },
    {
      "id": "service-handoff-matrix-02",
      "label": "Qualification",
      "owner": "Service operations",
      "evidence": "service requests and assignments: Qualification; W1–W6",
      "next": "Inspect uncompleted handoffs as well as completed wait times (Qualification).",
      "values": [
        5.6,
        6.8,
        5.2,
        7.3,
        6.2,
        6.5
      ]
    },
    {
      "id": "service-handoff-matrix-03",
      "label": "Demo",
      "owner": "Service operations",
      "evidence": "service requests and assignments: Demo; W1–W6",
      "next": "Inspect uncompleted handoffs as well as completed wait times (Demo).",
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
      "id": "service-handoff-matrix-04",
      "label": "Security",
      "owner": "Service operations",
      "evidence": "service requests and assignments: Security; W1–W6",
      "next": "Inspect uncompleted handoffs as well as completed wait times (Security).",
      "values": [
        20.2,
        17.6,
        21.4,
        15.8,
        19.3,
        16.4
      ]
    },
    {
      "id": "service-handoff-matrix-05",
      "label": "Procurement",
      "owner": "Service operations",
      "evidence": "service requests and assignments: Procurement; W1–W6",
      "next": "Inspect uncompleted handoffs as well as completed wait times (Procurement).",
      "values": [
        23.0,
        25.2,
        26.0,
        28.0,
        29.5,
        31.5
      ]
    },
    {
      "id": "service-handoff-matrix-06",
      "label": "Launch",
      "owner": "Service operations",
      "evidence": "service requests and assignments: Launch; W1–W6",
      "next": "Inspect uncompleted handoffs as well as completed wait times (Launch).",
      "values": [
        5.7,
        6.4,
        7.6,
        6.8,
        8.1,
        8.7
      ]
    }
  ],
  "outcome": "conversion"
};

export default observatory(fixture);
