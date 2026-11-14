/**
 * 민음사 세계문학전집 paperback: thin card covers, cream page block with
 * page-line edges, front cover and spine printed from the supplied images,
 * neutral back cover. Shares all motion with the cans via <Movable>.
 */
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Movable } from '../components/Movable';
import type { ThemeItemProps } from './itemTypes';
import { BOOK_YAW, bookSize, bookTextureUrl } from './books';

const COVER_T = 0.0035; // card cover thickness
const PAGE_INSET = 0.004; // page block sits just inside the covers

const texCache = new Map<string, THREE.Texture>();
function loadTex(url: string) {
  let t = texCache.get(url);
  if (!t) {
    t = new THREE.TextureLoader().load(url, undefined, undefined, () => console.warn(`[cancan] missing book texture ${url}`));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texCache.set(url, t);
  }
  return t;
}

function pagesTexture(vertical: boolean) {
  const key = `pages-${vertical}`;
  let t = texCache.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f2ecdf';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 2) {
    ctx.fillStyle = `rgba(150,136,112,${0.05 + ((i * 7919) % 11) / 120})`;
    if (vertical) ctx.fillRect(i, 0, 1, 256);
    else ctx.fillRect(0, i, 256, 1);
  }
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** Preload every book texture (resolves even on errors). */
export function preloadBookTextures(ids: readonly string[]): Promise<unknown> {
  return Promise.all(
    ids.flatMap((id) =>
      (['front', 'spine'] as const).map(
        (part) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve(null);
            img.src = bookTextureUrl(id, part);
          }),
      ),
    ),
  );
}

const CARD = '#f5f3ee'; // white card stock (cover edges)
const BACK = '#ece8df'; // neutral back cover (no image supplied)

export function Book3D({ id, position, selected = false, scale = 1, reducedMotion = false, appear = false }: ThemeItemProps) {
  const { w, h, d } = bookSize(id);

  const mats = useMemo(() => {
    const glow = (m: THREE.MeshStandardMaterial) => {
      m.emissive = new THREE.Color('#fff6e0');
      m.emissiveIntensity = 0;
      return m;
    };
    const front = glow(new THREE.MeshStandardMaterial({ map: loadTex(bookTextureUrl(id, 'front')), roughness: 0.55 }));
    const spine = glow(new THREE.MeshStandardMaterial({ map: loadTex(bookTextureUrl(id, 'spine')), roughness: 0.58 }));
    const card = new THREE.MeshStandardMaterial({ color: CARD, roughness: 0.7 });
    const back = new THREE.MeshStandardMaterial({ color: BACK, roughness: 0.75 });
    const fore = new THREE.MeshStandardMaterial({ map: pagesTexture(true), roughness: 0.9 });
    const edge = new THREE.MeshStandardMaterial({ map: pagesTexture(false), roughness: 0.9 });
    // BoxGeometry faces: +x, -x, +y, -y, +z, -z
    return {
      front: [card, card, card, card, front, card],
      back: [card, card, card, card, card, back],
      spine: [card, spine, card, card, card, card],
      pages: [fore, fore, edge, edge, fore, fore],
      emissive: [front, spine],
      all: [front, spine, card, back, fore, edge],
    };
  }, [id]);
  useLayoutEffect(() => () => mats.all.forEach((m) => m.dispose()), [mats]);

  const pagesW = w - COVER_T - PAGE_INSET;
  const pagesD = d - COVER_T * 2;

  return (
    <Movable
      position={position}
      selected={selected}
      scale={scale}
      reducedMotion={reducedMotion}
      appear={appear}
      blob={[w * 1.25, w * 0.95]}
      laneLift={0.2}
      emissive={mats.emissive}
      renderOutline={(m) => (
        <mesh material={m} rotation-y={BOOK_YAW} position-y={h / 2}>
          <boxGeometry args={[w * 1.06, h * 1.03, d * 1.35]} />
        </mesh>
      )}
    >
      <group rotation-y={BOOK_YAW} position-y={h / 2}>
        <mesh material={mats.pages} position={[-w / 2 + COVER_T + pagesW / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[pagesW, h - PAGE_INSET * 2, pagesD]} />
        </mesh>
        <mesh material={mats.front} position={[0, 0, d / 2 - COVER_T / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, h, COVER_T]} />
        </mesh>
        <mesh material={mats.back} position={[0, 0, -d / 2 + COVER_T / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, h, COVER_T]} />
        </mesh>
        <mesh material={mats.spine} position={[-w / 2 + COVER_T / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[COVER_T, h, d]} />
        </mesh>
      </group>
    </Movable>
  );
}
