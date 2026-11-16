import Phaser from 'phaser';
import { HD, RES, hd, view } from './view';
import { BTN, PANEL, buttonTexture, css, panelTexture, tone } from './textures';
import { app } from './app';
import { STAGE_LOOKS, UI, type StageLook } from './theme';

export function text(scene: Phaser.Scene, x: number, y: number, s: string, size = 28, color = UI.text, bold = true) {
  const t = scene.add
    .text(x, y, s, {
      fontFamily: UI.font,
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? '700' : '500',
      align: 'center',
    })
    .setOrigin(0.5)
    .setPadding(2, 6, 2, 6);
  // A soft shadow gives bold text depth on every background.
  if (bold) t.setShadow(0, Math.max(1, size / 14), 'rgba(0,0,0,0.38)', Math.max(2, size / 9), false, true);
  return t;
}

export interface Button extends Phaser.GameObjects.Container {
  setLabel(s: string): void;
  setEnabled(on: boolean): void;
  setBadge(s: string | null): void;
}

/** Glossy rounded button (9-slice art) with press feedback, a tap sound and an optional badge. */
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
  const key = buttonTexture(scene, color);
  const bg = scene.add
    .nineslice(
      0,
      BTN.lip / 2,
      key,
      undefined,
      w * HD,
      (h + BTN.lip) * HD,
      BTN.slice * HD,
      BTN.slice * HD,
      BTN.slice * HD,
      BTN.sliceBottom * HD,
    )
    .setScale(1 / HD);
  const light = color === 0xffffff || color === UI.gold;
  const t = text(scene, 0, -2, label, size, light ? '#1d2b3a' : UI.text);
  const badgeBg = scene.add
    .circle(w / 2 - 8, -h / 2 + 6, 17, UI.red)
    .setStrokeStyle(3, 0xffffff)
    .setVisible(false);
  const badgeTx = text(scene, w / 2 - 8, -h / 2 + 6, '', 18).setVisible(false);
  c.add([bg, t, badgeBg, badgeTx]);
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
    if (on) bg.clearTint();
    else bg.setTint(0x8a96a3);
    c.setAlpha(on ? 1 : 0.75);
  };
  c.setBadge = (s: string | null) => {
    badgeBg.setVisible(!!s);
    badgeTx.setVisible(!!s).setText(s ?? '');
  };
  return c;
}

/** Glass panel with a soft drop shadow (9-slice art). */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number = UI.panel) {
  const key = panelTexture(scene, color);
  const M = PANEL.margin;
  return scene.add
    .nineslice(
      x,
      y,
      key,
      undefined,
      (w + 2 * M) * HD,
      (h + 2 * M) * HD,
      PANEL.slice * HD,
      PANEL.slice * HD,
      PANEL.slice * HD,
      PANEL.slice * HD,
    )
    .setScale(1 / HD);
}

/** Dark full-screen layer that swallows taps; used under dialogs. */
export function dim(scene: Phaser.Scene, alpha = 0.6) {
  const { width, height } = view(scene);
  return scene.add.rectangle(width / 2, height / 2, width, height, 0x05080c, alpha).setInteractive();
}

/**
 * Stage background, painted once per stage into a texture: gradient, soft light from above,
 * blurred bokeh, faint themed shapes and a vignette.
 */
export function background(scene: Phaser.Scene, stage: number) {
  const { width, height } = view(scene);
  const look = STAGE_LOOKS[stage] ?? STAGE_LOOKS[1];
  const scale = Math.min(RES, 1.25); // soft art: no need for full resolution
  const key = `bg-${stage}-${Math.round(height)}-${scale}`;
  if (!scene.textures.exists(key)) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(width * scale);
    cv.height = Math.ceil(height * scale);
    const ctx = cv.getContext('2d')!;
    ctx.scale(scale, scale);
    paintBackground(ctx, width, height, look, stage);
    scene.textures.addCanvas(key, cv);
  }
  return scene.add
    .image(0, 0, key)
    .setOrigin(0)
    .setScale(1 / scale);
}

function paintBackground(ctx: CanvasRenderingContext2D, width: number, height: number, look: StageLook, stage: number) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, css(tone(look.top, 0.08)));
  g.addColorStop(0.55, css(look.top));
  g.addColorStop(1, css(look.bottom));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  // Light from above
  const glow = ctx.createRadialGradient(width / 2, height * 0.12, 10, width / 2, height * 0.12, height * 0.6);
  glow.addColorStop(0, css(look.accent, 0.22));
  glow.addColorStop(1, css(look.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  const rng = new Phaser.Math.RandomDataGenerator([String(stage)]);
  // Bokeh
  for (let k = 0; k < 18; k++) {
    const x = rng.between(0, width);
    const y = rng.between(0, height);
    const r = rng.between(20, 110);
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, css(look.accent, rng.realInRange(0.04, 0.1)));
    b.addColorStop(1, css(look.accent, 0));
    ctx.fillStyle = b;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Faint themed shapes
  ctx.strokeStyle = css(look.accent, 0.08);
  ctx.fillStyle = css(look.accent, 0.06);
  ctx.lineWidth = 4;
  for (let k = 0; k < 12; k++) {
    const x = rng.between(0, width);
    const y = rng.between(0, height);
    const r = rng.between(24, 90);
    ctx.beginPath();
    switch (look.deco) {
      case 'gears':
      case 'mix':
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        for (let t = 0; t < 10; t++) {
          const a = (t / 10) * Math.PI * 2;
          ctx.fillRect(x + Math.cos(a) * (r + 6) - 6, y + Math.sin(a) * (r + 6) - 6, 12, 12);
        }
        ctx.beginPath();
        ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'spokes':
        ctx.arc(x, y, r, 0, Math.PI * 2);
        for (let t = 0; t < 6; t++) {
          const a = (t / 6) * Math.PI;
          ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.stroke();
        break;
      case 'clock':
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - r * 0.7);
        ctx.moveTo(x, y);
        ctx.lineTo(x + r * 0.5, y);
        ctx.stroke();
        break;
      case 'waves':
        for (let t = 0; t <= 24; t++) ctx.lineTo(x - 120 + t * 10, y + Math.sin(t * 0.8) * 10);
        ctx.stroke();
        break;
      case 'rails':
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.moveTo(0, y + 24);
        ctx.lineTo(width, y + 24);
        ctx.stroke();
        break;
      case 'bolts':
        ctx.moveTo(x, y - r);
        ctx.lineTo(x - r / 3, y);
        ctx.lineTo(x + r / 6, y);
        ctx.lineTo(x - r / 6, y + r);
        ctx.lineTo(x + r / 2, y - r / 5);
        ctx.lineTo(x, y - r / 5);
        ctx.closePath();
        ctx.fill();
        break;
      case 'stars':
        for (let t = 0; t < 6; t++) {
          const sx = rng.between(0, width);
          const sy = rng.between(0, height);
          const sr = rng.realInRange(0.8, 2.6);
          ctx.fillStyle = `rgba(255,255,255,${rng.realInRange(0.25, 0.7)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'circuits':
        ctx.moveTo(x, y);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x + r, y + r);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + r, y + r, 6, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'bubbles':
        ctx.arc(x, y, r / 3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'grid':
        if (k === 0) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = css(look.accent, 0.1);
          for (let gx = 0; gx < width; gx += 40) {
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, height);
          }
          for (let gy = 0; gy < height; gy += 40) {
            ctx.moveTo(0, gy);
            ctx.lineTo(width, gy);
          }
          ctx.stroke();
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.strokeStyle = css(look.accent, 0.08);
        }
        ctx.strokeRect(x, y, r, r * 0.6);
        break;
      case 'speed':
        ctx.moveTo(x, y);
        ctx.lineTo(x + r * 2.5, y);
        ctx.stroke();
        break;
      case 'leaves':
        ctx.ellipse(x, y, r * 0.5, r * 0.22, rng.realInRange(0, 3), 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }
  // Vignette
  const v = ctx.createRadialGradient(width / 2, height / 2, height * 0.28, width / 2, height / 2, height * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, width, height);
}

export function toast(scene: Phaser.Scene, msg: string, y?: number) {
  const { width, height } = view(scene);
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
  const icon = hd(scene.add.image(-56, 0, 'coin'), 0.9);
  const t = text(scene, 14, 0, String(app.data.coins), 26);
  c.add([bg, icon, t]);
  return { container: c, refresh: () => t.setText(String(app.data.coins)) };
}

/** Simple yes/no dialog. */
export function confirm(scene: Phaser.Scene, title: string, body: string, yes: string, onYes: () => void) {
  const { width, height } = view(scene);
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
