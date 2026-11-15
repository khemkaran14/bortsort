import { describe, expect, it } from 'vitest';
import { applyMove, createState, heuristic, hint, isWon, solve, stateKey } from '../src';
import { bolts } from './helpers';

function replay(start: ReturnType<typeof createState>, path: { from: number; to: number }[]) {
  let s = start;
  for (const m of path) {
    const n = applyMove(s, m.from, m.to);
    expect(n).not.toBeNull();
    s = n!;
  }
  return s;
}

/** Plain breadth-first search, used to check that A* returns the true optimum. */
function bfsBest(start: ReturnType<typeof createState>): number {
  const seen = new Set([stateKey(start)]);
  let frontier = [start];
  for (let d = 0; d < 40; d++) {
    const next: typeof frontier = [];
    for (const s of frontier) {
      if (isWon(s)) return d;
      for (let f = 0; f < s.bolts.length; f++)
        for (let t = 0; t < s.bolts.length; t++) {
          const n = applyMove(s, f, t);
          if (!n) continue;
          const k = stateKey(n);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push(n);
        }
    }
    frontier = next;
  }
  return -1;
}

describe('solver', () => {
  it('solves and the solution replays to a win', () => {
    const s = createState({ bolts: bolts(['ABCA', 'BCAB', 'CABC', '', '']) });
    const r = solve(s);
    expect(r.solvable).toBe(true);
    expect(r.exact).toBe(true);
    expect(isWon(replay(s, r.path))).toBe(true);
  });

  it('finds the optimal move count (matches plain BFS)', () => {
    for (const spec of [
      ['ABAB', 'BABA', '', ''],
      ['ABCA', 'BCAB', 'CABC', '', ''],
      ['AABC', 'CBBA', 'CABC', '', ''],
    ]) {
      const s = createState({ bolts: bolts(spec) });
      expect(solve(s).path.length).toBe(bfsBest(s));
    }
  });

  it('proves a level unsolvable', () => {
    const r = solve(createState({ bolts: bolts(['ABAB', 'BABA']) }));
    expect(r.solvable).toBe(false);
  });

  it('heuristic is 0 when won and never above the true distance', () => {
    const won = createState({ bolts: bolts(['AAAA', 'BBBB', '']) });
    expect(heuristic(won)).toBe(0);
    const s = createState({ bolts: bolts(['ABCA', 'BCAB', 'CABC', '', '']) });
    expect(heuristic(s)).toBeLessThanOrEqual(solve(s).path.length);
  });

  it('handles every mechanic (lock, chain, frozen, hidden, short)', () => {
    const b = bolts(['BBA', 'AAB', 'CC', 'CB', '', '']);
    b[0].lock = 2; // opens when C completes
    b[0].nuts[0].h = true;
    b[1].nuts[0].f = 3;
    b[2].cap = 2;
    b[3].cap = 4;
    const s = createState({ bolts: b });
    const r = solve(s);
    expect(r.solvable).toBe(true);
    expect(isWon(replay(s, r.path))).toBe(true);
  });

  it('respects a move limit', () => {
    const spec = ['ABCA', 'BCAB', 'CABC', '', ''];
    const best = solve(createState({ bolts: bolts(spec) })).path.length;
    expect(solve(createState({ bolts: bolts(spec), moveLimit: best })).solvable).toBe(true);
    expect(solve(createState({ bolts: bolts(spec), moveLimit: best - 1 })).solvable).toBe(false);
  });

  it('hint gives a move that keeps the level solvable from the current position', () => {
    let s = createState({ bolts: bolts(['ABCA', 'BCAB', 'CABC', '', '']) });
    for (let i = 0; i < 40 && !isWon(s); i++) {
      const m = hint(s);
      expect(m).not.toBeNull();
      s = applyMove(s, m!.from, m!.to)!;
    }
    expect(isWon(s)).toBe(true);
  });

  it('hint returns null in a dead end', () => {
    expect(hint(createState({ bolts: bolts(['ABAB', 'BABA']) }))).toBeNull();
  });
});
