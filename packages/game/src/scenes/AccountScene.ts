import Phaser from 'phaser';
import { view } from '../view';
import { app } from '../app';
import { UI } from '../theme';
import { background, button, confirm, panel, text, toast } from '../ui';

/** Account status, subscription, log out and delete account. */
export class AccountScene extends Phaser.Scene {
  private from = 'Settings';

  constructor() {
    super('Account');
  }

  init(data: { from?: string }) {
    this.from = data.from ?? 'Settings';
  }

  create() {
    const { width } = view(this);
    background(this, 1);
    this.events.on('back', () => this.scene.start(this.from));
    button(this, 60, 56, 84, 72, '‹', () => this.scene.start(this.from), UI.grey, 40);
    text(this, width / 2, 56, app.t('account.title'), 40);
    const acc = app.account;
    panel(this, width / 2, 300, width - 60, 260, UI.panelLight);
    if (!acc.loggedIn) {
      text(this, width / 2, 250, app.t('account.guest'), 30);
      text(this, width / 2, 300, app.t('account.free'), 24, UI.textDim);
      if (app.api.enabled)
        button(
          this,
          width / 2,
          520,
          360,
          90,
          app.t('account.login'),
          () => this.scene.start('Login', { from: 'Account' }),
          UI.green,
          30,
        );
      return;
    }
    void acc.refresh().then(() => this.scene.isActive() && this.status());
    text(this, width / 2, 230, acc.label, 34);
    this.status();
    button(
      this,
      width / 2,
      520,
      360,
      86,
      app.t('account.logout'),
      async () => {
        await acc.logout();
        this.scene.restart();
      },
      UI.blue,
      28,
    );
    button(
      this,
      width / 2,
      640,
      360,
      80,
      app.t('account.delete'),
      () => {
        confirm(this, app.t('account.delete'), app.t('account.deleteConfirm'), app.t('account.delete'), async () => {
          try {
            await acc.deleteAccount();
            this.scene.restart();
          } catch {
            toast(this, app.t('login.err.network'));
          }
        });
      },
      UI.red,
      24,
    );
  }

  private statusText: Phaser.GameObjects.Text | null = null;

  private status() {
    const { width } = view(this);
    const sub = app.account.user?.subscription;
    const msg =
      sub && app.account.adFree
        ? app.t('account.premium', { p: sub.name, d: new Date(sub.expiresAt).toLocaleDateString() })
        : app.t('account.free');
    if (this.statusText) this.statusText.setText(msg);
    else this.statusText = text(this, width / 2, 320, msg, 26, sub ? '#7cf29c' : UI.textDim);
  }
}
