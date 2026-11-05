import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "transit-transfer-braids",
  "title": "Transit transfer braids",
  "category": "Cities",
  "summary": "Which interchange journeys have repeated transfer misses?",
  "question": "Which interchange journeys have repeated transfer misses?",
  "view": "braids",
  "unit": "missed transfers %",
  "periods": [
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6"
  ],
  "reference": 12,
  "direction": "above",
  "accent": "#8acbff",
  "grain": "One interchange per weekday; missed scheduled connections / eligible transfer journeys.",
  "source": "synthetic vehicle and passenger aggregates",
  "rows": [
    {
      "id": "transit-transfer-braids-01",
      "label": "Central",
      "owner": "Transit planning",
      "evidence": "synthetic vehicle and passenger aggregates: Central; D1–D6",
      "next": "Inspect timetable slack and accessibility before changing headways (Central).",
      "values": [
        6.2,
        7.1,
        8.2,
        9.4,
        9.0,
        7.6
      ]
    },
    {
      "id": "transit-transfer-braids-02",
      "label": "Harbor",
      "owner": "Transit planning",
      "evidence": "synthetic vehicle and passenger aggregates: Harbor; D1–D6",
      "next": "Inspect timetable slack and accessibility before changing headways (Harbor).",
      "values": [
        17.9,
        15.7,
        19.0,
        14.1,
        17.1,
        14.6
      ]
    },
    {
      "id": "transit-transfer-braids-03",
      "label": "Airport",
      "owner": "Transit planning",
      "evidence": "synthetic vehicle and passenger aggregates: Airport; D1–D6",
      "next": "Inspect timetable slack and accessibility before changing headways (Airport).",
      "values": [
        19.3,
        21.2,
        21.8,
        23.5,
        24.8,
        26.5
      ]
    },
    {
      "id": "transit-transfer-braids-04",
      "label": "University",
      "owner": "Transit planning",
      "evidence": "synthetic vehicle and passenger aggregates: University; D1–D6",
      "next": "Inspect timetable slack and accessibility before changing headways (University).",
      "values": [
        8.2,
        9.1,
        10.8,
        9.7,
        11.6,
        12.4
      ]
    },
    {
      "id": "transit-transfer-braids-05",
      "label": "Market",
      "owner": "Transit planning",
      "evidence": "synthetic vehicle and passenger aggregates: Market; D1–D6",
      "next": "Inspect timetable slack and accessibility before changing headways (Market).",
      "values": [
        16.5,
        15.3,
        13.2,
        14.8,
        12.0,
        11.1
      ]
    },
    {
      "id": "transit-transfer-braids-06",
      "label": "West end",
      "owner": "Transit planning",
      "evidence": "synthetic vehicle and passenger aggregates: West end; D1–D6",
      "next": "Inspect timetable slack and accessibility before changing headways (West end).",
      "values": [
        5.6,
        6.8,
        5.2,
        7.3,
        6.2,
        6.5
      ]
    }
  ]
};

export default observatory(fixture);
