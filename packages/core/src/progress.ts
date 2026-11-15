import type { LevelDef } from './types';

/** Star thresholds: 3 stars at or under best + 2, 2 stars under best + 6, otherwise 1. */
export function starThresholds(best: number): [number, number] {
  return [best + 2, best + 5];
}

export function starsFor(level: Pick<LevelDef, 'stars'>, moves: number): 1 | 2 | 3 {
  if (moves <= level.stars[0]) return 3;
  if (moves <= level.stars[1]) return 2;
  return 1;
}

/** Move limit for "move limit" levels: solver's best plus a margin. */
export function moveLimitFor(best: number): number {
  return best + Math.max(3, Math.round(best * 0.15));
}

export interface RewardRules {
  base: number;
  hard: number;
  boss: number;
  threeStarBonus: number;
  replay: number;
  perNewStar: number;
}

/** Defaults; Remote Config can override these without an app update. */
export const DEFAULT_REWARDS: RewardRules = {
  base: 10,
  hard: 20,
  boss: 40,
  threeStarBonus: 10,
  replay: 2,
  perNewStar: 5,
};

/** Coins for finishing a level. `prevStars` is 0 when the level was never cleared. */
export function coinsFor(
  level: Pick<LevelDef, 'kind' | 'difficulty'>,
  stars: number,
  prevStars: number,
  rules: RewardRules = DEFAULT_REWARDS,
): number {
  if (prevStars === 0) {
    let c = rules.base;
    if (level.kind === 'boss') c = rules.boss;
    else if (level.kind === 'hard' || level.difficulty !== 'normal') c = rules.hard;
    if (stars === 3) c += rules.threeStarBonus;
    return c;
  }
  if (stars > prevStars) return (stars - prevStars) * rules.perNewStar;
  return rules.replay;
}

/** Free undos per level: unlimited in stages 1–2, then 3 (more come from the Undo pack booster). */
export function freeUndos(stage: number): number {
  return stage <= 2 ? Infinity : 3;
}

export const BOOSTERS = {
  undoPack: { price: 60, amount: 5 },
  extraBolt: { price: 120, amount: 1 },
  hint: { price: 50, amount: 1 },
  revealHidden: { price: 80, amount: 1, moves: 3 },
} as const;
export type BoosterId = keyof typeof BOOSTERS;

/** Stage chest opens at 120 of the stage's 150 stars. */
export const CHEST_STARS = 120;
