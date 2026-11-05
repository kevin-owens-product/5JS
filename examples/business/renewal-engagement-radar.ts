import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "renewal-engagement-radar",
  "title": "Renewal engagement radar",
  "category": "Business",
  "summary": "Where is seat engagement thinning before renewal?",
  "question": "Where is seat engagement thinning before renewal?",
  "view": "radar",
  "unit": "active seats %",
  "periods": [
    "M1",
    "M2",
    "M3",
    "M4",
    "M5",
    "M6"
  ],
  "reference": 55,
  "direction": "below",
  "accent": "#ffc48f",
  "grain": "One account per monthly snapshot; active seats / purchased seats.",
  "source": "account-week usage joined to contracts",
  "rows": [
    {
      "id": "renewal-engagement-radar-01",
      "label": "Aster",
      "owner": "Customer success",
      "evidence": "account-week usage joined to contracts: Aster; M1–M6",
      "next": "Review usage with the account champion before proposing outreach (Aster).",
      "values": [
        67.7,
        81.4,
        62.6,
        87.1,
        74.9,
        78.5
      ]
    },
    {
      "id": "renewal-engagement-radar-02",
      "label": "Birch",
      "owner": "Customer success",
      "evidence": "account-week usage joined to contracts: Birch; M1–M6",
      "next": "Review usage with the account champion before proposing outreach (Birch).",
      "values": [
        37.4,
        42.7,
        49.0,
        56.6,
        53.8,
        45.6
      ]
    },
    {
      "id": "renewal-engagement-radar-03",
      "label": "Cedar",
      "owner": "Customer success",
      "evidence": "account-week usage joined to contracts: Cedar; M1–M6",
      "next": "Review usage with the account champion before proposing outreach (Cedar).",
      "values": [
        70.6,
        61.7,
        75.0,
        55.4,
        67.4,
        57.3
      ]
    },
    {
      "id": "renewal-engagement-radar-04",
      "label": "Dune",
      "owner": "Customer success",
      "evidence": "account-week usage joined to contracts: Dune; M1–M6",
      "next": "Review usage with the account champion before proposing outreach (Dune).",
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
      "id": "renewal-engagement-radar-05",
      "label": "Ember",
      "owner": "Customer success",
      "evidence": "account-week usage joined to contracts: Ember; M1–M6",
      "next": "Review usage with the account champion before proposing outreach (Ember).",
      "values": [
        66.4,
        73.7,
        87.5,
        78.6,
        94.0,
        99.5
      ]
    },
    {
      "id": "renewal-engagement-radar-06",
      "label": "Fjord",
      "owner": "Customer success",
      "evidence": "account-week usage joined to contracts: Fjord; M1–M6",
      "next": "Review usage with the account champion before proposing outreach (Fjord).",
      "values": [
        66.1,
        61.0,
        52.6,
        59.4,
        48.2,
        44.2
      ]
    }
  ],
  "outcome": "retention"
};

export default observatory(fixture);
