import { Preferences } from '@capacitor/preferences';

/** Everything saved on the phone. Bump SAVE_VERSION and add a step to migrate() when this changes. */
export interface SaveData {
  version: number;
  /** Highest level unlocked (1-based). */
  unlocked: number;
  /** Best stars per level id. */
  stars: Record<number, number>;
  /** Fewest moves per level id. */
  bestMoves: Record<number, number>;
  coins: number;
  boosters: { undo: number; extraBolt: number; hint: number; reveal: number };
  skins: { owned: string[]; nut: string; bolt: string; background: string };
  streak: { day: number; lastDate: string | null; freezesUsedWeek: string | null };
  daily: Record<string, { moves: number; stars: number }>;
  chestsOpened: number[];
  tutorialDone: boolean;
  ratedPrompted: boolean;
  settings: {
    music: boolean;
    sfx: boolean;
    haptics: boolean;
    colorBlind: boolean;
    dragDrop: boolean;
    language: 'en' | 'hi';
    notifications: { daily: boolean; streak: boolean; events: boolean };
  };
  stats: { levelsWon: number; threeStars: number; bossNoUndo: number; sessions: number };
  /** Blueprint mode progress (since save v2). */
  blueprint: { unlocked: number; stars: Record<number, number> };
  rush: { best: number; runs: number };
  zen: { solved: number };
  /** Wit Twist (second game, since save v3). */
  wit: { unlocked: number; solved: Record<number, boolean>; freeHints: number; hinted: Record<number, boolean> };
  /** Game shown first on the chooser. */
  lastGame: 'bolt' | 'wit';
  /** The optional login screen was offered once (since save v4). */
  loginPrompted: boolean;
}

export const SAVE_VERSION = 4;
const KEY = 'bolt-sort.save';

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    unlocked: 1,
    stars: {},
    bestMoves: {},
    coins: 100,
    boosters: { undo: 0, extraBolt: 1, hint: 3, reveal: 1 },
    skins: { owned: ['metal', 'steel', 'bench'], nut: 'metal', bolt: 'steel', background: 'bench' },
    streak: { day: 0, lastDate: null, freezesUsedWeek: null },
    daily: {},
    chestsOpened: [],
    tutorialDone: false,
    ratedPrompted: false,
    settings: {
      music: true,
      sfx: true,
      haptics: true,
      colorBlind: false,
      dragDrop: false,
      language: 'en',
      notifications: { daily: true, streak: true, events: true },
    },
    stats: { levelsWon: 0, threeStars: 0, bossNoUndo: 0, sessions: 0 },
    blueprint: { unlocked: 1, stars: {} },
    rush: { best: 0, runs: 0 },
    zen: { solved: 0 },
    wit: { unlocked: 1, solved: {}, freeHints: 3, hinted: {} },
    lastGame: 'bolt',
    loginPrompted: false,
  };
}

/** Bring an older (or partial) save up to the current format without losing progress. */
export function migrate(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SaveData>;
  // v2 added blueprint / rush / zen, v3 added wit / lastGame, v4 loginPrompted; missing fields come from the defaults.
  return {
    ...base,
    ...r,
    boosters: { ...base.boosters, ...(r.boosters ?? {}) },
    skins: { ...base.skins, ...(r.skins ?? {}) },
    streak: { ...base.streak, ...(r.streak ?? {}) },
    settings: {
      ...base.settings,
      ...(r.settings ?? {}),
      notifications: { ...base.settings.notifications, ...(r.settings?.notifications ?? {}) },
    },
    stats: { ...base.stats, ...(r.stats ?? {}) },
    blueprint: { ...base.blueprint, ...(r.blueprint ?? {}) },
    rush: { ...base.rush, ...(r.rush ?? {}) },
    zen: { ...base.zen, ...(r.zen ?? {}) },
    wit: { ...base.wit, ...(r.wit ?? {}) },
    version: SAVE_VERSION,
  };
}

/** Save data service. On phones it uses Capacitor Preferences; in a browser, localStorage. */
export class SaveService {
  data: SaveData = defaultSave();

  async load(): Promise<SaveData> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      this.data = migrate(value ? JSON.parse(value) : null);
    } catch {
      this.data = defaultSave();
    }
    return this.data;
  }

  async save(): Promise<void> {
    try {
      await Preferences.set({ key: KEY, value: JSON.stringify(this.data) });
    } catch {
      /* storage unavailable (private mode): keep playing from memory */
    }
  }

  async reset(): Promise<void> {
    this.data = defaultSave();
    await this.save();
  }
}
