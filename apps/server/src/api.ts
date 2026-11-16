import express, { type Request } from 'express';
import { adSettings, imageUrl, liveAds, recordClick, recordImpression, type Ad } from './ads';
import { bearer, login, logout, optionalUser, requireUser } from './auth';
import type { Config } from './config';
import { now, type DB } from './db';
import { issueOtp, normalizeEmail, normalizePhone, verifyOtp, type Channel } from './otp';
import type { Sender } from './senders';
import { activeSubscription, isAdFree, PLANS } from './subs';

/** Small in-memory rate limiter (per process) for public counters. */
function limiter(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (key: string) => {
    const t = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < t) {
      hits.set(key, { n: 1, reset: t + windowMs });
      if (hits.size > 10_000) hits.clear();
      return true;
    }
    return ++h.n <= max;
  };
}

const ipOf = (req: Request) => req.ip ?? 'unknown';

export function apiRouter(db: DB, cfg: Config, sender: Sender) {
  const r = express.Router();
  r.use(express.json({ limit: '20kb' }));
  r.use(optionalUser(db));
  const eventLimit = limiter(120, 60_000);

  const parseDest = (body: {
    channel?: unknown;
    phone?: unknown;
    email?: unknown;
  }): { channel: Channel; dest: string } | null => {
    if (body.channel === 'phone') {
      const d = normalizePhone(body.phone);
      return d ? { channel: 'phone', dest: d } : null;
    }
    if (body.channel === 'email') {
      const d = normalizeEmail(body.email);
      return d ? { channel: 'email', dest: d } : null;
    }
    return null;
  };

  // ---- Login with a one-time code (phone or email) ----
  r.post('/auth/otp', async (req, res) => {
    const p = parseDest(req.body ?? {});
    if (!p) return res.status(400).json({ error: 'invalid_destination' });
    const issued = issueOtp(db, cfg.otpSecret, p.channel, p.dest, ipOf(req));
    if (!issued.ok) return res.status(429).json({ error: issued.error, retryAfter: issued.retryAfter });
    try {
      if (p.channel === 'phone') await sender.sms(p.dest, issued.code);
      else await sender.email(p.dest, issued.code);
    } catch (e) {
      console.error('OTP send failed', (e as Error).message);
      return res.status(502).json({ error: 'send_failed' });
    }
    res.json({ ok: true, expiresIn: 300 });
  });

  r.post('/auth/verify', (req, res) => {
    const p = parseDest(req.body ?? {});
    if (!p) return res.status(400).json({ error: 'invalid_destination' });
    const v = verifyOtp(db, cfg.otpSecret, p.dest, req.body?.code);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const col = p.channel === 'phone' ? 'phone' : 'email';
    const existing = db.prepare(`SELECT blocked FROM users WHERE ${col} = ?`).get(p.dest) as
      { blocked: number } | undefined;
    if (existing?.blocked) return res.status(403).json({ error: 'blocked' });
    const { token, user } = login(db, p.channel, p.dest);
    res.json({ token, user: publicUser(db, user.id) });
  });

  r.post('/auth/logout', requireUser, (req, res) => {
    logout(db, bearer(req)!);
    res.json({ ok: true });
  });

  // ---- Account ----
  r.get('/me', requireUser, (req, res) => res.json({ user: publicUser(db, req.user!.id) }));

  /** Light progress summary so the admin can see how far players are. */
  r.post('/me/progress', requireUser, (req, res) => {
    const b = req.body ?? {};
    const num = (v: unknown, max: number) =>
      Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.floor(Number(v)))) : 0;
    const progress = {
      boltLevel: num(b.boltLevel, 100_000),
      witSolved: num(b.witSolved, 10_000),
      coins: num(b.coins, 100_000_000),
      at: now(),
    };
    db.prepare('UPDATE users SET progress = ? WHERE id = ?').run(JSON.stringify(progress), req.user!.id);
    res.json({ ok: true });
  });

  r.post('/me/name', requireUser, (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 40) : '';
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name || null, req.user!.id);
    res.json({ user: publicUser(db, req.user!.id) });
  });

  /** Delete the account and everything linked to it (required by the app stores). */
  r.delete('/me', requireUser, (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user!.id);
    res.json({ ok: true });
  });

  // ---- Ads ----
  r.get('/ads', (req, res) => {
    const game = req.query.game === 'wit' ? 'wit' : 'bolt';
    const s = adSettings(db);
    const adFree = isAdFree(db, req.user?.id);
    if (!s.enabled || adFree) return res.json({ enabled: false, adFree, ads: [] });
    const ads = liveAds(db, game).map((a: Ad) => ({
      id: a.id,
      title: a.title,
      image: imageUrl(cfg.publicUrl, a.image),
      clickUrl: `${cfg.publicUrl}/r/${a.id}`,
      placement: a.placement,
      skipAfter: a.skip_after >= 0 ? a.skip_after : s.defaultSkipAfter,
      weight: a.weight,
    }));
    res.set('cache-control', 'no-store');
    res.json({
      enabled: true,
      adFree: false,
      interstitialEvery: s.interstitialEvery,
      firstAfterLevel: s.firstAfterLevel,
      banners: s.banners,
      ads,
    });
  });

  r.post('/ads/:id/impression', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || !eventLimit(ipOf(req))) return res.status(429).json({ error: 'slow_down' });
    if (db.prepare('SELECT 1 FROM ads WHERE id = ?').get(id)) recordImpression(db, id);
    res.json({ ok: true });
  });

  return r;
}

/** Click tracking: count the click, then send the player to the advertiser's page. */
export function clickRedirect(db: DB) {
  return (req: Request, res: express.Response) => {
    const id = Number(req.params.id);
    const ad = Number.isInteger(id)
      ? (db.prepare('SELECT id, target_url FROM ads WHERE id = ?').get(id) as
          { id: number; target_url: string } | undefined)
      : undefined;
    if (!ad) return res.status(404).send('Ad not found');
    recordClick(db, ad.id);
    res.set('cache-control', 'no-store');
    res.redirect(302, ad.target_url);
  };
}

export function publicUser(db: DB, id: number) {
  const u = db.prepare('SELECT id, phone, email, name, created_at FROM users WHERE id = ?').get(id) as {
    id: number;
    phone: string | null;
    email: string | null;
    name: string | null;
    created_at: number;
  };
  const sub = activeSubscription(db, id);
  return {
    ...u,
    subscription: sub ? { plan: sub.plan, name: PLANS[sub.plan]?.name ?? sub.plan, expiresAt: sub.expires_at } : null,
    adFree: isAdFree(db, id),
  };
}
