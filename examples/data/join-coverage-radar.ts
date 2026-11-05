import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "join-coverage-radar",
  "title": "Join coverage radar",
  "category": "Data",
  "summary": "Which joins lose the evidence needed to connect a customer journey?",
  "question": "Which joins lose the evidence needed to connect a customer journey?",
  "view": "radar",
  "unit": "matched rows %",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 95,
  "direction": "below",
  "accent": "#f195bd",
  "grain": "One left-join contract per batch; left rows with at least one match / left rows; multiplicity needs separate review.",
  "source": "join validation reports",
  "rows": [
    {
      "id": "join-coverage-radar-01",
      "label": "User→Account",
      "owner": "Analytics engineering",
      "evidence": "join validation reports: User→Account; S1–S6",
      "next": "Inspect unmatched keys and one-to-many expansion before aggregating (User→Account).",
      "values": [
        99.5,
        96.0,
        99.5,
        86.2,
        99.5,
        89.2
      ]
    },
    {
      "id": "join-coverage-radar-02",
      "label": "Order→User",
      "owner": "Analytics engineering",
      "evidence": "join validation reports: Order→User; S1–S6",
      "next": "Inspect unmatched keys and one-to-many expansion before aggregating (Order→User).",
      "values": [
        84.6,
        92.9,
        95.7,
        99.5,
        99.5,
        99.5
      ]
    },
    {
      "id": "join-coverage-radar-03",
      "label": "Ticket→Account",
      "owner": "Analytics engineering",
      "evidence": "join validation reports: Ticket→Account; S1–S6",
      "next": "Inspect unmatched keys and one-to-many expansion before aggregating (Ticket→Account).",
      "values": [
        78.7,
        87.4,
        99.5,
        93.1,
        99.5,
        99.5
      ]
    },
    {
      "id": "join-coverage-radar-04",
      "label": "Usage→Plan",
      "owner": "Analytics engineering",
      "evidence": "join validation reports: Usage→Plan; S1–S6",
      "next": "Inspect unmatched keys and one-to-many expansion before aggregating (Usage→Plan).",
      "values": [
        99.5,
        97.0,
        83.7,
        94.3,
        76.5,
        70.3
      ]
    },
    {
      "id": "join-coverage-radar-05",
      "label": "Interview→Role",
      "owner": "Analytics engineering",
      "evidence": "join validation reports: Interview→Role; S1–S6",
      "next": "Inspect unmatched keys and one-to-many expansion before aggregating (Interview→Role).",
      "values": [
        79.0,
        94.9,
        73.1,
        99.5,
        87.4,
        91.6
      ]
    },
    {
      "id": "join-coverage-radar-06",
      "label": "Event→Session",
      "owner": "Analytics engineering",
      "evidence": "join validation reports: Event→Session; S1–S6",
      "next": "Inspect unmatched keys and one-to-many expansion before aggregating (Event→Session).",
      "values": [
        73.3,
        83.7,
        95.9,
        99.5,
        99.5,
        89.3
      ]
    }
  ]
};

export default observatory(fixture);
