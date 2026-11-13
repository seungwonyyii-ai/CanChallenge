export type DrinkId = 'morning' | 'plum' | 'pear' | 'sikhye' | 'pine';

export interface Drink {
  id: DrinkId;
  /** Korean product name, shown on the placeholder label. */
  name: string;
  /** Short English descriptor, shown on the placeholder label. */
  en: string;
  /** Dominant package colour (placeholder label + 2D fallback). */
  color: string;
  /** Readable ink colour on top of `color`. */
  ink: string;
  /**
   * Optional path (relative to the site root, e.g. `assets/drinks/morning.png`)
   * of an unwrapped can-label texture whose use is licensed. When absent, a
   * clearly marked placeholder label is generated at runtime.
   */
  labelTexture?: string;
}

/** What is currently "picked up" by the player. */
export type Selection =
  | { kind: 'tray'; id: DrinkId }
  | { kind: 'slot'; index: number }
  | null;

/**
 * - `ready`     : start screen, nothing running
 * - `playing`   : stopwatch running, input accepted
 * - `revealing` : round solved, cover open, waiting to advance (timer keeps
 *                 running between rounds; input blocked)
 * - `finished`  : final round solved, timer stopped, result screen
 */
export type Phase = 'ready' | 'playing' | 'revealing' | 'finished';

export interface RoundRecord {
  size: number;
  /** Number of full-arrangement judgements made in this round. */
  attempts: number;
  /** Time spent on this round in ms. */
  elapsedMs: number;
}

export interface MatchResult {
  correct: number;
  total: number;
  perfect: boolean;
  /** Increments for every judgement so the UI can restart the toast. */
  seq: number;
}

export interface GameState {
  phase: Phase;
  /** Index into ROUND_SIZES. */
  stage: number;
  /** Drinks used this round, in tray order. */
  ids: DrinkId[];
  /** Hidden answer (index = slot). */
  answer: DrinkId[];
  /** Player's arrangement (index = slot). */
  slots: (DrinkId | null)[];
  selection: Selection;
  /** Judgements made in the current round (survives RESET). */
  attempts: number;
  rounds: RoundRecord[];
  /** performance.now() when the challenge started. */
  startedAt: number;
  /** performance.now() when the current round started. */
  roundStartedAt: number;
  /** Total time; set the instant the last round is solved. */
  finalMs: number | null;
  /**
   * A full arrangement was produced by the last move and is waiting to be
   * judged once its move animation finishes. Input is blocked meanwhile.
   */
  pendingJudge: number | null;
  /**
   * Kind of the last arrangement change: `place` involved the tray (a can
   * travelled vertically), `shift` was shelf-only (move / swap). Lets the UI
   * time the judgement to the end of the matching animation.
   */
  lastMove: 'place' | 'shift' | null;
  lastResult: MatchResult | null;
  /** Monotonic counter, bumped on every arrangement change (for UI keys). */
  moveSeq: number;
  /** Unique id of this challenge run, bumped on (re)start. */
  runId: number;
}
