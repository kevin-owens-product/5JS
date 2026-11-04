import { decisionRecipe } from '../shared/decision-recipe.js';

export default decisionRecipe({
  "id": "activation-pathways",
  "title": "Activation pathways",
  "outcome": "conversion",
  "summary": "Find the onboarding step where the most eligible accounts stall.",
  "view": "lanes",
  "accent": "#82eacb",
  "unit": "accounts",
  "note": "Each account belongs to its first stalled step; completed accounts remain in the eligible denominator.",
  "rows": [
    {
      "id": "ACT-01",
      "label": "Invite team",
      "owner": "Growth",
      "eligible": 240,
      "affected": 84,
      "action": "Test an invitation prompt"
    },
    {
      "id": "ACT-02",
      "label": "Import data",
      "owner": "Integrations",
      "eligible": 210,
      "affected": 92,
      "action": "Observe failed imports"
    },
    {
      "id": "ACT-03",
      "label": "First report",
      "owner": "Product",
      "eligible": 180,
      "affected": 63,
      "action": "Interview first-report abandoners"
    },
    {
      "id": "ACT-04",
      "label": "Share result",
      "owner": "Collaboration",
      "eligible": 160,
      "affected": 38,
      "action": "Test a share preview"
    },
    {
      "id": "ACT-05",
      "label": "Connect source",
      "owner": "Platform",
      "eligible": 200,
      "affected": 75,
      "action": "Inspect authentication errors"
    }
  ]
});
