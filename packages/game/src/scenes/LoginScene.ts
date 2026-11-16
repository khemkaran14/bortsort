import Phaser from 'phaser';
import { view } from '../view';
import { ApiError, type TextKey } from '@bolt-sort/services';
import { app } from '../app';
import { UI } from '../theme';
import { background, button, text, toast, type Button } from '../ui';

type Channel = 'phone' | 'email';

const INPUT_CSS =
  'font: 600 30px system-ui, sans-serif; padding: 14px 18px; border-radius: 14px; border: 3px solid #5d6d7e;' +
  'background: #f5f7fa; color: #1d2b3a; outline: none; box-sizing: border-box;';

/** Optional login with a one-time code by SMS or email. */
export class LoginScene extends Phaser.Scene {
  private from = 'GameSelect';
  private channel: Channel = 'phone';
  private dest = '';
  private layer!: Phaser.GameObjects.Container;
  private doms: Phaser.GameObjects.DOMElement[] = [];
  private busy = false;
  private resendLeft = 0;
  private resendBtn: Button | null = null;

  constructor() {
    super('Login');
  }

  init(data: { from?: string }) {
    this.from = data.from ?? 'GameSelect';
    this.channel = 'phone';
    this.busy = false;
  }

  create() {
    const { width } = view(this);
    background(this, 30);
    this.events.on('back', () => this.leave());
    button(this, 60, 56, 84, 72, '‹', () => this.leave(), UI.grey, 40);
    text(this, width / 2, 56, app.t('login.title'), 40);
    text(this, width / 2, 160, app.t('login.why'), 24, UI.textDim, false).setWordWrapWidth(width - 100);
    this.layer = this.add.container(0, 0);
    this.enterStep();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
  }

  private clear() {
    this.layer.removeAll(true);
    this.doms.forEach((d) => d.destroy());
    this.doms = [];
    this.resendBtn = null;
  }

  private field(x: number, y: number, w: number, attrs: Record<string, string>) {
    const el = document.createElement('input');
    el.style.cssText = INPUT_CSS + `width:${w}px;`;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    const dom = this.add.dom(x, y, el);
    this.doms.push(dom);
    return el;
  }

  private enterStep() {
    this.clear();
    const { width, height } = view(this);
    const tab = (x: number, ch: Channel) =>
      button(
        this,
        x,
        280,
        250,
        76,
        app.t(ch === 'phone' ? 'login.phone' : 'login.email'),
        () => {
          this.channel = ch;
          this.enterStep();
        },
        this.channel === ch ? UI.blue : UI.panelLight,
        26,
      );
    this.layer.add([tab(width / 2 - 135, 'phone'), tab(width / 2 + 135, 'email')]);

    let read: () => string;
    if (this.channel === 'phone') {
      const cc = this.field(width / 2 - 225, 400, 150, {
        type: 'tel',
        value: '+91',
        'aria-label': 'Country code',
        autocomplete: 'tel-country-code',
      });
      const num = this.field(width / 2 + 75, 400, 420, {
        type: 'tel',
        inputmode: 'numeric',
        placeholder: app.t('login.phonePh'),
        autocomplete: 'tel-national',
        maxlength: '15',
      });
      read = () =>
        (cc.value.trim().startsWith('+') ? cc.value.trim() : '+' + cc.value.trim()) +
        num.value.replace(/\D/g, '').replace(/^0+/, '');
      num.focus();
    } else {
      const em = this.field(width / 2, 400, 600, {
        type: 'email',
        placeholder: app.t('login.emailPh'),
        autocomplete: 'email',
        maxlength: '200',
      });
      read = () => em.value.trim();
      em.focus();
    }
    this.layer.add(
      button(this, width / 2, 530, 420, 96, app.t('login.send'), () => void this.send(read()), UI.green, 32),
    );
    // Sign in with Google (when a Google client id is configured for this build).
    const googleId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
    if (googleId) {
      this.layer.add(text(this, width / 2, 640, '— ' + app.t('login.or') + ' —', 24, UI.textDim));
      const g = button(
        this,
        width / 2,
        730,
        420,
        90,
        '      ' + app.t('login.google'),
        () => void this.google(),
        0xffffff,
        26,
      );
      (g.list[1] as Phaser.GameObjects.Text).setColor('#1f1f1f');
      g.add(this.googleMark(-165, 0));
      this.layer.add(g);
    }
    this.layer.add(
      button(this, width / 2, height - 120, 420, 80, app.t('login.guest'), () => this.leave(), UI.grey, 24),
    );
  }

  private async send(dest: string) {
    if (this.busy) return;
    this.busy = true;
    try {
      await app.account.requestCode(this.channel, dest);
      this.dest = dest;
      this.resendLeft = 45;
      this.codeStep();
    } catch (e) {
      this.error(e);
    } finally {
      this.busy = false;
    }
  }

  private codeStep() {
    this.clear();
    const { width, height } = view(this);
    this.layer.add(text(this, width / 2, 290, app.t('login.sentTo', { d: this.dest }), 26, '#ffffff', false));
    const code = this.field(width / 2, 400, 360, {
      type: 'text',
      inputmode: 'numeric',
      autocomplete: 'one-time-code',
      maxlength: '6',
      placeholder: app.t('login.codePh'),
      style: INPUT_CSS + 'width:360px;text-align:center;letter-spacing:8px;',
    });
    code.focus();
    const verify = () => void this.verify(code.value.replace(/\D/g, ''));
    code.addEventListener('input', () => {
      if (code.value.replace(/\D/g, '').length === 6) verify();
    });
    this.layer.add(button(this, width / 2, 530, 420, 96, app.t('login.verify'), verify, UI.green, 32));
    this.resendBtn = button(
      this,
      width / 2 - 130,
      650,
      240,
      70,
      '',
      () => {
        if (this.resendLeft <= 0) void this.send(this.dest);
      },
      UI.panelLight,
      22,
    );
    this.layer.add(this.resendBtn);
    this.layer.add(
      button(this, width / 2 + 140, 650, 220, 70, app.t('login.change'), () => this.enterStep(), UI.panelLight, 22),
    );
    this.layer.add(
      button(this, width / 2, height - 120, 420, 80, app.t('login.guest'), () => this.leave(), UI.grey, 24),
    );
    this.tick(false);
  }

  private tick(count = true) {
    if (!this.resendBtn) return;
    if (count && this.resendLeft > 0) this.resendLeft--;
    this.resendBtn.setLabel(
      this.resendLeft > 0 ? app.t('login.resendIn', { n: this.resendLeft }) : app.t('login.resend'),
    );
    this.resendBtn.setAlpha(this.resendLeft > 0 ? 0.6 : 1);
  }

  private async verify(code: string) {
    if (this.busy || code.length !== 6) return;
    this.busy = true;
    try {
      await app.account.verify(this.channel, this.dest, code);
      toast(this, app.t('login.ok'));
      await app.houseAds.load('bolt');
      await app.houseAds.load('wit');
      app.syncProgress();
      this.time.delayedCall(700, () => this.leave());
    } catch (e) {
      this.error(e);
    } finally {
      this.busy = false;
    }
  }

  private async google() {
    if (this.busy) return;
    this.busy = true;
    try {
      await app.account.googleLogin({
        webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID!,
        iOSClientId: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || undefined,
      });
      toast(this, app.t('login.ok'));
      await app.houseAds.load('bolt');
      await app.houseAds.load('wit');
      app.syncProgress();
      this.time.delayedCall(700, () => this.leave());
    } catch (e) {
      this.error(e instanceof ApiError ? e : new ApiError(-1, 'google_failed'));
    } finally {
      this.busy = false;
    }
  }

  /** The multicolor "G" mark, drawn in code. */
  private googleMark(x: number, y: number) {
    const g = this.add.graphics({ x, y });
    const r = 20;
    const seg = (from: number, to: number, color: number) => {
      g.lineStyle(9, color, 1).beginPath();
      g.arc(0, 0, r, Phaser.Math.DegToRad(from), Phaser.Math.DegToRad(to), false);
      g.strokePath();
    };
    seg(-40, 45, 0x4285f4);
    seg(45, 135, 0x34a853);
    seg(135, 215, 0xfbbc05);
    seg(215, 320, 0xea4335);
    g.fillStyle(0x4285f4, 1).fillRect(0, -4.5, r + 4.5, 9);
    return g;
  }

  private error(e: unknown) {
    const code =
      e instanceof ApiError ? (e.status === 0 && e.code !== 'google_failed' ? 'network' : e.code) : 'network';
    const key = `login.err.${code}` as TextKey;
    toast(this, app.t(key) === key ? app.t('login.err.network') : app.t(key));
  }

  private leave() {
    app.data.loginPrompted = true;
    void app.save.save();
    this.scene.start(this.from);
  }
}
