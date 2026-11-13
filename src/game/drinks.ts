import type { Drink, DrinkId } from './types';

/**
 * The five Korean drinks from the original MVP.
 *
 * The original HTML hot-linked product photos from third-party shops. Those
 * URLs are NOT used here (link rot, CORS, and unverified usage rights). To show
 * the real package design, place a licensed, unwrapped label image in
 * `public/assets/drinks/` and set `labelTexture` — see README.md.
 */
export const DRINKS: readonly Drink[] = [
  { id: 'morning', name: '아침햇살', en: 'RICE DRINK', color: '#e6d2a1', ink: '#675027' },
  { id: 'plum', name: '초록매실', en: 'GREEN PLUM', color: '#96bf7b', ink: '#295d32' },
  { id: 'pear', name: '갈아만든배', en: 'PEAR', color: '#e9d578', ink: '#64551c' },
  { id: 'sikhye', name: '비락식혜', en: 'SIKHYE', color: '#dca66e', ink: '#69431e' },
  { id: 'pine', name: '솔의눈', en: 'PINE NEEDLE', color: '#a2cdd0', ink: '#25545c' },
];

const BY_ID = new Map(DRINKS.map((d) => [d.id, d]));

export function getDrink(id: DrinkId): Drink {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Unknown drink: ${id}`);
  return d;
}

export const ALL_DRINK_IDS: readonly DrinkId[] = DRINKS.map((d) => d.id);
