/**
 * Procedural textures for the SNACK mock-up. All designs are
 * fictional and carry a visible "SAMPLE" mark.
 */
import * as THREE from 'three';
import { UI_FONT } from '../three/textures';
import type { SnackSpec } from './mockItems';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number) {
  let s = size;
  ctx.font = `${s}px ${UI_FONT}`;
  while (ctx.measureText(text).width > maxW && s > 12) ctx.font = `${(s -= 2)}px ${UI_FONT}`;
}

function sampleStamp(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, align: CanvasTextAlign = 'right') {
  ctx.save();
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '3px';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.fillText('SAMPLE', x, y);
  ctx.restore();
}

const cache = new Map<string, THREE.Texture>();
const memo = (key: string, make: () => THREE.Texture) => {
  let t = cache.get(key);
  if (!t) cache.set(key, (t = make()));
  return t;
};

// ---------------------------------------------------------------- snacks

function drawSnackMotif(ctx: CanvasRenderingContext2D, s: SnackSpec, W: number, H: number, y0: number) {
  ctx.save();
  const rnd = (i: number) => ((Math.sin(i * 91.7 + s.id.length) + 1) / 2) % 1;
  switch (s.motif) {
    case 'chips':
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#f3d27a' : '#e2b34f';
        ctx.strokeStyle = '#c18f3a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(W * (0.22 + rnd(i) * 0.56), y0 + H * (0.08 + (i % 3) * 0.08), W * 0.12, W * 0.08, rnd(i + 3) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'shrimp':
      ctx.strokeStyle = s.accent;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        ctx.lineWidth = 16 - i * 2;
        ctx.beginPath();
        ctx.arc(W * (0.3 + (i % 2) * 0.4), y0 + H * (0.1 + Math.floor(i / 2) * 0.13), W * 0.09, Math.PI * 0.2, Math.PI * 1.5);
        ctx.stroke();
      }
      break;
    case 'corn':
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 9; k++) {
          ctx.fillStyle = (r + k) % 2 ? s.accent : '#f2df95';
          ctx.beginPath();
          ctx.arc(W * (0.14 + k * 0.09), y0 + H * (0.06 + r * 0.06), W * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    case 'choco':
      for (let i = 0; i < 3; i++) {
        const x = W * (0.25 + i * 0.25);
        const y = y0 + H * 0.14;
        ctx.fillStyle = '#3d2a22';
        ctx.beginPath();
        ctx.arc(x, y, W * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e6d2b5';
        ctx.fillRect(x - W * 0.11, y - 5, W * 0.22, 10);
      }
      break;
    case 'cookie':
      for (let i = 0; i < 4; i++) {
        const x = W * (0.2 + i * 0.2);
        const y = y0 + H * 0.12;
        ctx.fillStyle = s.accent;
        ctx.beginPath();
        ctx.arc(x, y, W * 0.085, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c9ad7e';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#c9ad7e';
        for (let d = 0; d < 5; d++) {
          ctx.beginPath();
          ctx.arc(x + Math.cos(d * 1.3) * W * 0.04, y + Math.sin(d * 1.3) * W * 0.04, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
  }
  ctx.restore();
}

/** Front print of a bag or box. Bags include crimped seal bands top/bottom. */
export function snackFrontTexture(s: SnackSpec) {
  return memo(`snack-${s.id}`, () => {
    const W = 512;
    const H = Math.round((W * s.h) / s.w);
    const { c, ctx } = canvas(W, H);
    const seal = s.kind === 'bag' ? H * 0.075 : 0;

    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, s.bg);
    g.addColorStop(0.45, s.bg);
    g.addColorStop(1, s.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (seal) {
      // crimp bands
      for (const y of [0, H - seal]) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, y, W, seal);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (let x = 0; x < W; x += 10) ctx.fillRect(x, y + 4, 4, seal - 8);
      }
    } else {
      // box: top flap line
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, H * 0.04, W, 3);
    }

    // name badge
    const top = seal + H * 0.08;
    ctx.fillStyle = s.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fit(ctx, s.name, W * 0.84, 84);
    ctx.fillText(s.name, W / 2, top + 46);
    ctx.font = `32px ${UI_FONT}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(s.sub, W / 2, top + 108);
    ctx.globalAlpha = 1;

    drawSnackMotif(ctx, s, W, H, top + 150);

    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillStyle = s.ink;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'left';
    ctx.fillText(s.kind === 'bag' ? '60g' : '216g', 26, H - seal - 26);
    ctx.globalAlpha = 1;
    sampleStamp(ctx, W - 26, H - seal - 22, s.ink);
    return tex(c);
  });
}
