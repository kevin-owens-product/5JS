import { decisionRecipe } from '../shared/decision-recipe.js';

export default decisionRecipe({
  "id": "performance-friction",
  "title": "Performance friction canyon",
  "outcome": "conversion",
  "summary": "Prioritize slow-session investigations without claiming latency causes abandonment.",
  "view": "canyon",
  "accent": "#82d8e8",
  "unit": "sessions",
  "note": "One session per final observed route; affected means route duration exceeded 3 seconds. This is not an abandonment count or a causal estimate.",
  "rows": [
    {
      "id": "PER-01",
      "label": "Landing",
      "owner": "Web",
      "eligible": 960,
      "affected": 122,
      "action": "Profile the landing route"
    },
    {
      "id": "PER-02",
      "label": "Search",
      "owner": "Discovery",
      "eligible": 740,
      "affected": 185,
      "action": "Inspect slow search traces"
    },
    {
      "id": "PER-03",
      "label": "Product",
      "owner": "Commerce",
      "eligible": 820,
      "affected": 164,
      "action": "Audit image loading"
    },
    {
      "id": "PER-04",
      "label": "Cart",
      "owner": "Checkout",
      "eligible": 610,
      "affected": 152,
      "action": "Profile cart API calls"
    },
    {
      "id": "PER-05",
      "label": "Checkout",
      "owner": "Payments",
      "eligible": 480,
      "affected": 192,
      "action": "Inspect payment handoff traces"
    }
  ]
});
