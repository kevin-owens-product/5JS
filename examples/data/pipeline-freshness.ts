import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "pipeline-freshness",
  "title": "Pipeline freshness coils",
  "category": "Data",
  "summary": "Which data products become stale before consumers notice?",
  "question": "Which data products become stale before consumers notice?",
  "view": "helix",
  "unit": "lag minutes",
  "periods": [
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6"
  ],
  "reference": 30,
  "direction": "above",
  "accent": "#8acbff",
  "grain": "One dataset per hourly inspection; elapsed time since upstream event watermark.",
  "source": "pipeline watermark snapshots",
  "rows": [
    {
      "id": "pipeline-freshness-01",
      "label": "Accounts",
      "owner": "Data operations",
      "evidence": "pipeline watermark snapshots: Accounts; H1–H6",
      "next": "Inspect upstream arrivals and failed stages; fetch time is not freshness (Accounts).",
      "values": [
        9.4,
        10.7,
        12.2,
        14.2,
        13.4,
        11.4
      ]
    },
    {
      "id": "pipeline-freshness-02",
      "label": "Sessions",
      "owner": "Data operations",
      "evidence": "pipeline watermark snapshots: Sessions; H1–H6",
      "next": "Inspect upstream arrivals and failed stages; fetch time is not freshness (Sessions).",
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
      "id": "pipeline-freshness-03",
      "label": "Orders",
      "owner": "Data operations",
      "evidence": "pipeline watermark snapshots: Orders; H1–H6",
      "next": "Inspect upstream arrivals and failed stages; fetch time is not freshness (Orders).",
      "values": [
        32.2,
        35.4,
        36.4,
        39.2,
        41.3,
        44.1
      ]
    },
    {
      "id": "pipeline-freshness-04",
      "label": "Usage",
      "owner": "Data operations",
      "evidence": "pipeline watermark snapshots: Usage; H1–H6",
      "next": "Inspect upstream arrivals and failed stages; fetch time is not freshness (Usage).",
      "values": [
        18.0,
        20.0,
        23.8,
        21.3,
        25.5,
        27.3
      ]
    },
    {
      "id": "pipeline-freshness-05",
      "label": "Tickets",
      "owner": "Data operations",
      "evidence": "pipeline watermark snapshots: Tickets; H1–H6",
      "next": "Inspect upstream arrivals and failed stages; fetch time is not freshness (Tickets).",
      "values": [
        56.6,
        52.3,
        45.1,
        50.9,
        41.3,
        37.9
      ]
    },
    {
      "id": "pipeline-freshness-06",
      "label": "Research",
      "owner": "Data operations",
      "evidence": "pipeline watermark snapshots: Research; H1–H6",
      "next": "Inspect upstream arrivals and failed stages; fetch time is not freshness (Research).",
      "values": [
        61.1,
        73.4,
        56.5,
        78.6,
        67.6,
        70.9
      ]
    }
  ]
};

export default observatory(fixture);
