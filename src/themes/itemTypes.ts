import type { ItemId } from '../game/types';
import type { Vec3 } from '../three/layout';

/** Props every theme's 3D object component accepts (Can3D, Book3D, …). */
export interface ThemeItemProps {
  id: ItemId;
  /** Resting position (base centre). */
  position: Vec3;
  selected?: boolean;
  scale?: number;
  reducedMotion?: boolean;
  /** Play a short drop-in when mounted. */
  appear?: boolean;
}
