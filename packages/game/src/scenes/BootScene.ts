import Phaser from 'phaser';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { app } from '../app';
import { makeMiscTextures, makeNutTextures, makeSymbolTextures } from '../textures';
import type { BoltSkin, NutSkin } from '../theme';
import { text } from '../ui';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const { width, height } = this.scale;
    text(this, width / 2, height / 2, 'Bolt Sort', 56, '#f3d28a');
    void this.start();
  }

  private async start() {
    try {
      await app.init();
    } catch (e) {
      console.error(e);
    }
    makeNutTextures(this, app.data.skins.nut as NutSkin);
    makeSymbolTextures(this);
    makeMiscTextures(this, app.data.skins.bolt as BoltSkin);
    SplashScreen.hide().catch(() => {});
    // Android back button: go back to the map, or leave the app from the map.
    CapApp.addListener('backButton', () => {
      const active = this.game.scene.getScenes(true)[0];
      if (!active || active.scene.key === 'Map') void CapApp.exitApp();
      else active.events.emit('back');
    }).catch(() => {});
    CapApp.addListener('pause', () => app.audio.stopMusic()).catch(() => {});
    // The app holds two games; the chooser opens first (one tap to play, no sign-up).
    this.scene.start('GameSelect');
  }
}
