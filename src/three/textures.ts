import * as THREE from 'three';
import { getDrink } from '../game/drinks';
import type { DrinkId } from '../game/types';

export const UI_FONT = `'BMKkubulim', 'Jua', 'Noto Sans KR', system-ui, sans-serif`;

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, anisotropy = 4) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, family = UI_FONT) {
  let s = size;
  ctx.font = `${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 10) {
    s -= 2;
    ctx.font = `${s}px ${family}`;
  }
  return s;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Generated placeholder label (NOT the real package design). It uses the
 * drink's dominant colour and name so the five cans stay identifiable, and is
 * stamped "PLACEHOLDER" so nobody mistakes it for the brand artwork.
 *
 * Layout: the label wraps the cylinder with u = 0.5 facing the camera.
 */
function placeholderLabel(id: DrinkId): THREE.Texture {
  const d = getDrink(id);
  const W = 1024;
  const H = 512;
  const { c, ctx } = canvas(W, H);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, shade(d.color, -0.1));
  g.addColorStop(0.18, d.color);
  g.addColorStop(0.82, d.color);
  g.addColorStop(1, shade(d.color, -0.12));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // thin bands top & bottom
  ctx.fillStyle = shade(d.ink, 0.05);
  ctx.fillRect(0, 34, W, 10);
  ctx.fillRect(0, H - 44, W, 10);

  // front panel
  const pw = 360;
  const ph = 300;
  const px = W / 2 - pw / 2;
  const py = H / 2 - ph / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.fill();
  ctx.strokeStyle = shade(d.color, -0.18);
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = d.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fitText(ctx, d.name, pw - 40, 96);
  ctx.font = `${size}px ${UI_FONT}`;
  ctx.fillText(d.name, W / 2, H / 2 - 22);

  ctx.font = `600 30px system-ui, sans-serif`;
  ctx.globalAlpha = 0.75;
  ctx.fillText(d.en, W / 2, H / 2 + 56);
  ctx.globalAlpha = 1;

  ctx.font = `600 17px system-ui, sans-serif`;
  ctx.fillStyle = shade(d.ink, 0.15);
  ctx.globalAlpha = 0.65;
  ctx.fillText('PLACEHOLDER LABEL', W / 2, py + ph - 26);
  ctx.globalAlpha = 1;

  // back side (u = 0 / 1): repeat the name, split across the seam
  ctx.fillStyle = d.ink;
  ctx.globalAlpha = 0.85;
  ctx.font = `64px ${UI_FONT}`;
  ctx.textAlign = 'center';
  for (const x of [0, W]) ctx.fillText(d.name, x, H / 2);
  ctx.globalAlpha = 1;

  return toTexture(c, 8);
}

const labelCache = new Map<DrinkId, THREE.Texture>();

/**
 * Label texture for a drink. If `labelTexture` is configured for the drink in
 * `drinks.ts`, the licensed image is loaded from `public/` and swapped in when
 * ready; on any load error the placeholder stays.
 */
export function getLabelTexture(id: DrinkId): THREE.Texture {
  const cached = labelCache.get(id);
  if (cached) return cached;
  const tex = placeholderLabel(id);
  labelCache.set(id, tex);

  const src = getDrink(id).labelTexture;
  if (src) {
    new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`,
      (img) => {
        // Paint the loaded image into the same texture object so every can
        // that already uses it updates automatically.
        tex.image = img.image;
        tex.needsUpdate = true;
      },
      undefined,
      () => console.warn(`[nbox] label texture for "${id}" failed to load; using placeholder`),
    );
  }
  return tex;
}

export function makeCoverTexture(): THREE.Texture {
  const W = 1024;
  const H = 256;
  const { c, ctx } = canvas(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5b5952';
  ctx.font = `600 40px system-ui, sans-serif`;
  ctx.letterSpacing = '8px';
  ctx.fillText('HIDDEN ANSWER', W / 2, H / 2 - 26);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#9a978e';
  ctx.font = `34px ${UI_FONT}`;
  ctx.fillText('정답은 이 아래에 숨겨져 있어요', W / 2, H / 2 + 34);
  return toTexture(c);
}

export function makeNumberTexture(label: string): THREE.Texture {
  const { c, ctx } = canvas(128, 64);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9c988e';
  ctx.font = `600 40px system-ui, sans-serif`;
  ctx.fillText(label, 64, 34);
  return toTexture(c);
}

export function makePlusTexture(): THREE.Texture {
  const { c, ctx } = canvas(128, 128);
  ctx.strokeStyle = '#c4c0b6';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(64, 34);
  ctx.lineTo(64, 94);
  ctx.moveTo(34, 64);
  ctx.lineTo(94, 64);
  ctx.stroke();
  return toTexture(c);
}

/** Soft radial blob used as a cheap contact shadow under each can. */
export function makeBlobTexture(): THREE.Texture {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(40,36,28,0.55)');
  g.addColorStop(0.55, 'rgba(40,36,28,0.22)');
  g.addColorStop(1, 'rgba(40,36,28,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = toTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
