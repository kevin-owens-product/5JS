import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "research-confidence-map",
  "title": "Research coverage map",
  "category": "Analytics",
  "summary": "Which research themes lack documented evidence coverage?",
  "question": "Which research themes lack documented evidence coverage?",
  "view": "radar",
  "unit": "covered questions %",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 70,
  "direction": "below",
  "accent": "#8acbff",
  "grain": "One research theme per sprint; questions with documented evidence / planned questions; not confidence.",
  "source": "interviews and research questions",
  "rows": [
    {
      "id": "research-confidence-map-01",
      "label": "Onboarding",
      "owner": "Research",
      "evidence": "interviews and research questions: Onboarding; S1–S6",
      "next": "Seek counter-evidence and missing participant segments (Onboarding).",
      "values": [
        64.0,
        73.0,
        83.6,
        96.8,
        91.8,
        77.9
      ]
    },
    {
      "id": "research-confidence-map-02",
      "label": "Sharing",
      "owner": "Research",
      "evidence": "interviews and research questions: Sharing; S1–S6",
      "next": "Seek counter-evidence and missing participant segments (Sharing).",
      "values": [
        63.8,
        55.9,
        67.8,
        50.2,
        61.0,
        51.9
      ]
    },
    {
      "id": "research-confidence-map-03",
      "label": "Reporting",
      "owner": "Research",
      "evidence": "interviews and research questions: Reporting; S1–S6",
      "next": "Seek counter-evidence and missing participant segments (Reporting).",
      "values": [
        60.7,
        66.7,
        68.6,
        73.9,
        77.9,
        83.2
      ]
    },
    {
      "id": "research-confidence-map-04",
      "label": "Automation",
      "owner": "Research",
      "evidence": "interviews and research questions: Automation; S1–S6",
      "next": "Seek counter-evidence and missing participant segments (Automation).",
      "values": [
        33.6,
        37.3,
        44.3,
        39.8,
        47.6,
        50.8
      ]
    },
    {
      "id": "research-confidence-map-05",
      "label": "Permissions",
      "owner": "Research",
      "evidence": "interviews and research questions: Permissions; S1–S6",
      "next": "Seek counter-evidence and missing participant segments (Permissions).",
      "values": [
        89.7,
        82.8,
        71.4,
        80.6,
        65.4,
        60.0
      ]
    },
    {
      "id": "research-confidence-map-06",
      "label": "Mobile",
      "owner": "Research",
      "evidence": "interviews and research questions: Mobile; S1–S6",
      "next": "Seek counter-evidence and missing participant segments (Mobile).",
      "values": [
        32.9,
        39.5,
        30.4,
        42.4,
        36.4,
        38.2
      ]
    }
  ],
  "outcome": "product"
};

export default observatory(fixture);
