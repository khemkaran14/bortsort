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
  type TextKey,
} from '@bolt-sort/services';

interface StageIndex {
  version: number;
  stages: { stage: number; theme: string; file: string; levels: number; first: number }[];
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
  index: StageIndex = { version: 1, stages: [] };
  private stages = new Map<number, StageFile>();
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
