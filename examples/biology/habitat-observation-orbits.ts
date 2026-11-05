import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "habitat-observation-orbits",
  "title": "Habitat observation orbits",
  "category": "Biology",
  "summary": "Which survey habitats show lower recorded detection intensity?",
  "question": "Which survey habitats show lower recorded detection intensity?",
  "view": "orbits",
  "unit": "detections per hour",
  "periods": [
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6"
  ],
  "reference": 20,
  "direction": "below",
  "accent": "#ffc48f",
  "grain": "One habitat per survey; detections / observation hours; detectability is not controlled.",
  "source": "synthetic ecological survey summaries",
  "rows": [
    {
      "id": "habitat-observation-orbits-01",
      "label": "Forest",
      "owner": "Ecology study",
      "evidence": "synthetic ecological survey summaries: Forest; H1–H6",
      "next": "Compare observer effort and detection conditions; not population size (Forest).",
      "values": [
        30.1,
        36.2,
        27.8,
        38.7,
        33.3,
        34.9
      ]
    },
    {
      "id": "habitat-observation-orbits-02",
      "label": "Marsh",
      "owner": "Ecology study",
      "evidence": "synthetic ecological survey summaries: Marsh; H1–H6",
      "next": "Compare observer effort and detection conditions; not population size (Marsh).",
      "values": [
        18.7,
        21.4,
        24.5,
        28.3,
        26.9,
        22.8
      ]
    },
    {
      "id": "habitat-observation-orbits-03",
      "label": "Meadow",
      "owner": "Ecology study",
      "evidence": "synthetic ecological survey summaries: Meadow; H1–H6",
      "next": "Compare observer effort and detection conditions; not population size (Meadow).",
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
      "id": "habitat-observation-orbits-04",
      "label": "Dunes",
      "owner": "Ecology study",
      "evidence": "synthetic ecological survey summaries: Dunes; H1–H6",
      "next": "Compare observer effort and detection conditions; not population size (Dunes).",
      "values": [
        10.1,
        11.1,
        11.4,
        12.3,
        13.0,
        13.9
      ]
    },
    {
      "id": "habitat-observation-orbits-05",
      "label": "River",
      "owner": "Ecology study",
      "evidence": "synthetic ecological survey summaries: River; H1–H6",
      "next": "Compare observer effort and detection conditions; not population size (River).",
      "values": [
        23.0,
        25.5,
        30.2,
        27.2,
        32.5,
        34.7
      ]
    },
    {
      "id": "habitat-observation-orbits-06",
      "label": "Scrub",
      "owner": "Ecology study",
      "evidence": "synthetic ecological survey summaries: Scrub; H1–H6",
      "next": "Compare observer effort and detection conditions; not population size (Scrub).",
      "values": [
        17.7,
        16.4,
        14.1,
        15.9,
        12.9,
        11.9
      ]
    }
  ]
};

export default observatory(fixture);
