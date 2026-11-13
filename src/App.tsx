import { Component, useCallback, useEffect, useReducer, useState, type ReactNode } from 'react';
import { Fallback2D, hasWebGL } from './components/Fallback2D';
import { GameScene } from './components/GameScene';
import { BottomBar, TopBar } from './components/Hud';
import { ResultOverlay, StartOverlay } from './components/Overlays';
import { canInteract, createInitialState, gameReducer } from './game/engine';
import { loadBest, saveIfBest } from './game/records';
import type { DrinkId } from './game/types';
import { MOTION, prefersReducedMotion } from './three/motion';

/** Falls back to the 2D board if the WebGL renderer throws. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error('[nbox] 3D scene failed, using 2D fallback', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState());
  const [best, setBest] = useState<number | null>(() => loadBest());
  const [newBest, setNewBest] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [webgl] = useState(hasWebGL);
  const reducedMotion = useReducedMotion();

  const { phase, runId, stage, finalMs, pendingJudge, lastMove } = state;

  // 1) Judge a full arrangement once its move animation has finished.
  useEffect(() => {
    if (pendingJudge === null) return;
    const delay = reducedMotion ? 0 : (lastMove === 'place' ? MOTION.placeMs : MOTION.swapMs) + 30;
    const t = window.setTimeout(() => dispatch({ type: 'judge', seq: pendingJudge, now: performance.now() }), delay);
    return () => window.clearTimeout(t);
  }, [pendingJudge, lastMove, reducedMotion]);

  // 2) Round solved → open the cover, hold, close, advance (or show result).
  useEffect(() => {
    if (phase !== 'revealing') {
      if (phase === 'playing' || phase === 'ready') setCoverOpen(false);
      return;
    }
    setCoverOpen(true);
    const timers: number[] = [];
    if (finalMs === null) {
      timers.push(window.setTimeout(() => setCoverOpen(false), MOTION.revealHoldMs));
      timers.push(
        window.setTimeout(
          () => dispatch({ type: 'nextRound', runId, now: performance.now() }),
          MOTION.revealHoldMs + (reducedMotion ? 0 : MOTION.coverCloseMs + 40),
        ),
      );
    } else {
      timers.push(window.setTimeout(() => dispatch({ type: 'showResult', runId }), MOTION.revealHoldMs));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [phase, runId, stage, finalMs, reducedMotion]);

  // 3) Persist personal best the moment the final box is solved.
  useEffect(() => {
    if (finalMs === null) return;
    const isNew = saveIfBest(finalMs);
    setNewBest(isNew);
    if (isNew) setBest(finalMs);
  }, [finalMs, runId]);

  // Test hook (only with ?e2e in the URL).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('e2e')) {
      (window as unknown as { __NBOX_STATE__: unknown }).__NBOX_STATE__ = state;
    }
  }, [state]);

  const start = useCallback(() => {
    setNewBest(false);
    dispatch({ type: 'start', now: performance.now() });
  }, []);

  const restart = useCallback(() => {
    if (phase === 'playing' || phase === 'revealing') {
      if (!window.confirm('처음부터 새 챌린지를 시작할까요?\n현재 기록은 저장되지 않습니다.')) return;
    }
    start();
  }, [phase, start]);

  const onSlot = useCallback((index: number) => dispatch({ type: 'clickSlot', index }), []);
  const onTray = useCallback((id: DrinkId) => dispatch({ type: 'clickTray', id }), []);
  const onReset = useCallback(() => dispatch({ type: 'reset' }), []);

  const interactive = canInteract(state);
  const canReset = interactive && (state.slots.some((s) => s !== null) || state.selection !== null);

  const board2d = <Fallback2D state={state} coverOpen={coverOpen} interactive={interactive} onSlot={onSlot} onTray={onTray} />;

  return (
    <div className={`app phase-${phase}`}>
      <TopBar state={state} />
      <main className="stage" aria-label="게임판">
        {webgl ? (
          <SceneBoundary fallback={board2d}>
            <GameScene state={state} coverOpen={coverOpen} reducedMotion={reducedMotion} interactive={interactive} onSlot={onSlot} onTray={onTray} />
          </SceneBoundary>
        ) : (
          board2d
        )}
      </main>
      <BottomBar state={state} canReset={canReset} onReset={onReset} onRestart={restart} />

      {phase === 'ready' && <StartOverlay best={best} onStart={start} />}
      {phase === 'finished' && <ResultOverlay state={state} best={best} newBest={newBest} onPlayAgain={start} />}
    </div>
  );
}
