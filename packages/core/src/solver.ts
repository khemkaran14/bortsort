import { applyMove, isPointlessMove, isWon, legalMoves, liftGroup } from './rules';
import type { GameState, Move } from './types';

/**
 * Solver: A* search over game states. The heuristic is a proven lower bound on the moves still
 * needed and changes by at most 1 per move, so the first solution A* finds is optimal (the plan's
 * "breadth-first search for the best move count", but much faster). When a level is too big for an
 * exact search within the node budget, a weighted search finds a (not always optimal) solution,
 * which is the plan's depth-first fallback.
 */

export interface SolveOptions {
  /** Node budget for the exact search. */
  exactNodes?: number;
  /** Node budget for each fallback search. */
  fallbackNodes?: number;
}

export interface SolveResult {
  /** true = solvable, false = proven unsolvable, null = unknown (budget ran out). */
  solvable: boolean | null;
  /** Moves of the best solution found (empty when not solvable). */
  path: Move[];
  /** True when `path` is proven to be the shortest. */
  exact: boolean;
  /** States expanded in total. */
  nodes: number;
}

/** Canonical key: equivalent states (plain bolts of equal size in another order) share a key. */
export function stateKey(state: GameState, maxThaw = 0): string {
  const chainTargets = new Set<number>();
  for (const b of state.bolts) if (b.chain !== undefined) chainTargets.add(b.chain);
  const plain: string[] = [];
  const special: string[] = [];
  state.bolts.forEach((b, i) => {
    let s = b.cap.toString(36);
    for (const n of b.nuts) {
      s += String.fromCharCode(65 + n.c * 2 + (n.h ? 1 : 0));
      if (n.f !== undefined && state.moves < n.f) s += '~' + n.f;
    }
    if (b.lock === undefined && b.chain === undefined && !chainTargets.has(i)) plain.push(s);
    else special.push(i + ':' + s);
  });
  plain.sort();
  return plain.join(',') + '|' + special.join(',') + '|' + Math.min(state.moves, maxThaw);
}

/**
 * Admissible, consistent lower bound. For each color: every extra run of that color needs one
 * merge move, and if no run of it sits at the bottom of a bolt, one more move is needed to bring
 * it down. A move involves one color and lowers this count by at most one.
 */
export function heuristic(state: GameState): number {
  const runs: number[] = [];
  const grounded: boolean[] = [];
  for (const b of state.bolts) {
    let prev = -1;
    for (let k = 0; k < b.nuts.length; k++) {
      const c = b.nuts[k].c;
      if (c !== prev) {
        runs[c] = (runs[c] ?? 0) + 1;
        if (k === 0) grounded[c] = true;
        prev = c;
      }
    }
  }
  let h = 0;
  for (let c = 0; c < runs.length; c++) {
    if (!runs[c]) continue;
    h += runs[c] - 1 + (grounded[c] ? 0 : 1);
  }
  return h;
}

function maxThawOf(state: GameState): number {
  let m = 0;
  for (const b of state.bolts) for (const n of b.nuts) if (n.f !== undefined && n.f > m) m = n.f;
  return m;
}

interface Node {
  state: GameState;
  g: number;
  f: number;
  parent: Node | null;
  move: Move | null;
}

class Heap {
  private a: Node[] = [];
  get size() {
    return this.a.length;
  }
  private less(x: Node, y: Node) {
    return x.f < y.f || (x.f === y.f && x.g > y.g);
  }
  push(n: Node) {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): Node | undefined {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

/** Moves the solver considers from a state (legal moves minus pointless ones). */
export function searchMoves(state: GameState): Move[] {
  return legalMoves(state).filter((m) => !isPointlessMove(state, m));
}

function search(
  start: GameState,
  weight: number,
  budget: number,
): { node: Node | null; exhausted: boolean; nodes: number } {
  const maxThaw = maxThawOf(start);
  const best = new Map<string, number>();
  const heap = new Heap();
  heap.push({ state: start, g: 0, f: weight * heuristic(start), parent: null, move: null });
  best.set(stateKey(start, maxThaw), 0);
  let nodes = 0;
  while (heap.size > 0) {
    const cur = heap.pop()!;
    if (isWon(cur.state)) return { node: cur, exhausted: false, nodes };
    const key = stateKey(cur.state, maxThaw);
    if ((best.get(key) ?? Infinity) < cur.g) continue;
    if (++nodes > budget) return { node: null, exhausted: false, nodes };
    for (const m of searchMoves(cur.state)) {
      const next = applyMove(cur.state, m.from, m.to)!;
      const g = cur.g + 1;
      const k = stateKey(next, maxThaw);
      if ((best.get(k) ?? Infinity) <= g) continue;
      if (next.moveLimit && g + heuristic(next) > next.moveLimit) continue;
      best.set(k, g);
      heap.push({ state: next, g, f: g + weight * heuristic(next), parent: cur, move: m });
    }
  }
  return { node: null, exhausted: true, nodes };
}

function pathOf(node: Node): Move[] {
  const path: Move[] = [];
  for (let n: Node | null = node; n && n.move; n = n.parent) path.push(n.move);
  return path.reverse();
}

/** Solve from any position (used by the generator, the tests and the in-game Hint button). */
export function solve(state: GameState, opts: SolveOptions = {}): SolveResult {
  const exactNodes = opts.exactNodes ?? 200_000;
  const fallbackNodes = opts.fallbackNodes ?? 200_000;
  if (isWon(state)) return { solvable: true, path: [], exact: true, nodes: 0 };
  let total = 0;
  const exact = search(state, 1, exactNodes);
  total += exact.nodes;
  if (exact.node) return { solvable: true, path: pathOf(exact.node), exact: true, nodes: total };
  if (exact.exhausted) return { solvable: false, path: [], exact: true, nodes: total };
  for (const w of [2, 5]) {
    const r = search(state, w, fallbackNodes);
    total += r.nodes;
    if (r.node) return { solvable: true, path: pathOf(r.node), exact: false, nodes: total };
    if (r.exhausted) return { solvable: false, path: [], exact: true, nodes: total };
  }
  return { solvable: null, path: [], exact: false, nodes: total };
}

/**
 * Hint: the next move of a shortest (or best found) solution from the player's current position.
 * Budgets are small so it stays quick on a phone. Returns null when no solution is reachable,
 * in which case the game suggests Undo or Extra Bolt.
 */
export function hint(state: GameState): Move | null {
  const r = solve(state, { exactNodes: 25_000, fallbackNodes: 40_000 });
  if (r.solvable && r.path.length > 0) return r.path[0];
  return null;
}

/** Fraction of the top group a move lifts, useful for the UI to preview a hint. */
export function hintGroupSize(state: GameState, m: Move): number {
  return liftGroup(state, m.from)?.count ?? 0;
}
