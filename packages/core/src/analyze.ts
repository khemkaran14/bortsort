import { Rng } from './rng';
import { applyMove, createState, isWon } from './rules';
import { searchMoves, solve, type SolveOptions } from './solver';
import type { Bolt, Difficulty, Mechanic, Move } from './types';

export interface LevelStats {
  solvable: boolean | null;
  best: number;
  bestExact: boolean;
  solution: Move[];
  /** Share of random playouts that ended with no legal move. */
  deadEndRatio: number;
  /** Legal first moves from which the level can still be won. */
  winningFirstMoves: number;
  firstMoves: number;
  spare: number;
}

export interface AnalyzeOptions extends SolveOptions {
  playouts?: number;
  seed?: number;
}

/** Solve a level and measure how much planning it needs. */
export function analyzeLevel(bolts: Bolt[], opts: AnalyzeOptions = {}, goal?: number[][]): LevelStats {
  const start = createState({ bolts, goal });
  const spare = bolts.filter((b) => b.nuts.length === 0).length;
  const r = solve(start, opts);
  const stats: LevelStats = {
    solvable: r.solvable,
    best: r.path.length,
    bestExact: r.exact,
    solution: r.path,
    deadEndRatio: 0,
    winningFirstMoves: 0,
    firstMoves: 0,
    spare,
  };
  if (!r.solvable) return stats;

  // Which first moves keep the level winnable?
  const first = searchMoves(start);
  stats.firstMoves = first.length;
  for (const m of first) {
    const next = applyMove(start, m.from, m.to)!;
    const cr = solve(next, { exactNodes: 2_000, fallbackNodes: 15_000 });
    if (cr.solvable !== false) stats.winningFirstMoves++;
  }

  // Random playouts: how often does an unplanned player paint themselves into a corner?
  const rng = new Rng(opts.seed ?? 12345);
  const playouts = opts.playouts ?? 60;
  const maxSteps = stats.best * 4 + 20;
  let deadEnds = 0;
  for (let p = 0; p < playouts; p++) {
    let s = start;
    let last: Move | null = null;
    let ended = false;
    for (let step = 0; step < maxSteps; step++) {
      if (isWon(s)) {
        ended = true;
        break;
      }
      const moves = searchMoves(s).filter((m) => !(last && m.from === last.to && m.to === last.from));
      if (moves.length === 0) {
        deadEnds++;
        ended = true;
        break;
      }
      const m = rng.pick(moves);
      s = applyMove(s, m.from, m.to)!;
      last = m;
    }
    if (!ended) deadEnds += 0.5; // wandered without progress: half a dead end
  }
  stats.deadEndRatio = deadEnds / playouts;
  return stats;
}

/** Difficulty score from the plan: best moves, dead-end ratio, spare bolts and mechanics. */
export function difficultyScore(stats: LevelStats, mechanics: Mechanic[]): number {
  const trapShare = stats.firstMoves > 0 ? 1 - stats.winningFirstMoves / stats.firstMoves : 0;
  const mech = mechanics.filter((m) => m !== 'tall' && m !== 'oneSpare').length;
  const score =
    stats.best * 1.0 +
    stats.deadEndRatio * 25 +
    trapShare * 10 +
    (stats.spare < 2 ? 6 : 0) +
    mech * 4 +
    (mechanics.includes('tall') ? 3 : 0);
  return Math.round(score * 10) / 10;
}

/** Labels from score percentiles inside a stage. */
export function labelFor(percentile: number): Difficulty {
  if (percentile >= 0.9) return 'superhard';
  if (percentile >= 0.72) return 'hard';
  return 'normal';
}
