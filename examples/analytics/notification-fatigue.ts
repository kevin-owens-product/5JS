import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "notification-fatigue",
  "title": "Notification fatigue coils",
  "category": "Analytics",
  "summary": "Which notification programs have rising opt-out shares?",
  "question": "Which notification programs have rising opt-out shares?",
  "view": "helix",
  "unit": "opt-out %",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 4,
  "direction": "above",
  "accent": "#82eacb",
  "grain": "One program per week; recipients opting out / delivered recipients; cohorts can overlap.",
  "source": "delivery and preference events",
  "rows": [
    {
      "id": "notification-fatigue-01",
      "label": "Digest",
      "owner": "Lifecycle",
      "evidence": "delivery and preference events: Digest; W1–W6",
      "next": "Review frequency and relevance with opted-out users (Digest).",
      "values": [
        1.6,
        1.8,
        2.2,
        1.9,
        2.3,
        2.5
      ]
    },
    {
      "id": "notification-fatigue-02",
      "label": "Alerts",
      "owner": "Lifecycle",
      "evidence": "delivery and preference events: Alerts; W1–W6",
      "next": "Review frequency and relevance with opted-out users (Alerts).",
      "values": [
        5.9,
        5.5,
        4.7,
        5.3,
        4.3,
        4.0
      ]
    },
    {
      "id": "notification-fatigue-03",
      "label": "Tips",
      "owner": "Lifecycle",
      "evidence": "delivery and preference events: Tips; W1–W6",
      "next": "Review frequency and relevance with opted-out users (Tips).",
      "values": [
        2.8,
        3.4,
        2.6,
        3.6,
        3.1,
        3.3
      ]
    },
    {
      "id": "notification-fatigue-04",
      "label": "Renewal",
      "owner": "Lifecycle",
      "evidence": "delivery and preference events: Renewal; W1–W6",
      "next": "Review frequency and relevance with opted-out users (Renewal).",
      "values": [
        0.8,
        0.9,
        1.0,
        1.2,
        1.1,
        0.9
      ]
    },
    {
      "id": "notification-fatigue-05",
      "label": "Community",
      "owner": "Lifecycle",
      "evidence": "delivery and preference events: Community; W1–W6",
      "next": "Review frequency and relevance with opted-out users (Community).",
      "values": [
        4.5,
        3.9,
        4.8,
        3.5,
        4.3,
        3.6
      ]
    },
    {
      "id": "notification-fatigue-06",
      "label": "Offers",
      "owner": "Lifecycle",
      "evidence": "delivery and preference events: Offers; W1–W6",
      "next": "Review frequency and relevance with opted-out users (Offers).",
      "values": [
        6.4,
        7.1,
        7.3,
        7.8,
        8.3,
        8.8
      ]
    }
  ],
  "outcome": "retention"
};

export default observatory(fixture);
