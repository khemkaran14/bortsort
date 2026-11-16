import Phaser from 'phaser';
import { NUT_COLORS, SYMBOLS, type BoltSkin, type NutSkin } from './theme';
import { HD } from './view';

/**
 * All game art is drawn in code with the Canvas 2D API (gradients, highlights, soft shadows) at HD
 * pixels per layout unit, so it stays sharp on every screen and the app needs no image files.
 */

type Ctx = CanvasRenderingContext2D;

const rgb = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
export function css(c: number, a = 1) {
  const [r, g, b] = rgb(c);
  return `rgba(${r},${g},${b},${a})`;
}
/** Lighten (amt > 0) or darken (amt < 0) a color. */
export function tone(c: number, amt: number) {
  const f = (v: number) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  const [r, g, b] = rgb(c).map(f);
  return (r << 16) | (g << 8) | b;
}

/** Create (or replace) a canvas texture of w×h layout units. */
export function canvasTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx) => void,
  replace = true,
) {
  if (scene.textures.exists(key)) {
    if (!replace) return;
    scene.textures.remove(key);
  }
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * HD);
  c.height = Math.ceil(h * HD);
  const ctx = c.getContext('2d')!;
  ctx.scale(HD, HD);
  draw(ctx);
  scene.textures.addCanvas(key, c);
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function hgrad(ctx: Ctx, x0: number, x1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// ---------------------------------------------------------------------------------------------
// Nuts

export const NUT_W = 120;
export const NUT_H = 50;
/** Height of the nut body inside the texture (the rest is room for its shadow). */
export const NUT_BODY = 44;
/** Draw nut images this much taller than a stack slot so the bodies touch. */
export const NUT_FILL = NUT_H / NUT_BODY;

/** A hex nut seen from the side: three faces, lit from the top-left, with a soft contact shadow. */
function drawNut(ctx: Ctx, color: number, skin: NutSkin) {
  const x = 3;
  const y = 2;
  const w = NUT_W - 6;
  const h = NUT_BODY;
  const r = 10;
  // Contact shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = css(tone(color, -0.5));
  ctx.fill();
  ctx.restore();

  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  if (skin === 'neon') {
    ctx.fillStyle = '#0d1118';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = vgrad(ctx, y, y + h, [
      [0, css(color, 0.28)],
      [0.5, css(color, 0.08)],
      [1, css(color, 0.22)],
    ]);
    ctx.fillRect(x, y, w, h);
  } else {
    // Three faces across the width.
    const base = skin === 'wood' ? tone(color, -0.12) : color;
    ctx.fillStyle = hgrad(ctx, x, x + w, [
      [0, css(tone(base, -0.5))],
      [0.17, css(tone(base, -0.18))],
      [0.175, css(tone(base, 0.22))],
      [0.5, css(tone(base, 0.06))],
      [0.825, css(tone(base, -0.1))],
      [0.83, css(tone(base, -0.32))],
      [1, css(tone(base, -0.55))],
    ]);
    ctx.fillRect(x, y, w, h);
    // Light from above, shade below.
    ctx.fillStyle = vgrad(ctx, y, y + h, [
      [0, 'rgba(255,255,255,0.42)'],
      [0.18, 'rgba(255,255,255,0.12)'],
      [0.55, 'rgba(255,255,255,0)'],
      [0.8, 'rgba(0,0,0,0.12)'],
      [1, 'rgba(0,0,0,0.38)'],
    ]);
    ctx.fillRect(x, y, w, h);
    if (skin === 'wood') {
      ctx.strokeStyle = css(tone(base, -0.45), 0.45);
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        const yy = y + 6 + k * 7;
        ctx.moveTo(x, yy);
        ctx.bezierCurveTo(x + w * 0.3, yy - 4, x + w * 0.6, yy + 5, x + w, yy - 1);
        ctx.stroke();
      }
    } else if (skin === 'candy') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let sx = x - 40; sx < x + w + 20; sx += 22) {
        ctx.beginPath();
        ctx.moveTo(sx, y + h);
        ctx.lineTo(sx + 10, y + h);
        ctx.lineTo(sx + 10 + h * 0.8, y);
        ctx.lineTo(sx + h * 0.8, y);
        ctx.fill();
      }
    } else if (skin === 'gems') {
      const facets: [number, number, number, number, number, number, number][] = [
        [x, y, x + w * 0.18, y, x, y + h, 0.25],
        [x + w * 0.5, y, x + w * 0.82, y, x + w * 0.66, y + h * 0.5, 0.18],
        [x + w * 0.18, y + h, x + w * 0.5, y + h * 0.45, x + w * 0.5, y + h, -0.15],
        [x + w * 0.5, y + h * 0.45, x + w * 0.82, y + h, x + w * 0.5, y + h, -0.25],
      ];
      for (const [x1, y1, x2, y2, x3, y3, t] of facets) {
        ctx.fillStyle = t > 0 ? `rgba(255,255,255,${t})` : `rgba(0,0,0,${-t})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.fill();
      }
    }
    // Top chamfer line and bottom bevel.
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(x, y + 1.5, w, 1.5);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, y + h - 5, w, 5);
  }
  ctx.restore();

  // Specular highlight
  if (skin !== 'neon') {
    const sx = x + w * 0.24;
    ctx.fillStyle = vgrad(ctx, y + 6, y + 13, [
      [0, 'rgba(255,255,255,0.75)'],
      [1, 'rgba(255,255,255,0.1)'],
    ]);
    rr(ctx, sx, y + 6, w * (skin === 'wood' ? 0.2 : 0.34), skin === 'wood' ? 3 : 5, 3);
    ctx.fill();
    if (skin === 'gems' || skin === 'candy') {
      star4(ctx, x + w * 0.74, y + 11, 6, 'rgba(255,255,255,0.95)');
    }
  }
  // Outline
  rr(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
  if (skin === 'neon') {
    ctx.save();
    ctx.shadowColor = css(color, 1);
    ctx.shadowBlur = 8;
    ctx.strokeStyle = css(tone(color, 0.25));
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.strokeStyle = css(tone(color, -0.6), 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/** A small four-point sparkle. */
function star4(ctx: Ctx, cx: number, cy: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
}

/** Draw every nut color for a skin into textures named nut-<i> (and nut-hidden). */
export function makeNutTextures(scene: Phaser.Scene, skin: NutSkin) {
  NUT_COLORS.forEach((c, i) => canvasTex(scene, `nut-${i}`, NUT_W, NUT_H, (ctx) => drawNut(ctx, c, skin)));
  canvasTex(scene, 'nut-hidden', NUT_W, NUT_H, (ctx) => drawNut(ctx, 0x6b7785, skin === 'neon' ? 'neon' : 'metal'));
}

/** A nut texture for one color and skin under any key (shop previews). */
export function makeNutPreview(scene: Phaser.Scene, key: string, colorIndex: number, skin: NutSkin) {
  canvasTex(scene, key, NUT_W, NUT_H, (ctx) => drawNut(ctx, NUT_COLORS[colorIndex], skin), false);
}

// ---------------------------------------------------------------------------------------------
// Color-blind symbols

export function makeSymbolTextures(scene: Phaser.Scene) {
  const s = 32;
  SYMBOLS.forEach((name, i) =>
    canvasTex(
      scene,
      `sym-${i}`,
      s,
      s,
      (ctx) => {
        const c = s / 2;
        ctx.beginPath();
        const poly = (n: number, r: number, inner?: number) => {
          for (let k = 0; k < n * (inner ? 2 : 1); k++) {
            const a = -Math.PI / 2 + (k * Math.PI * 2) / (n * (inner ? 2 : 1));
            const rad = inner && k % 2 ? inner : r;
            ctx.lineTo(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
          }
          ctx.closePath();
        };
        switch (name) {
          case 'circle':
            ctx.arc(c, c, 9, 0, Math.PI * 2);
            break;
          case 'square':
            ctx.rect(c - 8, c - 8, 16, 16);
            break;
          case 'triangle':
            poly(3, 11);
            break;
          case 'star':
            poly(5, 11, 5);
            break;
          case 'diamond':
            ctx.moveTo(c, c - 11);
            ctx.lineTo(c + 9, c);
            ctx.lineTo(c, c + 11);
            ctx.lineTo(c - 9, c);
            ctx.closePath();
            break;
          case 'plus':
            ctx.rect(c - 3.5, c - 10, 7, 20);
            ctx.rect(c - 10, c - 3.5, 20, 7);
            break;
          case 'heart':
            ctx.moveTo(c, c + 10);
            ctx.bezierCurveTo(c - 14, c, c - 9, c - 12, c, c - 5);
            ctx.bezierCurveTo(c + 9, c - 12, c + 14, c, c, c + 10);
            break;
          case 'hexagon':
            poly(6, 10);
            break;
          case 'cross':
            ctx.save();
            ctx.translate(c, c);
            ctx.rotate(Math.PI / 4);
            ctx.rect(-3.5, -11, 7, 22);
            ctx.rect(-11, -3.5, 22, 7);
            ctx.restore();
            break;
          case 'ring':
            ctx.arc(c, c, 9.5, 0, Math.PI * 2);
            ctx.arc(c, c, 5, 0, Math.PI * 2, true);
            break;
          case 'bars':
            ctx.rect(c - 9, c - 8, 18, 5.5);
            ctx.rect(c - 9, c + 2.5, 18, 5.5);
            break;
          case 'moon':
            ctx.arc(c, c, 10, 0.6, Math.PI * 2 - 0.6);
            ctx.arc(c + 5, c - 2, 8, Math.PI * 2 - 1.1, 1.1, true);
            break;
        }
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(15,20,28,0.9)';
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fill('evenodd');
      },
      false,
    ),
  );
}

// ---------------------------------------------------------------------------------------------
// Bolts, effects, icons

function metal(boltSkin: BoltSkin) {
  return boltSkin === 'brass' ? 0xc9a24a : 0xb0bac4;
}

/** Glossy gold star (tinted dark for "not earned"). */
function drawStar(ctx: Ctx, cx: number, cy: number, R: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rad = k % 2 ? R * 0.46 : R;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = vgrad(ctx, cy - R, cy + R, [
    [0, '#fff3b0'],
    [0.45, '#ffcf3a'],
    [1, '#e08a00'],
  ]);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#a65f00';
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - R * 0.15, cy - R * 0.45, R * 0.55, R * 0.28, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCoin(ctx: Ctx, cx: number, cy: number, R: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = '#b8730a';
  ctx.fill();
  ctx.restore();
  const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  g.addColorStop(0, '#fff6c4');
  g.addColorStop(0.45, '#ffd34d');
  g.addColorStop(1, '#d98b0b');
  ctx.beginPath();
  ctx.arc(cx, cy, R - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.66, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(160,95,0,0.6)';
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rad = k % 2 ? R * 0.18 : R * 0.42;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(176,104,0,0.85)';
  ctx.fill();
  ctx.restore();
}

export function makeMiscTextures(scene: Phaser.Scene, boltSkin: BoltSkin) {
  const m = metal(boltSkin);
  // Threaded rod (drawn as a repeating tile).
  canvasTex(scene, 'rod', 24, 24, (ctx) => {
    ctx.fillStyle = hgrad(ctx, 0, 24, [
      [0, css(tone(m, -0.55))],
      [0.25, css(tone(m, 0.1))],
      [0.38, css(tone(m, 0.55))],
      [0.55, css(m)],
      [1, css(tone(m, -0.6))],
    ]);
    ctx.fillRect(0, 0, 24, 24);
    ctx.strokeStyle = css(tone(m, -0.6), 0.7);
    ctx.lineWidth = 1.6;
    for (let y = -6; y < 30; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y + 4);
      ctx.lineTo(24, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.8;
    for (let y = -6; y < 30; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y + 5.5);
      ctx.lineTo(24, y + 1.5);
      ctx.stroke();
    }
  });
  // Base plate
  canvasTex(scene, 'base', 150, 30, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    rr(ctx, 4, 4, 142, 18, 9);
    ctx.fillStyle = css(tone(m, -0.5));
    ctx.fill();
    ctx.restore();
    rr(ctx, 4, 3, 142, 16, 8);
    ctx.fillStyle = vgrad(ctx, 3, 19, [
      [0, css(tone(m, 0.45))],
      [0.35, css(tone(m, 0.05))],
      [1, css(tone(m, -0.45))],
    ]);
    ctx.fill();
    ctx.strokeStyle = css(tone(m, -0.6), 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    rr(ctx, 14, 5, 110, 2.5, 1.5);
    ctx.fill();
  });
  // Gold cap on a finished bolt
  canvasTex(scene, 'cap', 64, 36, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.moveTo(4, 28);
    ctx.quadraticCurveTo(4, 6, 32, 5);
    ctx.quadraticCurveTo(60, 6, 60, 28);
    ctx.closePath();
    ctx.fillStyle = '#9a6200';
    ctx.fill();
    ctx.restore();
    const g = ctx.createRadialGradient(22, 10, 2, 32, 20, 34);
    g.addColorStop(0, '#fff7c9');
    g.addColorStop(0.35, '#ffd24a');
    g.addColorStop(1, '#c47a00');
    ctx.beginPath();
    ctx.moveTo(6, 27);
    ctx.quadraticCurveTo(6, 7, 32, 7);
    ctx.quadraticCurveTo(58, 7, 58, 27);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    rr(ctx, 2, 25, 60, 8, 4);
    ctx.fillStyle = vgrad(ctx, 25, 33, [
      [0, '#ffe07a'],
      [1, '#b06d00'],
    ]);
    ctx.fill();
  });
  // Soft glow particle (use with ADD blend)
  canvasTex(
    scene,
    'spark',
    24,
    24,
    (ctx) => {
      const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,250,220,0.9)');
      g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 24, 24);
    },
    false,
  );
  canvasTex(
    scene,
    'confetti',
    14,
    8,
    (ctx) => {
      rr(ctx, 0, 0, 14, 8, 2);
      ctx.fillStyle = vgrad(ctx, 0, 8, [
        [0, '#ffffff'],
        [1, '#c8c8c8'],
      ]);
      ctx.fill();
    },
    false,
  );
  canvasTex(scene, 'star', 64, 64, (ctx) => drawStar(ctx, 32, 33, 28), false);
  canvasTex(scene, 'coin', 40, 40, (ctx) => drawCoin(ctx, 20, 20, 17), false);
  canvasTex(
    scene,
    'lock',
    48,
    56,
    (ctx) => {
      ctx.lineWidth = 7;
      ctx.strokeStyle = hgrad(ctx, 10, 38, [
        [0, '#7d8a96'],
        [0.4, '#eef2f5'],
        [1, '#6c7883'],
      ]);
      ctx.beginPath();
      ctx.arc(24, 22, 12, Math.PI, 0);
      ctx.lineTo(36, 28);
      ctx.moveTo(12, 22);
      ctx.lineTo(12, 28);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      rr(ctx, 4, 22, 40, 30, 8);
      ctx.fillStyle = vgrad(ctx, 22, 52, [
        [0, '#ffd75e'],
        [1, '#c7800a'],
      ]);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#8a5300';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#5a3500';
      ctx.beginPath();
      ctx.arc(24, 34, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(22.5, 35, 3, 9);
    },
    false,
  );
  canvasTex(
    scene,
    'chain',
    24,
    36,
    (ctx) => {
      ctx.lineWidth = 6;
      ctx.strokeStyle = hgrad(ctx, 4, 20, [
        [0, '#5f6b75'],
        [0.45, '#e3e8ec'],
        [1, '#56616b'],
      ]);
      ctx.beginPath();
      ctx.ellipse(12, 18, 7.5, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
    },
    false,
  );
  canvasTex(
    scene,
    'hand',
    70,
    84,
    (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(22, 2, 18, 50, 9);
      ctx.roundRect(13, 34, 50, 42, 16);
      ctx.roundRect(40, 30, 14, 24, 7);
      ctx.roundRect(52, 35, 12, 24, 6);
      ctx.fillStyle = vgrad(ctx, 0, 80, [
        [0, '#ffffff'],
        [1, '#dfe6ee'],
      ]);
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#3a4756';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(26, 8, 4, 30);
    },
    false,
  );
  canvasTex(
    scene,
    'chest',
    92,
    80,
    (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      rr(ctx, 4, 30, 84, 46, 8);
      ctx.fillStyle = vgrad(ctx, 30, 76, [
        [0, '#9a5f2c'],
        [1, '#5e3414'],
      ]);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(4, 36);
      ctx.lineTo(4, 26);
      ctx.quadraticCurveTo(46, -4, 88, 26);
      ctx.lineTo(88, 36);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, 4, 36, [
        [0, '#c27a3e'],
        [1, '#7b4519'],
      ]);
      ctx.fill();
      ctx.fillStyle = vgrad(ctx, 30, 40, [
        [0, '#ffe08a'],
        [1, '#c98300'],
      ]);
      ctx.fillRect(4, 31, 84, 7);
      ctx.fillRect(14, 8, 7, 66);
      ctx.fillRect(71, 8, 7, 66);
      rr(ctx, 38, 26, 16, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#4a2a0a';
      ctx.fillRect(44.5, 33, 3, 8);
    },
    false,
  );
  canvasTex(
    scene,
    'ice',
    120,
    50,
    (ctx) => {
      rr(ctx, 1, 1, 118, 40, 10);
      ctx.fillStyle = vgrad(ctx, 0, 42, [
        [0, 'rgba(220,248,255,0.75)'],
        [1, 'rgba(150,215,240,0.55)'],
      ]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(14, 10);
      ctx.lineTo(36, 6);
      ctx.moveTo(84, 34);
      ctx.lineTo(106, 28);
      ctx.stroke();
    },
    false,
  );
  canvasTex(
    scene,
    'magnet',
    64,
    60,
    (ctx) => {
      ctx.lineWidth = 16;
      ctx.strokeStyle = hgrad(ctx, 4, 60, [
        [0, '#9e2a26'],
        [0.35, '#ff6b5e'],
        [1, '#a3221c'],
      ]);
      ctx.beginPath();
      ctx.arc(32, 28, 20, Math.PI, 0);
      ctx.lineTo(52, 44);
      ctx.moveTo(12, 28);
      ctx.lineTo(12, 44);
      ctx.stroke();
      ctx.fillStyle = vgrad(ctx, 44, 58, [
        [0, '#ffffff'],
        [1, '#9aa5b0'],
      ]);
      ctx.fillRect(4, 44, 16, 13);
      ctx.fillRect(44, 44, 16, 13);
    },
    false,
  );
  canvasTex(
    scene,
    'glue',
    80,
    40,
    (ctx) => {
      ctx.fillStyle = vgrad(ctx, 0, 36, [
        [0, '#c6f07c'],
        [1, '#5a9a1e'],
      ]);
      ctx.beginPath();
      ctx.roundRect(0, 0, 80, 14, 7);
      ctx.arc(14, 20, 7, 0, Math.PI * 2);
      ctx.arc(40, 26, 9, 0, Math.PI * 2);
      ctx.arc(64, 18, 6, 0, Math.PI * 2);
      ctx.rect(10, 8, 8, 12);
      ctx.rect(35, 8, 10, 18);
      ctx.rect(60, 8, 8, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(37, 23, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(6, 3, 40, 3);
    },
    false,
  );
}

// ---------------------------------------------------------------------------------------------
// Map spheres and UI pieces

/** Glossy sphere used for level buttons on the maps. */
export function nodeTexture(scene: Phaser.Scene, color: number): string {
  const key = `node-${color.toString(16)}`;
  canvasTex(
    scene,
    key,
    100,
    104,
    (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 5;
      ctx.beginPath();
      ctx.arc(50, 50, 44, 0, Math.PI * 2);
      ctx.fillStyle = css(tone(color, -0.45));
      ctx.fill();
      ctx.restore();
      const g = ctx.createRadialGradient(36, 30, 4, 50, 50, 46);
      g.addColorStop(0, css(tone(color, 0.55)));
      g.addColorStop(0.45, css(color));
      g.addColorStop(1, css(tone(color, -0.45)));
      ctx.beginPath();
      ctx.arc(50, 48, 44, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(40, 26, 20, 10, -0.4, 0, Math.PI * 2);
      ctx.fill();
    },
    false,
  );
  return key;
}

/** 9-slice button skin: gradient body, glossy top, darker 3D lip. */
export const BTN = { w: 80, h: 80, lip: 6, slice: 22, sliceBottom: 28 };
export function buttonTexture(scene: Phaser.Scene, color: number): string {
  const key = `btn-${color.toString(16)}`;
  const { w, h, lip } = BTN;
  canvasTex(
    scene,
    key,
    w,
    h + lip,
    (ctx) => {
      const r = 18;
      rr(ctx, 0.5, lip, w - 1, h - 0.5, r);
      ctx.fillStyle = css(tone(color, -0.5));
      ctx.fill();
      rr(ctx, 0.5, 0.5, w - 1, h - 1, r);
      ctx.fillStyle = vgrad(ctx, 0, h, [
        [0, css(tone(color, 0.28))],
        [0.5, css(color)],
        [1, css(tone(color, -0.18))],
      ]);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = vgrad(ctx, 0, h * 0.5, [
        [0, 'rgba(255,255,255,0.38)'],
        [1, 'rgba(255,255,255,0.04)'],
      ]);
      rr(ctx, 4, 3, w - 8, h * 0.42, 14);
      ctx.fill();
      ctx.restore();
      rr(ctx, 1, 1, w - 2, h - 2, r);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = css(tone(color, 0.45), 0.7);
      ctx.stroke();
    },
    false,
  );
  return key;
}

/** 9-slice glass panel with a soft drop shadow (margin M around the panel). */
export const PANEL = { size: 140, margin: 18, slice: 50 };
export function panelTexture(scene: Phaser.Scene, color: number): string {
  const key = `panel-${color.toString(16)}`;
  const { size, margin: M } = PANEL;
  canvasTex(
    scene,
    key,
    size,
    size,
    (ctx) => {
      const w = size - 2 * M;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      rr(ctx, M, M, w, w, 28);
      ctx.fillStyle = css(tone(color, -0.2));
      ctx.fill();
      ctx.restore();
      rr(ctx, M, M, w, w, 28);
      ctx.fillStyle = vgrad(ctx, M, M + w, [
        [0, css(tone(color, 0.14))],
        [1, css(tone(color, -0.18))],
      ]);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = css(tone(color, 0.4), 0.9);
      ctx.stroke();
      rr(ctx, M + 3, M + 3, w - 6, w - 6, 25);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();
    },
    false,
  );
  return key;
}
