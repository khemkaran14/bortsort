import Phaser from 'phaser';
import { view } from '../view';
import type { TextKey } from '@bolt-sort/services';
import { app } from '../app';
import { NUT_COLORS, UI, shade } from '../theme';
import { WIT_LEVELS } from '../wit/levels';
import { background, button, coinChip, text } from '../ui';

/** First screen: pick Nutwise or Wit Twist. Coins are shared between both games. */
export class GameSelectScene extends Phaser.Scene {
  constructor() {
    super('GameSelect');
  }

  create() {
    const { width, height } = view(this);
    background(this, 30);
    this.events.on('back', () => {});
    text(this, width / 2, 80, app.t('game.choose'), 42);
    coinChip(this, app.api.enabled ? width - 130 : width / 2, 150);
    button(this, width - 60, 70, 84, 72, '⚙', () => this.scene.start('Settings', { from: 'GameSelect' }), UI.grey, 30);
    // Account: login is optional; offered once on the first launch.
    if (app.api.enabled) {
      const acc = app.account;
      button(
        this,
        130,
        150,
        220,
        64,
        acc.loggedIn ? '👤 ' + acc.label.slice(-6) : '👤 ' + app.t('account.login'),
        () => this.scene.start(acc.loggedIn ? 'Account' : 'Login', { from: 'GameSelect' }),
        acc.loggedIn ? UI.panelLight : UI.blue,
        22,
      );
      if (!acc.loggedIn && !app.data.loginPrompted) {
        this.time.delayedCall(300, () => this.scene.start('Login', { from: 'GameSelect' }));
      }
    }

    const h = Math.min(420, (height - 260) / 2 - 30);
    const top = 210;
    const d = app.data;
    this.card(
      'bolt',
      width / 2,
      top + h / 2,
      width - 60,
      h,
      app.t('app.title'),
      app.t('game.bolt.desc'),
      0x2a5d8f,
      app.t('level', { n: d.unlocked }),
      () => {
        d.lastGame = 'bolt';
        void app.save.save();
        // A brand-new player goes straight into the first tutorial level.
        if (!d.tutorialDone && d.unlocked === 1) this.scene.start('Level', { id: 1 });
        else this.scene.start('Map');
      },
    );
    const solved = Object.keys(d.wit.solved).length;
    this.card(
      'wit',
      width / 2,
      top + h * 1.5 + 30,
      width - 60,
      h,
      app.t('game.wit'),
      app.t('game.wit.desc'),
      0x7b3fa0,
      app.t('wit.progress', { n: solved, m: WIT_LEVELS.length }),
      () => {
        d.lastGame = 'wit';
        void app.save.save();
        this.scene.start('WitMap');
      },
    );
  }

  private card(
    kind: 'bolt' | 'wit',
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    desc: string,
    color: number,
    status: string,
    open: () => void,
  ) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(shade(color, -0.5), 1).fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 32);
    g.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 32);
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(-w / 2 + 10, -h / 2 + 8, w - 20, h * 0.25, 24);
    if (app.data.lastGame === kind) g.lineStyle(5, 0xffd166, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 32);
    c.add(g);
    // Artwork drawn in code.
    const art = this.add.graphics();
    if (kind === 'bolt') {
      [0, 1, 2].forEach((b) => {
        const bx = -w / 2 + 90 + b * 80;
        art.fillStyle(0xaab4be, 1).fillRect(bx - 6, -60, 12, 150);
        art.fillStyle(0x6b7785, 1).fillRoundedRect(bx - 34, 86, 68, 14, 6);
        for (let k = 0; k < 3; k++) {
          art.fillStyle(NUT_COLORS[(b + k * 2) % 4], 1).fillRoundedRect(bx - 32, 52 - k * 34, 64, 30, 8);
        }
      });
    } else {
      art.fillStyle(0xffffff, 1).fillCircle(-w / 2 + 160, 0, 90);
      c.add(art);
      c.add(
        this.add
          .text(-w / 2 + 160, 0, '🧠', {
            fontSize: '110px',
            fontFamily: '"Noto Color Emoji", "Apple Color Emoji", sans-serif',
          })
          .setOrigin(0.5),
      );
      c.add(
        this.add
          .text(-w / 2 + 230, -70, '?', { fontSize: '64px', fontFamily: UI.font, color: '#ffd166', fontStyle: 'bold' })
          .setOrigin(0.5)
          .setAngle(15),
      );
    }
    if (kind === 'bolt') c.add(art);
    const tx = -w / 2 + 300;
    c.add(text(this, tx, -h / 2 + 70, title, 44).setOrigin(0, 0.5));
    c.add(
      text(this, tx, -10, desc, 24, '#eef3f8', false)
        .setOrigin(0, 0.5)
        .setWordWrapWidth(w - 330)
        .setAlign('left'),
    );
    c.add(text(this, tx, h / 2 - 60, status, 24, '#ffe08a').setOrigin(0, 0.5));
    const play = button(this, w / 2 - 110, h / 2 - 60, 160, 70, app.t('btn.play' as TextKey), open, UI.green, 26);
    c.add(play);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      app.audio.unlock();
      app.audio.tap();
      open();
    });
  }
}
