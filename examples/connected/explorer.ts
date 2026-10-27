import type { EntityRecord, OutcomeExplorer, OutcomeView, SelectableEntity } from './types.js';

export interface ExplorerOptions {
  records: readonly EntityRecord[];
  view(): OutcomeView;
  targets(): SelectableEntity[];
  onSelect?(): void;
  initialId?: string;
}

/** A shared selection connects a scene, accessible list, evidence inspector, and action brief. */
export function createOutcomeExplorer(options: ExplorerOptions): OutcomeExplorer {
  const records = [...options.records], ids = new Set<string>();
  for (const record of records) {
    if (!record.id || ids.has(record.id)) throw new RangeError(`Entity IDs must be unique: ${record.id}`);
    ids.add(record.id);
  }
  for (const record of records) for (const link of record.links) {
    if (!ids.has(link.id)) throw new RangeError(`Missing linked entity: ${link.id}`);
  }
  const listeners = new Set<() => void>();
  let selectedId: string | null = options.initialId ?? options.view().candidates[0]?.entityId ?? null;
  if (selectedId !== null && !ids.has(selectedId)) throw new RangeError(`Unknown selected entity: ${selectedId}`);
  let disposed = false;
  const assertActive = () => { if (disposed) throw new Error('Outcome explorer is disposed.'); };
  const notify = () => { for (const listener of [...listeners]) listener(); };
  return {
    records,
    get selectedId() { return selectedId; },
    view: () => options.view(),
    targets: () => disposed ? [] : options.targets(),
    select(id) {
      assertActive();
      if (!ids.has(id)) throw new RangeError(`Unknown entity: ${id}`);
      if (selectedId === id) return;
      selectedId = id; options.onSelect?.(); notify();
    },
    subscribe(listener) { assertActive(); listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh() {
      assertActive();
      const candidates = options.view().candidates;
      for (const candidate of candidates) if (!ids.has(candidate.entityId)) throw new RangeError(`Unknown candidate: ${candidate.entityId}`);
      const visible = new Set([...candidates.map(candidate => candidate.entityId), ...options.targets().map(target => target.id)]);
      if (selectedId === null || !visible.has(selectedId)) {
        const previous = selectedId; selectedId = candidates[0]?.entityId ?? null;
        if (selectedId !== previous) options.onSelect?.();
      }
      notify();
    },
    dispose() { if (disposed) return; disposed = true; listeners.clear(); },
  };
}
