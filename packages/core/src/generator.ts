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
  /** Add a small magnet tray: any color may be dropped on it. */
  magnet?: boolean;
  /** Add a glue bolt holding one stuck nut; that color must be finished there. */
  glue?: boolean;
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
  if (cfg.magnet) m.push('magnet');
  if (cfg.glue) m.push('glue');
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

  // New pieces are added last so older settings still give exactly the same levels.
  if (cfg.magnet) {
    bolts.push({ cap: Math.max(2, cfg.cap - 2), nuts: [], magnet: true });
  }
  if (cfg.glue) {
    const plainFilled = filled.filter((i) => bolts[i].lock === undefined && bolts[i].chain === undefined);
    if (plainFilled.length === 0) return null;
    const src = bolts[rng.pick(plainFilled)];
    const nut = src.nuts.pop()!;
    delete nut.h;
    delete nut.f;
    bolts.push({ cap: cfg.cap, nuts: [nut], glue: true });
  }
  return bolts;
}

export type BlueprintPattern = 'steps' | 'halves' | 'sandwich';

export interface BlueprintConfig {
  colors: number;
  cap: number;
  spare: number;
  pattern: BlueprintPattern;
}

/** The target drawing for a Blueprint level: every color still has exactly `cap` nuts. */
export function blueprintGoal(cfg: BlueprintConfig, palette: number[]): number[][] {
  const n = cfg.colors;
  const col = (i: number) => palette[((i % n) + n) % n];
  const goal: number[][] = [];
  for (let i = 0; i < n; i++) {
    const g: number[] = [];
    if (cfg.pattern === 'steps') {
      for (let k = 0; k < cfg.cap; k++) g.push(col(i + k));
    } else if (cfg.pattern === 'halves') {
      const half = Math.floor(cfg.cap / 2);
      for (let k = 0; k < cfg.cap; k++) g.push(k < half ? col(i) : col(i + 1));
      // Odd capacity: the extra nut makes counts uneven, so 'halves' is only used with even caps.
    } else {
      g.push(col(i + 1));
      for (let k = 0; k < cfg.cap - 2; k++) g.push(col(i));
      g.push(col(i + 1));
    }
    goal.push(g);
  }
  for (let s = 0; s < cfg.spare; s++) goal.push([]);
  return goal;
}

/**
 * Blueprint level: copy the drawing instead of sorting by color. The start is made by scrambling the
 * finished drawing with `scramble` random moves, so solutions stay short and difficulty is controlled.
 */
export function generateBlueprint(
  cfg: BlueprintConfig & { scramble: number },
  seed: number,
): { bolts: Bolt[]; goal: number[][] } | null {
  const rng = new Rng(seed);
  const palette = rng.shuffle(Array.from({ length: 12 }, (_, i) => i)).slice(0, cfg.colors);
  const goal = blueprintGoal(cfg, palette);
  const stacks = goal.map((g) => [...g]);
  let last: [number, number] | null = null;
  for (let step = 0; step < cfg.scramble; step++) {
    const moves: [number, number][] = [];
    for (let a = 0; a < stacks.length; a++) {
      if (stacks[a].length === 0) continue;
      for (let b = 0; b < stacks.length; b++) {
        if (a === b || stacks[b].length >= cfg.cap) continue;
        if (last && last[0] === b && last[1] === a) continue;
        moves.push([a, b]);
      }
    }
    if (moves.length === 0) break;
    const [a, b] = rng.pick(moves);
    // Move 1..(run length) nuts from the top of a, as far as space allows.
    const top = stacks[a][stacks[a].length - 1];
    let run = 0;
    for (let k = stacks[a].length - 1; k >= 0 && stacks[a][k] === top; k--) run++;
    const n = Math.min(rng.int(1, run), cfg.cap - stacks[b].length);
    stacks[b].push(...stacks[a].splice(stacks[a].length - n, n));
    last = [a, b];
  }
  const bolts: Bolt[] = stacks.map((st) => ({ cap: cfg.cap, nuts: st.map((c) => ({ c })) }));
  // Most bolts must be off their drawing at the start.
  let matching = 0;
  bolts.forEach((b, i) => {
    if (b.nuts.length > 0 && b.nuts.length === goal[i].length && b.nuts.every((nut, k) => nut.c === goal[i][k]))
      matching++;
  });
  if (matching > Math.floor(cfg.colors / 3)) return null;
  return { bolts, goal };
}
