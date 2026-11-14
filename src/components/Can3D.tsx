import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { DrinkId } from '../game/types';
import { canSize, type Vec3 } from '../three/layout';
import { getLabelTexture } from '../three/textures';
import { Movable } from './Movable';

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
  useLayoutEffect(() => () => label.dispose(), [label]);
  const emissive = useMemo(() => [label], [label]);

  return (
    <Movable
      position={position}
      selected={selected}
      scale={scale}
      reducedMotion={reducedMotion}
      appear={appear}
      blob={[geo.r * 3.1, geo.r * 3.1]}
      emissive={emissive}
      renderOutline={(m) => <mesh geometry={geo.outline} material={m} position-y={geo.h / 2} scale={[1.09, 1.035, 1.09]} />}
    >
      <mesh geometry={geo.bottom} material={getMetal()} castShadow receiveShadow />
      <mesh geometry={geo.body} material={label} position-y={geo.bottomH + geo.bodyH / 2} castShadow receiveShadow />
      <group position-y={geo.bottomH + geo.bodyH}>
        <mesh geometry={geo.top} material={getMetal()} castShadow receiveShadow />
        <mesh geometry={geo.tab} material={getMetal()} position={[0, geo.topH - 0.006, geo.r * 0.3]} />
      </group>
    </Movable>
  );
}
