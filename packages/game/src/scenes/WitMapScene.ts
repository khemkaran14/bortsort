import Phaser from 'phaser';
import { HD, RES, view } from '../view';
import { nodeTexture } from '../textures';
import { app } from '../app';
import { UI } from '../theme';
import { WIT_LEVELS } from '../wit/levels';
import { background, button, coinChip, text } from '../ui';

/** Wit Twist level picker: 50 puzzles, each opens after the one before. */
export class WitMapScene extends Phaser.Scene {
  private moved = 0;

  constructor() {
    super('WitMap');
  }

  create() {
    const { width, height } = view(this);
    background(this, 30);
    app.audio.startMusic(7);
    this.events.on('back', () => this.scene.start('GameSelect'));
    const d = app.data.wit;
    const cols = 5;
    const rowH = 120;
    const top = 250;
    const content = this.add.container(0, 0);
    WIT_LEVELS.forEach((_, idx) => {
      const n = idx + 1;
      const x = 90 + (idx % cols) * ((width - 180) / (cols - 1));
      const y = top + Math.floor(idx / cols) * rowH;
      const open = n <= d.unlocked;
      const done = !!d.solved[n];
      const cur = n === d.unlocked && !done;
      const node = this.add.container(x, y);
      const col = !open ? 0x4a5560 : done ? 0x3cb371 : cur ? 0xffd166 : 0x8e4fc0;
      node.add(
        this.add
          .image(0, 0, nodeTexture(this, col))
          .setOrigin(0.5, 48 / 104)
          .setScale(46 / 44 / HD),
      );
      node.add(text(this, 0, -2, open ? String(n) : '🔒', 30, cur ? '#4a2c6e' : '#ffffff'));
      if (done) node.add(text(this, 30, 30, '✓', 22, '#ffffff'));
      if (cur) this.tweens.add({ targets: node, scale: 1.1, yoyo: true, repeat: -1, duration: 600 });
      content.add(node);
      if (open) {
        node.setSize(92, 92).setInteractive({ useHandCursor: true });
        node.on('pointerup', () => {
          if (this.moved > 12) return;
          app.audio.unlock();
          app.audio.tap();
          this.scene.start('WitLevel', { n });
        });
      }
    });
    const contentH = top + Math.ceil(WIT_LEVELS.length / cols) * rowH;
    const maxScroll = Math.max(0, contentH - height + 60);
    let scroll = Phaser.Math.Clamp(Math.floor((d.unlocked - 1) / cols) * rowH - height / 2 + top, 0, maxScroll);
    content.y = -scroll;
    this.input.on('pointerdown', () => (this.moved = 0));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dy = (p.position.y - p.prevPosition.y) / RES;
      this.moved += Math.abs(dy);
      scroll = Phaser.Math.Clamp(scroll - dy, 0, maxScroll);
      content.y = -scroll;
    });

    const bar = this.add.graphics();
    bar.fillStyle(0x1d1033, 0.95).fillRect(0, 0, width, 190);
    button(this, 60, 56, 84, 72, '‹', () => this.scene.start('GameSelect'), UI.grey, 40);
    text(this, width / 2, 56, app.t('game.wit'), 42, '#ffd166');
    coinChip(this, width - 110, 56);
    const solved = Object.keys(d.solved).length;
    text(this, width / 2, 140, app.t('wit.progress', { n: solved, m: WIT_LEVELS.length }), 26, UI.textDim);
  }
}
