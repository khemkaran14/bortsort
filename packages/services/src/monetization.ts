/**
 * Monetization hooks reserved for the monetization phase. They do nothing today, so the game can
 * call them at the right moments and the real ad / purchase SDKs can be plugged in later without
 * touching the game screens.
 */

export type RewardPlacement = 'result_double_coins' | 'no_moves_extra_bolt' | 'daily_chest' | 'shop_free_coins';

export interface AdsService {
  /** Rewarded ad. Resolves true if the player watched it and earned the reward. */
  showRewarded(placement: RewardPlacement): Promise<boolean>;
  /** Interstitial at a natural break (after a level). Frequency comes from Remote Config. */
  showInterstitial(breakPoint: 'after_level'): Promise<void>;
  showBanner(): Promise<void>;
  hideBanner(): Promise<void>;
  /** Whether rewarded ads are available right now (used to show/hide reward buttons). */
  rewardedReady(placement: RewardPlacement): boolean;
}

export class NoAds implements AdsService {
  async showRewarded() {
    return false;
  }
  async showInterstitial() {}
  async showBanner() {}
  async hideBanner() {}
  rewardedReady() {
    return false;
  }
}

export interface Product {
  id: string;
  title: string;
  price: string;
  kind: 'coins' | 'bundle' | 'removeAds' | 'seasonPass';
}

export interface StoreService {
  products(): Promise<Product[]>;
  buy(productId: string): Promise<boolean>;
  restore(): Promise<string[]>;
  hasRemoveAds(): boolean;
}

export class NoStore implements StoreService {
  async products() {
    return [];
  }
  async buy() {
    return false;
  }
  async restore() {
    return [];
  }
  hasRemoveAds() {
    return false;
  }
}

/**
 * Cross-promotion slot for your other products (shown on the result screen / settings once
 * enabled in Remote Config). Empty by default.
 */
export interface Promo {
  id: string;
  title: string;
  body: string;
  url: string;
}
