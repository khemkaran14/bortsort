import { describe, expect, it } from 'vitest';
import {
  analyzeLevel,
  buildStage,
  coinsFor,
  countColors,
  createState,
  dailyLevel,
  findCandidate,
  generateLayout,
  isWon,
  applyMove,
  solve,
  starsFor,
  starThresholds,
} from '../src';

describe('generator', () => {
  it('is deterministic: the same seed gives the same level', () => {
    const cfg = { colors: 5, cap: 4, spare: 2 };
    expect(generateLayout(cfg, 99)).toEqual(generateLayout(cfg, 99));
  });

  it('every color has as many nuts as its bolt holds, including short bolts', () => {
    const b = generateLayout({ colors: 6, cap: 5, spare: 2, short: 2 }, 7)!;
    const caps = b
      .filter((x) => x.nuts.length > 0)
      .map((x) => x.cap)
      .sort();
    const totals = countColors(b).sort();
    expect(totals).toEqual(caps);
  });

  it('adds mechanics when asked', () => {
    const c = findCandidate({ colors: 5, cap: 4, spare: 2, lock: true, frozen: 2, hidden: 1 }, 3)!;
    expect(c).not.toBeNull();
    expect(c.bolts.some((b) => b.lock !== undefined)).toBe(true);
    expect(c.bolts.flatMap((b) => b.nuts).filter((n) => n.f !== undefined)).toHaveLength(2);
    expect(c.bolts.flatMap((b) => b.nuts).some((n) => n.h)).toBe(true);
  });

  it('scores harder layouts higher', () => {
    const easy = findCandidate({ colors: 3, cap: 4, spare: 2 }, 1)!;
    const hard = findCandidate({ colors: 8, cap: 5, spare: 2 }, 1)!;
    expect(hard.score).toBeGreaterThan(easy.score);
  });

  it('analyzeLevel reports dead ends and winning first moves', () => {
    const c = findCandidate({ colors: 5, cap: 4, spare: 1 }, 11)!;
    const s = analyzeLevel(c.bolts);
    expect(s.firstMoves).toBeGreaterThan(0);
    expect(s.deadEndRatio).toBeGreaterThanOrEqual(0);
    expect(s.deadEndRatio).toBeLessThanOrEqual(1);
  });

  it('builds a full stage of 50 solvable levels with the sawtooth kinds', () => {
    const st = buildStage(1, 1, { candidates: 2 });
    expect(st.levels).toHaveLength(50);
    expect(st.levels.map((l) => l.id)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(st.levels[9].kind).toBe('boss');
    expect(st.levels[7].kind).toBe('hard');
    expect(st.levels[8].kind).toBe('breather');
    expect(st.levels[0].kind).toBe('tutorial');
    for (const l of st.levels) {
      let s = createState(l);
      for (const m of solve(s).path) s = applyMove(s, m.from, m.to)!;
      expect(isWon(s)).toBe(true);
      expect(l.stars).toEqual(starThresholds(l.best));
    }
  }, 120000);

  it('daily level is the same for everyone on a date and differs between dates', () => {
    const a = dailyLevel('2026-11-15');
    expect(dailyLevel('2026-11-15')).toEqual(a);
    expect(dailyLevel('2026-11-16').bolts).not.toEqual(a.bolts);
  });
});

describe('stars and coins', () => {
  const level = {
    stars: starThresholds(10) as [number, number],
    kind: 'normal' as const,
    difficulty: 'normal' as const,
  };
  it('3 stars at best+2, 2 stars under best+6, else 1', () => {
    expect(starsFor(level, 10)).toBe(3);
    expect(starsFor(level, 12)).toBe(3);
    expect(starsFor(level, 13)).toBe(2);
    expect(starsFor(level, 15)).toBe(2);
    expect(starsFor(level, 16)).toBe(1);
  });
  it('more coins for Boss and 3 stars; small amount on replays', () => {
    expect(coinsFor(level, 1, 0)).toBe(10);
    expect(coinsFor(level, 3, 0)).toBe(20);
    expect(coinsFor({ ...level, kind: 'boss' }, 3, 0)).toBe(50);
    expect(coinsFor(level, 3, 1)).toBe(10);
    expect(coinsFor(level, 2, 3)).toBe(2);
  });
});
