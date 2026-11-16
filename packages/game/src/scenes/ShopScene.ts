import Phaser from 'phaser';
import { view } from '../view';
import { BOOSTERS } from '@bolt-sort/core';
import type { TextKey } from '@bolt-sort/services';
import { app } from '../app';
import { makeMiscTextures, makeNutPreview, makeNutTextures, tone } from '../textures';
import { NUT_COLORS, SKINS, UI, type BoltSkin, type NutSkin } from '../theme';
import { background, button, coinChip, text, toast } from '../ui';

/** Coins-only shop: boosters and cosmetic skins (cosmetics never change difficulty). */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    const { width } = view(this);
    background(this, 1);
    this.events.on('back', () => this.scene.start('Map'));
    button(this, 60, 56, 84, 72, '‹', () => this.scene.start('Map'), UI.grey, 40);
    text(this, width / 2, 56, app.t('shop.title'), 40);
    const coins = coinChip(this, width - 110, 56);

    text(this, width / 2, 150, app.t('shop.boosters'), 28, '#f3c14b');
    const prices = app.remote.values.boosterPrices;
    const items: { key: 'undo' | 'extraBolt' | 'hint' | 'reveal'; label: TextKey; price: number; amount: number }[] = [
      { key: 'undo', label: 'shop.undo', price: prices.undoPack, amount: BOOSTERS.undoPack.amount },
      { key: 'hint', label: 'shop.hint', price: prices.hint, amount: 1 },
      { key: 'extraBolt', label: 'shop.extraBolt', price: prices.extraBolt, amount: 1 },
      { key: 'reveal', label: 'shop.reveal', price: prices.reveal, amount: 1 },
    ];
    items.forEach((it, i) => {
      const y = 220 + i * 100;
      const g = this.add.graphics();
      g.fillStyle(UI.panelLight, 0.9).fillRoundedRect(30, y - 42, width - 60, 84, 18);
      text(this, 60, y, app.t(it.label), 24).setOrigin(0, 0.5);
      const own = text(this, width - 300, y, `×${app.data.boosters[it.key]}`, 24, UI.textDim);
      button(
        this,
        width - 130,
        y,
        170,
        64,
        `${it.price} ◉`,
        () => {
          if (!app.spendCoins(it.price, it.key)) return toast(this, app.t('noCoins'));
          app.data.boosters[it.key] += it.amount;
          void app.save.save();
          app.audio.coin();
          own.setText(`×${app.data.boosters[it.key]}`);
          coins.refresh();
        },
        UI.green,
        22,
      );
    });

    const skinsTop = 220 + items.length * 100 + 30;
    text(this, width / 2, skinsTop, app.t('shop.skins'), 28, '#f3c14b');
    const cols = 3;
    const cw = (width - 60) / cols;
    SKINS.forEach((sk, i) => {
      const cx = 30 + cw * (i % cols) + cw / 2;
      const cy = skinsTop + 110 + Math.floor(i / cols) * 230;
      const owned = app.data.skins.owned.includes(sk.id);
      const equipped = (sk.kind === 'nut' ? app.data.skins.nut : app.data.skins.bolt) === sk.id;
      const g = this.add.graphics();
      g.fillStyle(equipped ? 0x2f6f4f : UI.panelLight, 0.95).fillRoundedRect(
        cx - cw / 2 + 8,
        cy - 90,
        cw - 16,
        210,
        18,
      );
      // Preview drawn with that skin's style.
      this.preview(sk.kind, sk.id, cx, cy - 20);
      text(this, cx, cy + 40, sk.name, 22);
      const label = equipped ? app.t('equipped') : owned ? app.t('owned') : `${sk.price} ◉`;
      button(
        this,
        cx,
        cy + 88,
        cw - 50,
        52,
        label,
        () => {
          if (equipped) return;
          if (!owned) {
            if (!app.spendCoins(sk.price, 'skin_' + sk.id)) return toast(this, app.t('noCoins'));
            app.data.skins.owned.push(sk.id);
            app.audio.coin();
          }
          if (sk.kind === 'nut') app.data.skins.nut = sk.id;
          else app.data.skins.bolt = sk.id;
          void app.save.save();
          makeNutTextures(this, app.data.skins.nut as NutSkin);
          makeMiscTextures(this, app.data.skins.bolt as BoltSkin);
          this.scene.restart();
        },
        equipped ? UI.grey : owned ? UI.blue : UI.green,
        20,
      );
    });
  }

  private preview(kind: 'nut' | 'bolt', id: string, x: number, y: number) {
    if (kind === 'nut') {
      [0, 1, 2].forEach((c, k) => {
        makeNutPreview(this, `prev-${id}-${c}`, c, id as NutSkin);
        this.add.image(x, y + 24 - k * 34, `prev-${id}-${c}`).setDisplaySize(100, 42);
      });
    } else {
      const col = id === 'brass' ? 0xc9a24a : 0xb0bac4;
      this.add.rectangle(x, y + 3, 18, 106, tone(col, -0.1));
      this.add.rectangle(x - 3, y + 3, 5, 106, tone(col, 0.5));
      this.add.rectangle(x, y + 60, 110, 16, tone(col, -0.25)).setStrokeStyle(2, tone(col, -0.55));
      this.add.image(x, y + 30, 'nut-' + (NUT_COLORS.length - 1)).setDisplaySize(90, 38);
    }
  }
}
