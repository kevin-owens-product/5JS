import { decisionRecipe } from '../shared/decision-recipe.js';

export default decisionRecipe({
  "id": "payment-routing",
  "title": "Payment routing atlas",
  "outcome": "conversion",
  "summary": "Compare failed payment attempts by route before proposing a recovery test.",
  "view": "routes",
  "accent": "#ffc48f",
  "unit": "attempts",
  "note": "One final payment attempt per session, grouped by route; affected means failed. These are disjoint route groups.",
  "rows": [
    {
      "id": "PAY-01",
      "label": "Card US",
      "owner": "Payments",
      "eligible": 640,
      "affected": 48,
      "action": "Inspect issuer decline codes"
    },
    {
      "id": "PAY-02",
      "label": "Card EU",
      "owner": "Payments",
      "eligible": 420,
      "affected": 67,
      "action": "Review authentication failures"
    },
    {
      "id": "PAY-03",
      "label": "Wallet",
      "owner": "Checkout",
      "eligible": 360,
      "affected": 18,
      "action": "Replay wallet handoffs"
    },
    {
      "id": "PAY-04",
      "label": "Bank transfer",
      "owner": "Finance",
      "eligible": 180,
      "affected": 32,
      "action": "Review pending confirmations"
    },
    {
      "id": "PAY-05",
      "label": "Mobile card",
      "owner": "Checkout",
      "eligible": 510,
      "affected": 91,
      "action": "Test error recovery copy"
    }
  ]
});
