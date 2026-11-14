/**
 * BOOK theme: 민음사 세계문학전집 5권.
 *
 * Sizes come from book_dimensions.csv (retail listings; kept in
 * assets-src/books/). Textures are built by scripts/make_book_textures.py:
 * the flat front-cover scan for the front, and the spine strip cut out of the
 * 3/4 product render for the spine.
 */
export type BookId = 'moon_and_sixpence' | 'do_you_like_brahms' | 'animal_farm' | 'demian' | 'unbearable_lightness';

export interface Book {
  id: BookId;
  title: string;
  author: string;
  series: number;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  /** Title-band colour on the cover (2D fallback, accents). */
  color: string;
  ink: string;
}

// prettier-ignore
export const BOOKS: readonly Book[] = [
  { id: 'moon_and_sixpence',    title: '달과 6펜스',                author: '서머싯 몸',       series: 38,  widthMm: 132, heightMm: 225, thicknessMm: 30, color: '#55764a', ink: '#ffffff' },
  { id: 'do_you_like_brahms',   title: '브람스를 좋아하세요...',    author: '프랑수아즈 사강', series: 179, widthMm: 132, heightMm: 224, thicknessMm: 20, color: '#ea9a37', ink: '#ffffff' },
  { id: 'animal_farm',          title: '동물농장',                  author: '조지 오웰',       series: 5,   widthMm: 132, heightMm: 225, thicknessMm: 20, color: '#7b8472', ink: '#ffffff' },
  { id: 'demian',               title: '데미안',                    author: '헤르만 헤세',     series: 44,  widthMm: 132, heightMm: 225, thicknessMm: 20, color: '#7d4f9c', ink: '#ffffff' },
  { id: 'unbearable_lightness', title: '참을 수 없는 존재의 가벼움', author: '밀란 쿤데라',     series: 234, widthMm: 132, heightMm: 224, thicknessMm: 30, color: '#2f8c4c', ink: '#ffffff' },
];

export const BOOK_IDS: readonly BookId[] = BOOKS.map((b) => b.id);

const BY_ID = new Map(BOOKS.map((b) => [b.id, b]));
export function getBook(id: string): Book {
  const b = BY_ID.get(id as BookId);
  if (!b) throw new Error(`Unknown book: ${id}`);
  return b;
}

/**
 * World units per mm for books. A 225 mm book ≈ 0.99 units, so it fits the
 * shared shelf (1.2 inner height, incl. the 0.16 selection lift). Books and
 * cans use different scales on purpose: they never share a shelf.
 */
export const BOOK_MM = 0.0044;

export function bookSize(id: string) {
  const b = getBook(id);
  return { w: b.widthMm * BOOK_MM, h: b.heightMm * BOOK_MM, d: b.thicknessMm * BOOK_MM };
}

/** 3/4 view: turned so the spine (left edge) faces the camera with the cover. */
export const BOOK_YAW = 0.5;

export const bookTextureUrl = (id: string, part: 'front' | 'spine') => `${import.meta.env.BASE_URL}assets/books/${id}_${part}.jpg`;
