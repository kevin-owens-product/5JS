import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "instrumentation-drift",
  "title": "Instrumentation drift matrix",
  "category": "Analytics",
  "summary": "Where does event schema drift threaten a product decision?",
  "question": "Where does event schema drift threaten a product decision?",
  "view": "matrix",
  "unit": "invalid events %",
  "periods": [
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6"
  ],
  "reference": 3,
  "direction": "above",
  "accent": "#ffc48f",
  "grain": "One event family per daily batch; rejected events / received events.",
  "source": "event validation logs",
  "rows": [
    {
      "id": "instrumentation-drift-01",
      "label": "Session",
      "owner": "Data platform",
      "evidence": "event validation logs: Session; D1–D6",
      "next": "Trace producer versions before interpreting a metric shift (Session).",
      "values": [
        0.9,
        1.1,
        0.9,
        1.2,
        1.0,
        1.1
      ]
    },
    {
      "id": "instrumentation-drift-02",
      "label": "Identity",
      "owner": "Data platform",
      "evidence": "event validation logs: Identity; D1–D6",
      "next": "Trace producer versions before interpreting a metric shift (Identity).",
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
      "id": "instrumentation-drift-03",
      "label": "Checkout",
      "owner": "Data platform",
      "evidence": "event validation logs: Checkout; D1–D6",
      "next": "Trace producer versions before interpreting a metric shift (Checkout).",
      "values": [
        2.2,
        2.0,
        2.4,
        1.8,
        2.1,
        1.8
      ]
    },
    {
      "id": "instrumentation-drift-04",
      "label": "Feature",
      "owner": "Data platform",
      "evidence": "event validation logs: Feature; D1–D6",
      "next": "Trace producer versions before interpreting a metric shift (Feature).",
      "values": [
        6.4,
        7.1,
        7.3,
        7.8,
        8.3,
        8.8
      ]
    },
    {
      "id": "instrumentation-drift-05",
      "label": "Billing",
      "owner": "Data platform",
      "evidence": "event validation logs: Billing; D1–D6",
      "next": "Trace producer versions before interpreting a metric shift (Billing).",
      "values": [
        2.5,
        2.7,
        3.2,
        2.9,
        3.5,
        3.7
      ]
    },
    {
      "id": "instrumentation-drift-06",
      "label": "Consent",
      "owner": "Data platform",
      "evidence": "event validation logs: Consent; D1–D6",
      "next": "Trace producer versions before interpreting a metric shift (Consent).",
      "values": [
        5.9,
        5.5,
        4.7,
        5.3,
        4.3,
        4.0
      ]
    }
  ],
  "outcome": "product"
};

export default observatory(fixture);
