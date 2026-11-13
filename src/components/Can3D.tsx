import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { DrinkId } from '../game/types';
import { canSize, type Vec3 } from '../three/layout';
import { MOTION, clamp01, damp, easeInOutCubic, smoothstep } from '../three/motion';
import { getLabelTexture, makeBlobTexture } from '../three/textures';

// ---------------------------------------------------------------------------
// Geometry, cached per can size (radius / height follow the real can)
// ---------------------------------------------------------------------------
const lathe = (pts: [number, number][]) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    48,
  );

interface CanGeo {
  r: number;
  h: number;
  bottomH: number;
  topH: number;
  bodyH: number;
  body: THREE.CylinderGeometry;
  bottom: THREE.LatheGeometry;
  top: THREE.LatheGeometry;
  tab: THREE.BoxGeometry;
  outline: THREE.CylinderGeometry;
  blob: THREE.PlaneGeometry;
}

const geoCache = new Map<string, CanGeo>();

function getGeo(r: number, h: number): CanGeo {
  const key = `${r.toFixed(4)}:${h.toFixed(4)}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  // metal neck / base scale with the can's radius
  const bottomH = r * 0.26;
  const topH = r * 0.32;
  const bodyH = h - bottomH - topH;
  const geo: CanGeo = {
    r,
    h,
    bottomH,
    topH,
    bodyH,
    // label wraps the body; thetaStart = π puts u = 0.5 (label centre) at +z
    body: new THREE.CylinderGeometry(r, r, bodyH, 64, 1, true, Math.PI, Math.PI * 2),
    bottom: lathe([
      [0, bottomH * 0.43],
      [r * 0.62, bottomH * 0.17],
      [r * 0.8, 0],
      [r * 0.88, bottomH * 0.06],
      [r * 0.98, bottomH * 0.57],
      [r, bottomH + 0.002],
    ]),
    top: lathe([
      [r, -0.002],
      [r * 0.985, topH * 0.35],
      [r * 0.88, topH * 0.82],
      [r * 0.875, topH],
      [r * 0.83, topH + 0.006],
      [r * 0.8, topH - 0.008],
      [r * 0.78, topH - 0.012],
      [0, topH - 0.012],
    ]),
    tab: new THREE.BoxGeometry(r * 0.5, 0.008, r * 0.28),
    outline: new THREE.CylinderGeometry(r, r, h, 48, 1, false),
    blob: new THREE.PlaneGeometry(r * 3.1, r * 3.1),
  };
  geoCache.set(key, geo);
  return geo;
}

let metalMat: THREE.MeshStandardMaterial | null = null;
const getMetal = () =>
  (metalMat ??= new THREE.MeshStandardMaterial({
    color: '#d7dad9',
    metalness: 0.85,
    roughness: 0.3,
    side: THREE.DoubleSide,
  }));

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
        from.y + (to.y - from.y) * across + (far ? 0.2 : 0.03) * out01,
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

export interface Can3DProps {
  id: DrinkId;
  /** Resting position (base centre of the can). */
  position: Vec3;
  selected?: boolean;
  scale?: number;
  reducedMotion?: boolean;
  /** Play a short drop-in when mounted. */
  appear?: boolean;
}

export function Can3D({ id, position, selected = false, scale = 1, reducedMotion = false, appear = false }: Can3DProps) {
  const root = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const blob = useRef<THREE.Mesh>(null);
  const outlineMat = useRef<THREE.MeshBasicMaterial>(null);

  const tween = useRef<Tween | null>(null);
  const liftY = useRef(0);
  const glow = useRef(0);
  const born = useRef(appear && !reducedMotion ? -1 : 0);

  const geo = useMemo(() => {
    const { r, h } = canSize(id);
    return getGeo(r, h);
  }, [id]);

  const label = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: getLabelTexture(id),
        // the photo already carries its own shading → keep the label fairly matte
        metalness: 0.08,
        roughness: 0.42,
        emissive: new THREE.Color('#fff6e0'),
        emissiveIntensity: 0,
      }),
    [id],
  );
  const blobMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: getBlob(), transparent: true, depthWrite: false, opacity: 0.9 }),
    [],
  );
  useLayoutEffect(
    () => () => {
      label.dispose();
      blobMat.dispose();
    },
    [label, blobMat],
  );

  const [px, py, pz] = position;
  // Retarget whenever the resting position changes; always start from where
  // the can currently *is*, so an interrupted animation never jumps.
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
    tween.current = { from, to, start: performance.now(), dur, path };
  }, [px, py, pz, reducedMotion]);

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
    label.emissiveIntensity = glow.current * 0.14;
    if (outlineMat.current) {
      outlineMat.current.opacity = glow.current * 0.6 * ease;
      outlineMat.current.visible = glow.current > 0.02;
    }
    if (blob.current) {
      (blob.current.material as THREE.MeshBasicMaterial).opacity =
        (moving ? 0 : 0.9 - liftY.current * 3.2) * ease;
    }
  });

  return (
    <group ref={root} scale={scale}>
      <mesh ref={blob} geometry={geo.blob} material={blobMat} rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1} />
      <group ref={lift}>
        <mesh geometry={geo.bottom} material={getMetal()} castShadow receiveShadow />
        <mesh geometry={geo.body} material={label} position-y={geo.bottomH + geo.bodyH / 2} castShadow receiveShadow />
        <group position-y={geo.bottomH + geo.bodyH}>
          <mesh geometry={geo.top} material={getMetal()} castShadow receiveShadow />
          <mesh geometry={geo.tab} material={getMetal()} position={[0, geo.topH - 0.006, geo.r * 0.3]} />
        </group>
        {/* selection outline: back-face shell, warm and low-saturation */}
        <mesh geometry={geo.outline} position-y={geo.h / 2} scale={[1.09, 1.035, 1.09]}>
          <meshBasicMaterial ref={outlineMat} color="#c9a86a" side={THREE.BackSide} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
