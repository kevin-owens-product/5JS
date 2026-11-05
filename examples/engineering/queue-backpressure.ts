import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "queue-backpressure",
  "title": "Queue backpressure towers",
  "category": "Engineering",
  "summary": "Which worker queues exceed an illustrative age budget?",
  "question": "Which worker queues exceed an illustrative age budget?",
  "view": "matrix",
  "unit": "oldest job seconds",
  "periods": [
    "0m",
    "1m",
    "2m",
    "3m",
    "4m",
    "5m"
  ],
  "reference": 120,
  "direction": "above",
  "accent": "#82eacb",
  "grain": "One queue per minute; oldest pending job age, including unprocessed work.",
  "source": "queue snapshots",
  "rows": [
    {
      "id": "queue-backpressure-01",
      "label": "Email",
      "owner": "Runtime",
      "evidence": "queue snapshots: Email; 0m–5m",
      "next": "Inspect arrivals, processing rates and stalled consumers (Email).",
      "values": [
        36.9,
        41.0,
        48.6,
        43.6,
        52.2,
        55.8
      ]
    },
    {
      "id": "queue-backpressure-02",
      "label": "Exports",
      "owner": "Runtime",
      "evidence": "queue snapshots: Exports; 0m–5m",
      "next": "Inspect arrivals, processing rates and stalled consumers (Exports).",
      "values": [
        200.6,
        185.3,
        159.8,
        180.2,
        146.2,
        134.3
      ]
    },
    {
      "id": "queue-backpressure-03",
      "label": "Indexing",
      "owner": "Runtime",
      "evidence": "queue snapshots: Indexing; 0m–5m",
      "next": "Inspect arrivals, processing rates and stalled consumers (Indexing).",
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
      "id": "queue-backpressure-04",
      "label": "Imports",
      "owner": "Runtime",
      "evidence": "queue snapshots: Imports; 0m–5m",
      "next": "Inspect arrivals, processing rates and stalled consumers (Imports).",
      "values": [
        171.6,
        195.8,
        224.4,
        259.6,
        246.4,
        209.0
      ]
    },
    {
      "id": "queue-backpressure-05",
      "label": "Webhooks",
      "owner": "Runtime",
      "evidence": "queue snapshots: Webhooks; 0m–5m",
      "next": "Inspect arrivals, processing rates and stalled consumers (Webhooks).",
      "values": [
        72.8,
        63.7,
        77.3,
        57.2,
        69.5,
        59.1
      ]
    },
    {
      "id": "queue-backpressure-06",
      "label": "Reports",
      "owner": "Runtime",
      "evidence": "queue snapshots: Reports; 0m–5m",
      "next": "Inspect arrivals, processing rates and stalled consumers (Reports).",
      "values": [
        128.8,
        141.4,
        145.6,
        156.8,
        165.2,
        176.4
      ]
    }
  ]
};

export default observatory(fixture);
