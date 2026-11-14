/**
 * Playable theme configuration. CAN and BOOK share the same engine, timeline
 * and UI; a theme only supplies its item pool, 3D object, slot width, best
 * record key and a few words of copy.
 */
import type { ComponentType } from 'react';
import { Can3D } from '../components/Can3D';
import { ALL_DRINK_IDS, getDrink } from '../game/drinks';
import { BEST_KEY } from '../game/records';
import type { DrinkId, ItemId } from '../game/types';
import { preloadLabelImages } from '../three/textures';
import { Book3D, preloadBookTextures } from './Book3D';
import { BOOK_IDS, getBook } from './books';
import type { ThemeItemProps } from './itemTypes';
import { getTheme, type ThemeId } from './themes';

export interface GameTheme {
  id: ThemeId;
  pool: readonly ItemId[];
  Item: ComponentType<ThemeItemProps>;
  slotW: number;
  /** localStorage key of the personal best (CAN keeps the original key). */
  bestKey: string;
  /** One-line start-screen copy. */
  startText: string;
  /** Name/colours for the 2D (no-WebGL) fallback. */
  itemInfo: (id: ItemId) => { name: string; color: string; ink: string };
  preload: () => Promise<unknown>;
}

const CanItem = (p: ThemeItemProps) => <Can3D {...p} id={p.id as DrinkId} />;

export const GAME_THEMES: Record<'can' | 'book', GameTheme> = {
  can: {
    id: 'can',
    pool: ALL_DRINK_IDS,
    Item: CanItem,
    slotW: getTheme('can').slotW,
    bestKey: BEST_KEY,
    startText: '음료를 줄 세워 자리를 맞혀보세요',
    itemInfo: (id) => getDrink(id as DrinkId),
    preload: preloadLabelImages,
  },
  book: {
    id: 'book',
    pool: BOOK_IDS,
    Item: Book3D,
    slotW: getTheme('book').slotW,
    bestKey: 'cancan_best_book',
    startText: '책을 줄 세워 자리를 맞혀보세요',
    itemInfo: (id) => {
      const b = getBook(id);
      return { name: b.title, color: b.color, ink: b.ink };
    },
    preload: () => preloadBookTextures(BOOK_IDS),
  },
};

/** `?theme=book` selects BOOK; anything else is the original CAN game. */
export function themeFromUrl(): GameTheme {
  const t = new URLSearchParams(window.location.search).get('theme');
  return t === 'book' ? GAME_THEMES.book : GAME_THEMES.can;
}
