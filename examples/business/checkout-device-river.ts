import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "checkout-device-river",
  "title": "Checkout device river",
  "category": "Business",
  "summary": "Which device journeys have lower checkout completion?",
  "question": "Which device journeys have lower checkout completion?",
  "view": "braids",
  "unit": "completion %",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 65,
  "direction": "below",
  "accent": "#82eacb",
  "grain": "One device cohort per weekly snapshot; completed checkouts / started checkouts.",
  "source": "checkout and session aggregates",
  "rows": [
    {
      "id": "checkout-device-river-01",
      "label": "Mobile web",
      "owner": "Checkout",
      "evidence": "checkout and session aggregates: Mobile web; W1–W6",
      "next": "Replay consented sessions and inspect field errors (Mobile web).",
      "values": [
        42.6,
        47.3,
        56.2,
        50.4,
        60.3,
        64.5
      ]
    },
    {
      "id": "checkout-device-river-02",
      "label": "Desktop",
      "owner": "Checkout",
      "evidence": "checkout and session aggregates: Desktop; W1–W6",
      "next": "Replay consented sessions and inspect field errors (Desktop).",
      "values": [
        92.0,
        85.0,
        73.3,
        82.7,
        67.1,
        61.6
      ]
    },
    {
      "id": "checkout-device-river-03",
      "label": "Tablet",
      "owner": "Checkout",
      "evidence": "checkout and session aggregates: Tablet; W1–W6",
      "next": "Replay consented sessions and inspect field errors (Tablet).",
      "values": [
        57.3,
        68.9,
        53.1,
        73.8,
        63.4,
        66.5
      ]
    },
    {
      "id": "checkout-device-river-04",
      "label": "In-app",
      "owner": "Checkout",
      "evidence": "checkout and session aggregates: In-app; W1–W6",
      "next": "Replay consented sessions and inspect field errors (In-app).",
      "values": [
        53.0,
        60.5,
        69.4,
        80.2,
        76.2,
        64.6
      ]
    },
    {
      "id": "checkout-device-river-05",
      "label": "Assisted",
      "owner": "Checkout",
      "evidence": "checkout and session aggregates: Assisted; W1–W6",
      "next": "Replay consented sessions and inspect field errors (Assisted).",
      "values": [
        94.1,
        82.3,
        99.5,
        73.9,
        89.9,
        76.4
      ]
    },
    {
      "id": "checkout-device-river-06",
      "label": "Returning",
      "owner": "Checkout",
      "evidence": "checkout and session aggregates: Returning; W1–W6",
      "next": "Replay consented sessions and inspect field errors (Returning).",
      "values": [
        67.2,
        73.7,
        75.9,
        81.8,
        86.1,
        92.0
      ]
    }
  ],
  "outcome": "conversion"
};

export default observatory(fixture);
