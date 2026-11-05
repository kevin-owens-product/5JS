import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "urban-heat-observatory",
  "title": "Urban heat observatory",
  "category": "Climate",
  "summary": "Which sampled surfaces remain warmer across an illustrative heat episode?",
  "question": "Which sampled surfaces remain warmer across an illustrative heat episode?",
  "view": "matrix",
  "unit": "surface temperature °C",
  "periods": [
    "W1",
    "W2",
    "W3",
    "W4",
    "W5",
    "W6"
  ],
  "reference": 35,
  "direction": "above",
  "accent": "#ffc48f",
  "grain": "One surface class per afternoon; mean sampled surface temperature, not air temperature.",
  "source": "synthetic remote-sensing summaries",
  "rows": [
    {
      "id": "urban-heat-observatory-01",
      "label": "Canopy",
      "owner": "Climate research",
      "evidence": "synthetic remote-sensing summaries: Canopy; W1–W6",
      "next": "Compare shade, sampling time and emissivity assumptions (Canopy).",
      "values": [
        24.4,
        29.4,
        22.6,
        31.5,
        27.0,
        28.3
      ]
    },
    {
      "id": "urban-heat-observatory-02",
      "label": "Asphalt",
      "owner": "Climate research",
      "evidence": "synthetic remote-sensing summaries: Asphalt; W1–W6",
      "next": "Compare shade, sampling time and emissivity assumptions (Asphalt).",
      "values": [
        32.0,
        36.5,
        41.8,
        48.4,
        45.9,
        38.9
      ]
    },
    {
      "id": "urban-heat-observatory-03",
      "label": "Roof",
      "owner": "Climate research",
      "evidence": "synthetic remote-sensing summaries: Roof; W1–W6",
      "next": "Compare shade, sampling time and emissivity assumptions (Roof).",
      "values": [
        50.4,
        44.1,
        53.5,
        39.6,
        48.2,
        41.0
      ]
    },
    {
      "id": "urban-heat-observatory-04",
      "label": "Park",
      "owner": "Climate research",
      "evidence": "synthetic remote-sensing summaries: Park; W1–W6",
      "next": "Compare shade, sampling time and emissivity assumptions (Park).",
      "values": [
        26.7,
        29.3,
        30.2,
        32.5,
        34.2,
        36.5
      ]
    },
    {
      "id": "urban-heat-observatory-05",
      "label": "Waterfront",
      "owner": "Climate research",
      "evidence": "synthetic remote-sensing summaries: Waterfront; W1–W6",
      "next": "Compare shade, sampling time and emissivity assumptions (Waterfront).",
      "values": [
        25.4,
        28.2,
        33.5,
        30.1,
        36.0,
        38.4
      ]
    },
    {
      "id": "urban-heat-observatory-06",
      "label": "Plaza",
      "owner": "Climate research",
      "evidence": "synthetic remote-sensing summaries: Plaza; W1–W6",
      "next": "Compare shade, sampling time and emissivity assumptions (Plaza).",
      "values": [
        44.8,
        41.4,
        35.7,
        40.3,
        32.7,
        30.0
      ]
    }
  ]
};

export default observatory(fixture);
