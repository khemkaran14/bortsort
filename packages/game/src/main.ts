import Phaser from 'phaser';
import '@fontsource/baloo-2/500.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import { BootScene } from './scenes/BootScene';
import { MapScene } from './scenes/MapScene';
import { LevelScene } from './scenes/LevelScene';
import { DailyScene } from './scenes/DailyScene';
import { ShopScene } from './scenes/ShopScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ModesScene } from './scenes/ModesScene';
import { BlueprintScene } from './scenes/BlueprintScene';
import { GameSelectScene } from './scenes/GameSelectScene';
import { WitMapScene } from './scenes/WitMapScene';
import { WitLevelScene } from './scenes/WitLevelScene';
import { LoginScene } from './scenes/LoginScene';
import { AccountScene } from './scenes/AccountScene';
import { LOGICAL_WIDTH, pickRes, RES, setRes } from './view';

/** Portrait layout, 720 wide; the height follows the screen's shape so every phone is filled. */
function layoutHeight() {
  const el = document.getElementById('game')!;
  const w = el.clientWidth || window.innerWidth;
  const h = el.clientHeight || window.innerHeight;
  return Math.round(Math.min(1700, Math.max(1040, (LOGICAL_WIDTH * h) / w)));
}

// All text is drawn at the canvas resolution, so it stays sharp.
const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
  text: (...a: unknown[]) => Phaser.GameObjects.Text;
};
const makeText = factory.text;
factory.text = function (this: unknown, ...a: unknown[]) {
  return makeText.apply(this, a).setResolution(RES);
};

/** Wait (briefly) for the game font, so text is measured with the right letters. */
async function loadFonts() {
  const wait = Promise.all([
    document.fonts.load('700 32px "Baloo 2"', 'Bolt Sort'),
    document.fonts.load('800 32px "Baloo 2"', 'Bolt Sort'),
    document.fonts.load('500 32px "Baloo 2"', 'Bolt Sort'),
    document.fonts.load('700 32px "Baloo 2"', 'बोल्ट सॉर्ट'),
  ]);
  await Promise.race([wait, new Promise((r) => setTimeout(r, 2500))]).catch(() => {});
}

async function start() {
  await loadFonts();
  const el = document.getElementById('game')!;
  setRes(pickRes(el.clientWidth || window.innerWidth));
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#14202c',
    width: LOGICAL_WIDTH * RES,
    height: layoutHeight() * RES,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false, mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    fps: { target: 60 },
    input: { activePointers: 2 },
    // Text boxes on the login screen are real HTML inputs (keyboard, autofill of one-time codes).
    dom: { createContainer: true },
    // Ad images come from the server.
    loader: { crossOrigin: 'anonymous' },
    scene: [
      BootScene,
      MapScene,
      LevelScene,
      DailyScene,
      ShopScene,
      SettingsScene,
      ModesScene,
      BlueprintScene,
      GameSelectScene,
      WitMapScene,
      WitLevelScene,
      LoginScene,
      AccountScene,
    ],
  });

  document.getElementById('splash')?.remove();

  // Re-fit when the phone rotates or the window changes shape.
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const h = layoutHeight();
      if (Math.abs(h * RES - game.scale.height) > 20 * RES) {
        game.scale.setGameSize(LOGICAL_WIDTH * RES, h * RES);
        const active = game.scene.getScenes(true)[0];
        active?.scene.restart(active.scene.settings.data);
      }
    }, 250);
  });

  // Test hook for automated browser checks (?debug in the URL).
  if (location.search.includes('debug')) (window as unknown as { __game: Phaser.Game }).__game = game;
}

void start();
