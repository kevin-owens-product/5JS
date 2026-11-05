import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "cohort-return-compass",
  "title": "Cohort return compass",
  "category": "Analytics",
  "summary": "Which fully observed acquisition cohorts have weaker seven-day return?",
  "question": "Which fully observed acquisition cohorts have weaker seven-day return?",
  "view": "constellation",
  "unit": "D7 return %",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 35,
  "direction": "below",
  "accent": "#8acbff",
  "grain": "One channel per weekly mature cohort; users returning on day seven / eligible new users.",
  "source": "signup cohorts and return events",
  "rows": [
    {
      "id": "cohort-return-compass-01",
      "label": "Organic",
      "owner": "Retention",
      "evidence": "signup cohorts and return events: Organic; W1–W6",
      "next": "Compare intent and activation evidence; do not infer channel causality (Organic).",
      "values": [
        32.8,
        37.4,
        42.8,
        49.6,
        47.0,
        39.9
      ]
    },
    {
      "id": "cohort-return-compass-02",
      "label": "Search ads",
      "owner": "Retention",
      "evidence": "signup cohorts and return events: Search ads; W1–W6",
      "next": "Compare intent and activation evidence; do not infer channel causality (Search ads).",
      "values": [
        32.5,
        28.4,
        34.5,
        25.5,
        31.0,
        26.4
      ]
    },
    {
      "id": "cohort-return-compass-03",
      "label": "Partners",
      "owner": "Retention",
      "evidence": "signup cohorts and return events: Partners; W1–W6",
      "next": "Compare intent and activation evidence; do not infer channel causality (Partners).",
      "values": [
        34.0,
        37.4,
        38.5,
        41.4,
        43.7,
        46.6
      ]
    },
    {
      "id": "cohort-return-compass-04",
      "label": "Referral",
      "owner": "Retention",
      "evidence": "signup cohorts and return events: Referral; W1–W6",
      "next": "Compare intent and activation evidence; do not infer channel causality (Referral).",
      "values": [
        41.8,
        46.4,
        55.1,
        49.5,
        59.2,
        63.2
      ]
    },
    {
      "id": "cohort-return-compass-05",
      "label": "Social",
      "owner": "Retention",
      "evidence": "signup cohorts and return events: Social; W1–W6",
      "next": "Compare intent and activation evidence; do not infer channel causality (Social).",
      "values": [
        28.3,
        26.2,
        22.6,
        25.4,
        20.6,
        19.0
      ]
    },
    {
      "id": "cohort-return-compass-06",
      "label": "Outbound",
      "owner": "Retention",
      "evidence": "signup cohorts and return events: Outbound; W1–W6",
      "next": "Compare intent and activation evidence; do not infer channel causality (Outbound).",
      "values": [
        30.1,
        36.2,
        27.8,
        38.7,
        33.3,
        34.9
      ]
    }
  ],
  "outcome": "retention"
};

export default observatory(fixture);
