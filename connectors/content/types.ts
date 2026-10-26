export type Outcome = 'conversion' | 'retention' | 'product';

/** Authored guide content; provider scope is checked against the executable catalog. */
export interface ConnectorGuide {
  slug: string;
  catalogName: string;
  name: string;
  factory: string;
  monogram: string;
  accent: string;
  runtime: 'server' | 'universal' | 'browser';
  headline: string;
  description: string;
  outcome: Outcome;
  prerequisites: string[];
  capabilities: { title: string; body: string }[];
  limitations: string[];
  sample: {
    title: string;
    filename: string;
    description: string;
    code: string;
  };
  workflow: {
    question: string;
    join: string;
    action: string;
    measure: string;
  };
  docs: { label: string; url: string }[];
}
