import { decisionRecipe } from '../shared/decision-recipe.js';

export default decisionRecipe({
  "id": "feature-adoption",
  "title": "Feature adoption terraces",
  "outcome": "product",
  "summary": "Compare eligible account populations with the accounts yet to adopt.",
  "view": "terraces",
  "accent": "#8acbff",
  "unit": "accounts",
  "note": "One account-feature eligibility record; affected means no observed use. Accounts may occur in multiple features, so totals are account-feature records.",
  "rows": [
    {
      "id": "FEA-01",
      "label": "Automations",
      "owner": "Workflow",
      "eligible": 320,
      "affected": 190,
      "action": "Interview automation non-adopters"
    },
    {
      "id": "FEA-02",
      "label": "Shared views",
      "owner": "Collaboration",
      "eligible": 480,
      "affected": 210,
      "action": "Test a shared-view invitation"
    },
    {
      "id": "FEA-03",
      "label": "Alerts",
      "owner": "Analytics",
      "eligible": 250,
      "affected": 165,
      "action": "Observe alert setup"
    },
    {
      "id": "FEA-04",
      "label": "Exports",
      "owner": "Reporting",
      "eligible": 420,
      "affected": 132,
      "action": "Review export discoverability"
    },
    {
      "id": "FEA-05",
      "label": "API access",
      "owner": "Platform",
      "eligible": 180,
      "affected": 110,
      "action": "Test developer onboarding"
    }
  ]
});
