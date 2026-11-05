import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "battery-cycle-atlas",
  "title": "Battery cycle atlas",
  "category": "Energy",
  "summary": "Which illustrative battery packs lose usable capacity across cycle checkpoints?",
  "question": "Which illustrative battery packs lose usable capacity across cycle checkpoints?",
  "view": "helix",
  "unit": "capacity retained %",
  "periods": [
    "C0",
    "C100",
    "C200",
    "C300",
    "C400",
    "C500"
  ],
  "reference": 85,
  "direction": "below",
  "accent": "#e0e990",
  "grain": "One pack per cycle checkpoint; measured capacity / nominal capacity in a synthetic test.",
  "source": "synthetic battery test summaries",
  "rows": [
    {
      "id": "battery-cycle-atlas-01",
      "label": "Pack A",
      "owner": "Storage research",
      "evidence": "synthetic battery test summaries: Pack A; C0–C500",
      "next": "Review temperature and test conditions before comparing degradation (Pack A).",
      "values": [
        97.0,
        95.8,
        94.7,
        93.5,
        92.3,
        91.2
      ]
    },
    {
      "id": "battery-cycle-atlas-02",
      "label": "Pack B",
      "owner": "Storage research",
      "evidence": "synthetic battery test summaries: Pack B; C0–C500",
      "next": "Review temperature and test conditions before comparing degradation (Pack B).",
      "values": [
        93.0,
        91.6,
        90.2,
        88.8,
        87.4,
        86.0
      ]
    },
    {
      "id": "battery-cycle-atlas-03",
      "label": "Pack C",
      "owner": "Storage research",
      "evidence": "synthetic battery test summaries: Pack C; C0–C500",
      "next": "Review temperature and test conditions before comparing degradation (Pack C).",
      "values": [
        89.0,
        87.4,
        85.8,
        84.2,
        82.6,
        81.0
      ]
    },
    {
      "id": "battery-cycle-atlas-04",
      "label": "Pack D",
      "owner": "Storage research",
      "evidence": "synthetic battery test summaries: Pack D; C0–C500",
      "next": "Review temperature and test conditions before comparing degradation (Pack D).",
      "values": [
        95.0,
        93.0,
        91.0,
        89.0,
        87.0,
        85.0
      ]
    },
    {
      "id": "battery-cycle-atlas-05",
      "label": "Pack E",
      "owner": "Storage research",
      "evidence": "synthetic battery test summaries: Pack E; C0–C500",
      "next": "Review temperature and test conditions before comparing degradation (Pack E).",
      "values": [
        87.0,
        84.9,
        82.8,
        80.7,
        78.6,
        76.6
      ]
    },
    {
      "id": "battery-cycle-atlas-06",
      "label": "Pack F",
      "owner": "Storage research",
      "evidence": "synthetic battery test summaries: Pack F; C0–C500",
      "next": "Review temperature and test conditions before comparing degradation (Pack F).",
      "values": [
        91.0,
        88.5,
        86.1,
        83.6,
        81.2,
        78.7
      ]
    }
  ]
};

export default observatory(fixture);
