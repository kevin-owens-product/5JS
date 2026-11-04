import { decisionRecipe } from '../shared/decision-recipe.js';

export default decisionRecipe({
  "id": "renewal-runway",
  "title": "Renewal runway",
  "outcome": "retention",
  "summary": "Plan account reviews across the next five renewal windows.",
  "view": "runway",
  "accent": "#b6a0ff",
  "unit": "accounts",
  "note": "One account per scheduled renewal week; affected means a flagged usage or support signal, not a predicted churn event.",
  "rows": [
    {
      "id": "REN-01",
      "label": "Week 1",
      "owner": "Customer success",
      "eligible": 42,
      "affected": 16,
      "action": "Review low-usage accounts"
    },
    {
      "id": "REN-02",
      "label": "Week 2",
      "owner": "Customer success",
      "eligible": 58,
      "affected": 19,
      "action": "Confirm renewal owners"
    },
    {
      "id": "REN-03",
      "label": "Week 3",
      "owner": "Solutions",
      "eligible": 51,
      "affected": 23,
      "action": "Investigate integration blockers"
    },
    {
      "id": "REN-04",
      "label": "Week 4",
      "owner": "Customer success",
      "eligible": 70,
      "affected": 21,
      "action": "Review unresolved commitments"
    },
    {
      "id": "REN-05",
      "label": "Week 5",
      "owner": "Account team",
      "eligible": 65,
      "affected": 28,
      "action": "Schedule value reviews"
    }
  ]
});
