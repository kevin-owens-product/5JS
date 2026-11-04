import { decisionRecipe } from '../shared/decision-recipe.js';

export default decisionRecipe({
  "id": "support-escalation",
  "title": "Support escalation orbit",
  "outcome": "retention",
  "summary": "Separate support queues with high unresolved shares from high volumes.",
  "view": "orbit",
  "accent": "#ff97a9",
  "unit": "tickets",
  "note": "One ticket per owning queue; affected means unresolved at snapshot time. Ticket counts are not unique customers.",
  "rows": [
    {
      "id": "SUP-01",
      "label": "Authentication",
      "owner": "Identity",
      "eligible": 160,
      "affected": 48,
      "action": "Triage sign-in failures"
    },
    {
      "id": "SUP-02",
      "label": "Billing",
      "owner": "Finance",
      "eligible": 210,
      "affected": 36,
      "action": "Audit invoice confusion"
    },
    {
      "id": "SUP-03",
      "label": "Imports",
      "owner": "Integrations",
      "eligible": 130,
      "affected": 62,
      "action": "Reproduce import failures"
    },
    {
      "id": "SUP-04",
      "label": "Reports",
      "owner": "Analytics",
      "eligible": 180,
      "affected": 43,
      "action": "Inspect query errors"
    },
    {
      "id": "SUP-05",
      "label": "Permissions",
      "owner": "Platform",
      "eligible": 120,
      "affected": 51,
      "action": "Review role configuration"
    }
  ]
});
