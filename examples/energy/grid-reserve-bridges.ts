import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "grid-reserve-bridges",
  "title": "Grid reserve bridges",
  "category": "Energy",
  "summary": "Which fictional zones fall below an illustrative reserve reference?",
  "question": "Which fictional zones fall below an illustrative reserve reference?",
  "view": "bridges",
  "unit": "reserve MW",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 150,
  "direction": "below",
  "accent": "#ffc48f",
  "grain": "One zone per dispatch interval; available reserve capacity; not a reliability forecast.",
  "source": "synthetic dispatch snapshots",
  "rows": [
    {
      "id": "grid-reserve-bridges-01",
      "label": "North",
      "owner": "Grid study",
      "evidence": "synthetic dispatch snapshots: North; S1–S6",
      "next": "Inspect contingency assumptions and transfer constraints (North).",
      "values": [
        178.6,
        214.7,
        165.3,
        229.9,
        197.6,
        207.1
      ]
    },
    {
      "id": "grid-reserve-bridges-02",
      "label": "South",
      "owner": "Grid study",
      "evidence": "synthetic dispatch snapshots: South; S1–S6",
      "next": "Inspect contingency assumptions and transfer constraints (South).",
      "values": [
        101.4,
        115.7,
        132.6,
        153.4,
        145.6,
        123.5
      ]
    },
    {
      "id": "grid-reserve-bridges-03",
      "label": "East",
      "owner": "Grid study",
      "evidence": "synthetic dispatch snapshots: East; S1–S6",
      "next": "Inspect contingency assumptions and transfer constraints (East).",
      "values": [
        190.4,
        166.6,
        202.3,
        149.6,
        181.9,
        154.7
      ]
    },
    {
      "id": "grid-reserve-bridges-04",
      "label": "West",
      "owner": "Grid study",
      "evidence": "synthetic dispatch snapshots: West; S1–S6",
      "next": "Inspect contingency assumptions and transfer constraints (West).",
      "values": [
        105.8,
        116.2,
        119.6,
        128.8,
        135.7,
        144.9
      ]
    },
    {
      "id": "grid-reserve-bridges-05",
      "label": "Coastal",
      "owner": "Grid study",
      "evidence": "synthetic dispatch snapshots: Coastal; S1–S6",
      "next": "Inspect contingency assumptions and transfer constraints (Coastal).",
      "values": [
        180.4,
        200.2,
        237.6,
        213.4,
        255.2,
        272.8
      ]
    },
    {
      "id": "grid-reserve-bridges-06",
      "label": "Central",
      "owner": "Grid study",
      "evidence": "synthetic dispatch snapshots: Central; S1–S6",
      "next": "Inspect contingency assumptions and transfer constraints (Central).",
      "values": [
        171.1,
        158.1,
        136.3,
        153.7,
        124.7,
        114.6
      ]
    }
  ]
};

export default observatory(fixture);
