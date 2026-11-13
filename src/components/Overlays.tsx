import { formatTime, totalAttempts } from '../game/engine';
import type { GameState } from '../game/types';

export function StartOverlay({ best, onStart }: { best: number | null; onStart: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="start-title">
      <div className="modal">
        <h1 id="start-title" className="modal-title">
          N-BOX Speed Match
        </h1>
        <p className="modal-text">
          캔을 눌러 자리를 맞혀보세요.
          <br />3 → 4 → 5 BOX, 가장 빠른 기록에 도전!
        </p>
        <button type="button" className="btn primary big" onClick={onStart} autoFocus data-testid="start">
          START
        </button>
        <p className="modal-note">{best !== null ? `BEST ${formatTime(best)}` : ' '}</p>
      </div>
    </div>
  );
}

export function ResultOverlay({
  state,
  best,
  newBest,
  onPlayAgain,
}: {
  state: GameState;
  best: number | null;
  newBest: boolean;
  onPlayAgain: () => void;
}) {
  const total = state.finalMs ?? 0;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="modal">
        <p className="modal-eyebrow">{newBest ? 'NEW PERSONAL BEST' : 'CHALLENGE CLEAR'}</p>
        <h2 id="result-title" className="result-time" data-testid="result-time">
          {formatTime(total)}
        </h2>
        <table className="result-table">
          <tbody>
            {state.rounds.map((r) => (
              <tr key={r.size}>
                <th>{r.size}-BOX</th>
                <td>{formatTime(r.elapsedMs)}</td>
                <td className="muted">판정 {r.attempts}회</td>
              </tr>
            ))}
            <tr className="sum">
              <th>TOTAL</th>
              <td>{formatTime(total)}</td>
              <td className="muted">판정 {totalAttempts(state)}회</td>
            </tr>
          </tbody>
        </table>
        <p className="modal-note">PERSONAL BEST {best !== null ? formatTime(best) : '—'}</p>
        <button type="button" className="btn primary big" onClick={onPlayAgain} autoFocus data-testid="play-again">
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
