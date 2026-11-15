import Phaser from 'phaser';
import { todayLocal } from '@bolt-sort/services';
import { app } from '../app';
import { UI } from '../theme';
import { background, button, text } from '../ui';

/** Daily Challenge: one level per day, the same for every player, with a monthly calendar. */
export class DailyScene extends Phaser.Scene {
  constructor() {
    super('Daily');
  }

  create() {
    const { width, height } = this.scale;
    background(this, 0);
    this.events.on('back', () => this.scene.start('Modes'));
    button(this, 60, 56, 84, 72, '‹', () => this.scene.start('Modes'), UI.grey, 40);
    text(this, width / 2, 56, app.t('daily.title'), 40);

    const today = todayLocal();
    const [y, m] = today.split('-').map(Number);
    const monthName = new Date(y, m - 1, 1).toLocaleString(app.data.settings.language === 'hi' ? 'hi-IN' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
    text(this, width / 2, 150, monthName, 30, '#f3c14b');
    const days = new Date(y, m, 0).getDate();
    const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday first
    const cell = 88;
    const left = width / 2 - cell * 3.5 + cell / 2;
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => text(this, left + i * cell, 210, d, 22, UI.textDim));
    let done = 0;
    for (let d = 1; d <= days; d++) {
      const idx = firstDow + d - 1;
      const cx = left + (idx % 7) * cell;
      const cy = 270 + Math.floor(idx / 7) * cell;
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = app.data.daily[key];
      if (rec) done++;
      const isToday = key === today;
      const g = this.add.graphics();
      g.fillStyle(rec ? UI.green : isToday ? 0x9b5de5 : UI.panelLight, rec || isToday ? 1 : 0.7);
      g.fillRoundedRect(cx - cell / 2 + 5, cy - cell / 2 + 5, cell - 10, cell - 10, 14);
      if (isToday)
        g.lineStyle(4, 0xffffff, 1).strokeRoundedRect(cx - cell / 2 + 5, cy - cell / 2 + 5, cell - 10, cell - 10, 14);
      text(this, cx, cy - 8, String(d), 24, key > today ? UI.textDim : '#ffffff');
      if (rec) text(this, cx, cy + 20, '★'.repeat(rec.stars), 14, '#f3c14b');
    }
    const trophyY = 270 + 6 * cell + 10;
    const won = done >= 20;
    text(
      this,
      width / 2,
      trophyY,
      (won ? '🏆 ' : '') + app.t('daily.trophy', { n: done }),
      26,
      won ? '#f3c14b' : UI.textDim,
    );
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.4).fillRoundedRect(width / 2 - 250, trophyY + 30, 500, 22, 11);
    bar.fillStyle(UI.gold, 1).fillRoundedRect(width / 2 - 250, trophyY + 30, 500 * Math.min(1, done / 20), 22, 11);

    const playedToday = !!app.data.daily[today];
    const playY = Math.min(height - 180, trophyY + 160);
    button(
      this,
      width / 2,
      playY,
      420,
      110,
      playedToday ? app.t('btn.retry') : app.t('daily.play'),
      () => {
        const loading = text(this, width / 2, playY - 100, '…', 30);
        // Generating the daily level takes a moment; let the frame render first.
        this.time.delayedCall(30, () => {
          loading.destroy();
          this.scene.start('Level', { daily: today });
        });
      },
      playedToday ? UI.blue : 0x9b5de5,
      36,
    );
    if (playedToday) text(this, width / 2, playY + 90, app.t('daily.done'), 26, '#7cf29c');
  }
}
