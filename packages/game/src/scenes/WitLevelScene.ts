import Phaser from 'phaser';
import { app } from '../app';
import { showInterstitial } from '../adsUi';
import { NUT_COLORS, UI, shade } from '../theme';
import { background, button, coinChip, confirm, dim, panel, text, toast } from '../ui';
import { WIT_LEVELS } from '../wit/levels';
import type { Area, L, ObjOpts, SolveApi, WitCtx, WitLevel, WitObj } from '../wit/types';

export const WIT_COINS = 10;
export const WIT_HINT_PRICE = 25;
export const WIT_SKIP_PRICE = 60;

const EMOJI_FONT = '"Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';

interface Active {
  o: WitObj;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  depth: number;
  dragging: boolean;
}

/** One Wit Twist puzzle. Implements the small toolkit (WitCtx) the level scripts use. */
export class WitLevelScene extends Phaser.Scene {
  A!: Area;
  private ctx!: WitCtx;
  state: Record<string, unknown> = {};
  solved = false;
  private n = 1;
  private level!: WitLevel;
  private objs = new Map<string, WitObj>();
  private words: WitObj[] = [];
  private active: Active | null = null;
  private overlay: Phaser.GameObjects.Container | null = null;
  private anyTap: (() => void) | null = null;
  private hintBtn!: ReturnType<typeof button>;

  constructor() {
    super('WitLevel');
  }

  init(data: { n?: number }) {
    this.n = Phaser.Math.Clamp(data.n ?? 1, 1, WIT_LEVELS.length);
    this.level = WIT_LEVELS[this.n - 1];
    this.state = {};
    this.solved = false;
    this.objs = new Map();
    this.words = [];
    this.active = null;
    this.overlay = null;
    this.anyTap = null;
  }

  create() {
    const { width, height } = this.scale;
    background(this, 30);
    app.audio.startMusic(7);
    this.A = {
      left: 40,
      right: width - 40,
      top: 330,
      bottom: height - 150,
      cx: width / 2,
      cy: (330 + height - 150) / 2,
    };

    // Header
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.3).fillRect(0, 0, width, 110);
    button(this, 60, 56, 84, 72, '‹', () => this.sceneManager().start('WitMap'), UI.grey, 40);
    text(this, width / 2, 56, app.t('wit.level', { n: this.n }), 36);
    coinChip(this, width - 110, 56);

    this.ctx = this.makeCtx();
    this.questionWords();
    this.level.build(this.ctx);

    // Bottom bar: Hint and Skip.
    const by = height - 75;
    this.hintBtn = button(
      this,
      width / 2 - 130,
      by,
      230,
      86,
      '💡 ' + app.t('btn.hint'),
      () => this.showHint(),
      0x9b5de5,
      26,
    );
    button(this, width / 2 + 130, by, 230, 86, app.t('btn.skip') + ' ⏭', () => this.skipLevel(), UI.grey, 26);
    this.updateHintBadge();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.overlay || !this.anyTap) return;
      if (p.y > this.A.top - 20 && p.y < this.A.bottom + 20) this.anyTap();
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', () => this.onUp());
    this.events.on('back', () => (this.overlay ? this.closeOverlay() : this.sceneManager().start('WitMap')));

    if (location.search.includes('debug')) {
      (window as unknown as { __witSolve: () => Promise<boolean> }).__witSolve = async () => {
        await this.level.solve(this.solveApi(), this.ctx);
        await this.wait(200);
        return this.solved;
      };
    }
  }

  private sceneManager(): Phaser.Scenes.ScenePlugin {
    return this.scene;
  }

  /** The toolkit handed to level scripts. */
  private makeCtx(): WitCtx {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const s = this;
    return {
      scene: this,
      get A() {
        return s.A;
      },
      state: this.state,
      get solved() {
        return s.solved;
      },
      L: (l) => this.L(l),
      emoji: (...a) => this.emoji(...a),
      label: (...a) => this.label(...a),
      draw: (...a) => this.draw(...a),
      pill: (...a) => this.pill(...a),
      get: (n) => this.get(n),
      has: (n) => this.has(n),
      remove: (n) => this.remove(n),
      back: (o) => this.back(o),
      dist: (o, t) => this.dist(o, t),
      win: () => this.win(),
      wrong: (m) => this.wrong(m),
      say: (m) => this.say(m),
      keypad: (a) => this.keypad(a),
      choices: (l, c) => this.choices(l, c),
      figY: (k, r) => this.figY(k, r),
      after: (ms, fn) => this.after(ms, fn),
      every: (ms, fn) => this.every(ms, fn),
      onAnyTap: (fn) => this.onAnyTap(fn),
      word: (id) => this.word(id),
    };
  }

  // ---------- question ----------

  private questionWords() {
    const { width } = this.scale;
    const q = this.L(this.level.q);
    // `glue`: no space before this token in the source (e.g. "dot{dot:.}" or "{exit:exit}!").
    const tokens: { s: string; id?: string; glue: boolean }[] = [];
    const re = /\{(\w+):([^}]*)\}|[^\s{]+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(q))) {
      const glue = m.index > 0 && !/\s/.test(q[m.index - 1]);
      tokens.push(m[1] ? { s: m[2], id: m[1], glue } : { s: m[0], glue });
    }
    const size = q.length > 70 ? 28 : q.length > 40 ? 32 : 36;
    const maxW = width - 80;
    const made = tokens.map((t) =>
      this.add
        .text(0, 0, t.s, { fontFamily: UI.font, fontSize: `${size}px`, color: '#ffffff', fontStyle: 'bold' })
        .setPadding(2, 6, 2, 6),
    );
    // Lay the words out in centered lines.
    const lines: number[][] = [[]];
    let lineW = 0;
    made.forEach((t, i) => {
      const w = t.width + (tokens[i].glue ? -4 : 6);
      if (lineW + w > maxW && lines[lines.length - 1].length && !tokens[i].glue) {
        lines.push([]);
        lineW = 0;
      }
      lines[lines.length - 1].push(i);
      lineW += w;
    });
    const lineH = size * 1.5;
    const top = 140 + Math.max(0, (170 - lines.length * lineH) / 2);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(24, 125, width - 48, 185, 22);
    lines.forEach((ids, r) => {
      const total = ids.reduce((s, i, k) => s + made[i].width + (k === 0 ? 0 : tokens[i].glue ? -4 : 6), 0);
      let x = width / 2 - total / 2;
      ids.forEach((i, k) => {
        const t = made[i];
        if (k > 0) x += tokens[i].glue ? -4 : 6;
        const cx = x + t.width / 2;
        const cy = top + r * lineH + lineH / 2;
        t.setOrigin(0.5).setPosition(0, 0);
        const go = this.add.container(cx, cy, [t]).setDepth(50);
        const o: WitObj = {
          name: `w${i}`,
          go,
          home: { x: cx, y: cy },
          drag: !!tokens[i].id && !!this.level.words?.drag?.includes(tokens[i].id!),
          tokenId: tokens[i].id,
        };
        o.onTap = () => this.level.words?.tap?.(tokens[i].id ?? '', this.ctx);
        if (o.drag)
          o.onDrop = (w) => (this.level.words?.drop ? this.level.words.drop(tokens[i].id!, w, this.ctx) : this.back(w));
        go.setSize(Math.max(t.width, 30), t.height).setInteractive();
        go.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(o, p));
        this.words.push(o);
        x += t.width;
      });
    });
  }

  // ---------- input ----------

  private register(o: WitObj, w: number, h: number, opts: ObjOpts = {}) {
    if (this.objs.has(o.name)) this.remove(o.name);
    o.drag = !!opts.drag;
    o.onTap = opts.tap;
    o.onDrop = opts.drop;
    if (opts.depth !== undefined) o.go.setDepth(opts.depth);
    o.go.setSize(w, h).setInteractive();
    o.go.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(o, p));
    this.objs.set(o.name, o);
    return o;
  }

  private onDown(o: WitObj, p: Phaser.Input.Pointer) {
    if (this.overlay || this.solved) return;
    app.audio.unlock();
    this.active = { o, sx: p.x, sy: p.y, ox: o.go.x, oy: o.go.y, depth: o.go.depth, dragging: false };
  }

  private onMove(p: Phaser.Input.Pointer) {
    const a = this.active;
    if (!a || !a.o.drag || !p.isDown) return;
    if (!a.dragging && Phaser.Math.Distance.Between(p.x, p.y, a.sx, a.sy) > 12) {
      a.dragging = true;
      a.o.go.setDepth(900);
      app.audio.lift();
    }
    if (a.dragging) a.o.go.setPosition(a.ox + p.x - a.sx, a.oy + p.y - a.sy);
  }

  private onUp() {
    const a = this.active;
    this.active = null;
    if (!a || this.overlay) return;
    if (a.dragging) {
      a.o.go.setDepth(a.depth);
      app.audio.drop(1);
      a.o.onDrop?.(a.o);
    } else if (a.o.onTap) {
      app.audio.tap();
      a.o.onTap(a.o);
    }
  }

  // ---------- WitCtx ----------

  L(l: L): string {
    return l[app.data.settings.language] ?? l.en;
  }

  emoji(name: string, ch: string, x: number, y: number, size = 90, opts?: ObjOpts): WitObj {
    const t = this.add
      .text(0, 0, ch, { fontFamily: EMOJI_FONT, fontSize: `${size}px` })
      .setOrigin(0.5)
      .setPadding(4, 10, 4, 10);
    const go = this.add.container(x, y, [t]);
    return this.register({ name, go, home: { x, y }, drag: false }, size * 1.1, size * 1.1, opts);
  }

  label(name: string, s: string, x: number, y: number, size = 40, opts?: ObjOpts & { color?: string }): WitObj {
    const t = this.add
      .text(0, 0, s, {
        fontFamily: `${UI.font}, ${EMOJI_FONT}`,
        fontSize: `${size}px`,
        color: opts?.color ?? '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setPadding(4, 8, 4, 8);
    const go = this.add.container(x, y, [t]);
    return this.register(
      { name, go, home: { x, y }, drag: false },
      Math.max(t.width, 60),
      Math.max(t.height, 60),
      opts,
    );
  }

  draw(
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
    fn: (g: Phaser.GameObjects.Graphics) => void,
    opts?: ObjOpts,
  ): WitObj {
    const g = this.add.graphics();
    fn(g);
    const go = this.add.container(x, y, [g]);
    return this.register({ name, go, home: { x, y }, drag: false }, w, h, opts);
  }

  pill(name: string, s: string, x: number, y: number, w: number, h: number, color: number, opts?: ObjOpts): WitObj {
    const g = this.add.graphics();
    g.fillStyle(shade(color, -0.45), 1).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 16);
    g.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(0xffffff, 0.18).fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h * 0.32, 10);
    const t = this.add
      .text(0, 0, s, {
        fontFamily: `${UI.font}, ${EMOJI_FONT}`,
        fontSize: `${Math.min(30, h * 0.42)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setPadding(2, 6, 2, 6);
    const go = this.add.container(x, y, [g, t]);
    return this.register({ name, go, home: { x, y }, drag: false }, w, h, opts);
  }

  get(name: string): WitObj {
    const o = this.objs.get(name);
    if (!o) throw new Error('No object ' + name);
    return o;
  }

  has(name: string) {
    return this.objs.has(name) && this.objs.get(name)!.go.active;
  }

  remove(name: string) {
    this.objs.get(name)?.go.destroy();
    this.objs.delete(name);
  }

  word(id: string): WitObj {
    const o = this.words.find((w) => w.tokenId === id);
    if (!o) throw new Error('No word ' + id);
    return o;
  }

  back(o: WitObj) {
    this.tweens.add({ targets: o.go, x: o.home.x, y: o.home.y, duration: 220, ease: 'Back.out' });
  }

  dist(o: WitObj, to: WitObj | { x: number; y: number }) {
    const p = 'go' in to ? { x: to.go.x, y: to.go.y } : to;
    return Phaser.Math.Distance.Between(o.go.x, o.go.y, p.x, p.y);
  }

  win() {
    if (this.solved) return;
    this.solved = true;
    const d = app.data.wit;
    const first = !d.solved[this.n];
    d.solved[this.n] = true;
    d.unlocked = Math.max(d.unlocked, Math.min(this.n + 1, WIT_LEVELS.length));
    if (first) app.addCoins(WIT_COINS, 'wit');
    app.syncProgress();
    void app.save.save();
    app.analytics.log({ name: 'wit_solved', level: this.n, hinted: !!d.hinted[this.n] });
    app.audio.win();
    app.haptics.win();
    this.confetti();
    this.time.delayedCall(700, () => this.result(first));
  }

  wrong(msg?: L) {
    app.audio.invalid();
    app.haptics.invalid();
    this.cameras.main.shake(180, 0.006);
    toast(this, this.L(msg ?? { en: 'Nope!', hi: 'नहीं!' }));
  }

  say(msg: L) {
    toast(this, this.L(msg));
  }

  figY(kind: 'keypad' | 'choices', rows?: number) {
    const reserved = kind === 'keypad' ? 290 : (rows ?? 2) * 110 + 20;
    return (this.A.top + this.A.bottom - reserved) / 2;
  }

  keypad(answer: string) {
    const { cx, bottom } = this.A;
    let typed = '';
    const shown = this.label('key-display', '', cx - 150, bottom - 250, 52, { color: '#ffd166' });
    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.35).fillRoundedRect(cx - 290, bottom - 290, 280, 80, 16);
    box.setDepth(-1);
    const show = () => (shown.go.list[0] as Phaser.GameObjects.Text).setText(typed || '?');
    show();
    for (let d = 0; d <= 9; d++) {
      const x = cx + ((d % 5) - 2) * 122;
      const y = bottom - 155 + Math.floor(d / 5) * 85;
      this.pill(`key-${d}`, String(d), x, y, 110, 74, UI.blue, {
        tap: () => {
          if (typed.length < 4) typed += String(d);
          show();
        },
      });
    }
    this.pill('key-del', '⌫', cx + 70, bottom - 250, 110, 74, UI.grey, {
      tap: () => {
        typed = typed.slice(0, -1);
        show();
      },
    });
    this.pill('key-ok', 'OK', cx + 210, bottom - 250, 140, 74, UI.green, {
      tap: () => {
        if (typed === answer) this.win();
        else {
          this.wrong();
          typed = '';
          show();
        }
      },
    });
  }

  choices(labels: (L | string)[], correct: number) {
    const { cx, bottom } = this.A;
    const cols = labels.length > 4 ? 3 : 2;
    const rows = Math.ceil(labels.length / cols);
    const w = cols === 3 ? 190 : 290;
    labels.forEach((lab, i) => {
      const r = Math.floor(i / cols);
      const inRow = Math.min(cols, labels.length - r * cols);
      const c = i - r * cols;
      const x = cx + (c - (inRow - 1) / 2) * (w + 20);
      const y = bottom - 50 - (rows - 1 - r) * 110;
      const s = typeof lab === 'string' ? lab : this.L(lab);
      this.pill(`choice-${i}`, s, x, y, w, 90, NUT_COLORS[(i * 3 + 1) % NUT_COLORS.length], {
        tap: () => (i === correct ? this.win() : this.wrong()),
      });
    });
  }

  after(ms: number, fn: () => void) {
    this.time.delayedCall(ms, fn);
  }

  every(ms: number, fn: () => void) {
    this.time.addEvent({ delay: ms, loop: true, callback: fn });
  }

  onAnyTap(fn: () => void) {
    this.anyTap = fn;
  }

  // ---------- chrome ----------

  private updateHintBadge() {
    const d = app.data.wit;
    this.hintBtn.setBadge(d.hinted[this.n] ? null : d.freeHints > 0 ? String(d.freeHints) : `${WIT_HINT_PRICE}◉`);
  }

  private showHint() {
    if (this.overlay || this.solved) return;
    const d = app.data.wit;
    const open = () => {
      d.hinted[this.n] = true;
      void app.save.save();
      this.updateHintBadge();
      this.popup('💡', this.L(this.level.hint));
    };
    if (d.hinted[this.n]) return open();
    if (d.freeHints > 0) {
      d.freeHints--;
      return open();
    }
    confirm(this, app.t('btn.hint'), `${WIT_HINT_PRICE} coins (you have ${app.data.coins})`, app.t('btn.buy'), () => {
      if (!app.spendCoins(WIT_HINT_PRICE, 'wit_hint')) return toast(this, app.t('noCoins'));
      open();
    });
  }

  private skipLevel() {
    if (this.overlay || this.solved) return;
    confirm(this, app.t('btn.skip'), `${WIT_SKIP_PRICE} coins (you have ${app.data.coins})`, app.t('btn.skip'), () => {
      if (!app.spendCoins(WIT_SKIP_PRICE, 'wit_skip')) return toast(this, app.t('noCoins'));
      const d = app.data.wit;
      d.unlocked = Math.max(d.unlocked, Math.min(this.n + 1, WIT_LEVELS.length));
      void app.save.save();
      this.popup('⏭', this.L(this.level.why), true);
    });
  }

  private popup(icon: string, body: string, next = false) {
    const { width, height } = this.scale;
    const o = this.add.container(0, 0).setDepth(2000);
    this.overlay = o;
    o.add(dim(this));
    o.add(panel(this, width / 2, height / 2, 600, 460));
    o.add(
      this.add.text(width / 2, height / 2 - 150, icon, { fontFamily: EMOJI_FONT, fontSize: '70px' }).setOrigin(0.5),
    );
    o.add(text(this, width / 2, height / 2 - 30, body, 28, '#ffffff', false).setWordWrapWidth(520));
    o.add(
      button(
        this,
        width / 2,
        height / 2 + 150,
        300,
        86,
        next ? app.t('btn.next') : app.t('btn.close'),
        () => {
          if (next) this.goNext();
          else this.closeOverlay();
        },
        UI.green,
      ),
    );
  }

  private closeOverlay() {
    this.overlay?.destroy();
    this.overlay = null;
  }

  private result(first: boolean) {
    const { width, height } = this.scale;
    const o = this.add.container(0, 0).setDepth(2000);
    this.overlay = o;
    o.add(dim(this, 0.55));
    o.add(panel(this, width / 2, height / 2, 620, 620));
    o.add(text(this, width / 2, height / 2 - 240, app.t('wit.correct'), 46, '#ffd166'));
    o.add(
      this.add.text(width / 2, height / 2 - 150, '🧠', { fontFamily: EMOJI_FONT, fontSize: '90px' }).setOrigin(0.5),
    );
    o.add(text(this, width / 2, height / 2 - 20, this.L(this.level.why), 27, '#ffffff', false).setWordWrapWidth(540));
    if (first) {
      o.add(this.add.image(width / 2 - 70, height / 2 + 90, 'coin'));
      o.add(text(this, width / 2 + 30, height / 2 + 90, app.t('win.coins', { n: WIT_COINS }), 32, '#f3c14b'));
    }
    const last = this.n >= WIT_LEVELS.length;
    o.add(
      button(
        this,
        width / 2,
        height / 2 + 200,
        360,
        96,
        last ? app.t('btn.map') : app.t('btn.next'),
        () => this.goNext(),
        UI.green,
        32,
      ),
    );
  }

  private async goNext() {
    const ad = this.solved ? app.houseAds.afterWin('wit', this.n) : null;
    if (ad) await showInterstitial(this, ad);
    if (this.n >= WIT_LEVELS.length) this.sceneManager().start('WitMap');
    else this.sceneManager().restart({ n: this.n + 1 });
  }

  private confetti() {
    const { width } = this.scale;
    for (let k = 0; k < 50; k++) {
      const c = this.add
        .image(Phaser.Math.Between(0, width), -20, 'confetti')
        .setTint(NUT_COLORS[k % NUT_COLORS.length])
        .setDepth(1500);
      this.tweens.add({
        targets: c,
        y: Phaser.Math.Between(400, 1100),
        x: c.x + Phaser.Math.Between(-120, 120),
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: Phaser.Math.Between(1200, 2000),
        onComplete: () => c.destroy(),
      });
    }
  }

  // ---------- automated play (tests) ----------

  private wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, () => r()));
  }

  /** Sends real mouse events to the canvas, so hit areas and covering objects are tested too. */
  private solveApi(): SolveApi {
    const canvas = this.game.canvas;
    const send = (type: string, x: number, y: number) => {
      const r = canvas.getBoundingClientRect();
      const k = r.width / this.scale.width;
      const ev = new MouseEvent(type, {
        clientX: r.left + x * k,
        clientY: r.top + y * k,
        bubbles: true,
        button: 0,
        buttons: type === 'mouseup' ? 0 : 1,
      });
      canvas.dispatchEvent(ev);
    };
    const where = (o: WitObj) => ({ x: o.go.x, y: o.go.y });
    const target = (to: string | { x: number; y: number }) => (typeof to === 'string' ? where(this.get(to)) : to);
    const tapAt = async (p: { x: number; y: number }) => {
      send('mousedown', p.x, p.y);
      await this.wait(50);
      send('mouseup', p.x, p.y);
      await this.wait(250);
    };
    const dragFrom = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
      send('mousedown', from.x, from.y);
      await this.wait(40);
      for (let s = 1; s <= 8; s++) {
        send('mousemove', from.x + ((to.x - from.x) * s) / 8, from.y + ((to.y - from.y) * s) / 8);
        await this.wait(25);
      }
      send('mouseup', to.x, to.y);
      await this.wait(350);
    };
    return {
      tap: (name) => tapAt(where(this.get(name))),
      drag: (name, to) => dragFrom(where(this.get(name)), target(to)),
      tapWord: (id) => tapAt(where(this.word(id))),
      dragWord: (id, to) => dragFrom(where(this.word(id)), target(to)),
      type: async (s) => {
        for (const ch of s) await tapAt(where(this.get(`key-${ch}`)));
        await tapAt(where(this.get('key-ok')));
      },
      pick: (i) => tapAt(where(this.get(`choice-${i}`))),
      wait: (ms) => this.wait(ms),
    };
  }
}
