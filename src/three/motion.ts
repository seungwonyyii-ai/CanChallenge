/** Animation timings shared by the 3D scene and the game timeline (ms). */
export const MOTION = {
  /** Selected can lift (spec: 0.1–0.2 s). */
  liftMs: 150,
  /** Shelf ↔ shelf move or A ↔ B swap (spec: 0.2–0.35 s). */
  swapMs: 320,
  /** Tray ↔ shelf move: lift, travel, settle. */
  placeMs: 440,
  /** Cover swing open / closed. */
  coverOpenMs: 520,
  coverCloseMs: 340,
  /** Hold with the answer visible before the next round (original: 1.4 s). */
  revealHoldMs: 1500,
  /** `N RIGHT!` toast visibility (spec: 0.7 s). */
  toastMs: 700,
} as const;

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
/** Small overshoot for a "dropping into place" feel, kept subtle on purpose. */
export const easeOutBack = (t: number, s = 0.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

/** Frame-rate independent exponential approach. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));
