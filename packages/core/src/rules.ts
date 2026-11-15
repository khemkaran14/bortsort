import type { Bolt, GameState, LevelDef, Move, Nut } from './types';

/**
 * The game rules. The game screen, the solver, the hint system and the level generator all call
 * these functions, so the rules are identical everywhere.
 */

function cloneBolt(b: Bolt): Bolt {
  const nb: Bolt = { cap: b.cap, nuts: b.nuts.map((n) => ({ ...n })) };
  if (b.lock !== undefined) nb.lock = b.lock;
  if (b.chain !== undefined) nb.chain = b.chain;
  if (b.magnet) nb.magnet = true;
  if (b.glue) nb.glue = true;
  return nb;
}

export function countColors(bolts: Bolt[]): number[] {
  const totals: number[] = [];
  for (const b of bolts) for (const n of b.nuts) totals[n.c] = (totals[n.c] ?? 0) + 1;
  for (let i = 0; i < totals.length; i++) totals[i] = totals[i] ?? 0;
  return totals;
}

/** Build the starting state of a level. The top nut of every bolt is always visible. */
export function createState(level: Pick<LevelDef, 'bolts' | 'moveLimit' | 'goal'>): GameState {
  const bolts = level.bolts.map(cloneBolt);
  for (const b of bolts) revealTop(b);
  const state: GameState = { bolts, moves: 0, totals: countColors(bolts) };
  if (level.moveLimit) state.moveLimit = level.moveLimit;
  if (level.goal) state.goal = level.goal;
  return state;
}

/** Copy a state's fixed settings (totals, move limit, blueprint) onto new bolts and move count. */
function derive(state: GameState, bolts: Bolt[], moves: number): GameState {
  const next: GameState = { bolts, moves, totals: state.totals };
  if (state.moveLimit) next.moveLimit = state.moveLimit;
  if (state.goal) next.goal = state.goal;
  return next;
}

/** Blueprint: does bolt i hold exactly the colors its drawing asks for? */
export function matchesGoal(state: GameState, i: number): boolean {
  const want = state.goal?.[i] ?? [];
  const nuts = state.bolts[i].nuts;
  if (nuts.length !== want.length) return false;
  for (let k = 0; k < nuts.length; k++) if (nuts[k].c !== want[k]) return false;
  return true;
}

function revealTop(b: Bolt): void {
  const top = b.nuts[b.nuts.length - 1];
  if (top && top.h) delete top.h;
}

export function isFrozen(nut: Nut | undefined, moves: number): boolean {
  return !!nut && nut.f !== undefined && moves < nut.f;
}

/** A bolt is complete when it holds every nut of a single color. Completed bolts are capped. */
export function isComplete(state: GameState, i: number): boolean {
  const b = state.bolts[i];
  if (b.nuts.length === 0) return false;
  // Blueprint levels: a bolt is done when it matches its drawing.
  if (state.goal) return matchesGoal(state, i);
  const c = b.nuts[0].c;
  if (b.nuts.length !== state.totals[c]) return false;
  for (const n of b.nuts) if (n.c !== c) return false;
  return true;
}

/** Locked and chained bolts cannot be used until their condition is met. */
export function isOpen(state: GameState, i: number): boolean {
  const b = state.bolts[i];
  if (b.lock !== undefined) {
    let opened = false;
    for (let j = 0; j < state.bolts.length; j++) {
      if (j !== i && isComplete(state, j) && state.bolts[j].nuts[0].c === b.lock) {
        opened = true;
        break;
      }
    }
    if (!opened) return false;
  }
  if (b.chain !== undefined && !isComplete(state, b.chain)) return false;
  return true;
}

/**
 * The group a tap lifts: the top run of same-colored nuts. The run stops at a hidden nut (players
 * only lift what they can see) and at a frozen nut. Returns null when the bolt cannot be lifted.
 */
export function liftGroup(state: GameState, i: number): { color: number; count: number } | null {
  const b = state.bolts[i];
  if (b.glue) return null; // glue: nuts stick for good
  if (b.nuts.length === 0 || !isOpen(state, i) || isComplete(state, i)) return null;
  const top = b.nuts[b.nuts.length - 1];
  if (isFrozen(top, state.moves)) return null;
  let count = 1;
  for (let k = b.nuts.length - 2; k >= 0; k--) {
    const n = b.nuts[k];
    if (n.c !== top.c || n.h || isFrozen(n, state.moves)) break;
    count++;
  }
  return { color: top.c, count };
}

/** How many nuts a drop from `from` onto `to` would move (0 = not allowed). */
export function dropCount(state: GameState, from: number, to: number): number {
  if (from === to) return 0;
  const g = liftGroup(state, from);
  if (!g) return 0;
  const t = state.bolts[to];
  if (!t || !isOpen(state, to) || isComplete(state, to)) return 0;
  const space = t.cap - t.nuts.length;
  if (space <= 0) return 0;
  const top = t.nuts[t.nuts.length - 1];
  if (top) {
    // Same color only, except on a magnet bolt and in Blueprint levels (any nut, wherever it fits).
    if (top.c !== g.color && !t.magnet && !state.goal) return 0;
    if (isFrozen(top, state.moves)) return 0;
  }
  return Math.min(g.count, space);
}

export function canMove(state: GameState, from: number, to: number): boolean {
  return dropCount(state, from, to) > 0;
}

/** Apply a move. Returns a new state, or null when the move is not allowed. */
export function applyMove(state: GameState, from: number, to: number): GameState | null {
  const n = dropCount(state, from, to);
  if (n === 0) return null;
  const bolts = state.bolts.slice();
  const src = cloneBolt(bolts[from]);
  const dst = cloneBolt(bolts[to]);
  const moved = src.nuts.splice(src.nuts.length - n, n);
  for (const m of moved) delete m.h;
  dst.nuts.push(...moved);
  revealTop(src);
  bolts[from] = src;
  bolts[to] = dst;
  const next = derive(state, bolts, state.moves + 1);
  // A completed bolt shows all its nuts.
  for (const i of [to]) {
    if (isComplete(next, i)) for (const nut of next.bolts[i].nuts) delete nut.h;
  }
  return next;
}

export function legalMoves(state: GameState): Move[] {
  const out: Move[] = [];
  for (let from = 0; from < state.bolts.length; from++) {
    if (!liftGroup(state, from)) continue;
    for (let to = 0; to < state.bolts.length; to++) {
      if (dropCount(state, from, to) > 0) out.push({ from, to });
    }
  }
  return out;
}

export function isWon(state: GameState): boolean {
  if (state.goal) {
    for (let i = 0; i < state.bolts.length; i++) if (!matchesGoal(state, i)) return false;
    return true;
  }
  for (let i = 0; i < state.bolts.length; i++) {
    if (state.bolts[i].nuts.length > 0 && !isComplete(state, i)) return false;
  }
  return true;
}

export function isOutOfMoves(state: GameState): boolean {
  return !!state.moveLimit && state.moves >= state.moveLimit && !isWon(state);
}

/** No legal move left (the game must then offer Undo, Restart or Extra Bolt). */
export function isStuck(state: GameState): boolean {
  return !isWon(state) && legalMoves(state).length === 0;
}

export type Status = 'playing' | 'won' | 'stuck' | 'outOfMoves';

export function status(state: GameState): Status {
  if (isWon(state)) return 'won';
  if (isOutOfMoves(state)) return 'outOfMoves';
  if (legalMoves(state).length === 0) return 'stuck';
  return 'playing';
}

/** Extra Bolt booster: add one empty, open bolt with the level's largest capacity. */
export function addExtraBolt(state: GameState): GameState {
  const cap = Math.max(...state.bolts.map((b) => b.cap));
  const next = derive(state, [...state.bolts, { cap, nuts: [] }], state.moves);
  if (state.goal) next.goal = [...state.goal, []];
  return next;
}

/**
 * True for a move that can never help: moving a whole single-color bolt onto an empty plain bolt of
 * the same size just swaps two equivalent bolts.
 */
export function isPointlessMove(state: GameState, m: Move): boolean {
  const src = state.bolts[m.from];
  const dst = state.bolts[m.to];
  if (state.goal) return false; // in Blueprint every bolt position matters
  if (dst.nuts.length !== 0 || dst.cap !== src.cap) return false;
  if (src.magnet || dst.magnet || src.glue || dst.glue) return false;
  if (src.lock !== undefined || src.chain !== undefined) return false;
  if (dst.lock !== undefined || dst.chain !== undefined) return false;
  for (const b of state.bolts) if (b.chain === m.from || b.chain === m.to) return false;
  const g = liftGroup(state, m.from);
  return !!g && g.count === src.nuts.length;
}
