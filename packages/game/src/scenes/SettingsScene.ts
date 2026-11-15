import Phaser from 'phaser';
import type { TextKey } from '@bolt-sort/services';
import { app } from '../app';
import { UI } from '../theme';
import { background, button, confirm, text } from '../ui';

type Toggle = 'music' | 'sfx' | 'haptics' | 'colorBlind' | 'dragDrop';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    const { width, height } = this.scale;
    background(this, 1);
    this.events.on('back', () => this.scene.start('Map'));
    button(this, 60, 56, 84, 72, '‹', () => this.scene.start('Map'), UI.grey, 40);
    text(this, width / 2, 56, app.t('settings.title'), 40);
    const s = app.data.settings;
    const rows: { key: Toggle | 'notifications'; label: TextKey }[] = [
      { key: 'music', label: 'settings.music' },
      { key: 'sfx', label: 'settings.sfx' },
      { key: 'haptics', label: 'settings.haptics' },
      { key: 'colorBlind', label: 'settings.colorBlind' },
      { key: 'dragDrop', label: 'settings.drag' },
      { key: 'notifications', label: 'settings.notifications' },
    ];
    rows.forEach((r, i) => {
      const y = 180 + i * 100;
      const g = this.add.graphics();
      g.fillStyle(UI.panelLight, 0.9).fillRoundedRect(30, y - 40, width - 60, 80, 18);
      text(this, 60, y, app.t(r.label), 26).setOrigin(0, 0.5);
      const get = () => (r.key === 'notifications' ? s.notifications.daily : s[r.key]);
      const b = button(
        this,
        width - 120,
        y,
        150,
        60,
        get() ? app.t('on') : app.t('off'),
        () => {
          if (r.key === 'notifications') {
            s.notifications.daily = !s.notifications.daily;
            s.notifications.streak = s.notifications.daily;
          } else s[r.key] = !s[r.key];
          app.applySettings();
          if (r.key === 'music') {
            if (s.music) app.audio.startMusic(1);
            else app.audio.stopMusic();
          }
          void app.save.save();
          b.setLabel(get() ? app.t('on') : app.t('off'));
          b.setAlpha(get() ? 1 : 0.6);
        },
        UI.green,
        22,
      );
      b.setAlpha(get() ? 1 : 0.6);
    });
    const ly = 180 + rows.length * 100;
    const g = this.add.graphics();
    g.fillStyle(UI.panelLight, 0.9).fillRoundedRect(30, ly - 40, width - 60, 80, 18);
    text(this, 60, ly, app.t('settings.language'), 26).setOrigin(0, 0.5);
    button(this, width - 240, ly, 110, 60, 'EN', () => this.lang('en'), s.language === 'en' ? UI.blue : UI.grey, 22);
    button(this, width - 110, ly, 120, 60, 'हिंदी', () => this.lang('hi'), s.language === 'hi' ? UI.blue : UI.grey, 22);

    button(
      this,
      width / 2,
      ly + 140,
      360,
      80,
      app.t('settings.reset'),
      () => {
        confirm(this, app.t('settings.reset'), '?', app.t('settings.reset'), async () => {
          await app.save.reset();
          app.applySettings();
          this.scene.start('Map');
        });
      },
      UI.red,
      24,
    );
    text(this, width / 2, height - 60, 'Bolt Sort v0.1.0', 20, UI.textDim, false);
  }

  private lang(l: 'en' | 'hi') {
    app.data.settings.language = l;
    void app.save.save();
    this.scene.restart();
  }
}
