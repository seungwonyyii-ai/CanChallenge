/**
 * Personal best persistence. Uses the original MVP key so existing records
 * carry over: the value is the total clear time in milliseconds as a string.
 */
export const BEST_KEY = 'nbox_best_stopwatch';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadBest(storage: StorageLike | null = defaultStorage(), key = BEST_KEY): number | null {
  try {
    const v = Number(storage?.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Saves `timeMs` if it beats the stored best. Returns whether it was a new best. */
export function saveIfBest(timeMs: number, storage: StorageLike | null = defaultStorage(), key = BEST_KEY): boolean {
  const best = loadBest(storage, key);
  if (best !== null && timeMs >= best) return false;
  try {
    storage?.setItem(key, String(timeMs));
  } catch {
    /* private mode / quota — keep the in-memory result */
  }
  return true;
}
