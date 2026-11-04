import { decisionRecipe } from '../shared/decision-recipe.js';

export default decisionRecipe({
  "id": "interview-coverage",
  "title": "Interview coverage prism",
  "outcome": "product",
  "summary": "Expose gaps in a target interview sample before prioritizing a roadmap.",
  "view": "prism",
  "accent": "#f1c674",
  "unit": "target slots",
  "note": "Each segment has 24 planned interview slots; affected means unfilled. This is a recruitment plan, not representative customer evidence.",
  "rows": [
    {
      "id": "INT-01",
      "label": "New admins",
      "owner": "Research",
      "eligible": 24,
      "affected": 16,
      "action": "Recruit new administrators"
    },
    {
      "id": "INT-02",
      "label": "Power users",
      "owner": "Research",
      "eligible": 24,
      "affected": 5,
      "action": "Seek disconfirming interviews"
    },
    {
      "id": "INT-03",
      "label": "Churned teams",
      "owner": "Research",
      "eligible": 24,
      "affected": 21,
      "action": "Recruit churned account owners"
    },
    {
      "id": "INT-04",
      "label": "Occasional users",
      "owner": "Research",
      "eligible": 24,
      "affected": 18,
      "action": "Observe infrequent workflows"
    },
    {
      "id": "INT-05",
      "label": "Buyers",
      "owner": "Research",
      "eligible": 24,
      "affected": 13,
      "action": "Validate buying constraints"
    }
  ]
});
