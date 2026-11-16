import Phaser from 'phaser';
import { RES, view } from '../view';
import { app } from '../app';
import { UI } from '../theme';
import { background, button, text } from '../ui';

/** Level picker for Blueprint mode (60 levels, opened one after another). */
export class BlueprintScene extends Phaser.Scene {
  constructor() {
    super('Blueprint');
  }

  create() {
    const { width, height } = view(this);
    background(this, 20);
    this.events.on('back', () => this.scene.start('Modes'));
    const count = app.blueprintCount;
    const d = app.data.blueprint;
    const cols = 5;
    const rowH = 118;
    const top = 220;
    const content = this.add.container(0, 0);
    for (let i = 1; i <= count; i++) {
      const r = Math.floor((i - 1) / cols);
      const c = (i - 1) % cols;
      const x = 90 + c * ((width - 180) / (cols - 1));
      const y = top + r * rowH;
      const open = i <= d.unlocked;
      const stars = d.stars[i] ?? 0;
      const boss = i % 10 === 0;
      const node = this.add.container(x, y);
      const g = this.add.graphics();
      const col = !open ? 0x4a5560 : boss ? 0xc0392b : i === d.unlocked ? 0xffd166 : 0x0f3d78;
      g.fillStyle(0x000000, 0.3).fillRoundedRect(-44, -38, 88, 84, 14);
      g.fillStyle(col, 1).fillRoundedRect(-44, -44, 88, 84, 14);
      g.lineStyle(3, 0xffffff, 0.8).strokeRoundedRect(-44, -44, 88, 84, 14);
      node.add(g);
      node.add(text(this, 0, -8, open ? String(i) : '🔒', 28, i === d.unlocked ? '#0f3d78' : '#ffffff'));
      if (stars) node.add(text(this, 0, 24, '★'.repeat(stars), 16, '#f3c14b'));
      content.add(node);
      if (open) {
        node.setSize(88, 84).setInteractive({ useHandCursor: true });
        node.on('pointerup', () => {
          if (this.moved > 12) return;
          app.audio.unlock();
          app.audio.tap();
          this.scene.start('Level', { blueprint: i });
        });
      }
    }
    // Simple drag scrolling.
    const contentH = top + Math.ceil(count / cols) * rowH;
    const maxScroll = Math.max(0, contentH - height + 60);
    const cur = Math.floor((d.unlocked - 1) / cols) * rowH;
    let scroll = Math.min(maxScroll, Math.max(0, cur - height / 2 + top));
    content.y = -scroll;
    this.input.on('pointerdown', () => (this.moved = 0));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dy = (p.position.y - p.prevPosition.y) / RES;
      this.moved += Math.abs(dy);
      scroll = Phaser.Math.Clamp(scroll - dy, 0, maxScroll);
      content.y = -scroll;
    });

    // Header on top of the scrolling grid.
    const bar = this.add.graphics();
    bar.fillStyle(0x0f2a52, 0.95).fillRect(0, 0, width, 170);
    button(this, 60, 56, 84, 72, '‹', () => this.scene.start('Modes'), UI.grey, 40);
    text(this, width / 2, 56, app.t('mode.blueprint'), 40);
    text(this, width / 2, 124, app.t('mode.blueprint.desc'), 22, '#cfe3ff', false).setWordWrapWidth(width - 80);
  }

  private moved = 0;
}
