import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "search-zero-results",
  "title": "Search zero-result terrain",
  "category": "Analytics",
  "summary": "Which search intents repeatedly fail to find a useful result?",
  "question": "Which search intents repeatedly fail to find a useful result?",
  "view": "ridges",
  "unit": "zero-result %",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 10,
  "direction": "above",
  "accent": "#ffc48f",
  "grain": "One disjoint query intent per week; zero-result searches / searches.",
  "source": "search events and query classifications",
  "rows": [
    {
      "id": "search-zero-results-01",
      "label": "Setup",
      "owner": "Search",
      "evidence": "search events and query classifications: Setup; W1–W6",
      "next": "Inspect anonymized queries and result coverage before changing ranking (Setup).",
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
      "id": "search-zero-results-02",
      "label": "Pricing",
      "owner": "Search",
      "evidence": "search events and query classifications: Pricing; W1–W6",
      "next": "Inspect anonymized queries and result coverage before changing ranking (Pricing).",
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
      "id": "search-zero-results-03",
      "label": "Export",
      "owner": "Search",
      "evidence": "search events and query classifications: Export; W1–W6",
      "next": "Inspect anonymized queries and result coverage before changing ranking (Export).",
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
      "id": "search-zero-results-04",
      "label": "Access",
      "owner": "Search",
      "evidence": "search events and query classifications: Access; W1–W6",
      "next": "Inspect anonymized queries and result coverage before changing ranking (Access).",
      "values": [
        4.6,
        5.0,
        5.2,
        5.6,
        5.9,
        6.3
      ]
    },
    {
      "id": "search-zero-results-05",
      "label": "Billing",
      "owner": "Search",
      "evidence": "search events and query classifications: Billing; W1–W6",
      "next": "Inspect anonymized queries and result coverage before changing ranking (Billing).",
      "values": [
        7.4,
        8.2,
        9.7,
        8.7,
        10.4,
        11.2
      ]
    },
    {
      "id": "search-zero-results-06",
      "label": "API",
      "owner": "Search",
      "evidence": "search events and query classifications: API; W1–W6",
      "next": "Inspect anonymized queries and result coverage before changing ranking (API).",
      "values": [
        24.8,
        22.9,
        19.7,
        22.3,
        18.1,
        16.6
      ]
    }
  ],
  "outcome": "conversion"
};

export default observatory(fixture);
