import { getSetting, now, type DB } from './db';

export interface Ad {
  id: number;
  title: string;
  image: string;
  target_url: string;
  placement: 'interstitial' | 'banner';
  skip_after: number;
  games: 'all' | 'bolt' | 'wit';
  active: number;
  starts_at: number | null;
  ends_at: number | null;
  weight: number;
  impressions: number;
  clicks: number;
  created_at: number;
}

export interface AdSettings {
  enabled: boolean;
  /** Show a full-screen ad after every N wins (0 = never). */
  interstitialEvery: number;
  /** No full-screen ads before this Bolt Sort level / Wit Twist puzzle. */
  firstAfterLevel: number;
  /** Used when an ad has no own close-button delay. */
  defaultSkipAfter: number;
  banners: boolean;
}

export function adSettings(db: DB): AdSettings {
  return {
    enabled: getSetting(db, 'ads_enabled', '1') === '1',
    interstitialEvery: Number(getSetting(db, 'interstitial_every', '3')),
    firstAfterLevel: Number(getSetting(db, 'first_after_level', '5')),
    defaultSkipAfter: Number(getSetting(db, 'default_skip_after', '5')),
    banners: getSetting(db, 'banners_enabled', '1') === '1',
  };
}

/** Only http(s) links may be advertised. */
export function safeTargetUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Ads that may run now for a game. */
export function liveAds(db: DB, game: string): Ad[] {
  const t = now();
  return (db.prepare('SELECT * FROM ads WHERE active = 1').all() as Ad[]).filter(
    (a) =>
      (a.games === 'all' || a.games === game) && (!a.starts_at || a.starts_at <= t) && (!a.ends_at || a.ends_at > t),
  );
}

export function imageUrl(publicUrl: string, image: string) {
  return /^https?:\/\//.test(image) ? image : `${publicUrl}/uploads/${encodeURIComponent(image)}`;
}

function bump(db: DB, id: number, col: 'impressions' | 'clicks') {
  const day = new Date().toISOString().slice(0, 10);
  db.prepare(`UPDATE ads SET ${col} = ${col} + 1 WHERE id = ?`).run(id);
  db.prepare(
    `INSERT INTO ad_daily (ad_id, day, ${col}) VALUES (?, ?, 1) ON CONFLICT(ad_id, day) DO UPDATE SET ${col} = ${col} + 1`,
  ).run(id, day);
}

export const recordImpression = (db: DB, id: number) => bump(db, id, 'impressions');
export const recordClick = (db: DB, id: number) => bump(db, id, 'clicks');
