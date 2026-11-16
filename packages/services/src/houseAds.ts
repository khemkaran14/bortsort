import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import type { ApiClient } from './account';

export type GameId = 'bolt' | 'wit';

export interface HouseAd {
  id: number;
  title: string;
  image: string;
  clickUrl: string;
  placement: 'interstitial' | 'banner';
  /** Seconds before the close button appears (set by the admin). */
  skipAfter: number;
  weight: number;
}

export interface AdConfig {
  enabled: boolean;
  adFree: boolean;
  interstitialEvery?: number;
  firstAfterLevel?: number;
  banners?: boolean;
  ads: HouseAd[];
}

const OFF: AdConfig = { enabled: false, adFree: false, ads: [] };

/**
 * Our own ads, managed in the admin panel. The latest list is cached so ads still show offline;
 * a tap opens the advertiser's page through the server's click-tracking link.
 */
export class HouseAds {
  private config: Record<GameId, AdConfig> = { bolt: OFF, wit: OFF };
  private wins: Record<GameId, number> = { bolt: 0, wit: 0 };

  constructor(
    private readonly api: ApiClient,
    private readonly isAdFree: () => boolean,
  ) {}

  async load(game: GameId) {
    const key = `bolt-sort.ads.${game}`;
    try {
      const cached = (await Preferences.get({ key })).value;
      if (cached) this.config[game] = JSON.parse(cached) as AdConfig;
    } catch {
      /* ignore */
    }
    if (!this.api.enabled) return;
    try {
      const c = await this.api.call<AdConfig>('GET', `/api/ads?game=${game}`);
      this.config[game] = c;
      await Preferences.set({ key, value: JSON.stringify(c) });
    } catch {
      /* offline: keep the cached list */
    }
  }

  private active(game: GameId) {
    const c = this.config[game];
    return c.enabled && !c.adFree && !this.isAdFree();
  }

  private pick(game: GameId, placement: HouseAd['placement']): HouseAd | null {
    const list = this.config[game].ads.filter((a) => a.placement === placement);
    if (!list.length) return null;
    let r = Math.random() * list.reduce((s, a) => s + Math.max(1, a.weight), 0);
    for (const a of list) {
      r -= Math.max(1, a.weight);
      if (r <= 0) return a;
    }
    return list[0];
  }

  /** Called after each win; returns an ad when it is time for a full-screen one. */
  afterWin(game: GameId, level: number): HouseAd | null {
    if (!this.active(game)) return null;
    const c = this.config[game];
    const every = c.interstitialEvery ?? 0;
    if (every <= 0 || level < (c.firstAfterLevel ?? 0)) return null;
    this.wins[game]++;
    if (this.wins[game] % every !== 0) return null;
    return this.pick(game, 'interstitial');
  }

  banner(game: GameId): HouseAd | null {
    if (!this.active(game) || this.config[game].banners === false) return null;
    return this.pick(game, 'banner');
  }

  impression(ad: HouseAd) {
    if (this.api.enabled) this.api.call('POST', `/api/ads/${ad.id}/impression`).catch(() => {});
  }

  /** Open the advertiser's page (the server counts the click and redirects). */
  async open(ad: HouseAd) {
    try {
      await Browser.open({ url: ad.clickUrl });
    } catch {
      window.open(ad.clickUrl, '_blank', 'noopener');
    }
  }
}
