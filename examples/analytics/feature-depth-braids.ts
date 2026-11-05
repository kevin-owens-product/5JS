import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "feature-depth-braids",
  "title": "Feature depth braids",
  "category": "Analytics",
  "summary": "Which features have repeat use rather than one-off adoption?",
  "question": "Which features have repeat use rather than one-off adoption?",
  "view": "braids",
  "unit": "weekly uses per adopter",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 8,
  "direction": "below",
  "accent": "#f195bd",
  "grain": "One feature per week; uses / active adopting accounts; accounts can use multiple features.",
  "source": "feature events and accounts",
  "rows": [
    {
      "id": "feature-depth-braids-01",
      "label": "Reports",
      "owner": "Product analytics",
      "evidence": "feature events and accounts: Reports; W1–W6",
      "next": "Interview low-frequency adopters and inspect workflow fit (Reports).",
      "values": [
        13.4,
        11.8,
        14.3,
        10.6,
        12.8,
        10.9
      ]
    },
    {
      "id": "feature-depth-braids-02",
      "label": "Exports",
      "owner": "Product analytics",
      "evidence": "feature events and accounts: Exports; W1–W6",
      "next": "Interview low-frequency adopters and inspect workflow fit (Exports).",
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
      "id": "feature-depth-braids-03",
      "label": "Alerts",
      "owner": "Product analytics",
      "evidence": "feature events and accounts: Alerts; W1–W6",
      "next": "Interview low-frequency adopters and inspect workflow fit (Alerts).",
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
      "id": "feature-depth-braids-04",
      "label": "Boards",
      "owner": "Product analytics",
      "evidence": "feature events and accounts: Boards; W1–W6",
      "next": "Interview low-frequency adopters and inspect workflow fit (Boards).",
      "values": [
        8.3,
        7.6,
        6.6,
        7.4,
        6.0,
        5.5
      ]
    },
    {
      "id": "feature-depth-braids-05",
      "label": "Segments",
      "owner": "Product analytics",
      "evidence": "feature events and accounts: Segments; W1–W6",
      "next": "Interview low-frequency adopters and inspect workflow fit (Segments).",
      "values": [
        3.8,
        4.5,
        3.5,
        4.8,
        4.2,
        4.4
      ]
    },
    {
      "id": "feature-depth-braids-06",
      "label": "Automations",
      "owner": "Product analytics",
      "evidence": "feature events and accounts: Automations; W1–W6",
      "next": "Interview low-frequency adopters and inspect workflow fit (Automations).",
      "values": [
        11.7,
        13.3,
        15.3,
        17.7,
        16.8,
        14.2
      ]
    }
  ],
  "outcome": "product"
};

export default observatory(fixture);
