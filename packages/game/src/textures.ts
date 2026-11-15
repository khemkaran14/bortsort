import Phaser from 'phaser';
import { NUT_COLORS, SYMBOLS, shade, type NutSkin, type BoltSkin } from './theme';

export const NUT_W = 120;
export const NUT_H = 46;

/** Draw every nut color for a skin into textures named nut-<i>. Called at boot and on skin change. */
export function makeNutTextures(scene: Phaser.Scene, skin: NutSkin) {
  for (let i = 0; i < NUT_COLORS.length; i++) drawNut(scene, `nut-${i}`, NUT_COLORS[i], skin);
  drawNut(scene, 'nut-hidden', 0x6b7785, skin === 'neon' ? 'neon' : 'metal');
}

function drawNut(scene: Phaser.Scene, key: string, color: number, skin: NutSkin) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const w = NUT_W;
  const h = NUT_H;
  const r = 9;
  const side = w * 0.2;
  if (skin === 'neon') {
    g.fillStyle(0x0d1117, 1).fillRoundedRect(2, 2, w - 4, h - 4, r);
    g.lineStyle(5, color, 1).strokeRoundedRect(4, 4, w - 8, h - 8, r);
    g.lineStyle(2, shade(color, 0.6), 1).strokeRoundedRect(4, 4, w - 8, h - 8, r);
    g.fillStyle(color, 0.35)
      .fillRect(side, 8, 3, h - 16)
      .fillRect(w - side - 3, 8, 3, h - 16);
  } else {
    // Hex nut seen from the side: a wide middle face and two darker side faces.
    g.fillStyle(shade(color, -0.45), 1).fillRoundedRect(0, 2, w, h - 2, r);
    g.fillStyle(shade(color, -0.2), 1).fillRoundedRect(0, 0, w, h - 4, r);
    g.fillStyle(color, 1).fillRect(side, 0, w - side * 2, h - 4);
    g.fillStyle(shade(color, 0.35), 1).fillRect(side + 4, 4, w - side * 2 - 8, 7);
    g.fillStyle(shade(color, -0.3), 0.8).fillRect(side, h - 12, w - side * 2, 8);
    if (skin === 'metal') {
      g.fillStyle(0xffffff, 0.25).fillRect(side + 10, 13, w * 0.3, 3);
    } else if (skin === 'wood') {
      g.lineStyle(2, shade(color, -0.35), 0.6);
      for (let k = 0; k < 4; k++) {
        const y = 10 + k * 7;
        g.beginPath();
        g.moveTo(side, y);
        g.lineTo(w * 0.45, y + 3);
        g.lineTo(w - side, y - 1);
        g.strokePath();
      }
    } else if (skin === 'candy') {
      g.fillStyle(0xffffff, 0.55);
      for (let x = side - 20; x < w - side; x += 18) {
        g.fillTriangle(x, h - 4, x + 9, h - 4, x + 25, 0);
        g.fillTriangle(x + 9, h - 4, x + 25, 0, x + 34, 0);
      }
      g.fillStyle(shade(color, -0.2), 1).fillRoundedRect(0, 0, side, h - 4, { tl: r, bl: r, tr: 0, br: 0 });
      g.fillStyle(shade(color, -0.2), 1).fillRoundedRect(w - side, 0, side, h - 4, { tl: 0, bl: 0, tr: r, br: r });
    } else if (skin === 'gems') {
      g.fillStyle(shade(color, 0.5), 0.9).fillTriangle(side, 0, side + 22, 0, side, 20);
      g.fillStyle(shade(color, 0.25), 0.8).fillTriangle(w / 2, 4, w / 2 + 16, h / 2, w / 2 - 16, h / 2);
      g.fillStyle(0xffffff, 0.9).fillCircle(w - side - 12, 10, 3);
    }
    g.lineStyle(2, shade(color, -0.55), 1).strokeRoundedRect(1, 1, w - 2, h - 4, r);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Symbols for the color-blind setting: white shape with a dark outline. */
export function makeSymbolTextures(scene: Phaser.Scene) {
  const s = 30;
  SYMBOLS.forEach((name, i) => {
    const key = `sym-${i}`;
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const c = s / 2;
    const draw = (fill: boolean) => {
      if (fill) g.fillStyle(0xffffff, 1);
      else g.lineStyle(5, 0x111111, 0.9);
      const F = (fn: () => void) => fn();
      switch (name) {
        case 'circle':
          F(() => (fill ? g.fillCircle(c, c, 9) : g.strokeCircle(c, c, 9)));
          break;
        case 'square':
          F(() => (fill ? g.fillRect(c - 8, c - 8, 16, 16) : g.strokeRect(c - 8, c - 8, 16, 16)));
          break;
        case 'triangle':
          F(() =>
            fill
              ? g.fillTriangle(c, c - 10, c + 10, c + 8, c - 10, c + 8)
              : g.strokeTriangle(c, c - 10, c + 10, c + 8, c - 10, c + 8),
          );
          break;
        case 'diamond': {
          const pts = [
            new Phaser.Math.Vector2(c, c - 11),
            new Phaser.Math.Vector2(c + 9, c),
            new Phaser.Math.Vector2(c, c + 11),
            new Phaser.Math.Vector2(c - 9, c),
          ];
          if (fill) g.fillPoints(pts, true);
          else g.strokePoints(pts, true);
          break;
        }
        case 'star':
        case 'hexagon': {
          const pts: Phaser.Math.Vector2[] = [];
          const n = name === 'star' ? 10 : 6;
          for (let k = 0; k < n; k++) {
            const a = -Math.PI / 2 + (k * Math.PI * 2) / n;
            const rr = name === 'star' ? (k % 2 ? 5 : 11) : 10;
            pts.push(new Phaser.Math.Vector2(c + Math.cos(a) * rr, c + Math.sin(a) * rr));
          }
          if (fill) g.fillPoints(pts, true);
          else g.strokePoints(pts, true);
          break;
        }
        case 'plus':
          if (fill) g.fillRect(c - 3, c - 10, 6, 20).fillRect(c - 10, c - 3, 20, 6);
          else g.strokeRect(c - 3, c - 10, 6, 20).strokeRect(c - 10, c - 3, 20, 6);
          break;
        case 'cross': {
          const pts = [
            [c - 9, c - 9, c + 9, c + 9],
            [c + 9, c - 9, c - 9, c + 9],
          ];
          g.lineStyle(fill ? 5 : 9, fill ? 0xffffff : 0x111111, 1);
          for (const p of pts) g.lineBetween(p[0], p[1], p[2], p[3]);
          break;
        }
        case 'ring':
          g.lineStyle(fill ? 4 : 8, fill ? 0xffffff : 0x111111, 1);
          g.strokeCircle(c, c, 8);
          break;
        case 'bars':
          if (fill) g.fillRect(c - 9, c - 8, 18, 5).fillRect(c - 9, c + 3, 18, 5);
          else g.strokeRect(c - 9, c - 8, 18, 5).strokeRect(c - 9, c + 3, 18, 5);
          break;
        case 'heart':
          if (fill) {
            g.fillCircle(c - 5, c - 3, 6)
              .fillCircle(c + 5, c - 3, 6)
              .fillTriangle(c - 11, c - 1, c + 11, c - 1, c, c + 11);
          } else {
            g.strokeCircle(c - 5, c - 3, 6)
              .strokeCircle(c + 5, c - 3, 6)
              .strokeTriangle(c - 11, c - 1, c + 11, c - 1, c, c + 11);
          }
          break;
        case 'moon':
          if (fill) {
            g.fillCircle(c, c, 10);
            g.fillStyle(0x000000, 1);
            g.fillCircle(c + 6, c - 4, 8);
          } else g.strokeCircle(c, c, 10);
          break;
      }
    };
    draw(false);
    draw(true);
    g.generateTexture(key, s, s);
    g.destroy();
  });
}

export function makeMiscTextures(scene: Phaser.Scene, boltSkin: BoltSkin) {
  const make = (key: string, w: number, h: number, fn: (g: Phaser.GameObjects.Graphics) => void, replace = false) => {
    if (scene.textures.exists(key)) {
      if (!replace) return;
      scene.textures.remove(key);
    }
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    fn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  const rod = boltSkin === 'brass' ? 0xc9a24a : 0xaab4be;
  // Threaded rod (tiled vertically by stretching).
  make(
    'rod',
    22,
    40,
    (g) => {
      g.fillStyle(shade(rod, -0.35), 1).fillRect(0, 0, 22, 40);
      g.fillStyle(rod, 1).fillRect(3, 0, 16, 40);
      g.fillStyle(shade(rod, 0.4), 1).fillRect(6, 0, 4, 40);
      g.lineStyle(2, shade(rod, -0.5), 0.8);
      for (let y = 2; y < 40; y += 8) g.lineBetween(0, y + 4, 22, y);
    },
    true,
  );
  make(
    'base',
    150,
    26,
    (g) => {
      g.fillStyle(0x1a1a1a, 0.5).fillRoundedRect(4, 8, 146, 18, 9);
      g.fillStyle(shade(rod, -0.5), 1).fillRoundedRect(0, 4, 146, 18, 9);
      g.fillStyle(shade(rod, -0.2), 1).fillRoundedRect(0, 0, 146, 16, 8);
      g.fillStyle(shade(rod, 0.3), 1).fillRect(10, 3, 120, 3);
    },
    true,
  );
  make(
    'cap',
    60,
    30,
    (g) => {
      g.fillStyle(0x6e4a12, 1).fillRoundedRect(0, 8, 60, 22, 8);
      g.fillStyle(0xf3c14b, 1).fillRoundedRect(0, 4, 60, 20, 8);
      g.fillStyle(0xffe9a8, 1).fillRect(8, 8, 44, 4);
      g.fillStyle(0xf3c14b, 1).fillCircle(30, 6, 6);
    },
    true,
  );
  make('spark', 12, 12, (g) => {
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 6);
  });
  make('confetti', 14, 8, (g) => {
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 14, 8);
  });
  make('star', 64, 64, (g) => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? 13 : 30;
      pts.push(new Phaser.Math.Vector2(32 + Math.cos(a) * rr, 33 + Math.sin(a) * rr));
    }
    g.fillStyle(0xffffff, 1).fillPoints(pts, true);
  });
  make('lock', 48, 54, (g) => {
    g.lineStyle(7, 0xcfd8dc, 1).beginPath();
    g.arc(24, 22, 13, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(0x546e7a, 1).fillRoundedRect(4, 20, 40, 32, 7);
    g.fillStyle(0x78909c, 1).fillRoundedRect(4, 20, 40, 10, 6);
  });
  make('chain', 24, 34, (g) => {
    g.lineStyle(6, 0x90a4ae, 1).strokeEllipse(12, 17, 16, 28);
    g.lineStyle(2, 0x37474f, 1).strokeEllipse(12, 17, 16, 28);
  });
  make('hand', 70, 80, (g) => {
    g.fillStyle(0x000000, 0.25).fillEllipse(40, 72, 40, 10);
    g.fillStyle(0xffe0bd, 1);
    g.fillRoundedRect(22, 0, 18, 50, 9);
    g.fillRoundedRect(14, 34, 48, 40, 14);
    g.fillStyle(0xf4c59a, 1).fillRoundedRect(40, 30, 14, 26, 7).fillRoundedRect(52, 36, 12, 24, 6);
    g.lineStyle(3, 0x8d5a3b, 1).strokeRoundedRect(22, 0, 18, 50, 9).strokeRoundedRect(14, 34, 48, 40, 14);
  });
  make('coin', 40, 40, (g) => {
    g.fillStyle(0xb7791f, 1).fillCircle(20, 21, 18);
    g.fillStyle(0xf3c14b, 1).fillCircle(20, 19, 17);
    g.fillStyle(0xffe08a, 1).fillCircle(20, 19, 11);
    g.fillStyle(0xd69e2e, 1).fillRect(17, 11, 6, 16);
  });
  make('chest', 90, 76, (g) => {
    g.fillStyle(0x6d3f1d, 1).fillRoundedRect(4, 28, 82, 46, 8);
    g.fillStyle(0x8b5a2b, 1).fillRoundedRect(4, 6, 82, 30, { tl: 20, tr: 20, bl: 0, br: 0 });
    g.fillStyle(0xf3c14b, 1).fillRect(4, 30, 82, 7).fillRect(38, 24, 14, 22);
    g.lineStyle(3, 0x3e2310, 1).strokeRoundedRect(4, 6, 82, 68, 10);
  });
  make('magnet', 64, 58, (g) => {
    g.lineStyle(16, 0xd9534f, 1).beginPath();
    g.arc(32, 26, 20, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(0xd9534f, 1).fillRect(4, 26, 16, 18).fillRect(44, 26, 16, 18);
    g.fillStyle(0xe0e0e0, 1).fillRect(4, 44, 16, 12).fillRect(44, 44, 16, 12);
  });
  make('glue', 80, 40, (g) => {
    g.fillStyle(0x9ccc65, 0.95).fillRoundedRect(0, 0, 80, 14, 7);
    g.fillCircle(14, 20, 7).fillCircle(40, 26, 9).fillCircle(64, 18, 6);
    g.fillRect(10, 8, 8, 12).fillRect(35, 8, 10, 18).fillRect(60, 8, 8, 10);
    g.fillStyle(0xffffff, 0.5).fillCircle(37, 23, 3);
  });
  make('ice', 120, 46, (g) => {
    g.fillStyle(0xbfefff, 0.55).fillRoundedRect(0, 0, 120, 44, 9);
    g.lineStyle(3, 0xeafaff, 0.9).strokeRoundedRect(1, 1, 118, 42, 9);
    g.lineStyle(2, 0xffffff, 0.8).lineBetween(14, 10, 34, 6).lineBetween(80, 36, 104, 30);
  });
}
