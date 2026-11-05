import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "telescope-signal-ridges",
  "title": "Telescope signal ridges",
  "category": "Space",
  "summary": "Which observation targets have weak signal relative to noise?",
  "question": "Which observation targets have weak signal relative to noise?",
  "view": "ridges",
  "unit": "signal-to-noise",
  "periods": [
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ],
  "reference": 12,
  "direction": "below",
  "accent": "#f195bd",
  "grain": "One fictional target per exposure; illustrative signal-to-noise ratio, not detection significance.",
  "source": "synthetic exposure summaries",
  "rows": [
    {
      "id": "telescope-signal-ridges-01",
      "label": "Target A",
      "owner": "Observatory study",
      "evidence": "synthetic exposure summaries: Target A; S1–S6",
      "next": "Inspect sky background, exposure and calibration frames (Target A).",
      "values": [
        20.2,
        17.6,
        21.4,
        15.8,
        19.3,
        16.4
      ]
    },
    {
      "id": "telescope-signal-ridges-02",
      "label": "Target B",
      "owner": "Observatory study",
      "evidence": "synthetic exposure summaries: Target B; S1–S6",
      "next": "Inspect sky background, exposure and calibration frames (Target B).",
      "values": [
        8.3,
        9.1,
        9.4,
        10.1,
        10.6,
        11.3
      ]
    },
    {
      "id": "telescope-signal-ridges-03",
      "label": "Target C",
      "owner": "Observatory study",
      "evidence": "synthetic exposure summaries: Target C; S1–S6",
      "next": "Inspect sky background, exposure and calibration frames (Target C).",
      "values": [
        19.7,
        21.8,
        25.9,
        23.3,
        27.8,
        29.8
      ]
    },
    {
      "id": "telescope-signal-ridges-04",
      "label": "Target D",
      "owner": "Observatory study",
      "evidence": "synthetic exposure summaries: Target D; S1–S6",
      "next": "Inspect sky background, exposure and calibration frames (Target D).",
      "values": [
        16.5,
        15.3,
        13.2,
        14.8,
        12.0,
        11.1
      ]
    },
    {
      "id": "telescope-signal-ridges-05",
      "label": "Target E",
      "owner": "Observatory study",
      "evidence": "synthetic exposure summaries: Target E; S1–S6",
      "next": "Inspect sky background, exposure and calibration frames (Target E).",
      "values": [
        6.6,
        7.9,
        6.1,
        8.5,
        7.3,
        7.6
      ]
    },
    {
      "id": "telescope-signal-ridges-06",
      "label": "Target F",
      "owner": "Observatory study",
      "evidence": "synthetic exposure summaries: Target F; S1–S6",
      "next": "Inspect sky background, exposure and calibration frames (Target F).",
      "values": [
        12.5,
        14.2,
        16.3,
        18.9,
        17.9,
        15.2
      ]
    }
  ]
};

export default observatory(fixture);
