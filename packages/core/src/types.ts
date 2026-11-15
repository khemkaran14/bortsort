/** Color index 0..11 (see palette in the game package). */
export type Color = number;

/** A nut as stored in a level file and in game state. */
export interface Nut {
  /** Color index. */
  c: Color;
  /** Hidden: shown as "?" until it becomes the top nut of its bolt. */
  h?: boolean;
  /** Frozen: cannot be lifted (or dropped onto) until the player has made this many moves in total. */
  f?: number;
}

export interface Bolt {
  /** How many nuts the bolt holds. */
  cap: number;
  /** Nuts from bottom (index 0) to top. */
  nuts: Nut[];
  /** Locked bolt: opens once any bolt of this color is completed. */
  lock?: Color;
  /** Chained bolt: opens once the bolt with this index is completed. */
  chain?: number;
  /** Magnet bolt: any color may be dropped on top (not only the same color). */
  magnet?: boolean;
  /** Glue bolt: nuts can be dropped in but never lifted out again. */
  glue?: boolean;
}

export type Mechanic =
  | 'hidden'
  | 'oneSpare'
  | 'tall'
  | 'lock'
  | 'frozen'
  | 'short'
  | 'moveLimit'
  | 'chain'
  | 'magnet'
  | 'glue'
  | 'blueprint';

export type Difficulty = 'normal' | 'hard' | 'superhard';
export type LevelKind = 'normal' | 'hard' | 'breather' | 'boss' | 'tutorial';

/** One level as shipped in the stage JSON files. */
export interface LevelDef {
  /** Global level number, 1-based (level 137 is the same for every player). */
  id: number;
  stage: number;
  seed: number;
  bolts: Bolt[];
  /** Fewest moves found by the solver. */
  best: number;
  /** True when `best` is proven optimal (A* finished); false when it is an upper bound. */
  bestExact: boolean;
  /** Max moves for 3 stars and 2 stars. */
  stars: [number, number];
  moveLimit?: number;
  difficulty: Difficulty;
  kind: LevelKind;
  score: number;
  mechanics: Mechanic[];
  /**
   * Blueprint levels: the target picture. goal[i] lists the colors bolt i must hold (bottom → top).
   * Without a goal the aim is the usual one color per bolt.
   */
  goal?: Color[][];
  /** For tutorial levels: which idea is taught. */
  teaches?: Mechanic | 'basics' | 'undo' | 'hint';
}

export interface StageFile {
  stage: number;
  theme: string;
  version: number;
  levels: LevelDef[];
}

export interface Move {
  from: number;
  to: number;
}

/** Live game state. Treated as immutable: every move returns a new state (makes undo trivial). */
export interface GameState {
  bolts: Bolt[];
  moves: number;
  /** Total nuts of each color in the level. */
  totals: number[];
  moveLimit?: number;
  /** Blueprint target (see LevelDef.goal). */
  goal?: Color[][];
}
