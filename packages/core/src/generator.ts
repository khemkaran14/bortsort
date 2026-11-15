import { Rng } from './rng';
import { createState, isComplete } from './rules';
import type { Bolt, Mechanic, Nut } from './types';

/** Settings for one random candidate level. */
export interface GenConfig {
  colors: number;
  /** Capacity of normal bolts. */
  cap: number;
  /** Empty spare bolts (1 or 2). */
  spare: number;
  /** Chance that a filled bolt's lower nuts start hidden (0 = none). */
  hidden?: number;
  lock?: boolean;
  /** Number of frozen nuts. */
  frozen?: number;
  /** Number of short bolts (capacity 2 or 3). */
  short?: number;
  chain?: boolean;
  moveLimit?: boolean;
}

export function mechanicsOf(cfg: GenConfig): Mechanic[] {
  const m: Mechanic[] = [];
  if (cfg.spare < 2) m.push('oneSpare');
  if (cfg.cap > 4) m.push('tall');
  if (cfg.hidden) m.push('hidden');
  if (cfg.lock) m.push('lock');
  if (cfg.frozen) m.push('frozen');
  if (cfg.short) m.push('short');
  if (cfg.chain) m.push('chain');
  if (cfg.moveLimit) m.push('moveLimit');
  return m;
}

/**
 * Build one random candidate layout from a seed. Candidates can be unsolvable; the solver checks
 * them and the selection step keeps only solvable ones.
 */
export function generateLayout(cfg: GenConfig, seed: number): Bolt[] | null {
  const rng = new Rng(seed);
  const caps: number[] = new Array(cfg.colors).fill(cfg.cap);
  const shortCount = Math.min(cfg.short ?? 0, Math.max(0, cfg.colors - 2));
  for (let i = 0; i < shortCount; i++) caps[cfg.colors - 1 - i] = rng.int(2, 3);

  // Each color has as many nuts as its "home" bolt holds; deal them out randomly.
  const nuts: Nut[] = [];
  caps.forEach((cap, color) => {
    for (let k = 0; k < cap; k++) nuts.push({ c: color });
  });
  rng.shuffle(nuts);
  // Shuffle bolt order so short bolts are not always at the end.
  const order = rng.shuffle(caps.map((_, i) => i));
  const bolts: Bolt[] = order.map((i) => ({ cap: caps[i], nuts: [] }));
  let p = 0;
  for (const b of bolts) for (let k = 0; k < b.cap; k++) b.nuts.push(nuts[p++]);
  for (let s = 0; s < cfg.spare; s++) bolts.push({ cap: cfg.cap, nuts: [] });

  // Reject layouts that start with a bolt already finished or nearly sorted.
  const st = createState({ bolts });
  for (let i = 0; i < bolts.length; i++) if (isComplete(st, i)) return null;
  for (const b of bolts) {
    if (b.nuts.length >= 3) {
      const top = b.nuts.slice(-3);
      if (top.every((n) => n.c === top[0].c) && b.cap <= 4) return null;
    }
  }

  const filled = bolts.map((_, i) => i).filter((i) => bolts[i].nuts.length > 0);

  if (cfg.hidden) {
    for (const i of filled) {
      if (rng.chance(cfg.hidden)) {
        const b = bolts[i];
        for (let k = 0; k < b.nuts.length - 1; k++) b.nuts[k].h = true;
      }
    }
  }

  if (cfg.lock) {
    const i = rng.pick(filled);
    const inside = new Set(bolts[i].nuts.map((n) => n.c));
    const choices = caps.map((_, c) => c).filter((c) => !inside.has(c));
    if (choices.length === 0) return null;
    bolts[i].lock = rng.pick(choices);
  }

  if (cfg.chain) {
    const a = rng.pick(filled);
    const others = filled.filter((i) => i !== a && bolts[i].lock === undefined);
    if (others.length === 0) return null;
    bolts[a].chain = rng.pick(others);
  }

  if (cfg.frozen) {
    const all: Nut[] = [];
    for (const i of filled) for (const n of bolts[i].nuts) all.push(n);
    rng.shuffle(all);
    for (let k = 0; k < Math.min(cfg.frozen, all.length); k++) all[k].f = rng.int(3, 8);
  }

  return bolts;
}
