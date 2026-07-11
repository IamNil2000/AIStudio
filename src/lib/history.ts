import type { HistoryEntry, Part } from '@/types';

/**
 * Create a history entry snapshot of the current parts state.
 */
export function createSnapshot(parts: Record<string, Part>): HistoryEntry {
  const snapshot: HistoryEntry = { parts: {} };
  for (const [id, part] of Object.entries(parts)) {
    snapshot.parts[id] = {
      currentMatrix: part.currentMatrix.toArray(),
      visible: part.visible,
    };
  }
  return snapshot;
}

/**
 * Apply a history entry to the parts map (mutates in place).
 */
export function applySnapshot(
  snapshot: HistoryEntry,
  parts: Record<string, Part>
): void {
  for (const [id, data] of Object.entries(snapshot.parts)) {
    const part = parts[id];
    if (part) {
      part.currentMatrix.fromArray(data.currentMatrix);
      part.visible = data.visible;
    }
  }
}

/**
 * Diff two snapshots to get the changed part IDs.
 */
export function diffSnapshots(
  before: HistoryEntry,
  after: HistoryEntry
): string[] {
  const changed: string[] = [];
  const allIds = Array.from(new Set([
    ...Object.keys(before.parts),
    ...Object.keys(after.parts),
  ]));

  for (const id of allIds) {
    const b = before.parts[id];
    const a = after.parts[id];
    if (!b || !a) {
      changed.push(id);
      continue;
    }
    if (b.visible !== a.visible) {
      changed.push(id);
      continue;
    }
    for (let i = 0; i < 16; i++) {
      if (b.currentMatrix[i] !== a.currentMatrix[i]) {
        changed.push(id);
        break;
      }
    }
  }

  return changed;
}
