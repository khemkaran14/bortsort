import { describe, expect, it } from 'vitest';
import {
  addExtraBolt,
  applyMove,
  createState,
  dropCount,
  isComplete,
  isOpen,
  isStuck,
  isWon,
  legalMoves,
  liftGroup,
  status,
} from '../src';
import { bolts } from './helpers';

describe('basic rules', () => {
  it('lifts the top group of same-colored nuts', () => {
    const s = createState({ bolts: bolts(['ABB', 'A', '']) });
    expect(liftGroup(s, 0)).toEqual({ color: 1, count: 2 });
    expect(liftGroup(s, 2)).toBeNull();
  });

  it('drops onto an empty bolt or the same color only', () => {
    const s = createState({ bolts: bolts(['ABB', 'A', '']) });
    expect(dropCount(s, 0, 1)).toBe(0); // B onto A
    expect(dropCount(s, 0, 2)).toBe(2); // onto empty
    expect(dropCount(s, 1, 0)).toBe(0);
    expect(dropCount(s, 0, 0)).toBe(0); // same bolt = put back
  });

  it('moves as many as fit; the rest stay on the source', () => {
    const s = createState({ bolts: bolts(['ABBB', 'AAB', 'C']) });
    const n = applyMove(s, 0, 1)!;
    expect(n.bolts[1].nuts.map((x) => x.c)).toEqual([0, 0, 1, 1]);
    expect(n.bolts[0].nuts.map((x) => x.c)).toEqual([0, 1, 1]);
    expect(n.moves).toBe(1);
  });

  it('is immutable: the old state is untouched (undo = keep the old state)', () => {
    const s = createState({ bolts: bolts(['AB', '']) });
    applyMove(s, 0, 1);
    expect(s.bolts[0].nuts.length).toBe(2);
    expect(s.moves).toBe(0);
  });

  it('completes a bolt that holds every nut of one color and blocks picking it up', () => {
    const s = createState({ bolts: bolts(['AAA', 'BA', 'B', '']) });
    const n = applyMove(s, 1, 0)!;
    expect(isComplete(n, 0)).toBe(true);
    expect(liftGroup(n, 0)).toBeNull();
    expect(dropCount(n, 2, 0)).toBe(0);
  });

  it('wins when every bolt is empty or complete', () => {
    let s = createState({ bolts: bolts(['AAAB', 'BBB', '']) });
    expect(isWon(s)).toBe(false);
    s = applyMove(s, 0, 1)!;
    expect(isWon(s)).toBe(true);
    expect(status(s)).toBe('won');
  });

  it('detects "No moves left"', () => {
    const s = createState({ bolts: bolts(['ABAB', 'BABA']) });
    expect(legalMoves(s)).toHaveLength(0);
    expect(isStuck(s)).toBe(true);
    expect(status(s)).toBe('stuck');
  });

  it('Extra Bolt adds an empty bolt and unsticks the level', () => {
    const s = addExtraBolt(createState({ bolts: bolts(['ABAB', 'BABA']) }));
    expect(s.bolts).toHaveLength(3);
    expect(isStuck(s)).toBe(false);
  });

  it('supports capacity 5 and 6', () => {
    const s = createState({ bolts: bolts(['AAAAB', 'BBBBA', ''], 6) });
    expect(dropCount(s, 0, 1)).toBe(0);
    expect(dropCount(s, 0, 2)).toBe(1);
  });
});

describe('special mechanics', () => {
  it('hidden nuts: show as ? until they are on top; the lift stops at a hidden nut', () => {
    const b = bolts(['AAB', '', '', 'A']);
    b[0].nuts[0].h = true;
    b[0].nuts[1].h = true;
    b[0].nuts[2].h = true; // top is always revealed at start
    const s = createState({ bolts: b });
    expect(s.bolts[0].nuts[2].h).toBeUndefined();
    const n = applyMove(s, 0, 1)!;
    expect(n.bolts[0].nuts[1].h).toBeUndefined(); // new top revealed
    expect(n.bolts[0].nuts[0].h).toBe(true);
    expect(liftGroup(n, 0)).toEqual({ color: 0, count: 1 }); // stops at the hidden A below
  });

  it('locked bolt opens when a bolt of the key color is completed', () => {
    const b = bolts(['BBBA', 'AAA', 'B', '']);
    b[0].lock = 0; // locked until color A is completed
    let s = createState({ bolts: b });
    expect(isOpen(s, 0)).toBe(false);
    expect(liftGroup(s, 0)).toBeNull();
    expect(dropCount(s, 2, 0)).toBe(0);
    // A is complete only when all 4 As are together, so the A inside the lock blocks it:
    expect(legalMoves(s).some((m) => m.from === 0 || m.to === 0)).toBe(false);
    const b2 = bolts(['BBB', 'AAA', 'A', 'B']);
    b2[0].lock = 0;
    s = createState({ bolts: b2 });
    s = applyMove(s, 2, 1)!;
    expect(isComplete(s, 1)).toBe(true);
    expect(isOpen(s, 0)).toBe(true);
    s = applyMove(s, 3, 0)!;
    expect(isWon(s)).toBe(true);
  });

  it('frozen nut: cannot be lifted or dropped onto until enough moves are made', () => {
    const b = bolts(['A', 'BA', 'B', '', '']);
    b[0].nuts[0].f = 2; // thaws after 2 moves
    let s = createState({ bolts: b });
    expect(liftGroup(s, 0)).toBeNull();
    expect(dropCount(s, 1, 0)).toBe(0);
    s = applyMove(s, 1, 3)!; // move 1
    expect(dropCount(s, 3, 0)).toBe(0);
    s = applyMove(s, 2, 1)!; // move 2: now thawed
    expect(liftGroup(s, 0)).toEqual({ color: 0, count: 1 });
    expect(dropCount(s, 3, 0)).toBe(1);
  });

  it('frozen nut stops the lifted group', () => {
    const b = bolts(['AAA', '', 'A']);
    b[0].nuts[1].f = 5;
    const s = createState({ bolts: b });
    expect(liftGroup(s, 0)).toEqual({ color: 0, count: 1 });
  });

  it('short bolts hold only 2 or 3 nuts and complete with all nuts of a 2-nut color', () => {
    const b = bolts(['C', 'AAAA', 'CB', 'B']);
    b[0].cap = 2;
    b[2].cap = 2;
    b[3].cap = 2;
    let s = createState({ bolts: b });
    expect(dropCount(s, 2, 3)).toBe(1);
    s = applyMove(s, 2, 3)!;
    expect(isComplete(s, 3)).toBe(true);
    s = applyMove(s, 2, 0)!;
    expect(isWon(s)).toBe(true);
    expect(dropCount(createState({ bolts: bolts(['AA', 'A']).map((x) => ({ ...x, cap: 2 })) }), 1, 0)).toBe(0);
  });

  it('chained bolt is blocked until its linked bolt is completed', () => {
    const b = bolts(['BBB', 'AAA', 'A', 'B']);
    b[0].chain = 1;
    let s = createState({ bolts: b });
    expect(isOpen(s, 0)).toBe(false);
    expect(dropCount(s, 3, 0)).toBe(0);
    s = applyMove(s, 2, 1)!;
    expect(isOpen(s, 0)).toBe(true);
    expect(dropCount(s, 3, 0)).toBe(1);
  });

  it('move limit: out of moves when the limit is reached before winning', () => {
    let s = createState({ bolts: bolts(['AB', 'BA', '', '']), moveLimit: 1 });
    s = applyMove(s, 0, 2)!;
    expect(status(s)).toBe('outOfMoves');
  });
});
