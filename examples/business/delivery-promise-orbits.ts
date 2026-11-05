import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "delivery-promise-orbits",
  "title": "Delivery promise orbits",
  "category": "Business",
  "summary": "Which fulfillment lanes repeatedly miss the customer promise?",
  "question": "Which fulfillment lanes repeatedly miss the customer promise?",
  "view": "orbits",
  "unit": "late orders %",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 12,
  "direction": "above",
  "accent": "#82eacb",
  "grain": "One fulfillment lane per week; late delivered orders / all delivered orders.",
  "source": "shipment and order joins",
  "rows": [
    {
      "id": "delivery-promise-orbits-01",
      "label": "North",
      "owner": "Fulfillment",
      "evidence": "shipment and order joins: North; W1–W6",
      "next": "Trace carrier scans and promise timestamps for affected orders (North).",
      "values": [
        6.6,
        7.3,
        8.6,
        7.8,
        9.3,
        9.9
      ]
    },
    {
      "id": "delivery-promise-orbits-02",
      "label": "South",
      "owner": "Fulfillment",
      "evidence": "shipment and order joins: South; W1–W6",
      "next": "Trace carrier scans and promise timestamps for affected orders (South).",
      "values": [
        17.7,
        16.4,
        14.1,
        15.9,
        12.9,
        11.9
      ]
    },
    {
      "id": "delivery-promise-orbits-03",
      "label": "East",
      "owner": "Fulfillment",
      "evidence": "shipment and order joins: East; W1–W6",
      "next": "Trace carrier scans and promise timestamps for affected orders (East).",
      "values": [
        10.3,
        12.4,
        9.6,
        13.3,
        11.4,
        12.0
      ]
    },
    {
      "id": "delivery-promise-orbits-04",
      "label": "West",
      "owner": "Fulfillment",
      "evidence": "shipment and order joins: West; W1–W6",
      "next": "Trace carrier scans and promise timestamps for affected orders (West).",
      "values": [
        14.8,
        16.9,
        19.4,
        22.4,
        21.3,
        18.1
      ]
    },
    {
      "id": "delivery-promise-orbits-05",
      "label": "Metro",
      "owner": "Fulfillment",
      "evidence": "shipment and order joins: Metro; W1–W6",
      "next": "Trace carrier scans and promise timestamps for affected orders (Metro).",
      "values": [
        5.6,
        4.9,
        5.9,
        4.4,
        5.4,
        4.5
      ]
    },
    {
      "id": "delivery-promise-orbits-06",
      "label": "Remote",
      "owner": "Fulfillment",
      "evidence": "shipment and order joins: Remote; W1–W6",
      "next": "Trace carrier scans and promise timestamps for affected orders (Remote).",
      "values": [
        21.2,
        23.2,
        23.9,
        25.8,
        27.1,
        29.0
      ]
    }
  ],
  "outcome": "retention"
};

export default observatory(fixture);
