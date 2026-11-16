import Phaser from 'phaser';
import type { HouseAd } from '@bolt-sort/services';
import { app } from './app';
import { text } from './ui';

/** Load an ad image into the texture cache. Resolves false if it cannot be loaded. */
function loadAdImage(scene: Phaser.Scene, ad: HouseAd): Promise<string | null> {
  const key = `ad-${ad.id}-${ad.image}`;
  if (scene.textures.exists(key)) return Promise.resolve(key);
  return new Promise((resolve) => {
    let failed = false;
    const timer = setTimeout(() => resolve(null), 6000);
    scene.load.once('loaderror', () => (failed = true));
    scene.load.once('complete', () => {
      clearTimeout(timer);
      resolve(!failed && scene.textures.exists(key) ? key : null);
    });
    scene.load.image(key, ad.image);
    scene.load.start();
  });
}

/**
 * Full-screen ad over the game. The ✕ appears after the number of seconds the admin set;
 * tapping the ad opens the advertiser's page.
 */
export async function showInterstitial(scene: Phaser.Scene, ad: HouseAd): Promise<void> {
  const key = await loadAdImage(scene, ad);
  if (!key || !scene.sys.isActive()) return;
  const { width, height } = scene.scale;
  return new Promise((resolve) => {
    const layer = scene.add.container(0, 0).setDepth(5000);
    layer.add(scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.92).setInteractive());
    const img = scene.add.image(width / 2, height / 2 + 20, key);
    const scale = Math.min((width - 40) / img.width, (height - 200) / img.height);
    img.setScale(scale).setInteractive({ useHandCursor: true });
    img.on('pointerup', () => void app.houseAds.open(ad));
    layer.add(img);
    const tag = scene.add.graphics();
    tag.fillStyle(0xf3c14b, 1).fillRoundedRect(20, 40, 70, 34, 8);
    layer.add(tag);
    layer.add(text(scene, 55, 57, app.t('ad.label'), 20, '#1d2b3a'));
    // Countdown, then the close button.
    const cx = width - 60;
    const cy = 57;
    const ring = scene.add.circle(cx, cy, 30, 0x000000, 0.6).setStrokeStyle(3, 0xffffff, 0.8);
    const count = text(scene, cx, cy, String(ad.skipAfter), 26);
    layer.add([ring, count]);
    let left = Math.max(0, Math.floor(ad.skipAfter));
    const showClose = () => {
      count.setText('✕');
      ring.setInteractive({ useHandCursor: true });
      ring.on('pointerup', () => {
        layer.destroy();
        resolve();
      });
    };
    if (left === 0) showClose();
    else
      scene.time.addEvent({
        delay: 1000,
        repeat: left - 1,
        callback: () => {
          left--;
          if (left <= 0) showClose();
          else count.setText(String(left));
        },
      });
    app.houseAds.impression(ad);
  });
}

/** Banner in the strip reserved at the bottom of the level screen. */
export async function showBanner(scene: Phaser.Scene, ad: HouseAd, x: number, y: number, w: number, h: number) {
  const key = await loadAdImage(scene, ad);
  if (!key || !scene.sys.isActive()) return;
  const img = scene.add.image(x, y, key);
  img.setScale(Math.min(w / img.width, h / img.height)).setInteractive({ useHandCursor: true });
  img.on('pointerup', () => void app.houseAds.open(ad));
  const tag = scene.add.graphics();
  const left = x - (img.width * img.scale) / 2;
  const top = y - (img.height * img.scale) / 2;
  tag.fillStyle(0xf3c14b, 1).fillRoundedRect(left + 4, top + 4, 40, 22, 5);
  text(scene, left + 24, top + 15, app.t('ad.label'), 14, '#1d2b3a');
  app.houseAds.impression(ad);
}
