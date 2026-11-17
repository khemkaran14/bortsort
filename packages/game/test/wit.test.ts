import { describe, expect, it } from 'vitest';
import { WIT_LEVELS } from '../src/wit/levels';

const ids = (s: string) => [...s.matchAll(/\{(\w+):[^}]*\}/g)].map((m) => m[1]).sort();

describe('Wit Twist puzzles', () => {
  it('has 100 puzzles, with puzzles for kids, everyone and engineers', () => {
    expect(WIT_LEVELS).toHaveLength(100);
    const tags = WIT_LEVELS.slice(50).map((l) => l.tag);
    for (const t of ['kids', 'all', 'eng']) expect(tags.filter((x) => x === t).length).toBeGreaterThanOrEqual(12);
  });

  it('every puzzle has question, hint and explanation in English and Hindi', () => {
    WIT_LEVELS.forEach((lv, i) => {
      for (const t of [lv.q, lv.hint, lv.why]) {
        expect(t.en.trim(), `puzzle ${i + 1}`).not.toBe('');
        expect(t.hi.trim(), `puzzle ${i + 1}`).not.toBe('');
      }
    });
  });

  it('tappable/draggable question words exist in both languages', () => {
    WIT_LEVELS.forEach((lv, i) => {
      expect(ids(lv.q.hi), `puzzle ${i + 1}`).toEqual(ids(lv.q.en));
      for (const d of lv.words?.drag ?? []) expect(ids(lv.q.en), `puzzle ${i + 1}`).toContain(d);
      if (lv.words?.tap || lv.words?.drop) expect(ids(lv.q.en).length, `puzzle ${i + 1}`).toBeGreaterThan(0);
    });
  });

  it('no two puzzles ask the same question', () => {
    const qs = WIT_LEVELS.map((l) => l.q.en);
    expect(new Set(qs).size).toBe(qs.length);
  });
});
