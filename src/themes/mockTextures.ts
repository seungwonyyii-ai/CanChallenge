/**
 * Procedural textures for the BOOK / SNACK mock-ups. All designs are
 * fictional and carry a visible "SAMPLE" mark.
 */
import * as THREE from 'three';
import { UI_FONT } from '../three/textures';
import type { BookSpec, SnackSpec } from './mockItems';

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

// ---------------------------------------------------------------- books

function drawBookMotif(ctx: CanvasRenderingContext2D, b: BookSpec, W: number, H: number) {
  ctx.save();
  switch (b.motif) {
    case 'moon': {
      ctx.fillStyle = b.accent;
      ctx.beginPath();
      ctx.arc(W * 0.62, H * 0.6, W * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.bg;
      ctx.beginPath();
      ctx.arc(W * 0.7, H * 0.56, W * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4b5a78';
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.ellipse(W * (0.1 + i * 0.14), H * 0.86, W * 0.1, H * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'waves': {
      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 6;
      for (let r = 0; r < 6; r++) {
        ctx.beginPath();
        const y0 = H * (0.5 + r * 0.075);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y0 + Math.sin(x / 28 + r) * 9);
        ctx.stroke();
      }
      break;
    }
    case 'forest': {
      for (let i = 0; i < 9; i++) {
        const x = W * (0.08 + (i % 5) * 0.21 + (i > 4 ? 0.1 : 0));
        const y = H * (i > 4 ? 0.9 : 0.78);
        const s = W * (i > 4 ? 0.13 : 0.11);
        ctx.fillStyle = i % 2 ? b.accent : '#56724f';
        ctx.beginPath();
        ctx.moveTo(x, y - s * 2.2);
        ctx.lineTo(x + s, y);
        ctx.lineTo(x - s, y);
        ctx.fill();
      }
      break;
    }
    case 'lemon': {
      const cx = W * 0.5;
      const cy = H * 0.66;
      const r = W * 0.24;
      ctx.fillStyle = '#d8b84d';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.accent;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e1c45f';
      ctx.lineWidth = 5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84);
        ctx.stroke();
      }
      break;
    }
    case 'map': {
      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 2;
      for (let x = 0; x < W; x += W / 8) {
        ctx.beginPath();
        ctx.moveTo(x, H * 0.45);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = H * 0.45; y < H; y += W / 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.strokeStyle = b.ink;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 9]);
      ctx.beginPath();
      ctx.moveTo(W * 0.15, H * 0.9);
      ctx.bezierCurveTo(W * 0.4, H * 0.6, W * 0.55, H * 0.95, W * 0.82, H * 0.6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = b.ink;
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.6, 9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

export function bookCoverTexture(b: BookSpec) {
  return memo(`cover-${b.id}`, () => {
    const W = 512;
    const H = Math.round((W * b.h) / b.w);
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = b.bg;
    ctx.fillRect(0, 0, W, H);
    drawBookMotif(ctx, b, W, H);
    // hinge groove on hardcovers
    if (b.hardcover) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(18, 0, 5, H);
    }
    ctx.fillStyle = b.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fit(ctx, b.title, W * 0.8, 74);
    ctx.fillText(b.title, W / 2, H * 0.2);
    ctx.font = `30px ${UI_FONT}`;
    ctx.globalAlpha = 0.8;
    ctx.fillText(b.sub, W / 2, H * 0.31);
    ctx.globalAlpha = 1;
    sampleStamp(ctx, W - 24, H - 22, b.ink);
    return tex(c);
  });
}

export function bookSpineTexture(b: BookSpec) {
  return memo(`spine-${b.id}`, () => {
    const W = 96;
    const H = 512;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = b.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = b.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fit(ctx, b.title, H * 0.7, 44);
    ctx.fillText(b.title, 0, 0);
    ctx.restore();
    return tex(c);
  });
}

/** Page-block edges; `vertical` = lines run top→bottom (fore-edge). */
export function pagesTexture(vertical: boolean) {
  return memo(`pages-${vertical}`, () => {
    const { c, ctx } = canvas(256, 256);
    ctx.fillStyle = '#f3ecdc';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 3) {
      ctx.fillStyle = `rgba(150,135,110,${0.08 + ((i * 7919) % 13) / 130})`;
      if (vertical) ctx.fillRect(i, 0, 1, 256);
      else ctx.fillRect(0, i, 256, 1);
    }
    return tex(c);
  });
}

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
