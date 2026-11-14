import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ItemId } from '../game/types';
import {
  ANSWER_SCALE,
  BACK_Z,
  BASE_BOARD,
  DEPTH,
  DIVIDER_FRONT_Z,
  FLOOR_Y,
  FRONT_Z,
  LOWER_FLOOR,
  LOWER_INNER_H,
  LOWER_TOP,
  MID_BOARD,
  SHELF_FLOOR,
  SHELF_INNER_H,
  SLOT_W,
  TRAY_DEPTH,
  TRAY_TOP,
  TRAY_Z,
  WALL,
  answerPosition,
  innerWidth,
  slotX,
} from '../three/layout';
import { MOTION, clamp01, easeInOutCubic, easeOutBack } from '../three/motion';
import { makeCoverTexture, makeNumberTexture, makePlusTexture } from '../three/textures';
import type { ComponentType } from 'react';
import type { ThemeItemProps } from '../themes/itemTypes';

const board = (color: string, roughness = 0.72) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
const MAT = {
  shell: board('#f5f3ee'),
  inner: board('#ebe8e1', 0.85),
  back: board('#e4e1d9', 0.9),
  divider: board('#f1efe9'),
  cover: board('#eeebe4', 0.55),
  plinth: board('#dedbd3', 0.8),
  tray: board('#f2f0ea', 0.7),
  traySpot: board('#e2dfd7', 0.9),
  handle: new THREE.MeshStandardMaterial({ color: '#bdb9b0', metalness: 0.6, roughness: 0.35 }),
};

const R = 0.012; // rounded edge radius

let coverTex: THREE.Texture | null = null;
let plusTex: THREE.Texture | null = null;
const numberTex = new Map<number, THREE.Texture>();
const getNumberTex = (i: number) => {
  let t = numberTex.get(i);
  if (!t) numberTex.set(i, (t = makeNumberTexture(String(i + 1).padStart(2, '0'))));
  return t;
};

/** The white display cabinet: play shelf on top, hidden answer compartment below. */
export function Cabinet({ n, emptySlots, slotW = SLOT_W }: { n: number; emptySlots: boolean[]; slotW?: number }) {
  const w = innerWidth(n, slotW);
  const outerW = w + WALL * 2;
  const top = SHELF_FLOOR + SHELF_INNER_H + WALL;
  const bottom = LOWER_FLOOR - BASE_BOARD;
  const h = top - bottom;
  plusTex ??= makePlusTexture();

  return (
    <group>
      {/* side walls */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[WALL, h, DEPTH]}
          radius={R}
          smoothness={2}
          position={[s * (w / 2 + WALL / 2), bottom + h / 2, 0]}
          material={MAT.shell}
          castShadow
          receiveShadow
        />
      ))}
      {/* top board */}
      <RoundedBox args={[outerW, WALL, DEPTH]} radius={R} smoothness={2} position={[0, top - WALL / 2, 0]} material={MAT.shell} castShadow receiveShadow />
      {/* mid board = shelf floor (front face carries slot numbers) */}
      <RoundedBox args={[w, MID_BOARD, DEPTH]} radius={R} smoothness={2} position={[0, SHELF_FLOOR - MID_BOARD / 2, 0]} material={MAT.shell} castShadow receiveShadow />
      {/* base board */}
      <RoundedBox args={[w, BASE_BOARD, DEPTH]} radius={R} smoothness={2} position={[0, LOWER_FLOOR - BASE_BOARD / 2, 0]} material={MAT.shell} castShadow receiveShadow />
      {/* back panel */}
      <mesh position={[0, bottom + h / 2, BACK_Z + 0.02]} material={MAT.back} receiveShadow>
        <boxGeometry args={[w, h, 0.04]} />
      </mesh>
      {/* slightly darker floors so the cans read clearly */}
      <mesh position={[0, SHELF_FLOOR + 0.001, 0]} rotation-x={-Math.PI / 2} material={MAT.inner} receiveShadow>
        <planeGeometry args={[w, DEPTH - 0.02]} />
      </mesh>
      <mesh position={[0, LOWER_FLOOR + 0.001, 0]} rotation-x={-Math.PI / 2} material={MAT.inner} receiveShadow>
        <planeGeometry args={[w, DEPTH - 0.02]} />
      </mesh>

      {/* half-depth slot dividers (front half open so cans can step out to move) */}
      {Array.from({ length: n - 1 }, (_, i) => {
        const x = slotX(i, n, slotW) + slotW / 2;
        const d = DIVIDER_FRONT_Z - (BACK_Z + 0.04);
        return (
          <RoundedBox
            key={i}
            args={[0.035, SHELF_INNER_H, d]}
            radius={0.01}
            smoothness={2}
            position={[x, SHELF_FLOOR + SHELF_INNER_H / 2, BACK_Z + 0.04 + d / 2]}
            material={MAT.divider}
            castShadow
            receiveShadow
          />
        );
      })}

      {/* slot numbers on the shelf lip + "+" marks on empty slots */}
      {Array.from({ length: n }, (_, i) => (
        <group key={i}>
          <mesh position={[slotX(i, n, slotW), SHELF_FLOOR - MID_BOARD / 2, FRONT_Z + 0.002]}>
            <planeGeometry args={[0.2, 0.1]} />
            <meshBasicMaterial map={getNumberTex(i)} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          {emptySlots[i] && (
            <mesh position={[slotX(i, n, slotW), SHELF_FLOOR + 0.45, BACK_Z + 0.045]}>
              <planeGeometry args={[0.32, 0.32]} />
              <meshBasicMaterial map={plusTex!} transparent depthWrite={false} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}

      {/* recessed plinth to the floor */}
      <mesh position={[0, (bottom + FLOOR_Y) / 2, -0.12]} material={MAT.plinth} castShadow receiveShadow>
        <boxGeometry args={[outerW - 0.12, bottom - FLOOR_Y, DEPTH - 0.28]} />
      </mesh>
    </group>
  );
}

/** Low counter in front of the cabinet holding the unplaced cans. */
export function TrayCounter({ n, slotW = SLOT_W }: { n: number; slotW?: number }) {
  const w = innerWidth(n, slotW) + 0.34;
  const hgt = TRAY_TOP - FLOOR_Y;
  return (
    <group>
      <RoundedBox args={[w, hgt, TRAY_DEPTH]} radius={0.02} smoothness={2} position={[0, FLOOR_Y + hgt / 2, TRAY_Z]} material={MAT.tray} castShadow receiveShadow />
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[slotX(i, n, slotW), TRAY_TOP + 0.002, TRAY_Z]} rotation-x={-Math.PI / 2} material={MAT.traySpot} receiveShadow>
          <circleGeometry args={[0.31, 40]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Hinged cover in front of the answer compartment plus the real answer cans
 * behind it. The hinge is the cover's top edge: on reveal it swings up and
 * forward like a lifted flap, exposing the cans. The answer cans are hidden
 * (not rendered) whenever the cover is shut, so the answer can't leak through
 * gaps or during a round change.
 *
 * Mount with `key` per round so a new round always starts closed.
 */
export function AnswerCompartment({
  n,
  answer,
  open,
  reducedMotion,
  slotW = SLOT_W,
  Item,
}: {
  n: number;
  slotW?: number;
  /** The theme's 3D object (can, book, …). */
  Item: ComponentType<ThemeItemProps>;
  answer: readonly ItemId[];
  open: boolean;
  reducedMotion: boolean;
}) {
  const hinge = useRef<THREE.Group>(null);
  const cans = useRef<THREE.Group>(null);
  const anim = useRef({ from: 0, to: 0, start: 0, value: 0 });
  coverTex ??= makeCoverTexture();

  const OPEN_ANGLE = -1.62; // ≈ 93°, flap ends just above horizontal

  useEffect(() => {
    const a = anim.current;
    a.from = a.value;
    a.to = open ? 1 : 0;
    a.start = performance.now();
  }, [open]);

  useFrame(() => {
    const a = anim.current;
    const dur = reducedMotion ? 1 : a.to > a.from ? MOTION.coverOpenMs : MOTION.coverCloseMs;
    const t = clamp01((performance.now() - a.start) / dur);
    const k = a.to > a.from ? easeOutBack(t, 0.6) : easeInOutCubic(t);
    a.value = a.from + (a.to - a.from) * k;
    // tiny "unlatch" pop before the swing
    if (hinge.current) {
      hinge.current.rotation.x = OPEN_ANGLE * a.value;
      hinge.current.position.z = FRONT_Z + 0.028 + 0.03 * Math.sin(Math.PI * clamp01(a.value));
    }
    if (cans.current) cans.current.visible = a.value > 0.02 || a.to > 0;
  });

  const w = innerWidth(n, slotW);
  const coverH = LOWER_INNER_H + MID_BOARD * 0.15;
  const geom = useMemo(() => ({ w: w - 0.01, h: coverH }), [w, coverH]);

  return (
    <group>
      <group ref={cans} visible={false}>
        {answer.map((id, i) => (
          <Item key={`${id}-${i}`} id={id} position={answerPosition(i, n, slotW)} scale={ANSWER_SCALE} reducedMotion={reducedMotion} />
        ))}
      </group>
      <group ref={hinge} position={[0, LOWER_TOP, FRONT_Z + 0.028]}>
        <group position={[0, -geom.h / 2, 0]}>
          <RoundedBox args={[geom.w, geom.h, 0.05]} radius={0.014} smoothness={2} material={MAT.cover} castShadow receiveShadow />
          <mesh position={[0, 0.08, 0.026]}>
            <planeGeometry args={[Math.min(geom.w * 0.9, 2.6), Math.min(geom.w * 0.9, 2.6) / 4]} />
            <meshBasicMaterial map={coverTex} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          {/* finger pull */}
          <RoundedBox args={[0.5, 0.045, 0.05]} radius={0.018} smoothness={2} position={[0, -geom.h / 2 + 0.12, 0.045]} material={MAT.handle} castShadow />
        </group>
      </group>
    </group>
  );
}
