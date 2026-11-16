import type { LevelDef, StageFile } from '@bolt-sort/core';
import {
  AudioService,
  HapticsService,
  LocalAnalytics,
  NoAds,
  NoStore,
  NotificationService,
  RemoteConfigService,
  SaveService,
  t as translate,
  type AdsService,
  type StoreService,
  AccountService,
  ApiClient,
  HouseAds,
  type TextKey,
} from '@bolt-sort/services';

interface StageIndex {
  version: number;
  stages: { stage: number; theme: string; file: string; levels: number; first: number }[];
  modes?: { blueprint?: string };
}

/** Shared services and data for every scene. */
class AppContext {
  save = new SaveService();
  audio = new AudioService();
  haptics = new HapticsService();
  analytics = new LocalAnalytics(import.meta.env.DEV);
  ads: AdsService = new NoAds();
  store: StoreService = new NoStore();
  remote = new RemoteConfigService();
  notifications = new NotificationService();
  /** Server for login, subscriptions and ads. Set VITE_API_URL at build time; empty = offline only. */
  api = new ApiClient((import.meta.env.VITE_API_URL ?? '').replace(/\/$/, ''));
  account = new AccountService(this.api);
  houseAds = new HouseAds(this.api, () => this.account.adFree);
  index: StageIndex = { version: 1, stages: [] };
  private stages = new Map<number, StageFile>();
  private blueprints: StageFile | null = null;
  levelsWonThisSession = 0;

  get data() {
    return this.save.data;
  }

  t(key: TextKey, vars?: Record<string, string | number>) {
    return translate(this.save.data.settings.language, key, vars);
  }

  async init() {
    await this.save.load();
    this.applySettings();
    const res = await fetch('levels/index.json');
    this.index = await res.json();
    await this.remote.refresh();
    await this.account.init();
    void this.houseAds.load('bolt');
    void this.houseAds.load('wit');
    this.save.data.stats.sessions++;
    void this.save.save();
  }

  applySettings() {
    const s = this.save.data.settings;
    this.audio.sfxOn = s.sfx;
    this.audio.musicOn = s.music;
    this.haptics.on = s.haptics;
  }

  get totalLevels() {
    return this.index.stages.reduce((n, s) => n + s.levels, 0);
  }

  async stage(stage: number): Promise<StageFile> {
    const cached = this.stages.get(stage);
    if (cached) return cached;
    const meta = this.index.stages.find((s) => s.stage === stage);
    if (!meta) throw new Error('No stage ' + stage);
    const file = (await (await fetch('levels/' + meta.file)).json()) as StageFile;
    this.stages.set(stage, file);
    return file;
  }

  async level(id: number): Promise<LevelDef | null> {
    const meta = this.index.stages.find((s) => id >= s.first && id < s.first + s.levels);
    if (!meta) return null;
    const file = await this.stage(meta.stage);
    return file.levels.find((l) => l.id === id) ?? null;
  }

  /** Blueprint mode levels (1-based). */
  async blueprintLevel(n: number): Promise<LevelDef | null> {
    if (!this.blueprints) {
      const file = this.index.modes?.blueprint;
      if (!file) return null;
      this.blueprints = (await (await fetch('levels/' + file)).json()) as StageFile;
    }
    return this.blueprints.levels.find((l) => l.id === n) ?? null;
  }

  get blueprintCount() {
    return this.index.modes?.blueprint ? 60 : 0;
  }

  starsInStage(stage: number): number {
    const meta = this.index.stages.find((s) => s.stage === stage);
    if (!meta) return 0;
    let n = 0;
    for (let id = meta.first; id < meta.first + meta.levels; id++) n += this.data.stars[id] ?? 0;
    return n;
  }

  totalStars(): number {
    return Object.values(this.data.stars).reduce((a, b) => a + b, 0);
  }

  /** Tell the server how far the player is (only when logged in; throttled). */
  syncProgress() {
    this.account.syncProgress({
      boltLevel: this.data.unlocked,
      witSolved: Object.keys(this.data.wit.solved).length,
      coins: this.data.coins,
    });
  }

  addCoins(n: number, source: string) {
    if (n <= 0) return;
    this.data.coins += n;
    this.analytics.log({ name: 'coins_earned', amount: n, source });
  }

  spendCoins(n: number, item: string): boolean {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.analytics.log({ name: 'coins_spent', amount: n, item });
    void this.save.save();
    return true;
  }
}

export const app = new AppContext();
