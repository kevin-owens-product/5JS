import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "assay-response-ribbons",
  "title": "Assay response ribbons",
  "category": "Biology",
  "summary": "Which synthetic assay traces show different response timing?",
  "question": "Which synthetic assay traces show different response timing?",
  "view": "braids",
  "unit": "fluorescence AU",
  "periods": [
    "T0",
    "T1",
    "T2",
    "T3",
    "T4",
    "T5"
  ],
  "reference": 60,
  "direction": "above",
  "accent": "#b6a0ff",
  "grain": "One fictional sample per timepoint; arbitrary fluorescence units; no biological or clinical conclusion.",
  "source": "synthetic assay readings",
  "rows": [
    {
      "id": "assay-response-ribbons-01",
      "label": "Sample A",
      "owner": "Laboratory study",
      "evidence": "synthetic assay readings: Sample A; T0–T5",
      "next": "Inspect blanks, replicates and instrument drift before interpretation (Sample A).",
      "values": [
        29.5,
        27.3,
        23.5,
        26.5,
        21.5,
        19.8
      ]
    },
    {
      "id": "assay-response-ribbons-02",
      "label": "Sample B",
      "owner": "Laboratory study",
      "evidence": "synthetic assay readings: Sample B; T0–T5",
      "next": "Inspect blanks, replicates and instrument drift before interpretation (Sample B).",
      "values": [
        42.3,
        50.8,
        39.1,
        54.4,
        46.8,
        49.1
      ]
    },
    {
      "id": "assay-response-ribbons-03",
      "label": "Sample C",
      "owner": "Laboratory study",
      "evidence": "synthetic assay readings: Sample C; T0–T5",
      "next": "Inspect blanks, replicates and instrument drift before interpretation (Sample C).",
      "values": [
        52.3,
        59.6,
        68.3,
        79.1,
        75.0,
        63.6
      ]
    },
    {
      "id": "assay-response-ribbons-04",
      "label": "Sample D",
      "owner": "Laboratory study",
      "evidence": "synthetic assay readings: Sample D; T0–T5",
      "next": "Inspect blanks, replicates and instrument drift before interpretation (Sample D).",
      "values": [
        42.6,
        37.2,
        45.2,
        33.4,
        40.7,
        34.6
      ]
    },
    {
      "id": "assay-response-ribbons-05",
      "label": "Sample E",
      "owner": "Laboratory study",
      "evidence": "synthetic assay readings: Sample E; T0–T5",
      "next": "Inspect blanks, replicates and instrument drift before interpretation (Sample E).",
      "values": [
        69.0,
        75.8,
        78.0,
        84.0,
        88.5,
        94.5
      ]
    },
    {
      "id": "assay-response-ribbons-06",
      "label": "Sample F",
      "owner": "Laboratory study",
      "evidence": "synthetic assay readings: Sample F; T0–T5",
      "next": "Inspect blanks, replicates and instrument drift before interpretation (Sample F).",
      "values": [
        42.6,
        47.3,
        56.2,
        50.4,
        60.3,
        64.5
      ]
    }
  ]
};

export default observatory(fixture);
