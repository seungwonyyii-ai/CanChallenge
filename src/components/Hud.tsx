import { useEffect, useRef } from 'react';
import { elapsedMs, formatTime } from '../game/engine';
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

export function TopBar({ state, onLogo }: { state: GameState; onLogo: () => void }) {
  return (
    <header className="topbar">
      <button type="button" className="logo" onClick={onLogo} aria-label="CANCAN 처음 화면으로" data-testid="logo">
        CANCAN
      </button>
      <Stopwatch state={state} />
      <span aria-hidden="true" />
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
  return (
    <footer className="bottombar">
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
