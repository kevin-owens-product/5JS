import { observatory, type ObservatoryConfig } from '../shared/observatory.js';

/** Authored synthetic observations. Replace with validated source aggregates at this grain. */
export const fixture: ObservatoryConfig = {
  "id": "api-tail-latency",
  "title": "API tail-latency ridges",
  "category": "Engineering",
  "summary": "Which endpoint tails worsen while aggregate latency hides the problem?",
  "question": "Which endpoint tails worsen while aggregate latency hides the problem?",
  "view": "ridges",
  "unit": "p99 latency ms",
  "periods": [
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6"
  ],
  "reference": 600,
  "direction": "above",
  "accent": "#f195bd",
  "grain": "One endpoint per hourly bucket; p99 of completed requests.",
  "source": "distributed trace summaries",
  "rows": [
    {
      "id": "api-tail-latency-01",
      "label": "Auth",
      "owner": "Platform",
      "evidence": "distributed trace summaries: Auth; H1–H6",
      "next": "Inspect slow traces, error rates and request mix (Auth).",
      "values": [
        268.8,
        235.2,
        285.6,
        211.2,
        256.8,
        218.4
      ]
    },
    {
      "id": "api-tail-latency-02",
      "label": "Search",
      "owner": "Platform",
      "evidence": "distributed trace summaries: Search; H1–H6",
      "next": "Inspect slow traces, error rates and request mix (Search).",
      "values": [
        478.4,
        525.2,
        540.8,
        582.4,
        613.6,
        655.2
      ]
    },
    {
      "id": "api-tail-latency-03",
      "label": "Export",
      "owner": "Platform",
      "evidence": "distributed trace summaries: Export; H1–H6",
      "next": "Inspect slow traces, error rates and request mix (Export).",
      "values": [
        680.6,
        755.3,
        896.4,
        805.1,
        962.8,
        1029.2
      ]
    },
    {
      "id": "api-tail-latency-04",
      "label": "Checkout",
      "owner": "Platform",
      "evidence": "distributed trace summaries: Checkout; H1–H6",
      "next": "Inspect slow traces, error rates and request mix (Checkout).",
      "values": [
        483.8,
        446.9,
        385.4,
        434.6,
        352.6,
        323.9
      ]
    },
    {
      "id": "api-tail-latency-05",
      "label": "Ingest",
      "owner": "Platform",
      "evidence": "distributed trace summaries: Ingest; H1–H6",
      "next": "Inspect slow traces, error rates and request mix (Ingest).",
      "values": [
        648.6,
        779.7,
        600.3,
        834.9,
        717.6,
        752.1
      ]
    },
    {
      "id": "api-tail-latency-06",
      "label": "Reports",
      "owner": "Platform",
      "evidence": "distributed trace summaries: Reports; H1–H6",
      "next": "Inspect slow traces, error rates and request mix (Reports).",
      "values": [
        444.6,
        507.3,
        581.4,
        672.6,
        638.4,
        541.5
      ]
    }
  ]
};

export default observatory(fixture);
