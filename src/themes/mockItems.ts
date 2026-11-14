/**
 * SAMPLE items for the BOOK and SNACK design mock-ups.
 *
 * Every title, brand-like name and package design here is FICTIONAL and is
 * stamped "SAMPLE" on the object, so it can't be mistaken for a real product.
 * Replace with licensed artwork before these themes ship.
 *
 * Sizes are world units (≈ 1 = 13 cm, same scale as the cans).
 */

export interface BookSpec {
  id: string;
  title: string;
  /** small line under the title */
  sub: string;
  w: number;
  h: number;
  /** thickness */
  d: number;
  hardcover: boolean;
  bg: string;
  ink: string;
  accent: string;
  motif: 'moon' | 'waves' | 'forest' | 'lemon' | 'map';
}

export const BOOKS: readonly BookSpec[] = [
  { id: 'night', title: '밤의 정원', sub: '장편소설', w: 0.6, h: 0.86, d: 0.17, hardcover: true, bg: '#2f3a56', ink: '#efe6cf', accent: '#e4d3a6', motif: 'moon' },
  { id: 'sea', title: '바다로 가는 길', sub: '여행 에세이', w: 0.54, h: 0.8, d: 0.11, hardcover: false, bg: '#93b6c6', ink: '#21384a', accent: '#f4f7f6', motif: 'waves' },
  { id: 'forest', title: '작은 숲', sub: '그림책', w: 0.64, h: 0.9, d: 0.24, hardcover: true, bg: '#6f8b6a', ink: '#f1ecdc', accent: '#4f6a4c', motif: 'forest' },
  { id: 'lemon', title: '오후의 레몬', sub: '시집', w: 0.5, h: 0.74, d: 0.09, hardcover: false, bg: '#ead58a', ink: '#3c3a2c', accent: '#f7f1d4', motif: 'lemon' },
  { id: 'map', title: '붉은 지도', sub: '역사 교양', w: 0.58, h: 0.84, d: 0.19, hardcover: true, bg: '#b5684f', ink: '#f6ead9', accent: '#d68e75', motif: 'map' },
];

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
export const MOCK_TEXT = [...BOOKS.flatMap((b) => [b.title, b.sub]), ...SNACKS.flatMap((s) => [s.name, s.sub]), '테마를 골라주세요 음료 캔 책 과자 출판'].join(' ');
