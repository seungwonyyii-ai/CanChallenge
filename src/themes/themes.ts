/**
 * Theme registry for the theme-select screen and the design mock-ups.
 *
 * Adding a theme = adding one entry here (+ an object component for its
 * preview). Only CAN is playable; the others are design mock-ups.
 */
export type ThemeId = 'can' | 'book' | 'snack';

export interface ThemeInfo {
  id: ThemeId;
  /** Display name on the card (display font). */
  label: string;
  /** Korean sub-label. */
  ko: string;
  status: 'playable' | 'coming-soon';
  /** Slot width used on the shared cabinet (world units). */
  slotW: number;
}

export const THEMES: readonly ThemeInfo[] = [
  { id: 'can', label: 'CAN', ko: '음료 캔', status: 'playable', slotW: 0.68 },
  { id: 'book', label: 'BOOK', ko: '책', status: 'coming-soon', slotW: 0.8 },
  { id: 'snack', label: 'SNACK', ko: '과자', status: 'coming-soon', slotW: 0.86 },
];

export const getTheme = (id: ThemeId) => THEMES.find((t) => t.id === id)!;
