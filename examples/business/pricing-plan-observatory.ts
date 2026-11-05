import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "pricing-plan-observatory",
  "title": "Pricing plan observatory",
  "category": "Business",
  "summary": "Which pricing plans diverge between first and current completion?",
  "question": "Which pricing plans diverge between first and current completion?",
  "view": "constellation",
  "unit": "checkout completion %",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 60,
  "direction": "below",
  "accent": "#e0e990",
  "grain": "One plan cohort per week; completed / started checkouts; plan selection is not randomized.",
  "source": "plan and checkout aggregates",
  "rows": [
    {
      "id": "pricing-plan-observatory-01",
      "label": "Starter",
      "owner": "Monetization",
      "evidence": "plan and checkout aggregates: Starter; W1–W6",
      "next": "Review plan eligibility and segment mix before changing packaging (Starter).",
      "values": [
        66.2,
        72.7,
        74.9,
        80.6,
        85.0,
        90.7
      ]
    },
    {
      "id": "pricing-plan-observatory-02",
      "label": "Team",
      "owner": "Monetization",
      "evidence": "plan and checkout aggregates: Team; W1–W6",
      "next": "Review plan eligibility and segment mix before changing packaging (Team).",
      "values": [
        55.8,
        61.9,
        73.4,
        66.0,
        78.9,
        84.3
      ]
    },
    {
      "id": "pricing-plan-observatory-03",
      "label": "Growth",
      "owner": "Monetization",
      "evidence": "plan and checkout aggregates: Growth; W1–W6",
      "next": "Review plan eligibility and segment mix before changing packaging (Growth).",
      "values": [
        72.0,
        66.5,
        57.3,
        64.7,
        52.5,
        48.2
      ]
    },
    {
      "id": "pricing-plan-observatory-04",
      "label": "Business",
      "owner": "Monetization",
      "evidence": "plan and checkout aggregates: Business; W1–W6",
      "next": "Review plan eligibility and segment mix before changing packaging (Business).",
      "values": [
        50.8,
        61.0,
        47.0,
        65.3,
        56.2,
        58.9
      ]
    },
    {
      "id": "pricing-plan-observatory-05",
      "label": "Scale",
      "owner": "Monetization",
      "evidence": "plan and checkout aggregates: Scale; W1–W6",
      "next": "Review plan eligibility and segment mix before changing packaging (Scale).",
      "values": [
        38.2,
        43.6,
        50.0,
        57.8,
        54.9,
        46.5
      ]
    },
    {
      "id": "pricing-plan-observatory-06",
      "label": "Enterprise",
      "owner": "Monetization",
      "evidence": "plan and checkout aggregates: Enterprise; W1–W6",
      "next": "Review plan eligibility and segment mix before changing packaging (Enterprise).",
      "values": [
        48.2,
        42.1,
        51.2,
        37.8,
        46.0,
        39.1
      ]
    }
  ],
  "outcome": "conversion"
};

export default observatory(fixture);
