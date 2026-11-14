/**
 * Static 3D objects for the BOOK / SNACK design mock-ups.
 * Each is placed by its base centre (like Can3D) and faces +z (the camera).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../three/layout';
import { makeBlobTexture } from '../three/textures';
import type { BookSpec, SnackSpec } from './mockItems';
import { bookCoverTexture, bookSpineTexture, pagesTexture, snackFrontTexture } from './mockTextures';

let blobTex: THREE.Texture | null = null;
function ContactShadow({ w, d }: { w: number; d: number }) {
  blobTex ??= makeBlobTexture();
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}>
      <planeGeometry args={[w * 1.5, d * 1.5 + 0.25]} />
      <meshBasicMaterial map={blobTex} transparent depthWrite={false} opacity={0.75} />
    </mesh>
  );
}

// BoxGeometry face order: +x, -x, +y, -y, +z, -z
const plain = (color: string, roughness: number) => new THREE.MeshStandardMaterial({ color, roughness });

// ---------------------------------------------------------------- book

/**
 * Board covers (hardcover overhang + hinge), a cream page block with page-line
 * edges, and a printed spine. Paperbacks get thin, flush covers.
 */
export function Book3D({ spec, position, rotationY = 0 }: { spec: BookSpec; position: Vec3; rotationY?: number }) {
  const { w, h, d, hardcover } = spec;
  const board = hardcover ? 0.016 : 0.006;
  const over = hardcover ? 0.014 : 0;

  const mats = useMemo(() => {
    const coverColor = plain(spec.bg, hardcover ? 0.6 : 0.5);
    const coverPrint = new THREE.MeshStandardMaterial({ map: bookCoverTexture(spec), roughness: hardcover ? 0.55 : 0.42 });
    const spine = new THREE.MeshStandardMaterial({ map: bookSpineTexture(spec), roughness: 0.55 });
    const fore = new THREE.MeshStandardMaterial({ map: pagesTexture(true), roughness: 0.9 });
    const topEdge = new THREE.MeshStandardMaterial({ map: pagesTexture(false), roughness: 0.9 });
    return {
      front: [coverColor, coverColor, coverColor, coverColor, coverPrint, coverColor],
      back: [coverColor, coverColor, coverColor, coverColor, coverColor, coverColor],
      spine: [coverColor, spine, coverColor, coverColor, coverColor, coverColor],
      pages: [fore, fore, topEdge, topEdge, fore, fore],
    };
  }, [spec, hardcover]);

  const pagesW = w - over - board;
  const pagesD = d - board * 2;
  return (
    <group position={position} rotation-y={rotationY}>
      <ContactShadow w={w} d={d} />
      <group position-y={h / 2}>
        {/* page block, set back from the fore-edge by the overhang */}
        <mesh material={mats.pages} position={[-w / 2 + board + pagesW / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[pagesW, h - over * 2, pagesD]} />
        </mesh>
        {/* front / back boards */}
        <mesh material={mats.front} position={[0, 0, d / 2 - board / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, h, board]} />
        </mesh>
        <mesh material={mats.back} position={[0, 0, -d / 2 + board / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, h, board]} />
        </mesh>
        {/* spine; hardcovers get a gently rounded back */}
        <mesh material={mats.spine} position={[-w / 2 + board / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[board, h, d]} />
        </mesh>
        {hardcover && (
          <mesh position={[-w / 2 + board * 0.5, 0, 0]} scale={[0.32, 1, 1]} castShadow>
            <cylinderGeometry args={[d / 2, d / 2, h, 24, 1, true, Math.PI, Math.PI]} />
            <meshStandardMaterial color={spec.bg} roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- snack

const bagGeoCache = new Map<string, THREE.BufferGeometry>();

/**
 * Pillow-pack bag: a subdivided box whose depth puffs out in the middle and
 * flattens to crimped seals at the top and bottom, with faint wrinkles.
 */
function bagGeometry(w: number, h: number, d: number) {
  const key = `${w}:${h}:${d}`;
  const hit = bagGeoCache.get(key);
  if (hit) return hit;
  const g = new THREE.BoxGeometry(w, h, d, 24, 36, 6);
  const p = g.attributes.position;
  const SEAL = 0.86;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const ny = Math.abs(y) / (h / 2);
    const nx = Math.abs(x) / (w / 2);
    let puff: number;
    if (ny >= SEAL) puff = 0.04;
    else {
      const t = ny / SEAL;
      puff = Math.max(0.04, Math.sqrt(1 - Math.pow(t, 3.2)));
    }
    const side = Math.sqrt(Math.max(0, 1 - Math.pow(nx, 5)));
    const wrinkle = 1 + 0.035 * Math.sin(x * 38 + y * 11) * Math.sin(y * 23) * (ny < SEAL ? 1 : 0);
    p.setZ(i, z * Math.max(0.04, puff * (0.25 + 0.75 * side)) * wrinkle);
    // the bag pulls in slightly toward the seals
    p.setX(i, x * (1 - 0.045 * Math.pow(Math.min(1, ny / SEAL), 2)));
  }
  g.computeVertexNormals();
  bagGeoCache.set(key, g);
  return g;
}

export function Snack3D({ spec, position, rotationY = 0 }: { spec: SnackSpec; position: Vec3; rotationY?: number }) {
  const { w, h, d, kind } = spec;

  const mats = useMemo(() => {
    const print = snackFrontTexture(spec);
    if (kind === 'bag') {
      // glossy printed film
      const film = (map?: THREE.Texture) =>
        new THREE.MeshPhysicalMaterial({ color: map ? '#ffffff' : spec.bg, map, roughness: 0.42, metalness: 0.04, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.6 });
      const front = film(print);
      const other = film();
      return [other, other, other, other, front, other];
    }
    // matte paperboard
    const front = new THREE.MeshStandardMaterial({ map: print, roughness: 0.72 });
    const side = plain(spec.bg, 0.78);
    const top = plain(spec.accent, 0.8);
    return [side, side, top, side, front, side];
  }, [spec, kind]);

  const geometry = useMemo(() => (kind === 'bag' ? bagGeometry(w, h, d) : new THREE.BoxGeometry(w, h, d)), [kind, w, h, d]);

  return (
    <group position={position} rotation-y={rotationY}>
      <ContactShadow w={w} d={d} />
      <mesh geometry={geometry} material={mats} position-y={h / 2} castShadow receiveShadow />
    </group>
  );
}
