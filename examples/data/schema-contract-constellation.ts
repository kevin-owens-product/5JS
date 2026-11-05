import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "schema-contract-constellation",
  "title": "Schema contract constellation",
  "category": "Data",
  "summary": "Which producer contracts accumulate validation failures?",
  "question": "Which producer contracts accumulate validation failures?",
  "view": "constellation",
  "unit": "contract failures",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 5,
  "direction": "above",
  "accent": "#82eacb",
  "grain": "One producer per release batch; distinct failing contract checks, not failing rows.",
  "source": "schema contract test reports",
  "rows": [
    {
      "id": "schema-contract-constellation-01",
      "label": "Web",
      "owner": "Data governance",
      "evidence": "schema contract test reports: Web; S1–S6",
      "next": "Review breaking fields with the producer and affected consumers (Web).",
      "values": [
        2,
        2,
        2,
        2,
        2,
        2
      ]
    },
    {
      "id": "schema-contract-constellation-02",
      "label": "Mobile",
      "owner": "Data governance",
      "evidence": "schema contract test reports: Mobile; S1–S6",
      "next": "Review breaking fields with the producer and affected consumers (Mobile).",
      "values": [
        8,
        8,
        7,
        7,
        6,
        6
      ]
    },
    {
      "id": "schema-contract-constellation-03",
      "label": "Billing",
      "owner": "Data governance",
      "evidence": "schema contract test reports: Billing; S1–S6",
      "next": "Review breaking fields with the producer and affected consumers (Billing).",
      "values": [
        4,
        4,
        4,
        5,
        4,
        4
      ]
    },
    {
      "id": "schema-contract-constellation-04",
      "label": "CRM",
      "owner": "Data governance",
      "evidence": "schema contract test reports: CRM; S1–S6",
      "next": "Review breaking fields with the producer and affected consumers (CRM).",
      "values": [
        2,
        3,
        3,
        4,
        3,
        3
      ]
    },
    {
      "id": "schema-contract-constellation-05",
      "label": "Support",
      "owner": "Data governance",
      "evidence": "schema contract test reports: Support; S1–S6",
      "next": "Review breaking fields with the producer and affected consumers (Support).",
      "values": [
        10,
        9,
        11,
        8,
        10,
        8
      ]
    },
    {
      "id": "schema-contract-constellation-06",
      "label": "Warehouse",
      "owner": "Data governance",
      "evidence": "schema contract test reports: Warehouse; S1–S6",
      "next": "Review breaking fields with the producer and affected consumers (Warehouse).",
      "values": [
        6,
        6,
        6,
        7,
        7,
        8
      ]
    }
  ]
};

export default observatory(fixture);
