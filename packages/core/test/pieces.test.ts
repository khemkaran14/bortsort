import { describe, expect, it } from 'vitest';
import {
  applyMove,
  blueprintGoal,
  blueprintHeuristic,
  createState,
  dropCount,
  findBlueprint,
  findCandidate,
  generateLayout,
  hint,
  isComplete,
  isWon,
  liftGroup,
  quickLevel,
  rushConfig,
  solve,
  status,
} from '../src';
import { bolts } from './helpers';

function replay(s: ReturnType<typeof createState>, path: { from: number; to: number }[]) {
  for (const m of path) s = applyMove(s, m.from, m.to)!;
  return s;
}

describe('magnet bolt', () => {
  it('accepts any color on top; normal bolts still need the same color', () => {
    const b = bolts(['AB', 'BA', 'A', '']);
    b[3].magnet = true;
    b[3].nuts = [{ c: 1 }];
    const s = createState({ bolts: b });
    expect(dropCount(s, 2, 3)).toBe(1); // A onto a B, allowed on the magnet
    expect(dropCount(s, 2, 0)).toBe(0); // A onto B on a normal bolt: not allowed
  });

  it('you lift only the top run from a magnet bolt, and it must end empty or complete', () => {
    const b = bolts(['AAA', 'BBB', 'AB']);
    b[2].magnet = true;
    let s = createState({ bolts: b });
    expect(liftGroup(s, 2)).toEqual({ color: 1, count: 1 });
    expect(isWon(s)).toBe(false);
    s = applyMove(s, 2, 1)!;
    s = applyMove(s, 2, 0)!;
    expect(isWon(s)).toBe(true);
  });

  it('solver uses the magnet tray', () => {
    const c = findCandidate({ colors: 5, cap: 5, spare: 1, magnet: true }, 5)!;
    expect(c).not.toBeNull();
    expect(c.bolts.some((x) => x.magnet)).toBe(true);
    const s = createState({ bolts: c.bolts });
    expect(isWon(replay(s, solve(s).path))).toBe(true);
  });
});

describe('glue bolt', () => {
  it('nuts can be dropped in but never lifted out', () => {
    const b = bolts(['A', 'AA', 'AB', 'BBB', '']);
    b[0].glue = true;
    let s = createState({ bolts: b });
    expect(liftGroup(s, 0)).toBeNull();
    expect(dropCount(s, 1, 0)).toBe(2);
    s = applyMove(s, 1, 0)!;
    expect(liftGroup(s, 0)).toBeNull();
    s = applyMove(s, 2, 3)!;
    s = applyMove(s, 2, 0)!;
    expect(isComplete(s, 0)).toBe(true);
    expect(isWon(s)).toBe(true);
  });

  it('a wrong color dropped on glue is stuck for good (dead end)', () => {
    const b = bolts(['A', 'AAAB', 'BBB', '']);
    b[0].glue = true;
    let s = createState({ bolts: b });
    s = applyMove(s, 1, 3)!; // B to spare
    s = applyMove(s, 3, 2)!; // B complete
    expect(isWon(s)).toBe(false);
    expect(solve(s).solvable).toBe(true);
  });

  it('generator glues one nut and keeps the level solvable', () => {
    const c = findCandidate({ colors: 5, cap: 5, spare: 2, glue: true }, 9)!;
    const glue = c.bolts.find((x) => x.glue)!;
    expect(glue.nuts).toHaveLength(1);
    const s = createState({ bolts: c.bolts });
    expect(isWon(replay(s, solve(s).path))).toBe(true);
  });

  it('adding new pieces leaves older settings unchanged (shipped levels stay the same)', () => {
    const cfg = { colors: 6, cap: 4, spare: 2, hidden: 0.5, lock: true };
    const a = generateLayout(cfg, 1234);
    const b = generateLayout({ ...cfg }, 1234);
    expect(a).toEqual(b);
    expect(a!.some((x) => x.magnet || x.glue)).toBe(false);
  });
});

describe('blueprint mode', () => {
  it('every color keeps exactly `cap` nuts in each pattern', () => {
    for (const pattern of ['steps', 'halves', 'sandwich'] as const) {
      const goal = blueprintGoal({ colors: 5, cap: 4, spare: 2, pattern }, [0, 1, 2, 3, 4]);
      const counts = new Map<number, number>();
      for (const g of goal) for (const c of g) counts.set(c, (counts.get(c) ?? 0) + 1);
      for (const v of counts.values()) expect(v).toBe(4);
    }
  });

  it('wins only when every bolt matches its drawing; any nut may be dropped on any nut', () => {
    const b = bolts(['BA', 'AB', ''], 2);
    const goal = [[0, 1], [1, 0], []];
    let s = createState({ bolts: b, goal });
    expect(dropCount(s, 0, 1)).toBe(0); // bolt 1 already full
    s = applyMove(s, 0, 2)!; // A to spare
    expect(dropCount(s, 1, 0)).toBe(1); // B onto B (fine) …
    s = applyMove(s, 1, 2)!; // … but B onto A on the spare is also allowed here
    expect(s.bolts[2].nuts.map((n) => n.c)).toEqual([0, 1]);
    expect(isWon(s)).toBe(false);
    // With so little room the swap is impossible; one more empty bolt makes it solvable.
    expect(solve(createState({ bolts: bolts(['BA', 'AB', ''], 2), goal })).solvable).toBe(false);
    const roomy = { bolts: bolts(['BA', 'AB', '', ''], 2), goal: [...goal, []] };
    const r = solve(createState(roomy));
    expect(r.solvable).toBe(true);
    expect(isWon(replay(createState(roomy), r.path))).toBe(true);
  });

  it('a bolt matching its drawing is capped and locked in place', () => {
    const goal = [[0, 1], [1, 0], []];
    const s = createState({ bolts: bolts(['AB', 'BA', '']), goal });
    expect(isComplete(s, 0)).toBe(true);
    expect(status(s)).toBe('won');
  });

  it('heuristic is a lower bound', () => {
    const c = findBlueprint({ colors: 4, cap: 4, spare: 2, pattern: 'steps', scramble: 10 }, 77)!;
    const s = createState({ bolts: c.bolts, goal: c.goal });
    expect(blueprintHeuristic(s)).toBeLessThanOrEqual(solve(s).path.length);
  });

  it('hint works in blueprint levels', () => {
    const c = findBlueprint({ colors: 3, cap: 4, spare: 2, pattern: 'halves', scramble: 8 }, 3)!;
    let s = createState({ bolts: c.bolts, goal: c.goal });
    for (let i = 0; i < 60 && !isWon(s); i++) s = applyMove(s, hint(s)!.from, hint(s)!.to)!;
    expect(isWon(s)).toBe(true);
  });
});

describe('quick levels (Zen and Rush)', () => {
  it('are deterministic, solvable and fast', () => {
    const t = Date.now();
    for (let i = 0; i < 10; i++) {
      const l = quickLevel(rushConfig(i), 100 + i);
      expect(l).toEqual(quickLevel(rushConfig(i), 100 + i));
      const s = createState(l);
      expect(isWon(replay(s, solve(s).path))).toBe(true);
    }
    expect(Date.now() - t).toBeLessThan(10000);
  });
});
