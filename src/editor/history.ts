// Undo and redo over whole EditState snapshots. Slider drags update `present` without a history
// entry ("live"); releasing the slider commits. Snapshots are small, so no diffing.

const LIMIT = 100;

export type History<T> = { past: T[]; present: T; committed: T; future: T[] };

export type HistoryAction<T> =
  | { type: 'live'; state: T }
  | { type: 'commit'; state?: T }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; state: T };

export function initHistory<T>(state: T): History<T> {
  return { past: [], present: state, committed: state, future: [] };
}

export function historyReducer<T>(h: History<T>, a: HistoryAction<T>): History<T> {
  switch (a.type) {
    case 'live':
      return { ...h, present: a.state };
    case 'commit': {
      const state = a.state ?? h.present;
      if (state === h.committed) return { ...h, present: state };
      return {
        past: [...h.past, h.committed].slice(-LIMIT),
        present: state,
        committed: state,
        future: [],
      };
    }
    case 'undo': {
      // an uncommitted drag is thrown away first, then real undo
      if (h.present !== h.committed) return { ...h, present: h.committed };
      const prev = h.past[h.past.length - 1];
      if (prev === undefined) return h;
      return {
        past: h.past.slice(0, -1),
        present: prev,
        committed: prev,
        future: [h.committed, ...h.future],
      };
    }
    case 'redo': {
      const next = h.future[0];
      if (next === undefined) return h;
      return {
        past: [...h.past, h.committed],
        present: next,
        committed: next,
        future: h.future.slice(1),
      };
    }
    case 'reset':
      return initHistory(a.state);
  }
}
