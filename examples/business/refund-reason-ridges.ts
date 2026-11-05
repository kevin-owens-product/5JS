import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "refund-reason-ridges",
  "title": "Refund reason ridges",
  "category": "Business",
  "summary": "Which refund reasons need product or service investigation?",
  "question": "Which refund reasons need product or service investigation?",
  "view": "ridges",
  "unit": "refund requests",
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
  "accent": "#f195bd",
  "grain": "One mutually exclusive primary reason per week; counts are not refund rates.",
  "source": "refund cases linked to orders",
  "rows": [
    {
      "id": "refund-reason-ridges-01",
      "label": "Quality",
      "owner": "Operations",
      "evidence": "refund cases linked to orders: Quality; W1–W6",
      "next": "Inspect linked orders and total order volume before choosing a fix (Quality).",
      "values": [
        73,
        64,
        77,
        57,
        70,
        59
      ]
    },
    {
      "id": "refund-reason-ridges-02",
      "label": "Late arrival",
      "owner": "Operations",
      "evidence": "refund cases linked to orders: Late arrival; W1–W6",
      "next": "Inspect linked orders and total order volume before choosing a fix (Late arrival).",
      "values": [
        85,
        93,
        96,
        103,
        109,
        116
      ]
    },
    {
      "id": "refund-reason-ridges-03",
      "label": "Wrong item",
      "owner": "Operations",
      "evidence": "refund cases linked to orders: Wrong item; W1–W6",
      "next": "Inspect linked orders and total order volume before choosing a fix (Wrong item).",
      "values": [
        28,
        31,
        37,
        33,
        39,
        42
      ]
    },
    {
      "id": "refund-reason-ridges-04",
      "label": "Duplicate",
      "owner": "Operations",
      "evidence": "refund cases linked to orders: Duplicate; W1–W6",
      "next": "Inspect linked orders and total order volume before choosing a fix (Duplicate).",
      "values": [
        27,
        25,
        22,
        24,
        20,
        18
      ]
    },
    {
      "id": "refund-reason-ridges-05",
      "label": "Expectation",
      "owner": "Operations",
      "evidence": "refund cases linked to orders: Expectation; W1–W6",
      "next": "Inspect linked orders and total order volume before choosing a fix (Expectation).",
      "values": [
        72,
        87,
        67,
        93,
        80,
        84
      ]
    },
    {
      "id": "refund-reason-ridges-06",
      "label": "Other",
      "owner": "Operations",
      "evidence": "refund cases linked to orders: Other; W1–W6",
      "next": "Inspect linked orders and total order volume before choosing a fix (Other).",
      "values": [
        33,
        37,
        43,
        50,
        47,
        40
      ]
    }
  ],
  "outcome": "retention"
};

export default observatory(fixture);
