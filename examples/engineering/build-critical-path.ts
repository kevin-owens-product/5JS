import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "build-critical-path",
  "title": "Build critical-path bridges",
  "category": "Engineering",
  "summary": "Which build stages merit caching or dependency investigation?",
  "question": "Which build stages merit caching or dependency investigation?",
  "view": "bridges",
  "unit": "stage seconds",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 90,
  "direction": "above",
  "accent": "#b6a0ff",
  "grain": "One build stage per run; median duration across comparable jobs; stages can overlap.",
  "source": "CI timing records",
  "rows": [
    {
      "id": "build-critical-path-01",
      "label": "Install",
      "owner": "Developer experience",
      "evidence": "CI timing records: Install; S1–S6",
      "next": "Inspect cache misses and dependency ordering before parallelizing (Install).",
      "values": [
        53.1,
        49.1,
        42.3,
        47.7,
        38.7,
        35.6
      ]
    },
    {
      "id": "build-critical-path-02",
      "label": "Types",
      "owner": "Developer experience",
      "evidence": "CI timing records: Types; S1–S6",
      "next": "Inspect cache misses and dependency ordering before parallelizing (Types).",
      "values": [
        65.8,
        79.1,
        60.9,
        84.7,
        72.8,
        76.3
      ]
    },
    {
      "id": "build-critical-path-03",
      "label": "Unit",
      "owner": "Developer experience",
      "evidence": "CI timing records: Unit; S1–S6",
      "next": "Inspect cache misses and dependency ordering before parallelizing (Unit).",
      "values": [
        85.8,
        97.9,
        112.2,
        129.8,
        123.2,
        104.5
      ]
    },
    {
      "id": "build-critical-path-04",
      "label": "Bundle",
      "owner": "Developer experience",
      "evidence": "CI timing records: Bundle; S1–S6",
      "next": "Inspect cache misses and dependency ordering before parallelizing (Bundle).",
      "values": [
        95.2,
        83.3,
        101.1,
        74.8,
        91.0,
        77.4
      ]
    },
    {
      "id": "build-critical-path-05",
      "label": "Browser",
      "owner": "Developer experience",
      "evidence": "CI timing records: Browser; S1–S6",
      "next": "Inspect cache misses and dependency ordering before parallelizing (Browser).",
      "values": [
        211.6,
        232.3,
        239.2,
        257.6,
        271.4,
        289.8
      ]
    },
    {
      "id": "build-critical-path-06",
      "label": "Package",
      "owner": "Developer experience",
      "evidence": "CI timing records: Package; S1–S6",
      "next": "Inspect cache misses and dependency ordering before parallelizing (Package).",
      "values": [
        49.2,
        54.6,
        64.8,
        58.2,
        69.6,
        74.4
      ]
    }
  ]
};

export default observatory(fixture);
