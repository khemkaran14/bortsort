import type Phaser from 'phaser';

/** Text in every supported language. */
export interface L {
  en: string;
  hi: string;
}

/** Anything on the puzzle screen the player can touch. */
export interface WitObj {
  name: string;
  go: Phaser.GameObjects.Container;
  /** Where the object started (for snapping back). */
  home: { x: number; y: number };
  /** Can be dragged. A short touch without moving counts as a tap. */
  drag: boolean;
  onTap?: (o: WitObj) => void;
  onDrop?: (o: WitObj) => void;
  /** For question words: the id from {id:text} markup. */
  tokenId?: string;
}

export interface Area {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
  cy: number;
}

export interface ObjOpts {
  tap?: (o: WitObj) => void;
  drop?: (o: WitObj) => void;
  drag?: boolean;
  depth?: number;
}

/** What a level can do. Levels only use this, never Phaser directly (except inside draw()). */
export interface WitCtx {
  scene: Phaser.Scene;
  A: Area;
  /** Free per-level storage. */
  state: Record<string, unknown>;
  L(l: L): string;
  emoji(name: string, ch: string, x: number, y: number, size?: number, opts?: ObjOpts): WitObj;
  label(name: string, s: string, x: number, y: number, size?: number, opts?: ObjOpts & { color?: string }): WitObj;
  draw(
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
    fn: (g: Phaser.GameObjects.Graphics) => void,
    opts?: ObjOpts,
  ): WitObj;
  /** A rounded button-like object. */
  pill(name: string, s: string, x: number, y: number, w: number, h: number, color: number, opts?: ObjOpts): WitObj;
  get(name: string): WitObj;
  has(name: string): boolean;
  remove(name: string): void;
  /** Tween an object back to where it started. */
  back(o: WitObj): void;
  /** Distance between an object and a point or another object. */
  dist(o: WitObj, to: WitObj | { x: number; y: number }): number;
  win(): void;
  wrong(msg?: L): void;
  say(msg: L): void;
  /** Number pad at the bottom of the play area; the right answer wins. */
  keypad(answer: string): void;
  /** Answer buttons at the bottom of the play area. */
  choices(labels: (L | string)[], correct: number): void;
  /** Center of the space left above a keypad or answer buttons. */
  figY(kind: 'keypad' | 'choices', rows?: number): number;
  after(ms: number, fn: () => void): void;
  every(ms: number, fn: () => void): void;
  /** Called for any touch inside the play area. */
  onAnyTap(fn: () => void): void;
  /** Question word with this id (from {id:text} markup). */
  word(id: string): WitObj;
  solved: boolean;
}

/** Scripted solution used by the automated test that plays every level. */
export interface SolveApi {
  tap(name: string): Promise<void>;
  drag(name: string, to: string | { x: number; y: number }): Promise<void>;
  tapWord(id: string): Promise<void>;
  dragWord(id: string, to: string | { x: number; y: number }): Promise<void>;
  type(answer: string): Promise<void>;
  pick(i: number): Promise<void>;
  wait(ms: number): Promise<void>;
}

export interface WitLevel {
  /** Who it is aimed at (shown as a badge). Default: everyone. */
  tag?: 'kids' | 'all' | 'eng';
  /** Question. Use {id:text} to make a word the player can tap or drag. */
  q: L;
  hint: L;
  /** Explanation shown after solving. */
  why: L;
  build(c: WitCtx): void;
  /** Question words: tap handler, which ids can be dragged, and where they were dropped. */
  words?: {
    tap?: (id: string, c: WitCtx) => void;
    drag?: string[];
    drop?: (id: string, o: WitObj, c: WitCtx) => void;
  };
  solve(a: SolveApi, c: WitCtx): Promise<void>;
}
