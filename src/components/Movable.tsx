/**
 * Shared motion for every theme object (can, book, …): selection lift + glow
 * + outline, collision-free move/swap paths, contact shadow and drop-in.
 * The object itself is passed as children; game data never lives here.
 */
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../three/layout';
import { MOTION, clamp01, damp, easeInOutCubic, smoothstep } from '../three/motion';
import { makeBlobTexture } from '../three/textures';

let blobTex: THREE.Texture | null = null;
const getBlob = () => (blobTex ??= makeBlobTexture());

// ---------------------------------------------------------------------------
// Movement paths
// ---------------------------------------------------------------------------
type Path = 'lateral-far' | 'lateral-near' | 'up' | 'down';

interface Tween {
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
  dur: number;
  path: Path;
  /** Multiplier for the far lane's rise (tall objects keep it small). */
  lift: number;
}

/**
 * Collision-free paths. Shelf ↔ shelf moves step forward out of the slot
 * (clear of the half-depth dividers), slide across, then step back in. In a
 * swap the can moving right takes a far, slightly raised lane and the can
 * moving left a near lane, so the two never intersect. Tray ↔ shelf moves arc
 * in front of the cabinet; upward and downward moves use different depths.
 */
function sample(tw: Tween, t: number, out: THREE.Vector3) {
  const { from, to } = tw;
  switch (tw.path) {
    case 'lateral-far':
    case 'lateral-near': {
      const far = tw.path === 'lateral-far';
      const out01 = smoothstep(0, 0.28, t) * (1 - smoothstep(0.72, 1, t));
      const across = smoothstep(0.18, 0.82, t);
      out.set(
        from.x + (to.x - from.x) * across,
        from.y + (to.y - from.y) * across + (far ? 0.2 * tw.lift : 0.03) * out01,
        from.z + (to.z - from.z) * across + (far ? 1.0 : 0.4) * out01,
      );
      return out;
    }
    case 'up':
    case 'down': {
      const up = tw.path === 'up';
      const e = easeInOutCubic(t);
      const arc = Math.sin(Math.PI * t);
      out.set(
        from.x + (to.x - from.x) * e,
        from.y + (to.y - from.y) * e + (up ? 0.34 : 0.22) * arc,
        from.z + (to.z - from.z) * e + (up ? 0.78 : 1.4) * arc,
      );
      return out;
    }
  }
}

function choosePath(from: THREE.Vector3, to: THREE.Vector3): Path {
  const dy = to.y - from.y;
  if (Math.abs(dy) > 0.5) return dy > 0 ? 'up' : 'down';
  return to.x >= from.x ? 'lateral-far' : 'lateral-near';
}

// ---------------------------------------------------------------------------

export interface MovableProps {
  /** Resting position (base centre of the object). */
  position: Vec3;
  selected?: boolean;
  scale?: number;
  reducedMotion?: boolean;
  /** Play a short drop-in when mounted. */
  appear?: boolean;
  /** Footprint of the soft contact shadow [width, depth]. */
  blob: [number, number];
  /** Far-lane rise multiplier during swaps (default 1 = cans). */
  laneLift?: number;
  /** Materials that glow faintly while selected. */
  emissive?: THREE.MeshStandardMaterial[];
  /** Renders the selection outline shell with the given material. */
  renderOutline?: (material: THREE.Material) => ReactNode;
  children: ReactNode;
}

export function Movable({
  position,
  selected = false,
  scale = 1,
  reducedMotion = false,
  appear = false,
  blob: [blobW, blobD],
  laneLift = 1,
  emissive,
  renderOutline,
  children,
}: MovableProps) {
  const root = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);

  const tween = useRef<Tween | null>(null);
  const liftY = useRef(0);
  const glow = useRef(0);
  const born = useRef(appear && !reducedMotion ? -1 : 0);

  const blobMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: getBlob(), transparent: true, depthWrite: false, opacity: 0.9 }),
    [],
  );
  // selection outline: back-face shell, warm and low-saturation
  const outlineMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#c9a86a', side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  useLayoutEffect(
    () => () => {
      blobMat.dispose();
      outlineMat.dispose();
    },
    [blobMat, outlineMat],
  );

  const [px, py, pz] = position;
  // Retarget whenever the resting position changes; always start from where
  // the object currently *is*, so an interrupted animation never jumps.
  useLayoutEffect(() => {
    const g = root.current;
    if (!g) return;
    const to = new THREE.Vector3(px, py, pz);
    if (g.userData.placed !== true) {
      g.position.copy(to);
      g.userData.placed = true;
      return;
    }
    if (g.position.distanceToSquared(to) < 1e-6) return;
    const from = g.position.clone();
    const path = choosePath(from, to);
    const dur = reducedMotion ? 0 : path === 'up' || path === 'down' ? MOTION.placeMs : MOTION.swapMs;
    if (dur === 0) {
      g.position.copy(to);
      tween.current = null;
      return;
    }
    tween.current = { from, to, start: performance.now(), dur, path, lift: laneLift };
  }, [px, py, pz, reducedMotion, laneLift]);

  useFrame((_, delta) => {
    const g = root.current;
    const l = lift.current;
    if (!g || !l) return;
    const now = performance.now();
    const dt = Math.min(delta, 0.05);

    // travel
    let moving = false;
    const tw = tween.current;
    if (tw) {
      const t = clamp01((now - tw.start) / tw.dur);
      sample(tw, t, g.position);
      if (t >= 1) {
        g.position.copy(tw.to);
        tween.current = null;
      } else moving = true;
    }

    // selection lift (≈0.15 s), subtle scale & glow — no bounce
    const lambda = reducedMotion ? 1000 : 3 / (MOTION.liftMs / 1000);
    liftY.current = damp(liftY.current, selected ? 0.16 : 0, lambda, dt);
    glow.current = damp(glow.current, selected ? 1 : 0, lambda, dt);

    // drop-in on mount
    let appearK = 1;
    if (born.current !== 0) {
      if (born.current < 0) born.current = now;
      appearK = clamp01((now - born.current) / 260);
      if (appearK >= 1) born.current = 0;
    }
    const ease = 1 - Math.pow(1 - appearK, 3);

    l.position.y = liftY.current + (1 - ease) * 0.35;
    const s = 1 + glow.current * 0.045;
    l.scale.set(s, s * (0.9 + 0.1 * ease), s);
    if (emissive) for (const m of emissive) m.emissiveIntensity = glow.current * 0.14;
    outlineMat.opacity = glow.current * 0.6 * ease;
    outlineMat.visible = glow.current > 0.02;
    blobMat.opacity = (moving ? 0 : 0.9 - liftY.current * 3.2) * ease;
  });

  return (
    <group ref={root} scale={scale}>
      <mesh material={blobMat} rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}>
        <planeGeometry args={[blobW, blobD]} />
      </mesh>
      <group ref={lift}>
        {children}
        {renderOutline?.(outlineMat)}
      </group>
    </group>
  );
}
