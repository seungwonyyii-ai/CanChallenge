import { describe, expect, it } from 'vitest';
import { ALL_DRINK_IDS } from './drinks';
import {
  countCorrect,
  createInitialState,
  createRound,
  elapsedMs,
  formatTime,
  gameReducer,
  trayIds,
  type GameAction,
} from './engine';
import { BEST_KEY, loadBest, saveIfBest } from './records';

const BOOK_POOL = ['moon_and_sixpence', 'do_you_like_brahms', 'animal_farm', 'demian', 'unbearable_lightness'];
import type { ItemId, GameState } from './types';

/** Small deterministic PRNG (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const run = (s: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, s);

function started(seed = 1, now = 1000) {
  return gameReducer(createInitialState(seeded(seed)), { type: 'start', now, rng: seeded(seed + 7) });
}

/** Place tray cans so that the arrangement equals `order`. */
function placeAll(s: GameState, order: ItemId[]): GameState {
  return order.reduce(
    (st, id, i) => run(st, { type: 'clickTray', id }, { type: 'clickSlot', index: i }),
    s,
  );
}

/** A full arrangement where exactly `k` slots match (k !== n-1). */
function arrangementWith(answer: ItemId[], k: number): ItemId[] {
  const n = answer.length;
  const out = [...answer];
  // rotate the last n-k items by one → none of them are correct
  const tail = out.slice(k);
  if (tail.length > 1) {
    const rotated = [...tail.slice(1), tail[0]];
    out.splice(k, tail.length, ...rotated);
  }
  expect(countCorrect(out, answer)).toBe(k === n - 1 ? n : k);
  return out;
}

describe('round generation', () => {
  it('uses distinct drinks; 3/4 are subsets and 5 uses all five', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const size of [3, 4, 5]) {
        const { ids, answer } = createRound(size, seeded(seed));
        expect(ids).toHaveLength(size);
        expect(new Set(ids).size).toBe(size);
        expect([...answer].sort()).toEqual([...ids].sort());
        ids.forEach((id) => expect(ALL_DRINK_IDS).toContain(id));
      }
    }
    expect(new Set(createRound(5, seeded(3)).ids)).toEqual(new Set(ALL_DRINK_IDS));
  });

  it('randomises the answer order', () => {
    const orders = new Set<string>();
    for (let seed = 0; seed < 40; seed++) orders.add(createRound(5, seeded(seed)).answer.join());
    expect(orders.size).toBeGreaterThan(10);
  });
});

describe('countCorrect', () => {
  it('counts only exact positional matches', () => {
    const answer: ItemId[] = ['pear', 'pine', 'plum'];
    expect(countCorrect(['pear', 'pine', 'plum'], answer)).toBe(3);
    expect(countCorrect(['pine', 'pear', 'plum'], answer)).toBe(1);
    expect(countCorrect(['plum', 'pear', 'pine'], answer)).toBe(0);
    expect(countCorrect(['pear', null, null], answer)).toBe(1);
  });
});

describe('click-and-click placement', () => {
  it('places a tray can into an empty slot with two clicks', () => {
    let s = started();
    const id = s.ids[0];
    s = gameReducer(s, { type: 'clickTray', id });
    expect(s.selection).toEqual({ kind: 'tray', id });
    s = gameReducer(s, { type: 'clickSlot', index: 1 });
    expect(s.slots[1]).toBe(id);
    expect(s.selection).toBeNull();
    expect(trayIds(s)).not.toContain(id);
  });

  it('clicking the same can again cancels the selection', () => {
    let s = started();
    const id = s.ids[0];
    s = run(s, { type: 'clickTray', id }, { type: 'clickTray', id });
    expect(s.selection).toBeNull();
    s = run(s, { type: 'clickTray', id }, { type: 'clickSlot', index: 0 }, { type: 'clickSlot', index: 0 });
    expect(s.selection).toEqual({ kind: 'slot', index: 0 });
    s = gameReducer(s, { type: 'clickSlot', index: 0 });
    expect(s.selection).toBeNull();
  });

  it('moves a placed can to an empty slot during first placement', () => {
    let s = started();
    const id = s.ids[0];
    s = run(s, { type: 'clickTray', id }, { type: 'clickSlot', index: 0 });
    s = run(s, { type: 'clickSlot', index: 0 }, { type: 'clickSlot', index: 2 });
    expect(s.slots).toEqual([null, null, id]);
  });

  it('placing on an occupied slot sends the displaced can back to the tray', () => {
    let s = started();
    const [a, b] = s.ids;
    s = run(s, { type: 'clickTray', id: a }, { type: 'clickSlot', index: 0 });
    s = run(s, { type: 'clickTray', id: b }, { type: 'clickSlot', index: 0 });
    expect(s.slots[0]).toBe(b);
    expect(trayIds(s)).toContain(a);
  });

  it('ignores clicks on an empty slot with nothing selected', () => {
    const s = started();
    expect(gameReducer(s, { type: 'clickSlot', index: 0 })).toBe(s);
  });
});

describe('auto judgement', () => {
  it('does not judge an incomplete arrangement', () => {
    let s = started();
    s = placeAll(s, s.ids.slice(0, 2));
    expect(s.pendingJudge).toBeNull();
    expect(s.attempts).toBe(0);
    expect(s.lastResult).toBeNull();
  });

  it('queues a judgement as soon as every slot is filled, and blocks input until judged', () => {
    let s = started();
    const wrong = arrangementWith(s.answer, 0);
    s = placeAll(s, wrong);
    expect(s.pendingJudge).not.toBeNull();
    // input blocked while the move animation runs
    expect(gameReducer(s, { type: 'clickSlot', index: 0 })).toBe(s);
    expect(gameReducer(s, { type: 'reset' })).toBe(s);
    s = gameReducer(s, { type: 'judge', seq: s.pendingJudge!, now: 2000 });
    expect(s.lastResult).toMatchObject({ correct: 0, total: 3, perfect: false });
    expect(s.attempts).toBe(1);
    expect(s.phase).toBe('playing');
  });

  it('ignores stale judge requests', () => {
    let s = started();
    s = placeAll(s, arrangementWith(s.answer, 0));
    const stale = gameReducer(s, { type: 'judge', seq: s.pendingJudge! + 99, now: 2000 });
    expect(stale).toBe(s);
  });

  it('swaps two cans and judges again', () => {
    let s = started(5);
    const wrong = arrangementWith(s.answer, 0);
    s = placeAll(s, wrong);
    s = gameReducer(s, { type: 'judge', seq: s.pendingJudge!, now: 2000 });
    const before = [...s.slots];
    s = run(s, { type: 'clickSlot', index: 0 }, { type: 'clickSlot', index: 2 });
    expect(s.slots).toEqual([before[2], before[1], before[0]]);
    expect(s.pendingJudge).not.toBeNull();
    const firstSeq = s.lastResult!.seq;
    s = gameReducer(s, { type: 'judge', seq: s.pendingJudge!, now: 2500 });
    expect(s.lastResult!.seq).toBe(firstSeq + 1);
    expect(s.lastResult!.correct).toBe(countCorrect(s.slots, s.answer));
    expect(s.attempts).toBe(2);
  });
});

describe('rounds and stopwatch', () => {
  function solve(s: GameState, now: number): GameState {
    s = placeAll(s, s.answer);
    return gameReducer(s, { type: 'judge', seq: s.pendingJudge!, now });
  }

  it('reveals on success, then advances 3 → 4 → 5 and stops the clock on the last box', () => {
    let s = started(9, 1000);
    expect(s.ids).toHaveLength(3);
    s = solve(s, 4000);
    expect(s.phase).toBe('revealing');
    expect(s.lastResult?.perfect).toBe(true);
    expect(s.finalMs).toBeNull();
    expect(s.rounds).toEqual([{ size: 3, attempts: 1, elapsedMs: 3000 }]);
    // input is blocked during reveal
    expect(gameReducer(s, { type: 'clickSlot', index: 0 })).toBe(s);

    s = gameReducer(s, { type: 'nextRound', runId: s.runId, now: 5400 });
    expect(s.phase).toBe('playing');
    expect(s.ids).toHaveLength(4);
    expect(s.slots).toEqual([null, null, null, null]);
    expect(elapsedMs(s, 6000)).toBe(5000); // stopwatch continues across rounds

    s = solve(s, 9000);
    s = gameReducer(s, { type: 'nextRound', runId: s.runId, now: 10400 });
    expect(s.ids).toHaveLength(5);
    s = solve(s, 20000);
    expect(s.phase).toBe('revealing');
    expect(s.finalMs).toBe(19000);
    expect(elapsedMs(s, 99999)).toBe(19000); // frozen
    expect(gameReducer(s, { type: 'nextRound', runId: s.runId, now: 21000 })).toBe(s);

    s = gameReducer(s, { type: 'showResult', runId: s.runId });
    expect(s.phase).toBe('finished');
    expect(s.rounds.map((r) => r.size)).toEqual([3, 4, 5]);
    expect(s.rounds.map((r) => r.elapsedMs)).toEqual([3000, 3600, 9600]);
  });

  it('ignores a delayed nextRound from a previous run after RESTART', () => {
    let s = started(2, 1000);
    s = solve(s, 2000);
    const oldRun = s.runId;
    s = gameReducer(s, { type: 'start', now: 3000, rng: seeded(4) });
    expect(gameReducer(s, { type: 'nextRound', runId: oldRun, now: 3100 })).toBe(s);
    expect(s.stage).toBe(0);
    expect(s.rounds).toEqual([]);
    expect(s.startedAt).toBe(3000);
  });

  it('elapsed is 0 before start', () => {
    expect(elapsedMs(createInitialState(), 5000)).toBe(0);
  });
});

describe('RESET vs RESTART', () => {
  it('RESET clears only the current arrangement and keeps answer, time and attempts', () => {
    let s = started(3, 1000);
    s = placeAll(s, arrangementWith(s.answer, 0));
    s = gameReducer(s, { type: 'judge', seq: s.pendingJudge!, now: 2000 });
    s = gameReducer(s, { type: 'clickSlot', index: 1 });
    const { answer, startedAt, roundStartedAt, ids } = s;
    s = gameReducer(s, { type: 'reset' });
    expect(s.slots).toEqual([null, null, null]);
    expect(s.selection).toBeNull();
    expect(s.answer).toEqual(answer);
    expect(s.ids).toEqual(ids);
    expect(s.startedAt).toBe(startedAt);
    expect(s.roundStartedAt).toBe(roundStartedAt);
    expect(s.attempts).toBe(1);
    expect(trayIds(s)).toEqual(ids);
  });

  it('RESTART starts over at 3-box with a fresh run', () => {
    let s = started(3, 1000);
    s = placeAll(s, s.answer);
    s = gameReducer(s, { type: 'judge', seq: s.pendingJudge!, now: 2000 });
    s = gameReducer(s, { type: 'nextRound', runId: s.runId, now: 3000 });
    s = gameReducer(s, { type: 'start', now: 4000, rng: seeded(11) });
    expect(s.stage).toBe(0);
    expect(s.ids).toHaveLength(3);
    expect(s.rounds).toEqual([]);
    expect(s.attempts).toBe(0);
    expect(s.finalMs).toBeNull();
    expect(s.phase).toBe('playing');
  });
});

describe('home (logo)', () => {
  it('returns to the start screen and invalidates timers of the abandoned run', () => {
    let s = started(3, 1000);
    s = placeAll(s, s.answer);
    s = gameReducer(s, { type: 'judge', seq: s.pendingJudge!, now: 2000 });
    const oldRun = s.runId;
    s = gameReducer(s, { type: 'home', rng: seeded(8) });
    expect(s.phase).toBe('ready');
    expect(s.stage).toBe(0);
    expect(s.rounds).toEqual([]);
    expect(s.slots).toEqual([null, null, null]);
    expect(elapsedMs(s, 9999)).toBe(0);
    expect(gameReducer(s, { type: 'nextRound', runId: oldRun, now: 3000 })).toBe(s);
    expect(gameReducer(s, { type: 'clickSlot', index: 0 })).toBe(s);
  });
});

describe('BOOK theme pool (shared engine)', () => {
  it('draws every round from the theme pool and plays 3 → 4 → 5 the same way', () => {
    let s = gameReducer(createInitialState(seeded(1), BOOK_POOL), { type: 'start', now: 0, rng: seeded(2) });
    for (const size of [3, 4, 5]) {
      expect(s.ids).toHaveLength(size);
      s.ids.forEach((id) => expect(BOOK_POOL).toContain(id));
      s = placeAll(s, s.answer);
      s = gameReducer(s, { type: 'judge', seq: s.pendingJudge!, now: size * 1000 });
      expect(s.lastResult?.perfect).toBe(true);
      if (size < 5) s = gameReducer(s, { type: 'nextRound', runId: s.runId, now: size * 1000 + 1 });
    }
    expect(new Set(s.ids)).toEqual(new Set(BOOK_POOL));
    expect(s.finalMs).toBe(5000);
  });

  it('keeps the pool across RESTART and home', () => {
    let s = gameReducer(createInitialState(seeded(1), BOOK_POOL), { type: 'start', now: 0 });
    s = gameReducer(s, { type: 'home' });
    s.ids.forEach((id) => expect(BOOK_POOL).toContain(id));
    s = gameReducer(s, { type: 'start', now: 10 });
    s.ids.forEach((id) => expect(BOOK_POOL).toContain(id));
  });
});

describe('formatTime', () => {
  it('formats mm:ss.cs', () => {
    expect(formatTime(0)).toBe('00:00.00');
    expect(formatTime(61234)).toBe('01:01.23');
    expect(formatTime(-5)).toBe('00:00.00');
  });
});

describe('personal best', () => {
  function memStorage(init: Record<string, string> = {}) {
    const m = new Map(Object.entries(init));
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  }

  it('reads the legacy key and only overwrites with a faster time', () => {
    const st = memStorage({ [BEST_KEY]: '45123.4' });
    expect(loadBest(st)).toBeCloseTo(45123.4);
    expect(saveIfBest(50000, st)).toBe(false);
    expect(saveIfBest(30000, st)).toBe(true);
    expect(loadBest(st)).toBe(30000);
  });

  it('keeps a separate record per theme key', () => {
    const st = memStorage({ [BEST_KEY]: '40000' });
    expect(saveIfBest(50000, st, 'cancan_best_book')).toBe(true);
    expect(loadBest(st, 'cancan_best_book')).toBe(50000);
    expect(loadBest(st)).toBe(40000);
  });

  it('treats missing or garbage values as no record', () => {
    expect(loadBest(memStorage())).toBeNull();
    expect(loadBest(memStorage({ [BEST_KEY]: 'abc' }))).toBeNull();
    expect(loadBest(null)).toBeNull();
  });
});
