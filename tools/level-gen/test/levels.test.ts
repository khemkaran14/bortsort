import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMove, createState, isWon, solve, starThresholds, type StageFile } from '@bolt-sort/core';

const dir = resolve(__dirname, '../../../packages/game/public/levels');
const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as {
  stages: { file: string }[];
  modes: { blueprint: string };
};
const stages = index.stages.map((s) => JSON.parse(readFileSync(join(dir, s.file), 'utf8')) as StageFile);
const levels = stages.flatMap((s) => s.levels);

describe('shipped levels', () => {
  it('has 600 levels numbered 1..600 in 12 stages', () => {
    expect(stages).toHaveLength(12);
    expect(levels.map((l) => l.id)).toEqual(Array.from({ length: 600 }, (_, i) => i + 1));
  });

  it('follows the sawtooth: Hard at 8, breather at 9, Boss at 10 of each block', () => {
    for (const l of levels) {
      const slot = ((l.id - 1) % 10) + 1;
      if (slot === 10) expect(l.kind).toBe('boss');
      if (slot === 8) expect(l.kind).toBe('hard');
      if (slot === 9) expect(l.kind).toBe('breather');
      expect(l.stars).toEqual(starThresholds(l.best));
      if (l.moveLimit) expect(l.moveLimit).toBeGreaterThan(l.best);
    }
  });

  it('teaches each stage mechanic in its first level', () => {
    const want = [
      'basics',
      'oneSpare',
      'hidden',
      'tall',
      'lock',
      'frozen',
      'short',
      'moveLimit',
      'chain',
      'basics',
      'magnet',
      'glue',
    ];
    stages.forEach((s, i) => expect(s.levels[0].teaches).toBe(want[i]));
  });

  it('stage 11 uses magnet trays and stage 12 glue bolts', () => {
    expect(stages[10].levels.filter((l) => l.bolts.some((b) => b.magnet)).length).toBeGreaterThan(30);
    expect(stages[11].levels.filter((l) => l.bolts.some((b) => b.glue)).length).toBeGreaterThan(30);
  });

  it('ships 60 Blueprint levels whose drawings use the same nuts as the start', () => {
    const bp = JSON.parse(readFileSync(join(dir, index.modes.blueprint), 'utf8')) as StageFile;
    expect(bp.levels).toHaveLength(60);
    for (const l of bp.levels) {
      const have = l.bolts.flatMap((b) => b.nuts.map((n) => n.c)).sort();
      const want = l.goal!.flat().sort();
      expect(have).toEqual(want);
      if (l.id % 6 === 1) {
        const r = solve(createState(l));
        expect(r.solvable).toBe(true);
        expect(r.path.length).toBeLessThanOrEqual(l.best);
      }
    }
  });

  it('a sample of levels re-solves to a win in the stored best move count', () => {
    for (const l of levels.filter((x) => x.id % 25 === 1 || x.stage <= 2)) {
      const start = createState(l);
      const r = solve(start);
      expect(r.solvable, `level ${l.id}`).toBe(true);
      expect(r.path.length, `level ${l.id}`).toBeLessThanOrEqual(l.best);
      let s = start;
      for (const m of r.path) s = applyMove(s, m.from, m.to)!;
      expect(isWon(s)).toBe(true);
    }
  });
});
