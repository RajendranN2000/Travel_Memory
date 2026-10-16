export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** Edits with the same key close together (slider drags, typing) merge into one undo step */
  lastKey: string | null;
  lastAt: number;
}

const MAX_STEPS = 100;
const COALESCE_MS = 900;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null, lastAt: 0 };
}

export function commit<T>(h: History<T>, next: T, key: string | null = null, now = Date.now()): History<T> {
  if (Object.is(next, h.present)) return h;
  const merge = key !== null && key === h.lastKey && now - h.lastAt < COALESCE_MS && h.past.length > 0;
  const past = merge ? h.past : [...h.past, h.present].slice(-MAX_STEPS);
  return { past, present: next, future: [], lastKey: key, lastAt: now };
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  const previous = h.past[h.past.length - 1];
  return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future], lastKey: null, lastAt: 0 };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  const [next, ...rest] = h.future;
  return { past: [...h.past, h.present], present: next, future: rest, lastKey: null, lastAt: 0 };
}
