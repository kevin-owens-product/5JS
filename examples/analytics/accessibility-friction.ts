import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "accessibility-friction",
  "title": "Accessibility friction atlas",
  "category": "Analytics",
  "summary": "Which audited tasks have unresolved accessibility blockers?",
  "question": "Which audited tasks have unresolved accessibility blockers?",
  "view": "orbits",
  "unit": "blocked task %",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 15,
  "direction": "above",
  "accent": "#b6a0ff",
  "grain": "One task per audit; blocked scripted checks / scripted checks; not a population prevalence estimate.",
  "source": "manual audit cases",
  "rows": [
    {
      "id": "accessibility-friction-01",
      "label": "Sign in",
      "owner": "Accessibility",
      "evidence": "manual audit cases: Sign in; S1–S6",
      "next": "Reproduce failures with assistive technology and include user research (Sign in).",
      "values": [
        14.2,
        13.1,
        11.3,
        12.7,
        10.3,
        9.5
      ]
    },
    {
      "id": "accessibility-friction-02",
      "label": "Checkout",
      "owner": "Accessibility",
      "evidence": "manual audit cases: Checkout; S1–S6",
      "next": "Reproduce failures with assistive technology and include user research (Checkout).",
      "values": [
        26.3,
        31.6,
        24.4,
        33.9,
        29.1,
        30.5
      ]
    },
    {
      "id": "accessibility-friction-03",
      "label": "Search",
      "owner": "Accessibility",
      "evidence": "manual audit cases: Search; S1–S6",
      "next": "Reproduce failures with assistive technology and include user research (Search).",
      "values": [
        14.8,
        16.9,
        19.4,
        22.4,
        21.3,
        18.1
      ]
    },
    {
      "id": "accessibility-friction-04",
      "label": "Export",
      "owner": "Accessibility",
      "evidence": "manual audit cases: Export; S1–S6",
      "next": "Reproduce failures with assistive technology and include user research (Export).",
      "values": [
        9.0,
        7.8,
        9.5,
        7.0,
        8.6,
        7.3
      ]
    },
    {
      "id": "accessibility-friction-05",
      "label": "Invite",
      "owner": "Accessibility",
      "evidence": "manual audit cases: Invite; S1–S6",
      "next": "Reproduce failures with assistive technology and include user research (Invite).",
      "values": [
        20.2,
        22.2,
        22.9,
        24.6,
        26.0,
        27.7
      ]
    },
    {
      "id": "accessibility-friction-06",
      "label": "Settings",
      "owner": "Accessibility",
      "evidence": "manual audit cases: Settings; S1–S6",
      "next": "Reproduce failures with assistive technology and include user research (Settings).",
      "values": [
        11.5,
        12.7,
        15.1,
        13.6,
        16.2,
        17.4
      ]
    }
  ],
  "outcome": "product"
};

export default observatory(fixture);
