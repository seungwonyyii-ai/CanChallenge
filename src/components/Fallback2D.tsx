import type { CSSProperties } from 'react';
import { getDrink } from '../game/drinks';
import type { DrinkId, GameState } from '../game/types';
import { MatchToast } from './MatchToast';

/**
 * Readable 2D board used when WebGL is unavailable. Same engine, same
 * click-and-click rules; only the rendering differs.
 */
export function Fallback2D({
  state,
  coverOpen,
  interactive,
  onSlot,
  onTray,
}: {
  state: GameState;
  coverOpen: boolean;
  interactive: boolean;
  onSlot: (i: number) => void;
  onTray: (id: DrinkId) => void;
}) {
  const sel = state.selection;
  const can = (id: DrinkId, selected = false) => {
    const d = getDrink(id);
    return (
      <span className={`can2d${selected ? ' selected' : ''}`} style={{ '--can': d.color, '--ink': d.ink } as CSSProperties}>
        {d.name}
      </span>
    );
  };
  return (
    <div className="fallback2d">
      <p className="fallback-note">3D 그래픽(WebGL)을 사용할 수 없어 2D 화면으로 표시합니다.</p>
      <div className="board2d" style={{ '--n': state.slots.length } as CSSProperties}>
        {state.slots.map((id, i) => (
          <button key={i} type="button" className="slot2d" disabled={!interactive} onClick={() => onSlot(i)} aria-label={`${i + 1}번 칸`}>
            {id ? can(id, sel?.kind === 'slot' && sel.index === i) : <span className="plus">+</span>}
            <small>{String(i + 1).padStart(2, '0')}</small>
          </button>
        ))}
        <div className="toast2d">
          <MatchToast result={state.lastResult} />
        </div>
      </div>
      <div className={`cover2d${coverOpen ? ' open' : ''}`} style={{ '--n': state.slots.length } as CSSProperties}>
        {coverOpen ? state.answer.map((id, i) => <div key={i}>{can(id)}</div>) : <span>HIDDEN ANSWER</span>}
      </div>
      <div className="tray2d">
        {state.ids.map((id) =>
          state.slots.includes(id) ? (
            <span key={id} className="tray-empty" />
          ) : (
            <button key={id} type="button" className="tray-btn" disabled={!interactive} onClick={() => onTray(id)}>
              {can(id, sel?.kind === 'tray' && sel.id === id)}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
