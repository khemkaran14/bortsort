import type Phaser from 'phaser';
import type { L, WitCtx, WitObj } from './types';

/** Shared helpers for Wit Twist puzzles. */

export const l = (en: string, hi: string): L => ({ en, hi });

export const WRONG = {
  look: l('Look closer…', 'ध्यान से देखो…'),
  notThat: l('Not that one!', 'वो नहीं!'),
  locked: l('Locked!', 'बंद है!'),
};

/** Tap objects in a fixed order; a mistake resets the order. */
export function sequence(c: WitCtx, names: string[], done: () => void) {
  let next = 0;
  const marks: Phaser.GameObjects.Text[] = [];
  return (o: WitObj) => {
    if (o.name === names[next]) {
      next++;
      const t = c.scene.add
        .text(o.go.x, o.go.y - 60, String(next), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '30px',
          color: '#7cf29c',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      marks.push(t);
      if (next === names.length) done();
    } else {
      next = 0;
      marks.forEach((m) => m.destroy());
      marks.length = 0;
      c.wrong(l('Wrong order — start again.', 'गलत क्रम — फिर से शुरू करो।'));
    }
  };
}

/** Rounded box with a number, used by several levels. */
export function numberTile(g: Phaser.GameObjects.Graphics, w: number, h: number, color: number) {
  g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 16);
  g.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16);
  g.lineStyle(3, 0xffffff, 0.8).strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
}
