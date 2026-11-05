import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "deploy-error-braids",
  "title": "Deployment error braids",
  "category": "Engineering",
  "summary": "Which services show error-rate changes across a deployment window?",
  "question": "Which services show error-rate changes across a deployment window?",
  "view": "braids",
  "unit": "failed requests %",
  "periods": [
    "00m",
    "10m",
    "20m",
    "30m",
    "40m",
    "50m"
  ],
  "reference": 2,
  "direction": "above",
  "accent": "#e0e990",
  "grain": "One service per ten-minute snapshot; failed / received requests.",
  "source": "deployment markers and request logs",
  "rows": [
    {
      "id": "deploy-error-braids-01",
      "label": "Gateway",
      "owner": "Reliability",
      "evidence": "deployment markers and request logs: Gateway; 00m–50m",
      "next": "Correlate release markers and dependencies without assuming causation (Gateway).",
      "values": [
        0.9,
        1.0,
        1.0,
        1.1,
        1.2,
        1.3
      ]
    },
    {
      "id": "deploy-error-braids-02",
      "label": "Identity",
      "owner": "Reliability",
      "evidence": "deployment markers and request logs: Identity; 00m–50m",
      "next": "Correlate release markers and dependencies without assuming causation (Identity).",
      "values": [
        1.6,
        1.8,
        2.2,
        1.9,
        2.3,
        2.5
      ]
    },
    {
      "id": "deploy-error-braids-03",
      "label": "Payments",
      "owner": "Reliability",
      "evidence": "deployment markers and request logs: Payments; 00m–50m",
      "next": "Correlate release markers and dependencies without assuming causation (Payments).",
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
      "id": "deploy-error-braids-04",
      "label": "Workers",
      "owner": "Reliability",
      "evidence": "deployment markers and request logs: Workers; 00m–50m",
      "next": "Correlate release markers and dependencies without assuming causation (Workers).",
      "values": [
        1.4,
        1.7,
        1.3,
        1.8,
        1.6,
        1.6
      ]
    },
    {
      "id": "deploy-error-braids-05",
      "label": "Search",
      "owner": "Reliability",
      "evidence": "deployment markers and request logs: Search; 00m–50m",
      "next": "Correlate release markers and dependencies without assuming causation (Search).",
      "values": [
        3.1,
        3.6,
        4.1,
        4.7,
        4.5,
        3.8
      ]
    },
    {
      "id": "deploy-error-braids-06",
      "label": "Storage",
      "owner": "Reliability",
      "evidence": "deployment markers and request logs: Storage; 00m–50m",
      "next": "Correlate release markers and dependencies without assuming causation (Storage).",
      "values": [
        2.8,
        2.5,
        3.0,
        2.2,
        2.7,
        2.3
      ]
    }
  ]
};

export default observatory(fixture);
