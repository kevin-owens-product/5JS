import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "cache-efficiency-orbits",
  "title": "Cache efficiency orbits",
  "category": "Engineering",
  "summary": "Which cache namespaces lose effectiveness under changing workload?",
  "question": "Which cache namespaces lose effectiveness under changing workload?",
  "view": "orbits",
  "unit": "hit rate %",
  "periods": [
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6"
  ],
  "reference": 80,
  "direction": "below",
  "accent": "#ffc48f",
  "grain": "One cache namespace per hour; hits / lookups, not saved latency.",
  "source": "cache counters",
  "rows": [
    {
      "id": "cache-efficiency-orbits-01",
      "label": "Profiles",
      "owner": "Performance",
      "evidence": "cache counters: Profiles; H1–H6",
      "next": "Review key cardinality, expiry and workload before resizing (Profiles).",
      "values": [
        86.5,
        99.5,
        80.0,
        99.5,
        95.7,
        99.5
      ]
    },
    {
      "id": "cache-efficiency-orbits-02",
      "label": "Search",
      "owner": "Performance",
      "evidence": "cache counters: Search; H1–H6",
      "next": "Review key cardinality, expiry and workload before resizing (Search).",
      "values": [
        49.9,
        57.0,
        65.3,
        75.5,
        71.7,
        60.8
      ]
    },
    {
      "id": "cache-efficiency-orbits-03",
      "label": "Catalog",
      "owner": "Performance",
      "evidence": "cache counters: Catalog; H1–H6",
      "next": "Review key cardinality, expiry and workload before resizing (Catalog).",
      "values": [
        97.4,
        85.3,
        99.5,
        76.6,
        93.1,
        79.2
      ]
    },
    {
      "id": "cache-efficiency-orbits-04",
      "label": "Sessions",
      "owner": "Performance",
      "evidence": "cache counters: Sessions; H1–H6",
      "next": "Review key cardinality, expiry and workload before resizing (Sessions).",
      "values": [
        87.4,
        96.0,
        98.8,
        99.5,
        99.5,
        99.5
      ]
    },
    {
      "id": "cache-efficiency-orbits-05",
      "label": "Reports",
      "owner": "Performance",
      "evidence": "cache counters: Reports; H1–H6",
      "next": "Review key cardinality, expiry and workload before resizing (Reports).",
      "values": [
        47.6,
        52.8,
        62.6,
        56.3,
        67.3,
        71.9
      ]
    },
    {
      "id": "cache-efficiency-orbits-06",
      "label": "Assets",
      "owner": "Performance",
      "evidence": "cache counters: Assets; H1–H6",
      "next": "Review key cardinality, expiry and workload before resizing (Assets).",
      "values": [
        97.9,
        90.5,
        78.0,
        88.0,
        71.4,
        65.6
      ]
    }
  ]
};

export default observatory(fixture);
