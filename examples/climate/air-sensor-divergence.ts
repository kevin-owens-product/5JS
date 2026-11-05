import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "air-sensor-divergence",
  "title": "Air sensor divergence",
  "category": "Climate",
  "summary": "Which fictional sensors diverge between first and current observations?",
  "question": "Which fictional sensors diverge between first and current observations?",
  "view": "constellation",
  "unit": "PM2.5 µg/m³",
  "periods": [
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6"
  ],
  "reference": 20,
  "direction": "above",
  "accent": "#f195bd",
  "grain": "One sensor per daily mean; teaching values, not a health advisory or regulatory assessment.",
  "source": "synthetic particulate sensor summaries",
  "rows": [
    {
      "id": "air-sensor-divergence-01",
      "label": "Roadside",
      "owner": "Monitoring study",
      "evidence": "synthetic particulate sensor summaries: Roadside; D1–D6",
      "next": "Check calibration, weather and missing intervals before comparing (Roadside).",
      "values": [
        31.4,
        27.4,
        33.3,
        24.6,
        30.0,
        25.5
      ]
    },
    {
      "id": "air-sensor-divergence-02",
      "label": "Park",
      "owner": "Monitoring study",
      "evidence": "synthetic particulate sensor summaries: Park; D1–D6",
      "next": "Check calibration, weather and missing intervals before comparing (Park).",
      "values": [
        10.1,
        11.1,
        11.4,
        12.3,
        13.0,
        13.9
      ]
    },
    {
      "id": "air-sensor-divergence-03",
      "label": "Industrial",
      "owner": "Monitoring study",
      "evidence": "synthetic particulate sensor summaries: Industrial; D1–D6",
      "next": "Check calibration, weather and missing intervals before comparing (Industrial).",
      "values": [
        28.7,
        31.9,
        37.8,
        33.9,
        40.6,
        43.4
      ]
    },
    {
      "id": "air-sensor-divergence-04",
      "label": "School",
      "owner": "Monitoring study",
      "evidence": "synthetic particulate sensor summaries: School; D1–D6",
      "next": "Check calibration, weather and missing intervals before comparing (School).",
      "values": [
        21.2,
        19.6,
        16.9,
        19.1,
        15.5,
        14.2
      ]
    },
    {
      "id": "air-sensor-divergence-05",
      "label": "Suburban",
      "owner": "Monitoring study",
      "evidence": "synthetic particulate sensor summaries: Suburban; D1–D6",
      "next": "Check calibration, weather and missing intervals before comparing (Suburban).",
      "values": [
        14.1,
        16.9,
        13.1,
        18.1,
        15.6,
        16.4
      ]
    },
    {
      "id": "air-sensor-divergence-06",
      "label": "Rural",
      "owner": "Monitoring study",
      "evidence": "synthetic particulate sensor summaries: Rural; D1–D6",
      "next": "Check calibration, weather and missing intervals before comparing (Rural).",
      "values": [
        6.2,
        7.1,
        8.2,
        9.4,
        9.0,
        7.6
      ]
    }
  ]
};

export default observatory(fixture);
