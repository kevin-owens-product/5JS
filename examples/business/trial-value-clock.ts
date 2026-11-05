import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "trial-value-clock",
  "title": "Trial value clock",
  "category": "Business",
  "summary": "Which trial cohorts take longest to reach their first useful result?",
  "question": "Which trial cohorts take longest to reach their first useful result?",
  "view": "helix",
  "unit": "hours to value",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 24,
  "direction": "above",
  "accent": "#b6a0ff",
  "grain": "One acquisition cohort per week; median hours among trials reaching value; non-completers excluded.",
  "source": "trial milestones",
  "rows": [
    {
      "id": "trial-value-clock-01",
      "label": "Organic",
      "owner": "Activation",
      "evidence": "trial milestones: Organic; W1–W6",
      "next": "Compare non-completion share before testing a guided milestone (Organic).",
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
      "id": "trial-value-clock-02",
      "label": "Paid search",
      "owner": "Activation",
      "evidence": "trial milestones: Paid search; W1–W6",
      "next": "Compare non-completion share before testing a guided milestone (Paid search).",
      "values": [
        29.1,
        35.0,
        27.0,
        37.5,
        32.2,
        33.8
      ]
    },
    {
      "id": "trial-value-clock-03",
      "label": "Referral",
      "owner": "Activation",
      "evidence": "trial milestones: Referral; W1–W6",
      "next": "Compare non-completion share before testing a guided milestone (Referral).",
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
      "id": "trial-value-clock-04",
      "label": "Partners",
      "owner": "Activation",
      "evidence": "trial milestones: Partners; W1–W6",
      "next": "Compare non-completion share before testing a guided milestone (Partners).",
      "values": [
        29.1,
        25.5,
        30.9,
        22.9,
        27.8,
        23.7
      ]
    },
    {
      "id": "trial-value-clock-05",
      "label": "Outbound",
      "owner": "Activation",
      "evidence": "trial milestones: Outbound; W1–W6",
      "next": "Compare non-completion share before testing a guided milestone (Outbound).",
      "values": [
        35.9,
        39.4,
        40.6,
        43.7,
        46.0,
        49.1
      ]
    },
    {
      "id": "trial-value-clock-06",
      "label": "Community",
      "owner": "Activation",
      "evidence": "trial milestones: Community; W1–W6",
      "next": "Compare non-completion share before testing a guided milestone (Community).",
      "values": [
        12.3,
        13.7,
        16.2,
        14.5,
        17.4,
        18.6
      ]
    }
  ],
  "outcome": "conversion"
};

export default observatory(fixture);
