import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "query-cost-landscape",
  "title": "Query cost landscape",
  "category": "Data",
  "summary": "Which query families scan more data than their review reference?",
  "question": "Which query families scan more data than their review reference?",
  "view": "ridges",
  "unit": "GB scanned",
  "periods": [
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6"
  ],
  "reference": 100,
  "direction": "above",
  "accent": "#e0e990",
  "grain": "One query family per day; median bytes scanned per query expressed in decimal GB.",
  "source": "warehouse query history",
  "rows": [
    {
      "id": "query-cost-landscape-01",
      "label": "Funnels",
      "owner": "Data infrastructure",
      "evidence": "warehouse query history: Funnels; D1–D6",
      "next": "Inspect partition pruning and repeated scans before optimizing (Funnels).",
      "values": [
        41.4,
        45.5,
        46.8,
        50.4,
        53.1,
        56.7
      ]
    },
    {
      "id": "query-cost-landscape-02",
      "label": "Cohorts",
      "owner": "Data infrastructure",
      "evidence": "warehouse query history: Cohorts; D1–D6",
      "next": "Inspect partition pruning and repeated scans before optimizing (Cohorts).",
      "values": [
        98.4,
        109.2,
        129.6,
        116.4,
        139.2,
        148.8
      ]
    },
    {
      "id": "query-cost-landscape-03",
      "label": "Finance",
      "owner": "Data infrastructure",
      "evidence": "warehouse query history: Finance; D1–D6",
      "next": "Inspect partition pruning and repeated scans before optimizing (Finance).",
      "values": [
        88.5,
        81.8,
        70.5,
        79.5,
        64.5,
        59.2
      ]
    },
    {
      "id": "query-cost-landscape-04",
      "label": "Search",
      "owner": "Data infrastructure",
      "evidence": "warehouse query history: Search; D1–D6",
      "next": "Inspect partition pruning and repeated scans before optimizing (Search).",
      "values": [
        32.9,
        39.5,
        30.4,
        42.4,
        36.4,
        38.2
      ]
    },
    {
      "id": "query-cost-landscape-05",
      "label": "Dashboards",
      "owner": "Data infrastructure",
      "evidence": "warehouse query history: Dashboards; D1–D6",
      "next": "Inspect partition pruning and repeated scans before optimizing (Dashboards).",
      "values": [
        124.8,
        142.4,
        163.2,
        188.8,
        179.2,
        152.0
      ]
    },
    {
      "id": "query-cost-landscape-06",
      "label": "Exports",
      "owner": "Data infrastructure",
      "evidence": "warehouse query history: Exports; D1–D6",
      "next": "Inspect partition pruning and repeated scans before optimizing (Exports).",
      "values": [
        106.4,
        93.1,
        113.0,
        83.6,
        101.7,
        86.5
      ]
    }
  ]
};

export default observatory(fixture);
