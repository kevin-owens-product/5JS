/** Shared synthetic domain used by the outcome examples, not a production CRM schema. */
export type EntityKind = 'customer' | 'product' | 'service' | 'person' | 'interview' | 'session' | 'checkout';
export type Theme = 'checkout' | 'activation' | 'visibility';
export interface CustomerRecord { id: string; name: string; segment: 'Growth' | 'Enterprise'; annualValue: number; productIds: string[]; ownerId: string }
export interface PersonRecord { id: string; name: string; role: string; customerId?: string }
export interface ProductRecord { id: string; name: string; serviceIds: string[]; ownerId: string }
export interface ServiceRecord { id: string; name: string; ownerId: string }
export interface SessionEvent { offsetSeconds: number; label: string; serviceId?: string }
export interface SessionRecord { id: string; customerId: string; personId: string; productId: string; startedAt: string; device: 'Desktop' | 'Mobile'; events: SessionEvent[]; outcome: 'completed' | 'abandoned' | 'active' }
export type CheckoutBlocker = 'payment-timeout' | 'address-validation' | 'shipping-cost' | 'none';
export interface CheckoutRecord { id: string; sessionId: string; productId: string; amount: number; status: 'completed' | 'abandoned'; blocker: CheckoutBlocker; serviceId?: string }
export interface InterviewRecord { id: string; personId: string; customerId: string; productId: string; date: string; theme: Theme; stance: 'supports' | 'contradicts' | 'mixed'; quote: string; sessionIds: string[] }
export interface ConnectedDataset { customers: CustomerRecord[]; people: PersonRecord[]; products: ProductRecord[]; services: ServiceRecord[]; sessions: SessionRecord[]; checkouts: CheckoutRecord[]; interviews: InterviewRecord[] }
export interface EntityRecord {
  id: string; kind: EntityKind; label: string; summary: string;
  fields: { label: string; value: string }[];
  links: { id: string; label: string }[];
  evidence?: { label: string; text: string; basis: 'Synthetic observation' | 'Fictional interview' | 'Hypothesis' }[];
  timeline?: { label: string; detail: string }[];
}
export interface OutcomeCandidate { entityId: string; reason: string; measure: string }
export interface OutcomeAction {
  id: string; title: string; rationale: string; ownerId: string;
  evidenceIds: string[]; metric: string; baseline: string; success: string; guardrail: string;
  /** Explicit scenario/coverage limits, including why exposure is not expected impact. */
  caveat: string;
}
export interface OutcomeView {
  question: string; summary: string; scope: string;
  candidates: OutcomeCandidate[]; actions: OutcomeAction[];
}
export interface SelectableEntity { id: string; position: [number, number, number] }
export interface OutcomeExplorer {
  readonly records: readonly EntityRecord[];
  readonly selectedId: string | null;
  view(): OutcomeView;
  select(id: string): void;
  subscribe(listener: () => void): () => void;
  /** Reconcile a changed cohort and notify linked views. */
  refresh(): void;
  targets(): SelectableEntity[];
  dispose(): void;
}
