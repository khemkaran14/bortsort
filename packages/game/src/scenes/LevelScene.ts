import Phaser from 'phaser';
import {
  BOOSTERS,
  addExtraBolt,
  applyMove,
  coinsFor,
  createState,
  dailyLevel,
  dropCount,
  freeUndos,
  hint,
  isComplete,
  isFrozen,
  isOpen,
  liftGroup,
  quickLevel,
  RUSH,
  rushConfig,
  rushPoints,
  Rng,
  status,
  zenConfig,
  starsFor,
  type GameState,
  type LevelDef,
  type Move,
} from '@bolt-sort/core';
import type { TextKey } from '@bolt-sort/services';
import { app } from '../app';
import { NUT_COLORS, UI } from '../theme';
import { background, button, coinChip, confirm, dim, panel, text, toast, type Button } from '../ui';

interface LevelData {
  id?: number;
  daily?: string;
  /** Blueprint level number (1-based). */
  blueprint?: number;
  rush?: boolean;
  zen?: boolean;
}

type Mode = 'stage' | 'daily' | 'blueprint' | 'rush' | 'zen';

/** Background looks for the modes (see STAGE_LOOKS). */
const MODE_LOOK: Record<Mode, number> = { stage: 1, daily: 0, blueprint: 20, rush: 21, zen: 22 };

interface BoltLayout {
  x: number;
  baseY: number;
  nutW: number;
  nutH: number;
  rodTop: number;
  liftY: number;
  slotW: number;
  rowH: number;
}

const HUD_H = 200;
const BAR_H = 120;
/** Space kept free at the bottom for an optional banner ad later. */
const BANNER_H = 100;

export class LevelScene extends Phaser.Scene {
  private level!: LevelDef;
  private daily: string | null = null;
  private state!: GameState;
  private history: GameState[] = [];
  private selected: number | null = null;
  private busy = false;
  private overlay: Phaser.GameObjects.Container | null = null;
  private board!: Phaser.GameObjects.Container;
  private layout: BoltLayout[] = [];
  private nutSprites: Phaser.GameObjects.Container[][] = [];
  private movesText!: Phaser.GameObjects.Text;
  private undoBtn!: Button;
  private hintBtn: Button | null = null;
  private boltBtn: Button | null = null;
  private revealBtn: Button | null = null;
  private coins!: ReturnType<typeof coinChip>;
  private undosUsed = 0;
  private hintsUsed = 0;
  private extraBolts = 0;
  private revealUntil = -1;
  private startTime = 0;
  private downBolt: number | null = null;
  private hintMarks: Phaser.GameObjects.GameObject[] = [];
  private tutorialHand: Phaser.GameObjects.Image | null = null;
  private banner: Phaser.GameObjects.Container | null = null;
  private chainTags = new Map<number, string>();
  private mode: Mode = 'stage';
  private modeIndex = 0;
  private bestText: Phaser.GameObjects.Text | null = null;
  private skipBtn: Button | null = null;
  // Rush
  private rushEnd = 0;
  private rushScore = 0;
  private rushSolved = 0;
  private rushCombo = 0;
  private lastSolveAt = 0;
  private rushOverShown = false;
  private paused = false;
  private timerText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Level');
  }

  init(data: LevelData) {
    this.daily = data.daily ?? null;
    this.mode = data.daily ? 'daily' : data.blueprint ? 'blueprint' : data.rush ? 'rush' : data.zen ? 'zen' : 'stage';
    this.modeIndex = data.blueprint ?? 0;
    this.rushScore = 0;
    this.rushSolved = 0;
    this.rushCombo = 0;
    this.rushOverShown = false;
    this.paused = false;
    this.timerText = null;
    this.bestText = null;
    this.skipBtn = null;
    this.revealBtn = null;
    this.hintBtn = null;
    this.boltBtn = null;
    this.history = [];
    this.selected = null;
    this.busy = false;
    this.overlay = null;
    this.undosUsed = 0;
    this.hintsUsed = 0;
    this.extraBolts = 0;
    this.revealUntil = -1;
    this.hintMarks = [];
    this.tutorialHand = null;
    this.banner = null;
    this.downBolt = null;
    this.registry.set('levelId', data.id ?? 1);
  }

  /** The level to play for the current mode (Rush and Zen make a new one on the phone). */
  private async makeLevel(): Promise<LevelDef | null> {
    switch (this.mode) {
      case 'daily':
        return dailyLevel(this.daily!);
      case 'blueprint':
        return app.blueprintLevel(this.modeIndex);
      case 'rush':
        return quickLevel(rushConfig(this.rushSolved), (Date.now() ^ (this.rushSolved * 7919)) >>> 0);
      case 'zen': {
        const seed = (Date.now() ^ (app.data.zen.solved * 104729)) >>> 0;
        return quickLevel(zenConfig(app.data.zen.solved, new Rng(seed)), seed);
      }
      default:
        return app.level(this.registry.get('levelId') as number);
    }
  }

  /** Reset everything that belongs to one puzzle. */
  private setupLevel(lvl: LevelDef) {
    this.level = lvl;
    this.state = createState(lvl);
    this.history = [];
    this.selected = null;
    this.undosUsed = 0;
    this.hintsUsed = 0;
    this.extraBolts = 0;
    this.revealUntil = -1;
    this.chainTags.clear();
    let tag = 0;
    lvl.bolts.forEach((b) => {
      if (b.chain !== undefined && !this.chainTags.has(b.chain))
        this.chainTags.set(b.chain, String.fromCharCode(65 + tag++));
    });
    this.startTime = Date.now();
  }

  /** Rush and Zen: load the next puzzle without leaving the screen. */
  private async nextPuzzle() {
    const lvl = await this.makeLevel();
    if (!lvl) return;
    this.closeOverlay();
    this.setupLevel(lvl);
    this.bestText?.setText(app.t('best', { n: lvl.best }));
    this.busy = false;
    this.render();
  }

  async create() {
    const lvl = await this.makeLevel();
    if (!lvl) {
      this.scene.start('Map');
      return;
    }
    this.setupLevel(lvl);
    const look = this.mode === 'stage' ? lvl.stage : MODE_LOOK[this.mode];
    background(this, look);
    app.audio.startMusic(this.mode === 'stage' ? lvl.stage : look);
    this.board = this.add.container(0, 0);
    this.hud();
    this.bar();
    if (this.mode === 'rush') {
      this.rushEnd = Date.now() + RUSH.seconds * 1000;
      this.lastSolveAt = Date.now();
    }
    this.render();
    app.analytics.log({ name: 'level_start', level: lvl.id });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
    this.events.on('back', () => {
      if (this.overlay) this.closeOverlay();
      else this.quitToMap();
    });
    this.introTips();
    if (location.search.includes('debug'))
      (this as unknown as { __hint: () => Move | null }).__hint = () => hint(this.state);
  }

  // ---------- layout & drawing ----------

  private computeLayout() {
    const { width, height } = this.scale;
    const n = this.state.bolts.length;
    const maxCap = Math.max(...this.state.bolts.map((b) => b.cap));
    const rows = n <= 5 ? 1 : n <= 10 ? 2 : 3;
    const perRow = Math.ceil(n / rows);
    const areaTop = HUD_H + 70;
    const areaBottom = height - BAR_H - BANNER_H - 20;
    const slotW = Math.min(150, (width - 30) / perRow);
    const nutW = Math.min(118, slotW * 0.86);
    const maxRowH = (areaBottom - areaTop) / rows;
    const nutH = Math.min(nutW * 0.39, (maxRowH - 40) / (maxCap + 2.3));
    // Rows only as tall as needed; the board is centered in the free space.
    // Blueprint: room under each bolt for its drawing.
    const below = this.state.goal ? Math.min(100, nutH * 0.38 * maxCap + 34) : 0;
    const rowH = Math.min(maxRowH, nutH * (maxCap + 2.3) + 50 + below);
    const top = areaTop + (areaBottom - areaTop - rowH * rows) / 2;
    this.layout = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - r * perRow);
      const c = i - r * perRow;
      const x = width / 2 + (c - (inRow - 1) / 2) * slotW;
      const baseY = top + rowH * (r + 1) - 24 - below;
      const cap = this.state.bolts[i].cap;
      const rodTop = baseY - 10 - nutH * (cap + 0.5);
      const fullTop = baseY - 10 - nutH * (maxCap + 0.5);
      this.layout.push({ x, baseY, nutW, nutH, rodTop, liftY: fullTop - nutH * 0.9, slotW, rowH });
    }
  }

  private nutY(i: number, k: number) {
    const L = this.layout[i];
    return L.baseY - 12 - L.nutH * (k + 0.5);
  }

  private liftedY(i: number, j: number) {
    // j = 0 for the top-most lifted nut.
    const L = this.layout[i];
    return L.liftY - j * L.nutH * 0.92;
  }

  private render() {
    this.board.removeAll(true);
    this.clearHint();
    this.computeLayout();
    this.nutSprites = [];
    const s = this.state;
    const reveal = s.moves < this.revealUntil;
    s.bolts.forEach((b, i) => {
      const L = this.layout[i];
      const complete = isComplete(s, i);
      const open = isOpen(s, i);
      const zone = this.add.rectangle(L.x, L.baseY - L.rowH / 2 + 20, L.slotW, L.rowH, 0xffffff, 0).setInteractive();
      zone.on('pointerdown', () => {
        this.downBolt = i;
        this.tap(i);
      });
      this.board.add(zone);
      const rodH = L.baseY - L.rodTop;
      this.board.add(
        this.add
          .image(L.x, L.baseY, 'rod')
          .setOrigin(0.5, 1)
          .setDisplaySize(Math.max(12, L.nutW * 0.19), rodH),
      );
      const rod = this.board.list[this.board.list.length - 1] as Phaser.GameObjects.Image;
      if (b.magnet) rod.setTint(0xe57373);
      if (b.glue) rod.setTint(0x9ccc65);
      this.board.add(
        this.add.image(L.x, L.baseY + 4, 'base').setDisplaySize(L.nutW * 1.18, Math.max(16, L.nutH * 0.55)),
      );
      if (b.magnet) this.board.add(this.add.image(L.x, L.baseY + 34, 'magnet').setDisplaySize(44, 40));
      if (b.glue) {
        this.board.add(this.add.image(L.x, L.rodTop + 6, 'glue').setDisplaySize(L.nutW * 0.5, 34));
        this.board.add(this.add.image(L.x, L.baseY + 34, 'glue').setDisplaySize(44, 30));
      }
      if (s.goal) this.drawGoal(i, L, complete);
      if (this.chainTags.has(i))
        this.board.add(text(this, L.x, L.baseY + 30, '⛓' + this.chainTags.get(i), 20, '#cfd8dc'));
      const g = liftGroup(s, i);
      const liftCount = this.selected === i && g ? g.count : 0;
      const sprites: Phaser.GameObjects.Container[] = [];
      b.nuts.forEach((nut, k) => {
        const fromTop = b.nuts.length - 1 - k;
        const lifted = fromTop < liftCount;
        const y = lifted ? this.liftedY(i, fromTop) : this.nutY(i, k);
        const showColor = !nut.h || reveal;
        const c = this.add.container(L.x, y);
        c.add(this.add.image(0, 0, showColor ? `nut-${nut.c}` : 'nut-hidden').setDisplaySize(L.nutW, L.nutH));
        if (!showColor) c.add(text(this, 0, 0, '?', Math.round(L.nutH * 0.7), '#ffffff'));
        else if (app.data.settings.colorBlind)
          c.add(this.add.image(0, 0, `sym-${nut.c}`).setDisplaySize(L.nutH * 0.62, L.nutH * 0.62));
        if (nut.h && reveal) c.setAlpha(0.85);
        if (isFrozen(nut, s.moves)) {
          c.add(this.add.image(0, 0, 'ice').setDisplaySize(L.nutW * 1.04, L.nutH * 1.04));
          c.add(text(this, L.nutW * 0.36, 0, String(nut.f! - s.moves), Math.round(L.nutH * 0.55), '#0b4f6c'));
        }
        this.board.add(c);
        sprites.push(c);
      });
      this.nutSprites.push(sprites);
      if (complete) this.board.add(this.add.image(L.x, L.rodTop - 2, 'cap').setDisplaySize(L.nutW * 0.6, L.nutH * 0.7));
      if (!open) {
        const h = L.baseY - L.rodTop + 10;
        this.board.add(this.add.rectangle(L.x, L.rodTop + h / 2 - 5, L.nutW * 1.08, h, 0x000000, 0.45));
      }
      if (!open && b.lock !== undefined) {
        const midY = (L.rodTop + L.baseY) / 2;
        this.board.add(this.add.image(L.x, midY, 'lock').setDisplaySize(L.nutW * 0.8, L.nutW * 0.9));
        this.board.add(
          this.add.circle(L.x, midY + L.nutW * 0.15, L.nutW * 0.18, NUT_COLORS[b.lock]).setStrokeStyle(3, 0xffffff),
        );
        if (app.data.settings.colorBlind)
          this.board.add(
            this.add.image(L.x, midY + L.nutW * 0.15, `sym-${b.lock}`).setDisplaySize(L.nutW * 0.24, L.nutW * 0.24),
          );
      }
      if (!open && b.chain !== undefined) {
        for (let y = L.rodTop + 10; y < L.baseY - 10; y += 26) {
          this.board.add(
            this.add
              .image(L.x - L.nutW * 0.3 + ((y / 26) % 2) * L.nutW * 0.6, y, 'chain')
              .setAngle(40)
              .setScale(0.8),
          );
        }
        this.board.add(text(this, L.x, L.baseY + 30, '⛓' + (this.chainTags.get(b.chain) ?? ''), 20, '#ffd166'));
      }
    });
    this.updateHud();
  }

  /** Blueprint: the small drawing under a bolt showing what it must hold. */
  private drawGoal(i: number, L: BoltLayout, done: boolean) {
    const goal = this.state.goal![i] ?? [];
    const cap = this.state.bolts[i].cap;
    const cellH = Math.min(18, L.nutH * 0.38);
    const w = L.nutW * 0.62;
    const h = cellH * cap + 12;
    const top = L.baseY + 22;
    const g = this.add.graphics();
    g.fillStyle(0x1e5aa8, 1).fillRoundedRect(L.x - w / 2, top, w, h, 6);
    g.lineStyle(1, 0xffffff, 0.25);
    for (let x = L.x - w / 2 + 8; x < L.x + w / 2; x += 8) g.lineBetween(x, top, x, top + h);
    goal.forEach((c, k) => {
      const y = top + h - 6 - cellH * (k + 1);
      g.fillStyle(NUT_COLORS[c], 1).fillRoundedRect(L.x - w / 2 + 6, y + 1, w - 12, cellH - 2, 3);
      g.lineStyle(1.5, 0xffffff, 0.9).strokeRoundedRect(L.x - w / 2 + 6, y + 1, w - 12, cellH - 2, 3);
    });
    if (goal.length === 0) {
      g.lineStyle(2, 0xffffff, 0.6).lineBetween(L.x - w / 4, top + h / 2, L.x + w / 4, top + h / 2);
    }
    g.lineStyle(3, done ? 0x7cf29c : 0xffffff, done ? 1 : 0.8).strokeRoundedRect(L.x - w / 2, top, w, h, 6);
    this.board.add(g);
    if (app.data.settings.colorBlind) {
      goal.forEach((c, k) => {
        const y = top + h - 6 - cellH * (k + 0.5);
        this.board.add(this.add.image(L.x, y, `sym-${c}`).setDisplaySize(cellH * 0.8, cellH * 0.8));
      });
    }
  }

  // ---------- input ----------

  private onPointerUp(p: Phaser.Input.Pointer) {
    if (!app.data.settings.dragDrop || this.selected === null || this.downBolt !== this.selected) return;
    const target = this.boltAt(p.worldX, p.worldY);
    this.downBolt = null;
    if (target !== null && target !== this.selected) this.tap(target);
  }

  private boltAt(x: number, y: number): number | null {
    for (let i = 0; i < this.layout.length; i++) {
      const L = this.layout[i];
      if (Math.abs(x - L.x) < L.slotW / 2 && y < L.baseY + 40 && y > L.baseY - L.rowH + 20) return i;
    }
    return null;
  }

  private tap(i: number) {
    if (this.busy || this.overlay) return;
    app.audio.unlock();
    this.clearHint();
    if (this.selected === null) {
      if (liftGroup(this.state, i)) this.lift(i);
      else this.invalid(i);
      return;
    }
    if (this.selected === i) {
      this.putBack();
      return;
    }
    const n = dropCount(this.state, this.selected, i);
    if (n > 0) this.drop(this.selected, i, n);
    else if (liftGroup(this.state, i)) {
      // Switch selection to the tapped bolt.
      this.putBack(false);
      this.lift(i);
    } else this.invalid(i);
  }

  private lift(i: number) {
    this.selected = i;
    const g = liftGroup(this.state, i)!;
    const sprites = this.nutSprites[i];
    for (let j = 0; j < g.count; j++) {
      const sp = sprites[sprites.length - 1 - j];
      this.tweens.add({ targets: sp, y: this.liftedY(i, j), duration: 140, ease: 'Back.out' });
      this.tweens.add({ targets: sp, scaleX: 0.86, duration: 70, yoyo: true, repeat: 1 });
    }
    app.audio.lift();
    app.haptics.lift();
    this.tutorialStep();
  }

  private putBack(sound = true) {
    const i = this.selected;
    if (i === null) return;
    const g = liftGroup(this.state, i);
    const sprites = this.nutSprites[i];
    const b = this.state.bolts[i];
    for (let j = 0; j < (g?.count ?? 0); j++) {
      const k = b.nuts.length - 1 - j;
      this.tweens.add({ targets: sprites[k], y: this.nutY(i, k), duration: 120, ease: 'Quad.in' });
    }
    this.selected = null;
    if (sound) app.audio.drop(1);
    this.tutorialStep();
  }

  private invalid(i: number) {
    app.audio.invalid();
    app.haptics.invalid();
    const sprites = this.nutSprites[i];
    const target = sprites.length ? sprites : [];
    this.tweens.add({ targets: target, x: '+=8', duration: 40, yoyo: true, repeat: 2 });
  }

  private drop(from: number, to: number, n: number) {
    this.busy = true;
    const next = applyMove(this.state, from, to)!;
    const src = this.nutSprites[from];
    const dstCount = this.state.bolts[to].nuts.length;
    const group = liftGroup(this.state, from)!;
    const moving = src.slice(src.length - n);
    const staying = src.slice(src.length - group.count, src.length - n);
    // Nuts that did not fit drop back onto the source bolt.
    staying.forEach((sp, j) => {
      const k = src.length - group.count + j;
      this.tweens.add({ targets: sp, y: this.nutY(from, k), duration: 140, ease: 'Quad.in' });
    });
    const T = this.layout[to];
    moving.forEach((sp, j) => {
      const fromTop = n - 1 - j;
      sp.setDepth(10);
      this.tweens.chain({
        targets: sp,
        tweens: [
          { x: T.x, y: this.liftedY(to, fromTop), duration: 150, ease: 'Sine.inOut' },
          { y: this.nutY(to, dstCount + j), duration: 150, ease: 'Quad.in' },
        ],
      });
      this.tweens.add({ targets: sp, scaleX: 0.85, duration: 50, delay: 150, yoyo: true, repeat: 2 });
    });
    this.time.delayedCall(310, () => {
      this.history.push(this.state);
      this.state = next;
      this.selected = null;
      app.audio.drop(n);
      app.haptics.drop();
      const completed = isComplete(next, to);
      this.render();
      if (completed) this.boltComplete(to);
      this.busy = false;
      this.afterMove();
    });
  }

  private boltComplete(i: number) {
    const L = this.layout[i];
    app.audio.complete();
    app.haptics.complete();
    const cap = this.add.image(L.x, L.rodTop - 80, 'cap').setDisplaySize(L.nutW * 0.6, L.nutH * 0.7);
    this.board.add(cap);
    this.tweens.add({
      targets: cap,
      y: L.rodTop - 2,
      duration: 220,
      ease: 'Bounce.out',
      onComplete: () => cap.destroy(),
    });
    for (let k = 0; k < 14; k++) {
      const sp = this.add
        .image(L.x, L.rodTop, 'spark')
        .setTint(k % 2 ? 0xffe08a : 0xffffff)
        .setScale(0.7);
      const a = (k / 14) * Math.PI * 2;
      this.tweens.add({
        targets: sp,
        x: L.x + Math.cos(a) * 70,
        y: L.rodTop + Math.sin(a) * 70,
        alpha: 0,
        scale: 0.1,
        duration: 450,
        onComplete: () => sp.destroy(),
      });
    }
  }

  private afterMove() {
    this.tutorialStep();
    const st = status(this.state);
    if (st === 'won') this.time.delayedCall(450, () => this.win());
    else if (st === 'stuck') this.time.delayedCall(300, () => this.stuck('stuck'));
    else if (st === 'outOfMoves') this.time.delayedCall(300, () => this.stuck('outOfMoves'));
  }

  // ---------- HUD & boosters ----------

  private hud() {
    const { width } = this.scale;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRect(0, 0, width, 110);
    button(this, 60, 56, 84, 72, '‹', () => this.quitToMap(), UI.grey, 40);
    const titles: Record<Mode, string> = {
      stage: app.t('level', { n: this.level.id }),
      daily: app.t('daily.title'),
      blueprint: app.t('blueprint.level', { n: this.level.id }),
      rush: app.t('mode.rush'),
      zen: app.t('mode.zen'),
    };
    text(this, width / 2, 40, titles[this.mode], 34);
    button(this, width - 60, 56, 84, 72, 'II', () => this.pause(), UI.grey, 30);
    this.movesText = text(this, width / 2, 150, '', 30, '#ffffff');
    this.coins = coinChip(this, 120, 150);
    if (this.mode === 'rush') {
      this.timerText = text(this, width / 2, 84, '', 30, '#ffd166');
      return;
    }
    if (this.mode === 'zen') return;
    const d = this.level.difficulty;
    const label =
      this.level.kind === 'boss'
        ? `${app.t('boss')} · ${app.t(('diff.' + d) as TextKey)}`
        : app.t(('diff.' + d) as TextKey);
    const badge = this.add.graphics();
    const bw = 30 + label.length * 13;
    badge.fillStyle(UI.badge[d], 1).fillRoundedRect(width / 2 - bw / 2, 66, bw, 32, 16);
    text(this, width / 2, 82, label, 20);
    this.bestText = text(this, width - 110, 150, app.t('best', { n: this.level.best }), 22, UI.textDim);
  }

  private bar() {
    const { width, height } = this.scale;
    const y = height - BANNER_H - BAR_H / 2;
    const hasHidden = this.level.bolts.some((b) => b.nuts.some((n) => n.h));
    // Which buttons each mode offers: Rush and Zen are about flow, so no paid boosters there.
    const items: ('undo' | 'restart' | 'hint' | 'extra' | 'reveal' | 'skip')[] =
      this.mode === 'rush'
        ? ['undo', 'restart', 'skip']
        : this.mode === 'zen'
          ? ['undo', 'restart', 'hint', 'skip']
          : ['undo', 'restart', 'hint', 'extra', ...(hasHidden ? (['reveal'] as const) : [])];
    const count = items.length;
    const w = Math.min(150, (width - 40) / count - 12);
    const xs = (k: number) => width / 2 + (k - (count - 1) / 2) * (w + 12);
    items.forEach((it, k) => {
      const x = xs(k);
      if (it === 'undo') this.undoBtn = button(this, x, y, w, 86, app.t('btn.undo'), () => this.undo(), UI.blue, 22);
      if (it === 'restart') button(this, x, y, w, 86, app.t('btn.restart'), () => this.restart(), UI.grey, 22);
      if (it === 'hint')
        this.hintBtn = button(this, x, y, w, 86, app.t('btn.hint'), () => this.useHint(), 0x9b5de5, 22);
      if (it === 'extra')
        this.boltBtn = button(this, x, y, w, 86, app.t('btn.extra'), () => this.useExtraBolt(), UI.green, 22);
      if (it === 'reveal')
        this.revealBtn = button(this, x, y, w, 86, app.t('btn.reveal'), () => this.useReveal(), 0xf28c28, 22);
      if (it === 'skip') this.skipBtn = button(this, x, y, w, 86, app.t('btn.skip'), () => this.skip(), 0xf28c28, 22);
    });
    // Reserved banner area (empty until ads are added).
    this.add.rectangle(width / 2, height - BANNER_H / 2, width, BANNER_H, 0x000000, 0.12);
  }

  private stageForRules() {
    return this.daily ? 3 : this.level.stage;
  }

  private undoAllowance(): number {
    if (this.mode === 'blueprint' || this.mode === 'rush' || this.mode === 'zen') return Infinity;
    return freeUndos(this.stageForRules()) - this.undosUsed;
  }

  /** Skip (Rush and Zen): a fresh puzzle. In Rush it costs 5 seconds and the combo. */
  private skip() {
    if (this.busy) return;
    if (this.mode === 'rush') {
      this.rushEnd -= 5000;
      this.rushCombo = 0;
    }
    this.busy = true;
    void this.nextPuzzle();
  }

  private updateHud() {
    if (!this.movesText) return;
    const s = this.state;
    if (this.mode === 'rush') this.movesText.setText(app.t('rush.score', { n: this.rushScore }));
    else if (this.mode === 'zen') this.movesText.setText(app.t('zen.solved', { n: app.data.zen.solved }));
    else
      this.movesText.setText(
        s.moveLimit ? app.t('movesLeft', { n: Math.max(0, s.moveLimit - s.moves) }) : app.t('moves', { n: s.moves }),
      );
    this.movesText.setColor(s.moveLimit && s.moveLimit - s.moves <= 3 ? '#ff8a80' : '#ffffff');
    const free = this.undoAllowance();
    this.undoBtn.setBadge(free === Infinity ? null : String(Math.max(0, free) + app.data.boosters.undo));
    this.undoBtn.setEnabled(this.history.length > 0);
    this.hintBtn?.setBadge(this.freeHints() ? null : String(app.data.boosters.hint));
    this.boltBtn?.setBadge(String(app.data.boosters.extraBolt));
    this.boltBtn?.setEnabled(this.extraBolts < 2);
    this.revealBtn?.setBadge(String(app.data.boosters.reveal));
    this.coins.refresh();
  }

  private isTutorial() {
    return this.mode === 'stage' && this.level.id <= 3;
  }

  /** Hints are free in the tutorial and in Zen mode. */
  private freeHints() {
    return this.isTutorial() || this.mode === 'zen';
  }

  /** Use one booster from the inventory, or buy one with coins after asking. */
  private withBooster(key: 'undo' | 'hint' | 'extraBolt' | 'reveal', use: () => void) {
    if (app.data.boosters[key] > 0) {
      app.data.boosters[key]--;
      app.analytics.log({ name: 'booster_used', booster: key, level: this.level.id });
      void app.save.save();
      use();
      return;
    }
    const prices = app.remote.values.boosterPrices;
    const price = key === 'undo' ? prices.undoPack : prices[key];
    const name = app.t(
      key === 'undo'
        ? 'shop.undo'
        : key === 'hint'
          ? 'shop.hint'
          : key === 'extraBolt'
            ? 'shop.extraBolt'
            : 'shop.reveal',
    );
    const z = this.overlay;
    confirm(this, name, `${price} coins (you have ${app.data.coins})`, app.t('btn.buy'), () => {
      if (!app.spendCoins(price, key)) {
        toast(this, app.t('noCoins'));
        return;
      }
      app.data.boosters[key] += key === 'undo' ? BOOSTERS.undoPack.amount : 1;
      app.audio.coin();
      this.withBooster(key, use);
      this.updateHud();
    }).setDepth(z ? 3000 : 2000);
  }

  private undo() {
    if (this.busy || this.history.length === 0) return;
    const doUndo = () => {
      this.putBack(false);
      this.state = this.history.pop()!;
      this.undosUsed++;
      app.audio.drop(1);
      this.closeOverlay();
      this.render();
    };
    if (this.undoAllowance() > 0) doUndo();
    else
      this.withBooster('undo', () => {
        this.undosUsed--; // a booster undo does not count against the free ones
        doUndo();
      });
  }

  private restart() {
    if (this.busy) return;
    this.closeOverlay();
    this.history = [];
    this.selected = null;
    this.extraBolts = 0;
    this.revealUntil = -1;
    this.state = createState(this.level);
    this.render();
  }

  private useHint() {
    if (this.busy) return;
    this.putBack(false);
    // Solve first, so a booster is never spent on a position with no way out.
    const m = hint(this.state);
    if (!m) {
      toast(this, app.t('stuck.body'));
      return;
    }
    const show = () => {
      this.hintsUsed++;
      this.showHint(m);
    };
    if (this.freeHints()) show();
    else this.withBooster('hint', show);
  }

  private showHint(m: Move) {
    this.clearHint();
    for (const i of [m.from, m.to]) {
      const L = this.layout[i];
      const r = this.add
        .rectangle(L.x, (L.rodTop + L.baseY) / 2 - 20, L.slotW * 0.92, L.baseY - L.rodTop + 90)
        .setStrokeStyle(6, i === m.from ? 0xffd166 : 0x7cf29c)
        .setFillStyle(0xffffff, 0.06);
      this.tweens.add({ targets: r, alpha: 0.35, yoyo: true, repeat: -1, duration: 400 });
      this.hintMarks.push(r);
    }
    const a = this.layout[m.from];
    const b = this.layout[m.to];
    const hand = this.add
      .image(a.x + 20, a.rodTop + 30, 'hand')
      .setOrigin(0.3, 0)
      .setDepth(50);
    this.tweens.chain({
      targets: hand,
      loop: -1,
      tweens: [
        { x: a.x + 20, y: a.rodTop + 30, duration: 0 },
        { scale: 0.85, duration: 200, yoyo: true },
        { x: b.x + 20, y: b.rodTop + 30, duration: 500, ease: 'Sine.inOut' },
        { scale: 0.85, duration: 200, yoyo: true },
        { alpha: 1, duration: 300 },
      ],
    });
    this.hintMarks.push(hand);
  }

  private clearHint() {
    for (const o of this.hintMarks) o.destroy();
    this.hintMarks = [];
  }

  private useExtraBolt() {
    if (this.busy || this.extraBolts >= 2) return;
    this.withBooster('extraBolt', () => {
      this.putBack(false);
      this.history.push(this.state);
      this.state = addExtraBolt(this.state);
      this.extraBolts++;
      this.closeOverlay();
      this.render();
      app.audio.complete();
    });
  }

  private useReveal() {
    if (this.busy) return;
    this.withBooster('reveal', () => {
      this.revealUntil = this.state.moves + BOOSTERS.revealHidden.moves;
      this.putBack(false);
      this.render();
    });
  }

  // ---------- tutorial ----------

  private introTips() {
    const teaches = this.level.teaches;
    if (this.isTutorial()) {
      if (this.level.id === 1) this.showBanner(app.t('tut.1'));
      if (this.level.id === 2) {
        this.showBanner(app.t('tut.undo'));
        this.tweens.add({ targets: this.undoBtn, scale: 1.1, yoyo: true, repeat: 5, duration: 300 });
      }
      if (this.level.id === 3) {
        this.showBanner(app.t('tut.hint'));
        this.tweens.add({ targets: this.hintBtn, scale: 1.1, yoyo: true, repeat: 5, duration: 300 });
      }
      this.tutorialStep();
      app.analytics.log({ name: 'tutorial_step', step: this.level.id });
    } else if (teaches && teaches !== 'basics') {
      this.showBanner(app.t(('teach.' + teaches) as TextKey));
    } else if (teaches === 'basics' && this.level.stage === 10) {
      this.showBanner(app.t('teach.basics'));
    }
  }

  /** Level 1: a pointing hand walks the player through the solver's moves. */
  private tutorialStep() {
    if (this.level.id !== 1 || this.mode !== 'stage') return;
    this.tutorialHand?.destroy();
    this.tutorialHand = null;
    if (status(this.state) !== 'playing') return;
    const m = hint(this.state);
    if (!m) return;
    const target = this.selected === null ? m.from : this.selected === m.from ? m.to : this.selected;
    if (this.selected !== null) this.showBanner(app.t('tut.2'));
    else if (this.state.moves > 0) this.showBanner(app.t('tut.3'));
    const L = this.layout[target];
    if (!L) return;
    const hand = this.add
      .image(L.x + 10, L.rodTop + 10, 'hand')
      .setOrigin(0.3, 0)
      .setDepth(60);
    this.tweens.add({ targets: hand, y: '+=24', yoyo: true, repeat: -1, duration: 400 });
    this.tutorialHand = hand;
  }

  private showBanner(msg: string) {
    this.banner?.destroy();
    const { width } = this.scale;
    const c = this.add.container(width / 2, HUD_H + 10).setDepth(40);
    const t = text(this, 0, 0, msg, 24).setWordWrapWidth(width - 100);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.6).fillRoundedRect(-(width - 60) / 2, -t.height / 2 - 8, width - 60, t.height + 16, 18);
    c.add([g, t]);
    this.banner = c;
    if (!this.isTutorial()) {
      this.tweens.add({ targets: c, alpha: 0, delay: 4500, duration: 500, onComplete: () => c.destroy() });
    }
  }

  // ---------- overlays ----------

  private closeOverlay() {
    this.overlay?.destroy();
    this.overlay = null;
    this.paused = false;
  }

  /** Rush timer. The clock stops while the pause menu is open. */
  override update(_t: number, dt: number) {
    if (this.mode !== 'rush' || !this.timerText || this.rushOverShown) return;
    if (this.paused) {
      this.rushEnd += dt;
      return;
    }
    const left = Math.max(0, Math.ceil((this.rushEnd - Date.now()) / 1000));
    this.timerText.setText('⏱ ' + app.t('rush.time', { n: left }));
    this.timerText.setColor(left <= 10 ? '#ff8a80' : '#ffd166');
    if (left <= 0 && !this.busy) this.rushOver();
  }

  private pause() {
    if (this.overlay) return;
    const { width, height } = this.scale;
    const o = this.add.container(0, 0).setDepth(500);
    this.overlay = o;
    this.paused = true;
    o.add(dim(this));
    o.add(panel(this, width / 2, height / 2, 520, 600));
    o.add(text(this, width / 2, height / 2 - 230, app.t('pause.title'), 40));
    o.add(button(this, width / 2, height / 2 - 120, 340, 86, app.t('btn.resume'), () => this.closeOverlay(), UI.green));
    o.add(button(this, width / 2, height / 2 - 20, 340, 86, app.t('btn.restart'), () => this.restart(), UI.blue));
    o.add(button(this, width / 2, height / 2 + 80, 340, 86, app.t('btn.map'), () => this.quitToMap(), UI.grey));
    const s = app.data.settings;
    const toggle = (x: number, key: 'music' | 'sfx', label: TextKey) => {
      const b = button(
        this,
        x,
        height / 2 + 200,
        160,
        70,
        `${app.t(label)}`,
        () => {
          s[key] = !s[key];
          app.applySettings();
          if (key === 'music') {
            if (s.music) app.audio.startMusic(this.mode === 'stage' ? this.level.stage : MODE_LOOK[this.mode]);
            else app.audio.stopMusic();
          }
          b.setAlpha(s[key] ? 1 : 0.45);
          void app.save.save();
        },
        UI.panelLight,
        20,
      );
      b.setAlpha(s[key] ? 1 : 0.45);
      o.add(b);
    };
    toggle(width / 2 - 90, 'music', 'settings.music');
    toggle(width / 2 + 90, 'sfx', 'settings.sfx');
  }

  private stuck(kind: 'stuck' | 'outOfMoves') {
    const { width, height } = this.scale;
    const o = this.add.container(0, 0).setDepth(500);
    this.overlay = o;
    o.add(dim(this, 0.5));
    o.add(panel(this, width / 2, height / 2, 600, 560));
    o.add(
      text(this, width / 2, height / 2 - 200, app.t(kind === 'stuck' ? 'stuck.title' : 'out.title'), 40, '#ffd166'),
    );
    o.add(
      text(
        this,
        width / 2,
        height / 2 - 120,
        app.t(kind === 'stuck' ? 'stuck.body' : 'out.body'),
        24,
        UI.textDim,
        false,
      ).setWordWrapWidth(500),
    );
    // Always at least one action: Undo, Restart, and (when stuck) Extra Bolt.
    o.add(button(this, width / 2, height / 2 - 10, 380, 86, app.t('btn.undo'), () => this.undo(), UI.blue));
    o.add(button(this, width / 2, height / 2 + 90, 380, 86, app.t('btn.restart'), () => this.restart(), UI.grey));
    if (this.mode === 'rush' || this.mode === 'zen') {
      o.add(button(this, width / 2, height / 2 + 190, 380, 86, app.t('btn.skip'), () => this.skip(), 0xf28c28));
    } else if (kind === 'stuck' && this.extraBolts < 2) {
      o.add(
        button(
          this,
          width / 2,
          height / 2 + 190,
          380,
          86,
          `${app.t('btn.extra')} (${app.data.boosters.extraBolt})`,
          () => this.useExtraBolt(),
          UI.green,
        ),
      );
    }
    // Reward hook: a rewarded ad could give a free Extra Bolt here later.
    if (app.ads.rewardedReady('no_moves_extra_bolt')) {
      /* monetization phase */
    }
  }

  private win() {
    if (this.mode === 'rush') return this.rushWin();
    if (this.mode === 'zen') return this.zenWin();
    const lvl = this.level;
    const moves = this.state.moves;
    const stars = starsFor(lvl, moves);
    const d = app.data;
    let coins = 0;
    if (this.mode === 'blueprint') {
      const prev = d.blueprint.stars[lvl.id] ?? 0;
      coins = coinsFor(lvl, stars, prev, app.remote.values.rewards);
      d.blueprint.stars[lvl.id] = Math.max(prev, stars);
      d.blueprint.unlocked = Math.max(d.blueprint.unlocked, Math.min(lvl.id + 1, app.blueprintCount));
      app.analytics.log({ name: 'mode_played', mode: 'blueprint', won: true });
    } else if (this.daily) {
      const prev = d.daily[this.daily];
      coins = prev ? 2 : 50 + (stars === 3 ? 20 : 0);
      d.daily[this.daily] = {
        moves: Math.min(moves, prev?.moves ?? Infinity),
        stars: Math.max(stars, prev?.stars ?? 0),
      };
      app.analytics.log({ name: 'daily_challenge_played', date: this.daily, won: true, moves });
    } else {
      const prev = d.stars[lvl.id] ?? 0;
      coins = coinsFor(lvl, stars, prev, app.remote.values.rewards);
      d.stars[lvl.id] = Math.max(prev, stars);
      d.bestMoves[lvl.id] = Math.min(moves, d.bestMoves[lvl.id] ?? Infinity);
      if (prev === 0) d.stats.levelsWon++;
      if (stars === 3 && prev < 3) d.stats.threeStars++;
      if (lvl.kind === 'boss' && this.undosUsed === 0) d.stats.bossNoUndo++;
      d.unlocked = Math.max(d.unlocked, Math.min(lvl.id + 1, app.totalLevels));
      if (lvl.id >= 3) d.tutorialDone = true;
    }
    app.addCoins(coins, this.mode);
    void app.save.save();
    app.levelsWonThisSession++;
    app.analytics.log({
      name: 'level_win',
      level: lvl.id,
      moves,
      time: Math.round((Date.now() - this.startTime) / 1000),
      hints: this.hintsUsed,
      undos: this.undosUsed,
      stars,
    });
    app.audio.win();
    app.haptics.win();
    this.confetti();
    this.resultScreen(stars, moves, coins);

    // Rating prompt: only after level 15 with 3 stars (official in-app review prompt, added with the store plugin).
    if (lvl.id === 15 && stars === 3 && !d.ratedPrompted) {
      d.ratedPrompted = true;
      void app.save.save();
    }
  }

  private resultScreen(stars: number, moves: number, coins: number) {
    const { width, height } = this.scale;
    const o = this.add.container(0, 0).setDepth(500);
    this.overlay = o;
    o.add(dim(this, 0.55));
    o.add(panel(this, width / 2, height / 2, 620, 720));
    o.add(text(this, width / 2, height / 2 - 290, app.t('win.title'), 44, '#ffd166'));
    for (let k = 0; k < 3; k++) {
      const st = this.add
        .image(width / 2 + (k - 1) * 130, height / 2 - 170 + (k === 1 ? -20 : 0), 'star')
        .setScale(k === 1 ? 2 : 1.6);
      st.setTint(0x2b3540);
      o.add(st);
      if (k < stars) {
        this.time.delayedCall(300 + k * 250, () => {
          st.setTint(0xf3c14b);
          this.tweens.add({
            targets: st,
            scale: { from: st.scale * 1.5, to: st.scale },
            duration: 250,
            ease: 'Back.out',
          });
          app.audio.coin();
        });
      }
    }
    o.add(
      text(
        this,
        width / 2,
        height / 2 - 40,
        app.t('win.moves', { n: moves }) + `  ·  ${app.t('best', { n: this.level.best })}`,
        28,
        UI.textDim,
      ),
    );
    o.add(this.add.image(width / 2 - 70, height / 2 + 30, 'coin'));
    o.add(text(this, width / 2 + 30, height / 2 + 30, app.t('win.coins', { n: coins }), 32, '#f3c14b'));
    const isLastOfStage = this.mode === 'stage' && this.level.id % 50 === 0;
    if (isLastOfStage) o.add(text(this, width / 2, height / 2 + 90, app.t('stageDone'), 24, '#7cf29c'));
    if (this.daily) {
      o.add(
        button(
          this,
          width / 2,
          height / 2 + 200,
          360,
          90,
          app.t('btn.close'),
          () => this.scene.start('Daily'),
          UI.green,
        ),
      );
    } else if (this.mode === 'blueprint') {
      const hasNext = this.level.id < app.blueprintCount;
      const go = (data: LevelData | null) => (data ? this.scene.restart(data) : this.scene.start('Blueprint'));
      o.add(
        button(
          this,
          width / 2,
          height / 2 + 170,
          380,
          96,
          hasNext ? app.t('btn.next') : app.t('btn.back'),
          () => go(hasNext ? { blueprint: this.level.id + 1 } : null),
          UI.green,
          32,
        ),
      );
      o.add(
        button(
          this,
          width / 2 - 100,
          height / 2 + 280,
          180,
          76,
          app.t('btn.retry'),
          () => go({ blueprint: this.level.id }),
          UI.blue,
          24,
        ),
      );
      o.add(button(this, width / 2 + 100, height / 2 + 280, 180, 76, app.t('btn.back'), () => go(null), UI.grey, 24));
    } else {
      const hasNext = this.level.id < app.totalLevels;
      o.add(
        button(
          this,
          width / 2,
          height / 2 + 170,
          380,
          96,
          hasNext ? app.t('btn.next') : app.t('btn.map'),
          () => this.next(),
          UI.green,
          32,
        ),
      );
      o.add(
        button(
          this,
          width / 2 - 100,
          height / 2 + 280,
          180,
          76,
          app.t('btn.retry'),
          () => this.scene.restart({ id: this.level.id }),
          UI.blue,
          24,
        ),
      );
      o.add(
        button(
          this,
          width / 2 + 100,
          height / 2 + 280,
          180,
          76,
          app.t('btn.map'),
          () => this.scene.start('Map'),
          UI.grey,
          24,
        ),
      );
    }
    this.coins.refresh();
  }

  private next() {
    const n = app.remote.values.interstitialEveryNLevels;
    // Break point: an interstitial ad could appear here later (Remote Config controls frequency).
    if (n > 0 && app.levelsWonThisSession % n === 0) void app.ads.showInterstitial('after_level');
    if (this.level.id < app.totalLevels) this.scene.restart({ id: this.level.id + 1 });
    else this.scene.start('Map');
  }

  // ---------- Rush and Zen ----------

  private rushWin() {
    const now = Date.now();
    this.rushCombo = now - this.lastSolveAt < RUSH.comboWindow * 1000 ? this.rushCombo + 1 : 0;
    this.lastSolveAt = now;
    const pts = rushPoints(this.level.best, this.state.moves, this.rushCombo);
    this.rushScore += pts;
    this.rushSolved++;
    this.rushEnd += RUSH.bonusSeconds * 1000;
    app.audio.complete();
    app.haptics.win();
    const msg = `+${pts}` + (this.rushCombo > 0 ? `  ${app.t('rush.combo', { n: this.rushCombo + 1 })}` : '');
    toast(this, msg);
    this.busy = true;
    this.time.delayedCall(500, () => void this.nextPuzzle());
  }

  private rushOver() {
    this.rushOverShown = true;
    this.closeOverlay();
    const d = app.data;
    const newBest = this.rushScore > d.rush.best;
    d.rush.best = Math.max(d.rush.best, this.rushScore);
    d.rush.runs++;
    const coins = Math.round(this.rushScore / 50);
    app.addCoins(coins, 'rush');
    void app.save.save();
    app.analytics.log({ name: 'mode_played', mode: 'rush', won: true, score: this.rushScore });
    app.audio.win();
    if (newBest) this.confetti();
    const { width, height } = this.scale;
    const o = this.add.container(0, 0).setDepth(500);
    this.overlay = o;
    o.add(dim(this, 0.6));
    o.add(panel(this, width / 2, height / 2, 600, 640));
    o.add(text(this, width / 2, height / 2 - 250, app.t('rush.over'), 44, '#ffd166'));
    o.add(text(this, width / 2, height / 2 - 160, app.t('rush.score', { n: this.rushScore }), 40));
    o.add(text(this, width / 2, height / 2 - 100, app.t('rush.solved', { n: this.rushSolved }), 26, UI.textDim));
    o.add(
      text(
        this,
        width / 2,
        height / 2 - 50,
        newBest ? app.t('rush.newBest') : app.t('mode.best', { n: d.rush.best }),
        28,
        newBest ? '#7cf29c' : UI.textDim,
      ),
    );
    o.add(this.add.image(width / 2 - 70, height / 2 + 20, 'coin'));
    o.add(text(this, width / 2 + 30, height / 2 + 20, app.t('win.coins', { n: coins }), 32, '#f3c14b'));
    o.add(
      button(
        this,
        width / 2,
        height / 2 + 140,
        380,
        96,
        app.t('btn.again'),
        () => this.scene.restart({ rush: true }),
        UI.green,
        32,
      ),
    );
    o.add(
      button(
        this,
        width / 2,
        height / 2 + 250,
        260,
        76,
        app.t('btn.back'),
        () => this.scene.start('Modes'),
        UI.grey,
        24,
      ),
    );
    this.coins.refresh();
  }

  private zenWin() {
    app.data.zen.solved++;
    app.addCoins(3, 'zen');
    void app.save.save();
    app.analytics.log({ name: 'mode_played', mode: 'zen', won: true });
    app.audio.win();
    this.confetti();
    toast(this, app.t('win.coins', { n: 3 }));
    this.busy = true;
    this.time.delayedCall(1300, () => void this.nextPuzzle());
  }

  private confetti() {
    const { width } = this.scale;
    for (let k = 0; k < 60; k++) {
      const c = this.add
        .image(Phaser.Math.Between(0, width), -20, 'confetti')
        .setTint(NUT_COLORS[k % NUT_COLORS.length])
        .setDepth(600)
        .setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: c,
        y: Phaser.Math.Between(400, 1100),
        x: c.x + Phaser.Math.Between(-120, 120),
        angle: c.angle + Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: Phaser.Math.Between(1200, 2000),
        delay: Phaser.Math.Between(0, 300),
        onComplete: () => c.destroy(),
      });
    }
  }

  private quitToMap() {
    if (!this.overlay || this.state.moves > 0) {
      if (status(this.state) !== 'won') {
        app.analytics.log({
          name: 'level_quit',
          level: this.level.id,
          moves: this.state.moves,
          time: Math.round((Date.now() - this.startTime) / 1000),
          hints: this.hintsUsed,
          undos: this.undosUsed,
        });
      }
    }
    const back: Record<Mode, string> = {
      stage: 'Map',
      daily: 'Daily',
      blueprint: 'Blueprint',
      rush: 'Modes',
      zen: 'Modes',
    };
    this.scene.start(back[this.mode]);
  }
}
