import Phaser from 'phaser';

/**
 * Sharp rendering on every screen.
 *
 * The game is laid out in a fixed 720-wide coordinate space, but the canvas is RES times larger so
 * it matches the phone's real pixels. Each scene's camera zooms by RES, so layout code keeps using
 * 720-wide coordinates while everything is drawn at full resolution. Generated images are made at
 * HD times their layout size and shown scaled down.
 */
export const LOGICAL_WIDTH = 720;
export let RES = 1;
/** Generated textures are drawn at this many pixels per layout unit (2 or 3, from RES). */
export let HD = 2;

export function setRes(r: number) {
  RES = r;
  HD = Math.max(2, Math.ceil(r));
}

/** Pick the render scale for this device: canvas pixels per layout unit (1 … 2.5). */
export function pickRes(cssWidth: number): number {
  const dpr = window.devicePixelRatio || 1;
  const r = (cssWidth * dpr) / LOGICAL_WIDTH;
  return Math.max(1, Math.min(2.5, Math.round(r * 4) / 4));
}

/** Layout size of a scene (720 wide) and camera set up for sharp rendering. Call at the start of create(). */
const faded = new WeakSet<Phaser.Scene>();

export function view(scene: Phaser.Scene): { width: number; height: number } {
  const cam = scene.cameras.main;
  if (cam.zoom !== RES) {
    cam.setOrigin(0, 0);
    cam.setZoom(RES);
  }
  // Soft fade-in once per scene start.
  if (!faded.has(scene)) {
    faded.add(scene);
    cam.fadeIn(220, 10, 16, 24);
    scene.events.once('shutdown', () => faded.delete(scene));
  }
  return { width: LOGICAL_WIDTH, height: scene.scale.height / RES };
}

/** Show a generated (HD) image at `s` times its layout size. */
export function hd<T extends Phaser.GameObjects.Image>(img: T, s = 1): T {
  img.setScale(s / HD);
  return img;
}
