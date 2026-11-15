import { analyzeLevel, difficultyScore, labelFor, type LevelStats } from './analyze';
import { generateLayout, mechanicsOf, type GenConfig } from './generator';
import { moveLimitFor, starThresholds } from './progress';
import { hashString, Rng } from './rng';
import { stateKey } from './solver';
import { createState } from './rules';
import { LEVELS_PER_STAGE, STAGES, type StageSpec } from './stages';
import type { Bolt, LevelDef, LevelKind, StageFile } from './types';

export interface Candidate {
  seed: number;
  cfg: GenConfig;
  bolts: Bolt[];
  stats: LevelStats;
  score: number;
}

export interface BuildOptions {
  /** Solvable candidates scored per level slot; the slot's target picks one. */
  candidates?: number;
  /** Max seeds tried per candidate before giving up. */
  attempts?: number;
  exactNodes?: number;
  fallbackNodes?: number;
  onProgress?: (msg: string) => void;
}

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

export function kindOfSlot(slot: number, index: number): LevelKind {
  if (slot === 10) return 'boss';
  if (slot === 8) return 'hard';
  if (slot === 9) return 'breather';
  if (index === 0) return 'tutorial';
  return 'normal';
}

/** Settings for a level slot (0-based index within the stage), following the sawtooth curve. */
export function configFor(spec: StageSpec, index: number, rng: Rng): GenConfig {
  const slot = (index % 10) + 1;
  const kind = kindOfSlot(slot, index);
  const t = index / (LEVELS_PER_STAGE - 1);
  let colors = lerp(spec.colors[0], spec.colors[1], t * 0.85);
  if (kind === 'boss' || kind === 'hard') colors = Math.min(spec.colors[1], colors + 1);
  if (kind === 'breather') colors = Math.max(spec.colors[0], colors - 1);
  if (spec.stage === 1 && index < 3) colors = 3; // the 3 tutorial levels
  const cap = spec.cap[0] === spec.cap[1] ? spec.cap[0] : rng.int(spec.cap[0], spec.cap[1]);
  const cfg: GenConfig = { colors, cap, spare: 2 };
  const uses = new Set(spec.uses);
  const isNew = (m: string) => spec.introduces === m;
  // The first level of a stage teaches its new idea, with few colors.
  if (index === 0 && spec.introduces !== 'basics') cfg.colors = spec.colors[0];
  const want = (m: string, p: number) =>
    uses.has(m as never) && (index === 0 ? isNew(m) : rng.chance(isNew(m) ? p : p * 0.35));

  if (want('oneSpare', kind === 'hard' || kind === 'boss' ? 0.8 : 0.35)) {
    cfg.spare = 1;
    cfg.colors = Math.max(3, cfg.colors - 1);
  }
  if (want('hidden', 0.75)) cfg.hidden = index === 0 ? 1 : 0.6;
  if (want('lock', 0.7)) cfg.lock = true;
  if (want('frozen', 0.7)) cfg.frozen = index === 0 ? 1 : rng.int(1, 3);
  if (want('short', 0.7)) cfg.short = index === 0 ? 1 : rng.int(1, 2);
  if (want('chain', 0.7)) cfg.chain = true;
  if (want('moveLimit', kind === 'boss' ? 1 : 0.5)) cfg.moveLimit = true;
  if (spec.stage === 10 && index > 0) {
    // Finale: mix two random mechanics into most levels.
    const pool = ['hidden', 'lock', 'frozen', 'short', 'chain', 'moveLimit'] as const;
    for (let k = 0; k < 2; k++) {
      const m = rng.pick(pool);
      if (m === 'hidden') cfg.hidden = 0.5;
      if (m === 'lock') cfg.lock = true;
      if (m === 'frozen') cfg.frozen = rng.int(1, 3);
      if (m === 'short') cfg.short = 1;
      if (m === 'chain') cfg.chain = true;
      if (m === 'moveLimit') cfg.moveLimit = true;
    }
  }
  return cfg;
}

/** Try seeds until a solvable candidate appears. */
export function findCandidate(cfg: GenConfig, seed0: number, opts: BuildOptions = {}): Candidate | null {
  const attempts = opts.attempts ?? 40;
  for (let a = 0; a < attempts; a++) {
    const seed = (seed0 + a * 7919) >>> 0;
    const bolts = generateLayout(cfg, seed);
    if (!bolts) continue;
    const stats = analyzeLevel(bolts, {
      exactNodes: opts.exactNodes,
      fallbackNodes: opts.fallbackNodes,
      seed,
      playouts: 40,
    });
    if (stats.solvable !== true) continue;
    // Too trivial to be fun.
    if (stats.best < Math.min(4, cfg.colors + 1)) continue;
    return { seed, cfg, bolts, stats, score: difficultyScore(stats, mechanicsOf(cfg)) };
  }
  return null;
}

/** Where in the sorted candidate list each slot picks: rises 1→7, Hard at 8, breather 9, Boss 10. */
export function slotTarget(slot: number): number {
  if (slot === 10) return 1;
  if (slot === 9) return 0;
  if (slot === 8) return 0.85;
  return 0.1 + ((slot - 1) / 6) * 0.55;
}

function toLevel(c: Candidate, id: number, stage: number, kind: LevelKind): LevelDef {
  const best = c.stats.best;
  const lvl: LevelDef = {
    id,
    stage,
    seed: c.seed,
    bolts: c.bolts,
    best,
    bestExact: c.stats.bestExact,
    stars: starThresholds(best),
    difficulty: 'normal',
    kind,
    score: c.score,
    mechanics: mechanicsOf(c.cfg),
  };
  if (c.cfg.moveLimit) lvl.moveLimit = moveLimitFor(best);
  return lvl;
}

/** Build all 50 levels of a stage: generate, solve, score, pick along the curve, label. */
export function buildStage(stage: number, seed: number, opts: BuildOptions = {}): StageFile {
  const spec = STAGES[stage - 1];
  if (!spec) throw new Error(`Unknown stage ${stage}`);
  const want = opts.candidates ?? 5;
  const firstId = (stage - 1) * LEVELS_PER_STAGE + 1;
  const seen = new Set<string>();
  const levels: LevelDef[] = [];
  for (let index = 0; index < LEVELS_PER_STAGE; index++) {
    const slot = (index % 10) + 1;
    const kind = kindOfSlot(slot, index);
    const rng = new Rng(hashString(`stage${stage}:slot${index}:${seed}`));
    const cfg = configFor(spec, index, rng);
    const pool: Candidate[] = [];
    const tries = index === 0 || (stage === 1 && index < 3) ? 1 : want;
    for (let k = 0; k < tries * 3 && pool.length < tries; k++) {
      const c = findCandidate(cfg, rng.int(1, 2 ** 31 - 1), opts);
      if (!c) continue;
      const key = stateKey(createState({ bolts: c.bolts }));
      if (seen.has(key)) continue; // reject duplicates
      pool.push(c);
    }
    if (pool.length === 0) {
      // Relax: one fewer color until something solvable comes out.
      let relaxed = { ...cfg };
      let c: Candidate | null = null;
      while (!c && relaxed.colors > 3) {
        relaxed = { ...relaxed, colors: relaxed.colors - 1 };
        c = findCandidate(relaxed, rng.int(1, 2 ** 31 - 1), opts);
      }
      if (!c) throw new Error(`Stage ${stage} level ${index + 1}: no solvable candidate`);
      pool.push(c);
    }
    pool.sort((a, b) => a.score - b.score);
    const pickIndex = Math.round(slotTarget(slot) * (pool.length - 1));
    // Tutorials are always the easiest candidate.
    const chosen = kind === 'tutorial' ? pool[0] : pool[pickIndex];
    seen.add(stateKey(createState({ bolts: chosen.bolts })));
    const lvl = toLevel(chosen, firstId + index, stage, kind);
    if (index === 0) lvl.teaches = spec.introduces;
    if (stage === 1 && index === 1) lvl.teaches = 'undo';
    if (stage === 1 && index === 2) lvl.teaches = 'hint';
    if (stage === 1 && index < 3) lvl.kind = 'tutorial';
    levels.push(lvl);
    opts.onProgress?.(`stage ${stage} level ${lvl.id}: best ${lvl.best}${lvl.bestExact ? '' : '*'} score ${lvl.score}`);
  }
  // Label from score percentile inside the stage; Boss levels are always at least Hard.
  const sorted = levels.map((l) => l.score).sort((a, b) => a - b);
  for (const l of levels) {
    const below = sorted.filter((s) => s < l.score).length;
    l.difficulty = labelFor(below / Math.max(1, sorted.length - 1));
    if (l.kind === 'boss' && l.difficulty === 'normal') l.difficulty = 'hard';
    if (l.kind === 'tutorial' || l.kind === 'breather') l.difficulty = 'normal';
  }
  return { stage, theme: spec.theme, version: 1, levels };
}

/**
 * Daily Challenge: the same level for every player on a given date (YYYY-MM-DD), generated on
 * the device from a seed, so it works offline. Difficulty follows the weekday (harder at weekends).
 */
export function dailyLevel(date: string): LevelDef {
  const rng = new Rng(hashString('daily:' + date));
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  const colors = [7, 5, 5, 6, 6, 6, 7][day];
  const cfg: GenConfig = { colors, cap: 4, spare: 2 };
  if (rng.chance(0.4)) cfg.hidden = 0.5;
  else if (rng.chance(0.3)) cfg.lock = true;
  for (let k = 0; k < 20; k++) {
    const c = findCandidate(cfg, rng.int(1, 2 ** 31 - 1), { attempts: 10, exactNodes: 30_000, fallbackNodes: 30_000 });
    if (c) {
      const lvl = toLevel(c, 0, 0, 'normal');
      lvl.difficulty = colors >= 7 ? 'hard' : 'normal';
      return lvl;
    }
  }
  throw new Error('No daily level');
}
