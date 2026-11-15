import { DEFAULT_REWARDS, type RewardRules } from '@bolt-sort/core';
import type { Promo } from './monetization';

/** Values that can be changed without a new app release (Firebase Remote Config in Phase 3). */
export interface RemoteValues {
  rewards: RewardRules;
  boosterPrices: { undoPack: number; extraBolt: number; hint: number; reveal: number };
  interstitialEveryNLevels: number;
  /** Override the daily level seed (e.g. to swap a bad daily). */
  dailySeedSalt: string;
  products: { id: string; enabled: boolean }[];
  promos: Promo[];
}

export const REMOTE_DEFAULTS: RemoteValues = {
  rewards: DEFAULT_REWARDS,
  boosterPrices: { undoPack: 60, extraBolt: 120, hint: 50, reveal: 80 },
  interstitialEveryNLevels: 0,
  dailySeedSalt: '',
  products: [],
  promos: [],
};

export class RemoteConfigService {
  values: RemoteValues = REMOTE_DEFAULTS;
  /** Fetch and activate. No backend yet: keeps defaults. */
  async refresh(): Promise<void> {}
}
