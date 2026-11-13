/**
 * World-space layout of the display cabinet (units ≈ 1 = 13 cm).
 *
 * Kept separate from game data: the engine knows only slot indexes and drink
 * ids; these helpers turn them into 3D coordinates.
 *
 *   y  1.38 ┌───────────────┐  top board
 *           │ 1 │ 2 │ 3 │…  │  play shelf (slots, open front, half-depth dividers)
 *   y  0.00 ├───────────────┤  mid board (shelf floor)
 *           │ hidden answer │  answer compartment, closed by a hinged cover
 *   y -1.22 ├───────────────┤
 *           │    plinth     │
 *   y -2.40 └───────────────┘  floor; tray counter stands in front of the plinth
 */
export const CAN_R = 0.27;
export const CAN_H = 0.96;
export const SLOT_W = 0.8;
export const WALL = 0.08;

export const SHELF_FLOOR = 0; // y where play cans stand
export const SHELF_INNER_H = 1.3;
export const MID_BOARD = 0.12;
export const LOWER_TOP = SHELF_FLOOR - MID_BOARD; // underside of the mid board
export const LOWER_INNER_H = 1.1;
export const LOWER_FLOOR = LOWER_TOP - LOWER_INNER_H; // y where answer cans stand
export const BASE_BOARD = 0.1;
export const FLOOR_Y = -2.4;

export const DEPTH = 0.9; // outer depth of the cabinet
export const BACK_Z = -DEPTH / 2;
export const FRONT_Z = DEPTH / 2;
export const CAN_Z = -0.06; // can centre inside a slot
export const DIVIDER_FRONT_Z = -0.02; // dividers run from the back to here

export const TRAY_TOP = -2.28; // y where tray cans stand
export const TRAY_Z = 0.78;
export const TRAY_DEPTH = 0.86;

export const ANSWER_SCALE = 0.86;

export const innerWidth = (n: number) => n * SLOT_W;
export const slotX = (i: number, n: number) => (i - (n - 1) / 2) * SLOT_W;

export type Vec3 = [number, number, number];

export const slotPosition = (i: number, n: number): Vec3 => [slotX(i, n), SHELF_FLOOR, CAN_Z];
export const trayPosition = (i: number, n: number): Vec3 => [slotX(i, n), TRAY_TOP, TRAY_Z];
export const answerPosition = (i: number, n: number): Vec3 => [slotX(i, n), LOWER_FLOOR, -0.08];

/** Bounds the camera must keep in view for an `n`-box round. */
export function contentBounds(n: number) {
  const halfW = innerWidth(n) / 2 + WALL + 0.16;
  return { halfW, top: SHELF_FLOOR + SHELF_INNER_H + 0.25, bottom: FLOOR_Y - 0.08 };
}
