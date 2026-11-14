/**
 * SAMPLE items for the SNACK design mock-up (BOOK now uses the real books in books.ts).
 *
 * Every title, brand-like name and package design here is FICTIONAL and is
 * stamped "SAMPLE" on the object, so it can't be mistaken for a real product.
 * Replace with licensed artwork before these themes ship.
 *
 * Sizes are world units (≈ 1 = 13 cm, same scale as the cans).
 */

export interface SnackSpec {
  id: string;
  name: string;
  /** small line under the name */
  sub: string;
  kind: 'bag' | 'box';
  w: number;
  h: number;
  d: number;
  bg: string;
  ink: string;
  accent: string;
  motif: 'chips' | 'shrimp' | 'corn' | 'choco' | 'cookie';
}

export const SNACKS: readonly SnackSpec[] = [
  { id: 'chips', name: '바삭 감자칩', sub: '오리지널', kind: 'bag', w: 0.7, h: 0.92, d: 0.3, bg: '#e8c35c', ink: '#7a3524', accent: '#f6e2a3', motif: 'chips' },
  { id: 'shrimp', name: '새우 스낵', sub: '짭짤한 맛', kind: 'bag', w: 0.62, h: 0.86, d: 0.27, bg: '#d97b5f', ink: '#fff6ea', accent: '#f2b49e', motif: 'shrimp' },
  { id: 'choco', name: '초코 과자', sub: '12개입', kind: 'box', w: 0.62, h: 0.78, d: 0.2, bg: '#6a4a3b', ink: '#f6e8d6', accent: '#9a6a52', motif: 'choco' },
  { id: 'corn', name: '고소한 콘', sub: '버터구이', kind: 'bag', w: 0.64, h: 0.8, d: 0.25, bg: '#7fa36c', ink: '#fdf6dc', accent: '#e8d27c', motif: 'corn' },
  { id: 'cookie', name: '버터 쿠키', sub: '선물용', kind: 'box', w: 0.7, h: 0.58, d: 0.24, bg: '#9fb3c6', ink: '#24384c', accent: '#e9d7b0', motif: 'cookie' },
];

/** Every Korean glyph painted into mock-up textures (for font preloading). */
export const MOCK_TEXT = [...SNACKS.flatMap((s) => [s.name, s.sub]), '테마를 골라주세요 음료 캔 책 과자'].join(' ');
