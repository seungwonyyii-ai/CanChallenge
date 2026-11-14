/**
 * Pure game engine for N-BOX Speed Match.
 *
 * No React, no Three.js, no timers: every function takes the previous state and
 * returns the next one. Wall-clock time (`performance.now()`) is passed in by
 * the caller so the logic stays deterministic and unit-testable. The 3D layer
 * only *reads* this state, so an interrupted animation can never corrupt the
 * answer or the arrangement.
 */
import { ALL_DRINK_IDS } from './drinks';
import type { GameState, ItemId, MatchResult } from './types';

export const ROUND_SIZES = [3, 4, 5] as const;
export const LAST_STAGE = ROUND_SIZES.length - 1;

export type Rng = () => number;

export type GameAction =
  | { type: 'start'; now: number; rng?: Rng }
  | { type: 'clickTray'; id: ItemId }
  | { type: 'clickSlot'; index: number }
  | { type: 'judge'; seq: number; now: number }
  | { type: 'reset' }
  | { type: 'nextRound'; runId: number; now: number; rng?: Rng }
  | { type: 'showResult'; runId: number }
  | { type: 'home'; rng?: Rng };

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick `size` distinct items of the theme pool (all five for the 5-box) and an independent
 * random answer order.
 */
export function createRound(
  size: number,
  rng: Rng = Math.random,
  pool: readonly ItemId[] = ALL_DRINK_IDS,
): { ids: ItemId[]; answer: ItemId[] } {
  if (size < 1 || size > pool.length) throw new Error(`Invalid round size ${size}`);
  const ids = shuffle(pool, rng).slice(0, size);
  const answer = shuffle(ids, rng);
  return { ids, answer };
}

/** Number of slots where the player's can matches the hidden answer. */
export function countCorrect(slots: readonly (ItemId | null)[], answer: readonly ItemId[]): number {
  let n = 0;
  for (let i = 0; i < answer.length; i++) if (slots[i] !== null && slots[i] === answer[i]) n++;
  return n;
}

export const isFull = (slots: readonly (ItemId | null)[]): slots is ItemId[] => slots.every((s) => s !== null);

/** Cans still waiting on the tray, in their fixed tray order. */
export function trayIds(state: Pick<GameState, 'ids' | 'slots'>): ItemId[] {
  return state.ids.filter((id) => !state.slots.includes(id));
}

export function createInitialState(rng: Rng = Math.random, pool: readonly ItemId[] = ALL_DRINK_IDS): GameState {
  // A preview round is laid out behind the start screen.
  const { ids, answer } = createRound(ROUND_SIZES[0], rng, pool);
  return {
    phase: 'ready',
    pool,
    stage: 0,
    ids,
    answer,
    slots: Array(ids.length).fill(null),
    selection: null,
    attempts: 0,
    rounds: [],
    startedAt: 0,
    roundStartedAt: 0,
    finalMs: null,
    pendingJudge: null,
    lastMove: null,
    lastResult: null,
    moveSeq: 0,
    runId: 0,
  };
}

function beginRound(state: GameState, stage: number, now: number, rng: Rng): GameState {
  const { ids, answer } = createRound(ROUND_SIZES[stage], rng, state.pool);
  return {
    ...state,
    phase: 'playing',
    stage,
    ids,
    answer,
    slots: Array(ids.length).fill(null),
    selection: null,
    attempts: 0,
    roundStartedAt: now,
    pendingJudge: null,
    lastMove: null,
    lastResult: null,
    moveSeq: state.moveSeq + 1,
  };
}

/** Commit a changed arrangement; queue a judgement when every slot is filled. */
function commitSlots(state: GameState, slots: (ItemId | null)[], lastMove: 'place' | 'shift'): GameState {
  const moveSeq = state.moveSeq + 1;
  return {
    ...state,
    slots,
    lastMove,
    selection: null,
    moveSeq,
    pendingJudge: isFull(slots) ? moveSeq : null,
  };
}

export const canInteract = (s: GameState) => s.phase === 'playing' && s.pendingJudge === null;

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start': {
      const base: GameState = {
        ...state,
        rounds: [],
        startedAt: action.now,
        finalMs: null,
        runId: state.runId + 1,
      };
      return beginRound(base, 0, action.now, action.rng ?? Math.random);
    }

    case 'clickTray': {
      if (!canInteract(state)) return state;
      if (state.slots.includes(action.id) || !state.ids.includes(action.id)) return state;
      const sel = state.selection;
      const same = sel?.kind === 'tray' && sel.id === action.id;
      return { ...state, selection: same ? null : { kind: 'tray', id: action.id } };
    }

    case 'clickSlot': {
      if (!canInteract(state)) return state;
      const { index } = action;
      if (index < 0 || index >= state.slots.length) return state;
      const sel = state.selection;
      const target = state.slots[index];

      // Tray can → slot. Placing on an occupied slot (only possible while the
      // tray still has cans) sends the displaced can back to the tray, exactly
      // like the original MVP.
      if (sel?.kind === 'tray') {
        const slots = [...state.slots];
        const prev = slots.indexOf(sel.id);
        if (prev >= 0) slots[prev] = null;
        slots[index] = sel.id;
        return commitSlots(state, slots, 'place');
      }

      if (sel === null) {
        return target === null ? state : { ...state, selection: { kind: 'slot', index } };
      }

      // Slot can already selected.
      if (sel.index === index) return { ...state, selection: null };
      const slots = [...state.slots];
      if (target === null) {
        // Move to an empty slot (first placement phase).
        slots[index] = slots[sel.index];
        slots[sel.index] = null;
      } else {
        // Swap A ↔ B.
        [slots[sel.index], slots[index]] = [slots[index], slots[sel.index]];
      }
      return commitSlots(state, slots, 'shift');
    }

    case 'judge': {
      if (state.phase !== 'playing' || state.pendingJudge !== action.seq || !isFull(state.slots)) return state;
      const total = state.slots.length;
      const correct = countCorrect(state.slots, state.answer);
      const attempts = state.attempts + 1;
      const result: MatchResult = {
        correct,
        total,
        perfect: correct === total,
        seq: (state.lastResult?.seq ?? 0) + 1,
      };
      if (!result.perfect) {
        return { ...state, attempts, pendingJudge: null, selection: null, lastResult: result };
      }
      const rounds = [...state.rounds, { size: total, attempts, elapsedMs: action.now - state.roundStartedAt }];
      return {
        ...state,
        phase: 'revealing',
        attempts,
        rounds,
        pendingJudge: null,
        selection: null,
        lastResult: result,
        // Stop the stopwatch the instant the last box is solved.
        finalMs: state.stage === LAST_STAGE ? action.now - state.startedAt : null,
      };
    }

    case 'reset': {
      if (!canInteract(state)) return state;
      if (state.slots.every((s) => s === null) && state.selection === null) return state;
      return {
        ...state,
        slots: Array(state.slots.length).fill(null),
        selection: null,
        lastMove: 'place',
        lastResult: null,
        moveSeq: state.moveSeq + 1,
      };
    }

    case 'nextRound': {
      if (state.phase !== 'revealing' || action.runId !== state.runId || state.stage >= LAST_STAGE) return state;
      return beginRound(state, state.stage + 1, action.now, action.rng ?? Math.random);
    }

    case 'showResult': {
      if (state.phase !== 'revealing' || action.runId !== state.runId || state.finalMs === null) return state;
      return { ...state, phase: 'finished' };
    }

    case 'home': {
      // Back to the start screen. Bumping runId invalidates any pending
      // round/result timers from the abandoned run.
      if (state.phase === 'ready') return state;
      return { ...createInitialState(action.rng, state.pool), runId: state.runId + 1, moveSeq: state.moveSeq + 1 };
    }

    default:
      return state;
  }
}

/** Elapsed stopwatch time for display. */
export function elapsedMs(state: GameState, now: number): number {
  if (state.finalMs !== null) return state.finalMs;
  if (state.phase === 'ready') return 0;
  return Math.max(0, now - state.startedAt);
}

export const totalAttempts = (state: Pick<GameState, 'rounds'>) => state.rounds.reduce((n, r) => n + r.attempts, 0);

/** `mm:ss.cs`, same as the original MVP. */
export function formatTime(ms: number): string {
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const cs = Math.floor((t % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
