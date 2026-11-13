import { useEffect, useRef } from 'react';
import { ROUND_SIZES, elapsedMs, formatTime } from '../game/engine';
import type { GameState } from '../game/types';

/** Stopwatch text updated every animation frame without re-rendering React. */
export function Stopwatch({ state }: { state: GameState }) {
  const el = useRef<HTMLDivElement>(null);
  const live = useRef(state);
  useEffect(() => {
    live.current = state;
  }, [state]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (el.current) el.current.textContent = formatTime(elapsedMs(live.current, performance.now()));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={el} className={`timer${state.finalMs !== null ? ' stopped' : ''}`} data-testid="timer" aria-label="경과 시간">
      {/* text is written by the rAF loop above; React keeps this constant */}
      00:00.00
    </div>
  );
}

export function TopBar({ state }: { state: GameState }) {
  return (
    <header className="topbar">
      <div className="logo">
        N-BOX<span className="logo-sub">Korean Drinks</span>
      </div>
      <ol className="rounds" aria-label="라운드">
        {ROUND_SIZES.map((size, i) => {
          const done = i < state.stage || (i === state.stage && (state.phase === 'revealing' || state.phase === 'finished'));
          const active = i === state.stage && state.phase !== 'ready';
          return (
            <li key={size} className={`round${done ? ' done' : active ? ' active' : ''}`} aria-current={active ? 'step' : undefined}>
              {size}-BOX
            </li>
          );
        })}
      </ol>
      <Stopwatch state={state} />
    </header>
  );
}

export function BottomBar({
  state,
  canReset,
  onReset,
  onRestart,
}: {
  state: GameState;
  canReset: boolean;
  onReset: () => void;
  onRestart: () => void;
}) {
  const placing = state.slots.some((s) => s === null);
  const hint =
    state.phase === 'revealing'
      ? state.finalMs !== null
        ? 'CLEAR!'
        : '정답! 다음 박스로…'
      : placing
        ? '캔 → 빈 칸을 차례로 눌러 놓기'
        : '캔 두 개를 눌러 자리 바꾸기';
  return (
    <footer className="bottombar">
      <p className="hint" data-testid="hint">
        {hint}
      </p>
      <div className="actions">
        <button type="button" className="btn" onClick={onReset} disabled={!canReset} data-testid="reset" title="현재 라운드의 캔만 트레이로 되돌립니다. 시간은 계속 흐릅니다.">
          RESET <small>배치만 초기화</small>
        </button>
        <button type="button" className="btn ghost" onClick={onRestart} disabled={state.phase === 'ready'} data-testid="restart" title="3-BOX부터 새 정답으로 다시 시작합니다.">
          RESTART <small>처음부터</small>
        </button>
      </div>
    </footer>
  );
}
