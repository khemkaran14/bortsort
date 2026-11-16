import Phaser from 'phaser';
import { view } from '../view';
import { MODE_UNLOCK, type PlayMode } from '@bolt-sort/core';
import { todayLocal, type TextKey } from '@bolt-sort/services';
import { app } from '../app';
import { NUT_COLORS, UI, shade } from '../theme';
import { background, button, coinChip, text, toast } from '../ui';

interface Card {
  mode: PlayMode;
  title: TextKey;
  desc: TextKey;
  color: number;
  status: () => string;
  open: () => void;
}

/** Hub for the other ways to play: Daily, Blueprint, Rush and Zen. */
export class ModesScene extends Phaser.Scene {
  constructor() {
    super('Modes');
  }

  create() {
    const { width, height } = view(this);
    background(this, 0);
    this.events.on('back', () => this.scene.start('Map'));
    button(this, 60, 56, 84, 72, '‹', () => this.scene.start('Map'), UI.grey, 40);
    text(this, width / 2, 56, app.t('modes.title'), 40);
    coinChip(this, width - 110, 56);

    const d = app.data;
    const today = todayLocal();
    const cards: Card[] = [
      {
        mode: 'daily',
        title: 'daily.title',
        desc: 'mode.daily.desc',
        color: 0x9b5de5,
        status: () => (d.daily[today] ? app.t('daily.done') : app.t('daily.play')),
        open: () => this.scene.start('Daily'),
      },
      {
        mode: 'blueprint',
        title: 'mode.blueprint',
        desc: 'mode.blueprint.desc',
        color: 0x1e5aa8,
        status: () => app.t('mode.progress', { n: Object.keys(d.blueprint.stars).length, m: app.blueprintCount || 60 }),
        open: () => this.scene.start('Blueprint'),
      },
      {
        mode: 'rush',
        title: 'mode.rush',
        desc: 'mode.rush.desc',
        color: 0xc0392b,
        status: () => app.t('mode.best', { n: d.rush.best }),
        open: () => this.scene.start('Level', { rush: true }),
      },
      {
        mode: 'zen',
        title: 'mode.zen',
        desc: 'mode.zen.desc',
        color: 0x2e8b74,
        status: () => app.t('zen.solved', { n: d.zen.solved }),
        open: () => this.scene.start('Level', { zen: true }),
      },
    ];
    const top = 140;
    const h = Math.min(220, (height - top - 40) / cards.length - 20);
    cards.forEach((c, i) => this.card(c, width / 2, top + h / 2 + i * (h + 20), width - 60, h));
  }

  private card(c: Card, x: number, y: number, w: number, h: number) {
    const unlockAt = MODE_UNLOCK[c.mode];
    const open = app.data.unlocked >= unlockAt;
    const box = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(shade(c.color, -0.5), 1).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 26);
    g.fillStyle(open ? c.color : UI.grey, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, h * 0.3, 20);
    box.add(g);
    box.add(this.icon(c.mode, -w / 2 + 80, 0, open));
    box.add(text(this, -w / 2 + 160, -h / 2 + 44, app.t(c.title), 32).setOrigin(0, 0.5));
    box.add(
      text(this, -w / 2 + 160, -4, app.t(c.desc), 21, '#eef3f8', false)
        .setOrigin(0, 0.5)
        .setWordWrapWidth(w - 190)
        .setAlign('left'),
    );
    const status = open ? c.status() : '🔒 ' + app.t('mode.unlockAt', { n: unlockAt });
    box.add(text(this, -w / 2 + 160, h / 2 - 34, status, 22, open ? '#ffe08a' : '#dddddd').setOrigin(0, 0.5));
    box.setSize(w, h).setInteractive({ useHandCursor: true });
    box.on('pointerup', () => {
      app.audio.unlock();
      app.audio.tap();
      if (!open) return toast(this, app.t('mode.unlockAt', { n: unlockAt }));
      c.open();
    });
    box.on('pointerdown', () => this.tweens.add({ targets: box, scale: 0.97, duration: 60, yoyo: true }));
  }

  /** Small drawn icon per mode. */
  private icon(mode: PlayMode, x: number, y: number, open: boolean) {
    const g = this.add.graphics({ x, y });
    g.fillStyle(0x000000, 0.25).fillCircle(0, 0, 56);
    const alpha = open ? 1 : 0.5;
    if (mode === 'daily') {
      g.fillStyle(0xffffff, alpha).fillRoundedRect(-34, -30, 68, 62, 10);
      g.fillStyle(0xe8554e, alpha).fillRoundedRect(-34, -30, 68, 18, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.fillStyle(0x333333, alpha);
      for (let k = 0; k < 6; k++) g.fillRect(-24 + (k % 3) * 18, -2 + Math.floor(k / 3) * 16, 10, 10);
    } else if (mode === 'blueprint') {
      g.fillStyle(0x0f3d78, alpha).fillRoundedRect(-36, -36, 72, 72, 8);
      g.lineStyle(2, 0xffffff, 0.5 * alpha);
      for (let k = -24; k <= 24; k += 12) g.lineBetween(k, -36, k, 36);
      [2, 1, 3, 0].forEach((c, k) => g.fillStyle(NUT_COLORS[c], alpha).fillRect(-18, 18 - k * 14, 36, 11));
    } else if (mode === 'rush') {
      g.fillStyle(0xffffff, alpha).fillCircle(0, 4, 34);
      g.fillStyle(0xc0392b, alpha).fillRect(-8, -40, 16, 10);
      g.lineStyle(5, 0x222222, alpha).lineBetween(0, 4, 0, -20).lineBetween(0, 4, 16, 12);
    } else {
      g.fillStyle(0xa8e6cf, alpha).fillEllipse(-14, -6, 40, 22).fillEllipse(16, 6, 40, 22);
      g.fillStyle(0xffffff, 0.8 * alpha).fillCircle(0, -28, 6);
    }
    return g;
  }
}
