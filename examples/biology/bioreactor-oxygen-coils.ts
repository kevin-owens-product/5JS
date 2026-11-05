import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "bioreactor-oxygen-coils",
  "title": "Bioreactor oxygen coils",
  "category": "Biology",
  "summary": "Which fictional reactors cross an illustrative oxygen review reference?",
  "question": "Which fictional reactors cross an illustrative oxygen review reference?",
  "view": "helix",
  "unit": "dissolved oxygen %",
  "periods": [
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6"
  ],
  "reference": 40,
  "direction": "below",
  "accent": "#8acbff",
  "grain": "One reactor per hourly sample; percent air saturation; teaching data only.",
  "source": "synthetic process samples",
  "rows": [
    {
      "id": "bioreactor-oxygen-coils-01",
      "label": "Vessel A",
      "owner": "Process research",
      "evidence": "synthetic process samples: Vessel A; H1–H6",
      "next": "Review probe calibration and agitation history before interpretation (Vessel A).",
      "values": [
        50.7,
        57.9,
        66.3,
        76.7,
        72.8,
        61.8
      ]
    },
    {
      "id": "bioreactor-oxygen-coils-02",
      "label": "Vessel B",
      "owner": "Process research",
      "evidence": "synthetic process samples: Vessel B; H1–H6",
      "next": "Review probe calibration and agitation history before interpretation (Vessel B).",
      "values": [
        53.8,
        47.0,
        57.1,
        42.2,
        51.4,
        43.7
      ]
    },
    {
      "id": "bioreactor-oxygen-coils-03",
      "label": "Vessel C",
      "owner": "Process research",
      "evidence": "synthetic process samples: Vessel C; H1–H6",
      "next": "Review probe calibration and agitation history before interpretation (Vessel C).",
      "values": [
        34.0,
        37.4,
        38.5,
        41.4,
        43.7,
        46.6
      ]
    },
    {
      "id": "bioreactor-oxygen-coils-04",
      "label": "Vessel D",
      "owner": "Process research",
      "evidence": "synthetic process samples: Vessel D; H1–H6",
      "next": "Review probe calibration and agitation history before interpretation (Vessel D).",
      "values": [
        45.9,
        51.0,
        60.5,
        54.3,
        65.0,
        69.4
      ]
    },
    {
      "id": "bioreactor-oxygen-coils-05",
      "label": "Vessel E",
      "owner": "Process research",
      "evidence": "synthetic process samples: Vessel E; H1–H6",
      "next": "Review probe calibration and agitation history before interpretation (Vessel E).",
      "values": [
        36.6,
        33.8,
        29.1,
        32.9,
        26.7,
        24.5
      ]
    },
    {
      "id": "bioreactor-oxygen-coils-06",
      "label": "Vessel F",
      "owner": "Process research",
      "evidence": "synthetic process samples: Vessel F; H1–H6",
      "next": "Review probe calibration and agitation history before interpretation (Vessel F).",
      "values": [
        67.7,
        81.4,
        62.6,
        87.1,
        74.9,
        78.5
      ]
    }
  ]
};

export default observatory(fixture);
