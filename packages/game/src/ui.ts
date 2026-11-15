import Phaser from 'phaser';
import { app } from './app';
import { STAGE_LOOKS, UI, shade } from './theme';

export function text(scene: Phaser.Scene, x: number, y: number, s: string, size = 28, color = UI.text, bold = true) {
  return scene.add
    .text(x, y, s, {
      fontFamily: UI.font,
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? 'bold' : 'normal',
      align: 'center',
    })
    .setOrigin(0.5)
    .setPadding(2, 6, 2, 6);
}

export interface Button extends Phaser.GameObjects.Container {
  setLabel(s: string): void;
  setEnabled(on: boolean): void;
  setBadge(s: string | null): void;
}

/** Rounded button with press feedback, a tap sound and an optional count badge. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  color: number = UI.blue,
  size = 26,
): Button {
  const c = scene.add.container(x, y) as Button;
  const g = scene.add.graphics();
  const draw = (col: number) => {
    g.clear();
    g.fillStyle(shade(col, -0.45), 1).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 16);
    g.fillStyle(col, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(0xffffff, 0.18).fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h * 0.32, 10);
  };
  draw(color);
  const t = text(scene, 0, -1, label, size);
  const badgeBg = scene.add
    .circle(w / 2 - 8, -h / 2 + 6, 17, UI.red)
    .setStrokeStyle(3, 0xffffff)
    .setVisible(false);
  const badgeTx = text(scene, w / 2 - 8, -h / 2 + 6, '', 18).setVisible(false);
  c.add([g, t, badgeBg, badgeTx]);
  c.setSize(w, h);
  let enabled = true;
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => {
    if (!enabled) return;
    scene.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true });
  });
  c.on('pointerup', () => {
    if (!enabled) return;
    app.audio.unlock();
    app.audio.tap();
    onClick();
  });
  c.setLabel = (s: string) => t.setText(s);
  c.setEnabled = (on: boolean) => {
    enabled = on;
    draw(on ? color : UI.grey);
    c.setAlpha(on ? 1 : 0.7);
  };
  c.setBadge = (s: string | null) => {
    badgeBg.setVisible(!!s);
    badgeTx.setVisible(!!s).setText(s ?? '');
  };
  return c;
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number = UI.panel) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x - w / 2 + 4, y - h / 2 + 8, w, h, 28);
  g.fillStyle(color, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 28);
  g.lineStyle(4, shade(color, 0.25), 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 28);
  return g;
}

/** Dark full-screen layer that swallows taps; used under dialogs. */
export function dim(scene: Phaser.Scene, alpha = 0.6) {
  const { width, height } = scene.scale;
  return scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, alpha).setInteractive();
}

/** Stage background: vertical gradient plus faint themed shapes. */
export function background(scene: Phaser.Scene, stage: number) {
  const { width, height } = scene.scale;
  const look = STAGE_LOOKS[stage] ?? STAGE_LOOKS[1];
  const g = scene.add.graphics();
  const steps = 32;
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(look.top),
      Phaser.Display.Color.ValueToColor(look.bottom),
      steps - 1,
      i,
    );
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, (height / steps) * i, width, height / steps + 1);
  }
  const rng = new Phaser.Math.RandomDataGenerator([String(stage)]);
  g.lineStyle(4, look.accent, 0.07);
  g.fillStyle(look.accent, 0.05);
  for (let k = 0; k < 14; k++) {
    const x = rng.between(0, width);
    const y = rng.between(0, height);
    const r = rng.between(20, 90);
    switch (look.deco) {
      case 'gears':
      case 'mix':
        g.strokeCircle(x, y, r);
        for (let t = 0; t < 8; t++) {
          const a = (t / 8) * Math.PI * 2;
          g.fillRect(x + Math.cos(a) * r - 6, y + Math.sin(a) * r - 6, 12, 12);
        }
        break;
      case 'spokes':
        g.strokeCircle(x, y, r);
        for (let t = 0; t < 6; t++) {
          const a = (t / 6) * Math.PI;
          g.lineBetween(x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        break;
      case 'clock':
        g.strokeCircle(x, y, r);
        g.lineBetween(x, y, x, y - r * 0.7);
        g.lineBetween(x, y, x + r * 0.5, y);
        break;
      case 'waves':
        g.beginPath();
        for (let t = 0; t <= 20; t++) g.lineTo(x - 100 + t * 10, y + Math.sin(t) * 8);
        g.strokePath();
        break;
      case 'rails':
        g.lineBetween(0, y, width, y);
        break;
      case 'bolts':
        g.fillTriangle(x, y - r, x - r / 3, y, x + r / 4, y);
        g.fillTriangle(x + r / 4, y - r / 5, x - r / 4, y + r, x + r / 2, y - r / 5);
        break;
      case 'stars':
        g.fillCircle(x, y, rng.between(1, 4));
        break;
      case 'circuits':
        g.lineBetween(x, y, x + r, y);
        g.lineBetween(x + r, y, x + r, y + r);
        g.strokeCircle(x + r, y + r, 6);
        break;
      case 'bubbles':
        g.strokeCircle(x, y, r / 3);
        break;
      case 'grid':
        if (k === 0) {
          g.lineStyle(1, look.accent, 0.12);
          for (let gx = 0; gx < width; gx += 40) g.lineBetween(gx, 0, gx, height);
          for (let gy = 0; gy < height; gy += 40) g.lineBetween(0, gy, width, gy);
          g.lineStyle(4, look.accent, 0.07);
        }
        g.strokeRect(x, y, r, r * 0.6);
        break;
      case 'speed':
        g.lineBetween(x, y, x + r * 2, y);
        break;
      case 'leaves':
        g.fillEllipse(x, y, r * 0.5, r * 0.25);
        break;
    }
  }
  return g;
}

export function toast(scene: Phaser.Scene, msg: string, y?: number) {
  const { width, height } = scene.scale;
  const t = text(scene, width / 2, y ?? height * 0.42, msg, 30).setDepth(1000);
  const bg = scene.add
    .rectangle(width / 2, t.y, Math.min(width - 40, t.width + 50), t.height + 24, 0x000000, 0.75)
    .setDepth(999);
  scene.tweens.add({
    targets: [t, bg],
    alpha: 0,
    delay: 1400,
    duration: 400,
    onComplete: () => {
      t.destroy();
      bg.destroy();
    },
  });
}

/** Coin counter shown in headers. */
export function coinChip(scene: Phaser.Scene, x: number, y: number) {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  bg.fillStyle(0x000000, 0.35).fillRoundedRect(-80, -24, 160, 48, 24);
  const icon = scene.add.image(-56, 0, 'coin').setScale(0.9);
  const t = text(scene, 14, 0, String(app.data.coins), 26);
  c.add([bg, icon, t]);
  return { container: c, refresh: () => t.setText(String(app.data.coins)) };
}

/** Simple yes/no dialog. */
export function confirm(scene: Phaser.Scene, title: string, body: string, yes: string, onYes: () => void) {
  const { width, height } = scene.scale;
  const layer = scene.add.container(0, 0).setDepth(2000);
  const close = () => layer.destroy();
  layer.add(dim(scene));
  layer.add(panel(scene, width / 2, height / 2, 560, 380));
  layer.add(text(scene, width / 2, height / 2 - 130, title, 36));
  const b = text(scene, width / 2, height / 2 - 40, body, 26, UI.textDim, false).setWordWrapWidth(480);
  layer.add(b);
  layer.add(button(scene, width / 2 - 120, height / 2 + 110, 200, 80, app.t('btn.close'), close, UI.grey));
  layer.add(
    button(
      scene,
      width / 2 + 120,
      height / 2 + 110,
      200,
      80,
      yes,
      () => {
        close();
        onYes();
      },
      UI.green,
    ),
  );
  return layer;
}
