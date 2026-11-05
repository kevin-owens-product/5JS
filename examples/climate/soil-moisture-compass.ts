import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "soil-moisture-compass",
  "title": "Soil moisture compass",
  "category": "Climate",
  "summary": "Which soil plots dry below an illustrative study reference?",
  "question": "Which soil plots dry below an illustrative study reference?",
  "view": "radar",
  "unit": "water content %",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 25,
  "direction": "below",
  "accent": "#8acbff",
  "grain": "One plot per weekly sample; volumetric water content at one fixed depth.",
  "source": "synthetic sensor samples",
  "rows": [
    {
      "id": "soil-moisture-compass-01",
      "label": "North plot",
      "owner": "Field research",
      "evidence": "synthetic sensor samples: North plot; W1–W6",
      "next": "Inspect sensor calibration and soil type before intervention (North plot).",
      "values": [
        25.0,
        28.5,
        32.6,
        37.8,
        35.8,
        30.4
      ]
    },
    {
      "id": "soil-moisture-compass-02",
      "label": "South plot",
      "owner": "Field research",
      "evidence": "synthetic sensor samples: South plot; W1–W6",
      "next": "Inspect sensor calibration and soil type before intervention (South plot).",
      "values": [
        23.5,
        20.6,
        25.0,
        18.5,
        22.5,
        19.1
      ]
    },
    {
      "id": "soil-moisture-compass-03",
      "label": "Orchard",
      "owner": "Field research",
      "evidence": "synthetic sensor samples: Orchard; W1–W6",
      "next": "Inspect sensor calibration and soil type before intervention (Orchard).",
      "values": [
        24.8,
        27.3,
        28.1,
        30.2,
        31.9,
        34.0
      ]
    },
    {
      "id": "soil-moisture-compass-04",
      "label": "Meadow",
      "owner": "Field research",
      "evidence": "synthetic sensor samples: Meadow; W1–W6",
      "next": "Inspect sensor calibration and soil type before intervention (Meadow).",
      "values": [
        15.6,
        17.3,
        20.5,
        18.4,
        22.0,
        23.6
      ]
    },
    {
      "id": "soil-moisture-compass-05",
      "label": "Slope",
      "owner": "Field research",
      "evidence": "synthetic sensor samples: Slope; W1–W6",
      "next": "Inspect sensor calibration and soil type before intervention (Slope).",
      "values": [
        18.9,
        17.4,
        15.0,
        17.0,
        13.8,
        12.6
      ]
    },
    {
      "id": "soil-moisture-compass-06",
      "label": "Wetland",
      "owner": "Field research",
      "evidence": "synthetic sensor samples: Wetland; W1–W6",
      "next": "Inspect sensor calibration and soil type before intervention (Wetland).",
      "values": [
        38.5,
        46.3,
        35.7,
        49.6,
        42.6,
        44.7
      ]
    }
  ]
};

export default observatory(fixture);
