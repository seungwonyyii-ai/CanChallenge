import { useEffect, useRef } from 'react';
import { formatTime } from '../game/engine';

export function StartOverlay({ best, onStart, text }: { best: number | null; onStart: () => void; text: string }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="start-title">
      <div className="modal">
        <h1 id="start-title" className="modal-title">
          CANCAN
        </h1>
        <p className="modal-text">{text}</p>
        <div className={`best-card${best === null ? ' empty' : ''}`} data-testid="best-card">
          <span className="best-label">MY BEST</span>
          {best !== null ? (
            <strong className="best-time" data-testid="best-time">
              {formatTime(best)}
            </strong>
          ) : (
            <span className="best-none">첫 기록에 도전해보세요</span>
          )}
        </div>
        <button type="button" className="btn primary big" onClick={onStart} data-testid="start">
          START
        </button>
      </div>
    </div>
  );
}

const seconds = (ms: number) => `${(Math.abs(ms) / 1000).toFixed(2)}초`;

/**
 * Result: this run vs. personal best, framed to invite another try.
 * `prevBest` is the record *before* this run was saved.
 */
export function ResultOverlay({
  time,
  prevBest,
  attempts,
  onPlayAgain,
}: {
  time: number;
  prevBest: number | null;
  attempts: number;
  onPlayAgain: () => void;
}) {
  const newBest = prevBest === null || time < prevBest;
  const diff = prevBest === null ? 0 : time - prevBest;
  const max = prevBest === null ? time : Math.max(time, prevBest);

  let headline: string;
  let sub: string;
  if (prevBest === null) {
    headline = '첫 기록 등록!';
    sub = '한 번 더 하면 더 빨라질 거예요';
  } else if (newBest) {
    headline = `${seconds(diff)} 단축!`;
    sub = '최고 기록을 새로 썼어요';
  } else if (diff < 1) {
    headline = `최고 기록까지 ${seconds(diff)}!`;
    sub = '거의 다 왔어요. 바로 다시 도전!';
  } else {
    headline = `최고 기록까지 ${seconds(diff)}`;
    sub = '한 번 더 하면 깰 수 있어요';
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="modal">
        <p className={`modal-eyebrow${newBest ? ' good' : ''}`}>{newBest ? 'NEW BEST' : 'CLEAR'}</p>
        <h2 id="result-title" className="result-time" data-testid="result-time">
          {formatTime(time)}
        </h2>

        <div className={`compare${newBest ? ' is-best' : ''}`} data-testid="compare">
          <p className="compare-headline">{headline}</p>
          <p className="compare-sub">{sub}</p>
          {prevBest !== null && (
            <div className="bars">
              <div className="bar-row now">
                <span className="bar-label">이번</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(time / max) * 100}%` }} />
                </span>
                <span className="bar-time">{formatTime(time)}</span>
              </div>
              <div className="bar-row best">
                <span className="bar-label">{newBest ? '이전 BEST' : 'BEST'}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(prevBest / max) * 100}%` }} />
                </span>
                <span className="bar-time">{formatTime(prevBest)}</span>
              </div>
            </div>
          )}
        </div>

        <button type="button" className="btn primary big" onClick={onPlayAgain} data-testid="play-again">
          {newBest ? 'PLAY AGAIN' : '다시 도전'}
        </button>
        <p className="modal-note">총 판정 {attempts}회</p>
      </div>
    </div>
  );
}

/** In-game confirmation dialog (replaces the browser's native confirm). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmBtn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="overlay dim" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" data-testid="confirm-dialog">
        <h2 id="confirm-title" className="dialog-title">
          {title}
        </h2>
        <p className="dialog-text">{message}</p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel} data-testid="confirm-cancel">
            계속하기
          </button>
          <button type="button" className="btn primary" onClick={onConfirm} ref={confirmBtn} data-testid="confirm-ok">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
