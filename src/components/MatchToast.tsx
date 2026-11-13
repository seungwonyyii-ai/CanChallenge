import { useEffect, useState } from 'react';
import type { MatchResult } from '../game/types';
import { MOTION } from '../three/motion';

/**
 * `N RIGHT!` — only the count, no denominator, no extra copy. Shown for 0.7 s,
 * never blocks input, and a newer result immediately replaces an older one.
 */
export function MatchToast({ result }: { result: MatchResult | null }) {
  const [visibleSeq, setVisibleSeq] = useState<number | null>(null);

  useEffect(() => {
    if (!result) {
      setVisibleSeq(null);
      return;
    }
    setVisibleSeq(result.seq);
    const t = window.setTimeout(() => setVisibleSeq(null), MOTION.toastMs);
    return () => window.clearTimeout(t); // newer result → previous timer cleared
  }, [result]);

  const show = result !== null && visibleSeq === result.seq;
  return (
    <div className="toast-anchor" aria-live="polite" role="status">
      {show && (
        <div key={result.seq} className={`match-toast${result.perfect ? ' perfect' : ''}`} data-testid="match-toast">
          {result.correct} RIGHT!
        </div>
      )}
    </div>
  );
}
