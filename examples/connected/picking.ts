import { Vector3 } from 'three';
import type { FiveApp } from '../../src/index.js';
import type { OutcomeExplorer, SelectableEntity } from './types.js';

/** Screen-space picking keeps thin glyphs usable; a drag remains an orbit gesture. */
export function nearestEntity(targets: readonly SelectableEntity[], camera: FiveApp['camera'], rect: { left: number; top: number; width: number; height: number }, x: number, y: number): string | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  let nearest: { id: string; distance: number; depth: number } | undefined;
  for (const target of targets) {
    const p = new Vector3(...target.position).project(camera);
    if (![p.x, p.y, p.z].every(Number.isFinite) || p.z < -1 || p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) continue;
    const dx = rect.left + (p.x + 1) / 2 * rect.width - x;
    const dy = rect.top + (1 - p.y) / 2 * rect.height - y;
    const distance = Math.hypot(dx, dy);
    if (distance > 18) continue;
    if (!nearest || distance < nearest.distance - 0.5 || (Math.abs(distance - nearest.distance) <= 0.5 && p.z < nearest.depth)) nearest = { id: target.id, distance, depth: p.z };
  }
  return nearest?.id ?? null;
}

export function bindEntityPicking(app: FiveApp, explorer: OutcomeExplorer, tooltip: HTMLElement, onPick?: () => void): () => void {
  const canvas = app.renderer.domElement;
  const records = new Map(explorer.records.map(record => [record.id, record]));
  let down: { x: number; y: number; pointer: number; moved: boolean } | null = null;
  const pick = (event: PointerEvent) => nearestEntity(explorer.targets(), app.camera, canvas.getBoundingClientRect(), event.clientX, event.clientY);
  const clearHover = () => { tooltip.hidden = true; canvas.style.cursor = ''; };
  const start = (event: PointerEvent) => { if (event.button === 0) down = { x: event.clientX, y: event.clientY, pointer: event.pointerId, moved: false }; };
  const move = (event: PointerEvent) => {
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) down.moved = true;
    if (down?.moved) { clearHover(); return; }
    const id = pick(event), record = id ? records.get(id) : undefined;
    if (!record) { clearHover(); return; }
    const box = canvas.getBoundingClientRect();
    tooltip.textContent = `${record.label} · ${record.kind} — select to inspect`;
    tooltip.style.left = `${Math.max(8, Math.min(box.width - 240, event.clientX - box.left + 14))}px`;
    tooltip.style.top = `${Math.max(40, Math.min(box.height - 60, event.clientY - box.top + 14))}px`;
    tooltip.hidden = false; canvas.style.cursor = 'pointer';
  };
  const end = (event: PointerEvent) => {
    const press = down; down = null;
    if (!press || press.pointer !== event.pointerId || press.moved || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) return;
    const id = pick(event); if (id) { explorer.select(id); onPick?.(); }
    clearHover();
  };
  const cancel = () => { down = null; clearHover(); };
  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('pointerleave', clearHover);
  return () => {
    cancel(); canvas.removeEventListener('pointerdown', start); canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', end); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('pointerleave', clearHover);
  };
}
