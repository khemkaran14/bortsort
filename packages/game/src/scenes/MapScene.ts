import Phaser from 'phaser';
import { CHEST_STARS } from '@bolt-sort/core';
import { checkIn, todayLocal } from '@bolt-sort/services';
import { app } from '../app';
import { STAGE_LOOKS, UI, hex, shade } from '../theme';
import { background, button, coinChip, dim, panel, text, toast } from '../ui';

const COLS = 5;
const ROW_H = 128;
const HEADER_H = 190;
const CHEST_H = 200;
const TOP = 150;

let streakCheckedThisSession = false;

/** Scrolling world map of stages and levels. */
export class MapScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private bands: { stage: number; y: number; h: number; built: boolean; container?: Phaser.GameObjects.Container }[] =
    [];
  private velocity = 0;
  private dragging = false;
  private dragMoved = 0;
  private coins!: ReturnType<typeof coinChip>;

  constructor() {
    super('Map');
  }

  create() {
    const { width, height } = this.scale;
    this.bands = [];
    this.velocity = 0;
    const current = app.data.unlocked;
    const curStage = app.index.stages.find((s) => current >= s.first && current < s.first + s.levels)?.stage ?? 1;
    background(this, curStage).setScrollFactor(0);
    app.audio.startMusic(curStage);

    this.content = this.add.container(0, 0);
    let y = TOP;
    for (const s of app.index.stages) {
      const rows = Math.ceil(s.levels / COLS);
      const h = HEADER_H + rows * ROW_H + CHEST_H;
      this.bands.push({ stage: s.stage, y, h, built: false });
      y += h;
    }
    // "More levels coming soon" at the end.
    const endY = y;
    this.content.add(text(this, width / 2, endY + 80, app.t('comingSoon'), 30, UI.textDim));
    y += 220;
    this.maxScroll = Math.max(0, y - height + 140);

    // Scroll so the current level is in view.
    const pos = this.levelPos(Math.min(current, app.totalLevels));
    this.scrollY = Phaser.Math.Clamp(pos.y - height * 0.55, 0, this.maxScroll);
    this.applyScroll();

    this.header();
    this.input.on('pointerdown', () => {
      this.dragging = true;
      this.dragMoved = 0;
      this.velocity = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const dy = p.position.y - p.prevPosition.y;
      this.dragMoved += Math.abs(dy);
      this.scrollY = Phaser.Math.Clamp(this.scrollY - dy, 0, this.maxScroll);
      this.velocity = -dy;
      this.applyScroll();
    });
    this.input.on('pointerup', () => (this.dragging = false));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScroll);
      this.applyScroll();
    });
    this.events.on('back', () => {});

    if (!streakCheckedThisSession) {
      streakCheckedThisSession = true;
      this.time.delayedCall(400, () => this.dailyStreak());
    }
  }

  override update(_t: number, dt: number) {
    if (!this.dragging && Math.abs(this.velocity) > 0.5) {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + this.velocity * (dt / 16), 0, this.maxScroll);
      this.velocity *= 0.92;
      this.applyScroll();
    }
  }

  private applyScroll() {
    this.content.y = -this.scrollY;
    const { height } = this.scale;
    // Build stage bands lazily as they come into view (keeps 500 levels light on low-end phones).
    for (const b of this.bands) {
      const visible = b.y + b.h > this.scrollY - 400 && b.y < this.scrollY + height + 400;
      if (visible && !b.built) this.buildBand(b);
      if (b.container) b.container.setVisible(visible);
    }
  }

  levelPos(id: number) {
    const s = app.index.stages.find((x) => id >= x.first && id < x.first + x.levels) ?? app.index.stages[0];
    const band = this.bands.find((b) => b.stage === s.stage)!;
    const i = id - s.first;
    const row = Math.floor(i / COLS);
    let col = i % COLS;
    if (row % 2 === 1) col = COLS - 1 - col; // snake path
    const w = this.scale.width;
    const x = 90 + col * ((w - 180) / (COLS - 1));
    return { x, y: band.y + HEADER_H + row * ROW_H + ROW_H / 2 };
  }

  private buildBand(b: (typeof this.bands)[number]) {
    b.built = true;
    const { width } = this.scale;
    const c = this.add.container(0, 0);
    this.content.add(c);
    b.container = c;
    const meta = app.index.stages.find((s) => s.stage === b.stage)!;
    const look = STAGE_LOOKS[b.stage];
    const open = app.data.unlocked >= meta.first;

    const g = this.add.graphics();
    g.fillStyle(look.top, 0.85).fillRoundedRect(20, b.y + 20, width - 40, b.h - 40, 36);
    g.lineStyle(4, look.accent, 0.5).strokeRoundedRect(20, b.y + 20, width - 40, b.h - 40, 36);
    c.add(g);
    c.add(text(this, width / 2, b.y + 70, app.t('stage', { n: b.stage }), 24, hex(look.accent)));
    c.add(text(this, width / 2, b.y + 112, meta.theme, 40));
    const stars = app.starsInStage(b.stage);
    c.add(text(this, width / 2, b.y + 156, `★ ${stars} / ${meta.levels * 3}`, 24, '#f3c14b'));

    // Path between nodes.
    const path = this.add.graphics();
    path.lineStyle(10, 0x000000, 0.25);
    for (let id = meta.first; id < meta.first + meta.levels - 1; id++) {
      const a = this.levelPos(id);
      const z = this.levelPos(id + 1);
      path.lineBetween(a.x, a.y, z.x, z.y);
    }
    c.add(path);

    for (let id = meta.first; id < meta.first + meta.levels; id++) c.add(this.levelNode(id));

    // Stage chest.
    const chestY = b.y + b.h - CHEST_H / 2 - 20;
    const opened = app.data.chestsOpened.includes(b.stage);
    const chest = this.add
      .image(width / 2 - 90, chestY, 'chest')
      .setScale(1.1)
      .setAlpha(opened ? 0.45 : 1);
    c.add(chest);
    const label = opened ? '✓' : stars >= CHEST_STARS ? app.t('chest.open') : app.t('chest.need', { n: stars });
    c.add(text(this, width / 2 + 70, chestY, label, 26, stars >= CHEST_STARS && !opened ? '#f3c14b' : UI.textDim));
    if (!opened && stars >= CHEST_STARS) {
      this.tweens.add({ targets: chest, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 300 });
      chest.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openChest(b.stage));
    }

    if (!open) {
      const lockG = this.add.graphics();
      lockG.fillStyle(0x000000, 0.45).fillRoundedRect(20, b.y + 20, width - 40, b.h - 40, 36);
      c.add(lockG);
      c.add(this.add.image(width / 2, b.y + 260, 'lock').setScale(1.6));
      c.add(text(this, width / 2, b.y + 340, app.t('locked'), 30, UI.textDim));
    }
  }

  private levelNode(id: number) {
    const { x, y } = this.levelPos(id);
    const meta = app.index.stages.find((s) => id >= s.first && id < s.first + s.levels)!;
    const slot = ((id - meta.first) % 10) + 1;
    const boss = slot === 10;
    const hard = slot === 8;
    const unlocked = id <= app.data.unlocked;
    const current = id === app.data.unlocked;
    const stars = app.data.stars[id] ?? 0;
    const r = boss ? 50 : 42;
    const c = this.add.container(x, y);
    const look = STAGE_LOOKS[meta.stage];
    const col = !unlocked ? 0x4a5560 : boss ? 0xc0392b : hard ? 0xe67e22 : current ? look.accent : 0x3d8bf2;
    const g = this.add.graphics();
    g.fillStyle(shade(col, -0.45), 1).fillCircle(0, 6, r);
    g.fillStyle(col, 1).fillCircle(0, 0, r);
    g.fillStyle(0xffffff, 0.2).fillCircle(-r * 0.25, -r * 0.3, r * 0.45);
    c.add(g);
    if (unlocked) c.add(text(this, 0, -2, String(id), id > 99 ? 26 : 30, current ? '#1d2b3a' : '#ffffff'));
    else c.add(this.add.image(0, 0, 'lock').setScale(0.55));
    if (boss) c.add(text(this, 0, -r - 14, 'BOSS', 18, '#ffd166'));
    if (stars > 0) {
      for (let k = 0; k < 3; k++) {
        c.add(
          this.add
            .image(-26 + k * 26, r + 6, 'star')
            .setScale(0.38)
            .setTint(k < stars ? 0xf3c14b : 0x2b3540),
        );
      }
    }
    if (current) this.tweens.add({ targets: c, scale: 1.1, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
    if (unlocked) {
      c.setSize(r * 2, r * 2).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        if (this.dragMoved > 12) return;
        app.audio.unlock();
        app.audio.tap();
        this.scene.start('Level', { id });
      });
    }
    return c;
  }

  private header() {
    const { width } = this.scale;
    const bar = this.add.graphics().setScrollFactor(0).setDepth(10);
    bar.fillStyle(0x0f1923, 0.92).fillRect(0, 0, width, 120);
    button(this, 46, 60, 72, 72, '⌂', () => this.scene.start('GameSelect'), UI.grey, 34)
      .setScrollFactor(0)
      .setDepth(11);
    const coins = coinChip(this, 172, 60);
    coins.container.setScrollFactor(0).setDepth(11);
    this.coins = coins;
    text(this, 300, 60, `★ ${app.totalStars()}`, 26, '#f3c14b').setScrollFactor(0).setDepth(11);
    const mk = (x: number, label: string, scene: string, color: number) =>
      button(this, x, 60, 110, 72, label, () => this.scene.start(scene), color, 21)
        .setScrollFactor(0)
        .setDepth(11);
    const today = todayLocal();
    const modes = mk(412, app.t('menu.modes'), 'Modes', 0x9b5de5);
    if (!app.data.daily[today]) modes.setBadge('!');
    mk(532, app.t('menu.shop'), 'Shop', UI.green);
    mk(650, '⚙', 'Settings', UI.grey);
  }

  private openChest(stage: number) {
    app.data.chestsOpened.push(stage);
    const skins = ['wood', 'candy', 'neon', 'brass', 'gems'];
    const skin = skins.find((s) => !app.data.skins.owned.includes(s));
    app.addCoins(200, 'stage_chest');
    if (skin) app.data.skins.owned.push(skin);
    void app.save.save();
    app.audio.win();
    toast(this, `+200 coins${skin ? ` + ${skin} skin` : ''}`);
    this.time.delayedCall(1200, () => this.scene.restart());
  }

  private dailyStreak() {
    const r = checkIn(app.data.streak, todayLocal());
    if (!r) return;
    app.data.streak = r.streak;
    let label = '';
    const rw = r.reward;
    if ('coins' in rw) {
      app.addCoins(rw.coins, 'streak');
      label = `${rw.coins} coins`;
    } else if ('booster' in rw) {
      app.data.boosters[rw.booster]++;
      label =
        rw.booster === 'hint'
          ? app.t('shop.hint')
          : rw.booster === 'undo'
            ? app.t('btn.undo')
            : app.t('shop.extraBolt');
      if (rw.booster === 'undo') app.data.boosters.undo += 4;
    } else {
      if (!app.data.skins.owned.includes(rw.skin)) app.data.skins.owned.push(rw.skin);
      else app.addCoins(100, 'streak');
      label = `${rw.skin} skin`;
    }
    app.analytics.log({ name: 'streak_day', day: r.streak.day });
    void app.save.save();
    void app.notifications.scheduleDaily({
      daily: app.data.settings.notifications.daily,
      streak: app.data.settings.notifications.streak,
      streakDay: r.streak.day,
      lang: app.data.settings.language,
    });

    const { width, height } = this.scale;
    const layer = this.add.container(0, 0).setDepth(100).setScrollFactor(0);
    layer.add(dim(this));
    layer.add(panel(this, width / 2, height / 2, 600, 560));
    layer.add(text(this, width / 2, height / 2 - 210, app.t('streak', { n: r.streak.day }), 40, '#f3c14b'));
    for (let d = 1; d <= 7; d++) {
      const x = width / 2 - 240 + (d - 1) * 80;
      const done = d <= r.streak.day;
      const g = this.add.graphics();
      g.fillStyle(done ? UI.green : UI.panelLight, 1).fillRoundedRect(x - 34, height / 2 - 140, 68, 90, 14);
      layer.add(g);
      layer.add(text(this, x, height / 2 - 112, String(d), 26));
      layer.add(text(this, x, height / 2 - 74, d === 7 ? '🎁' : done ? '✓' : '·', 26));
    }
    layer.add(text(this, width / 2, height / 2 + 10, app.t('streak.reward', { r: label }), 30));
    if (r.usedFreeze) layer.add(text(this, width / 2, height / 2 + 60, '❄ Streak freeze used', 24, UI.textDim));
    layer.add(
      button(
        this,
        width / 2,
        height / 2 + 180,
        260,
        90,
        'OK',
        () => {
          app.audio.coin();
          layer.destroy();
          this.coins.refresh();
        },
        UI.green,
      ),
    );
  }
}
