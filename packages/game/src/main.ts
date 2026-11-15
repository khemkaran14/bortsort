import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MapScene } from './scenes/MapScene';
import { LevelScene } from './scenes/LevelScene';
import { DailyScene } from './scenes/DailyScene';
import { ShopScene } from './scenes/ShopScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ModesScene } from './scenes/ModesScene';
import { BlueprintScene } from './scenes/BlueprintScene';

/** Portrait game, 720 wide; height follows the screen's shape so every phone is filled. */
function gameHeight() {
  const el = document.getElementById('game')!;
  const w = el.clientWidth || window.innerWidth;
  const h = el.clientHeight || window.innerHeight;
  return Math.round(Math.min(1700, Math.max(1040, (720 * h) / w)));
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d2b3a',
  width: 720,
  height: gameHeight(),
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false },
  fps: { target: 60 },
  input: { activePointers: 2 },
  scene: [BootScene, MapScene, LevelScene, DailyScene, ShopScene, SettingsScene, ModesScene, BlueprintScene],
});

document.getElementById('splash')?.remove();

// Re-fit when the phone rotates or the window changes shape.
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const h = gameHeight();
    if (Math.abs(h - game.scale.height) > 20) {
      game.scale.setGameSize(720, h);
      const active = game.scene.getScenes(true)[0];
      active?.scene.restart(active.scene.settings.data);
    }
  }, 250);
});

export default game;

// Test hook for automated browser checks (?debug in the URL).
if (location.search.includes('debug')) (window as unknown as { __game: Phaser.Game }).__game = game;
