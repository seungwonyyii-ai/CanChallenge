import type { Drink, DrinkId } from './types';

/**
 * The five Korean drinks from the original MVP.
 *
 * Label textures are unwrapped from the product photos supplied by the project
 * owner (`assets-src/drinks/`, see `scripts/make_can_labels.py`). If a texture
 * fails to load, a generated placeholder label is shown instead.
 */
export const DRINKS: readonly Drink[] = [
  // sizes: can_dimensions.csv (estimated, not physically verified)
  { id: 'morning', name: '아침햇살', en: 'RICE DRINK', color: '#e6d2a1', ink: '#675027', labelTexture: 'assets/drinks/morning.jpg', volumeMl: 180, diameterMm: 53, heightMm: 104 },
  { id: 'plum', name: '초록매실', en: 'GREEN PLUM', color: '#96bf7b', ink: '#295d32', labelTexture: 'assets/drinks/plum.jpg', volumeMl: 180, diameterMm: 53, heightMm: 104 },
  { id: 'pear', name: '갈아만든배', en: 'PEAR', color: '#e9d578', ink: '#64551c', labelTexture: 'assets/drinks/pear.jpg', volumeMl: 238, diameterMm: 66, heightMm: 92 },
  { id: 'sikhye', name: '비락식혜', en: 'SIKHYE', color: '#dca66e', ink: '#69431e', labelTexture: 'assets/drinks/sikhye.jpg', volumeMl: 238, diameterMm: 66, heightMm: 92 },
  { id: 'pine', name: '솔의눈', en: 'PINE NEEDLE', color: '#a2cdd0', ink: '#25545c', labelTexture: 'assets/drinks/pine.jpg', volumeMl: 240, diameterMm: 53, heightMm: 134 },
];

const BY_ID = new Map(DRINKS.map((d) => [d.id, d]));

export function getDrink(id: DrinkId): Drink {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Unknown drink: ${id}`);
  return d;
}

export const ALL_DRINK_IDS: readonly DrinkId[] = DRINKS.map((d) => d.id);
