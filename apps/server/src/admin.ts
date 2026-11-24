import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { adSettings, imageUrl, safeTargetUrl, type Ad } from './ads';
import { hashToken, type User } from './auth';
import type { Config } from './config';
import { now, setSetting, type DB } from './db';
import { fmtDate, html, page, raw, type Raw } from './html';
import {
  activeSubscription,
  cancelSubscriptions,
  grantSubscription,
  PLANS,
  type Plan,
  type Subscription,
} from './subs';

const COOKIE = 'bs_admin';
const SESSION_MS = 12 * 3_600_000;

export function adminRouter(db: DB, cfg: Config) {
  const r = express.Router();
  r.use(cookieParser());
  r.use(express.urlencoded({ extended: false, limit: '50kb' }));
  r.use((_req, res, next) => {
    res.set('x-frame-options', 'DENY');
    // Browsers send "Origin: null" under no-referrer; the origin check below needs the real origin.
    res.set('referrer-policy', 'same-origin');
    res.set('cache-control', 'no-store');
    next();
  });

  mkdirSync(cfg.uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: cfg.uploadDir,
      filename: (_req, file, cb) =>
        cb(null, randomBytes(12).toString('hex') + extname(file.originalname).toLowerCase()),
    }),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ok =
        ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mimetype) &&
        /\.(png|jpe?g|webp|gif)$/i.test(file.originalname);
      cb(null, ok);
    },
  });

  // ---- login ----
  const attempts = new Map<string, { n: number; reset: number }>();
  const tooMany = (ip: string) => {
    const t = Date.now();
    const a = attempts.get(ip);
    if (!a || a.reset < t) {
      attempts.set(ip, { n: 1, reset: t + 15 * 60_000 });
      return false;
    }
    return ++a.n > 10;
  };

  const checkPassword = async (pw: string) => {
    if (cfg.admin.passwordHash) return bcrypt.compare(pw, cfg.admin.passwordHash);
    if (!cfg.admin.password) return false;
    const a = Buffer.from(pw);
    const b = Buffer.from(cfg.admin.password);
    return a.length === b.length && timingSafeEqual(a, b);
  };

  /** Forms must come from this site (cookie is SameSite=Strict as well). */
  const sameOrigin = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin');
    // Development only: also accept the game's dev server (localhost:5173 forwards /admin here).
    const devLocal = !cfg.production && !!origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (
      req.method === 'POST' &&
      origin &&
      !devLocal &&
      origin !== new URL(cfg.publicUrl).origin &&
      origin !== `${req.protocol}://${req.get('host')}`
    ) {
      return res.status(403).send('Bad origin');
    }
    next();
  };
  r.use(sameOrigin);

  r.get('/login', (_req, res) => {
    res.send(
      page(
        'Log in',
        html`<form method="post" action="/admin/login" class="card" style="max-width:380px">
          <label>Email</label><input name="email" type="email" required autocomplete="username" style="width:100%" />
          <label>Password</label
          ><input name="password" type="password" required autocomplete="current-password" style="width:100%" />
          <p><button>Log in</button></p>
        </form>`,
        { nav: false },
      ),
    );
  });

  r.post('/login', async (req, res) => {
    const ip = req.ip ?? '';
    if (tooMany(ip))
      return res
        .status(429)
        .send(page('Log in', html`<p>Too many attempts. Try again in 15 minutes.</p>`, { nav: false }));
    const email = String(req.body.email ?? '')
      .toLowerCase()
      .trim();
    const ok = !!cfg.admin.email && email === cfg.admin.email && (await checkPassword(String(req.body.password ?? '')));
    if (!ok)
      return res
        .status(401)
        .send(
          page('Log in', html`<p>Wrong email or password. <a href="/admin/login">Try again</a></p>`, { nav: false }),
        );
    const token = randomBytes(32).toString('base64url');
    db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(now());
    db.prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)').run(
      hashToken(token),
      now() + SESSION_MS,
    );
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: cfg.production,
      maxAge: SESSION_MS,
      path: '/admin',
    });
    res.redirect('/admin');
  });

  // Everything below needs an admin session.
  r.use((req, res, next) => {
    const token = req.cookies?.[COOKIE];
    const ok =
      token &&
      db.prepare('SELECT 1 FROM admin_sessions WHERE token_hash = ? AND expires_at > ?').get(hashToken(token), now());
    if (!ok) return res.redirect('/admin/login');
    next();
  });

  r.post('/logout', (req, res) => {
    const token = req.cookies?.[COOKIE];
    if (token) db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashToken(token));
    res.clearCookie(COOKIE, { path: '/admin' });
    res.redirect('/admin/login');
  });

  const flash = (req: Request) => (typeof req.query.msg === 'string' ? req.query.msg.slice(0, 200) : undefined);

  // ---- dashboard ----
  r.get('/', (req, res) => {
    const count = (sql: string, ...a: unknown[]) => (db.prepare(sql).get(...a) as { n: number }).n;
    const t = now();
    const users = count('SELECT COUNT(*) n FROM users');
    const new7 = count('SELECT COUNT(*) n FROM users WHERE created_at > ?', t - 7 * 86_400_000);
    const active7 = count('SELECT COUNT(*) n FROM users WHERE last_seen_at > ?', t - 7 * 86_400_000);
    const subs = count(
      "SELECT COUNT(DISTINCT user_id) n FROM subscriptions WHERE status='active' AND starts_at <= ? AND expires_at > ?",
      t,
      t,
    );
    const ads = db.prepare('SELECT COALESCE(SUM(impressions),0) i, COALESCE(SUM(clicks),0) c FROM ads').get() as {
      i: number;
      c: number;
    };
    const today = new Date().toISOString().slice(0, 10);
    const adsToday = db
      .prepare('SELECT COALESCE(SUM(impressions),0) i, COALESCE(SUM(clicks),0) c FROM ad_daily WHERE day = ?')
      .get(today) as { i: number; c: number };
    const stat = (n: number | string, label: string) =>
      html`<div class="card stat"><b>${n}</b><span>${label}</span></div>`;
    res.send(
      page(
        'Dashboard',
        html`<div class="grid">
          ${stat(users, 'Players with an account')}${stat(new7, 'New in the last 7 days')}${stat(active7, 'Active in the last 7 days')}
          ${stat(subs, 'Active subscriptions')}${stat(ads.i, 'Ad views (all time)')}${stat(ads.c, 'Ad clicks (all time)')}
          ${stat(adsToday.i, 'Ad views today')}${stat(adsToday.c, 'Ad clicks today')}
          ${stat(ads.i ? ((100 * ads.c) / ads.i).toFixed(1) + '%' : '—', 'Click rate')}
        </div>`,
        { flash: flash(req) },
      ),
    );
  });

  // ---- users ----
  const subLabel = (s: Subscription | null) =>
    s
      ? html`<span class="pill ok">${PLANS[s.plan]?.name ?? s.plan} until ${fmtDate(s.expires_at).slice(0, 10)}</span>`
      : html`<span class="pill">Free</span>`;
  const progressLabel = (p: string | null) => {
    if (!p) return '—';
    try {
      const o = JSON.parse(p) as { boltLevel?: number; witSolved?: number; coins?: number };
      return `Bolt lvl ${o.boltLevel ?? 0} · Wit ${o.witSolved ?? 0}/100 · ${o.coins ?? 0} coins`;
    } catch {
      return '—';
    }
  };

  r.get('/users', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const pageNo = Math.max(1, Number(req.query.page) || 1);
    const like = `%${q}%`;
    const where = q ? 'WHERE phone LIKE ? OR email LIKE ? OR name LIKE ? OR CAST(id AS TEXT) = ?' : '';
    const args = q ? [like, like, like, q] : [];
    const total = (db.prepare(`SELECT COUNT(*) n FROM users ${where}`).get(...args) as { n: number }).n;
    const rows = db
      .prepare(`SELECT * FROM users ${where} ORDER BY id DESC LIMIT 50 OFFSET ?`)
      .all(...args, (pageNo - 1) * 50) as User[];
    const pages = Math.max(1, Math.ceil(total / 50));
    res.send(
      page(
        'Users',
        html`<form class="row" method="get">
            <input name="q" value="${q}" placeholder="Phone, email, name or id" /><button>Search</button>
            <span class="dim">${total} user(s)</span>
          </form>
          <div class="tablewrap card" style="padding:0;margin-top:12px">
            <table>
              <tr>
                <th>ID</th>
                <th>Phone / email</th>
                <th>Name</th>
                <th>Joined</th>
                <th>Last seen</th>
                <th>Progress</th>
                <th>Subscription</th>
                <th></th>
              </tr>
              ${rows.map(
                (u) =>
                  html`<tr>
                    <td>${u.id}</td>
                    <td>
                      ${u.phone ?? u.email ?? 'Google user'}${u.google_sub ? html` <span class="pill">Google</span>` : ''}
                    </td>
                    <td>${u.name ?? ''}</td>
                    <td>${fmtDate(u.created_at)}</td>
                    <td>${fmtDate(u.last_seen_at)}</td>
                    <td class="dim">${progressLabel(u.progress)}</td>
                    <td>
                      ${subLabel(activeSubscription(db, u.id))}${u.blocked ? html` <span class="pill bad">Blocked</span>` : ''}
                    </td>
                    <td><a href="/admin/users/${u.id}">Open</a></td>
                  </tr>`,
              )}
            </table>
          </div>
          <p>
            ${pageNo > 1 ? html`<a href="?q=${encodeURIComponent(q)}&page=${pageNo - 1}">← Newer</a>` : ''} Page
            ${pageNo} of ${pages}
            ${pageNo < pages ? html`<a href="?q=${encodeURIComponent(q)}&page=${pageNo + 1}">Older →</a>` : ''}
          </p>`,
        { flash: flash(req) },
      ),
    );
  });

  r.get('/users/:id', (req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id)) as User | undefined;
    if (!u) return res.status(404).send(page('Not found', html`<p>No such user.</p>`));
    const subs = db
      .prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC')
      .all(u.id) as Subscription[];
    const sessions = (
      db.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id = ? AND expires_at > ?').get(u.id, now()) as {
        n: number;
      }
    ).n;
    res.send(
      page(
        `User ${u.id}`,
        html`<div class="card">
            <p>
              <b>${u.phone ?? u.email ?? 'Google user'}</b> ${u.name ? `(${u.name})` : ''}
              ${u.google_sub ? html`<span class="pill">Google</span>` : ''}
              ${u.blocked ? html`<span class="pill bad">Blocked</span>` : ''}
            </p>
            <p class="dim">
              Joined ${fmtDate(u.created_at)} · last seen ${fmtDate(u.last_seen_at)} · ${sessions} signed-in device(s)
            </p>
            <p>${progressLabel(u.progress)}</p>
            <p>Now: ${subLabel(activeSubscription(db, u.id))}</p>
          </div>
          <div class="card">
            <h2 style="margin-top:0">Give or extend a subscription</h2>
            <form method="post" action="/admin/users/${u.id}/grant" class="row">
              <div>
                <label>Plan</label
                ><select name="plan">
                  ${Object.entries(PLANS).map(([k, p]) => html`<option value="${k}">${p.name}</option>`)}
                </select>
              </div>
              <div><label>Days</label><input name="days" type="number" min="1" max="3650" value="30" required /></div>
              <div><label>Note</label><input name="note" maxlength="200" placeholder="e.g. paid via UPI #1234" /></div>
              <div><button class="ok">Give</button></div>
            </form>
            <form method="post" action="/admin/users/${u.id}/cancel" style="margin-top:12px">
              <button class="bad">Cancel all active subscriptions</button>
            </form>
          </div>
          <div class="card">
            <h2 style="margin-top:0">History</h2>
            <div class="tablewrap">
              <table>
                <tr>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>From</th>
                  <th>Until</th>
                  <th>Note</th>
                </tr>
                ${subs.map(
                  (s) =>
                    html`<tr>
                      <td>${PLANS[s.plan]?.name ?? s.plan}</td>
                      <td>${s.status}</td>
                      <td>${s.source}</td>
                      <td>${fmtDate(s.starts_at)}</td>
                      <td>${fmtDate(s.expires_at)}</td>
                      <td>${s.note ?? ''}</td>
                    </tr>`,
                )}
              </table>
            </div>
          </div>
          <div class="card">
            <form method="post" action="/admin/users/${u.id}/${u.blocked ? 'unblock' : 'block'}">
              <button class="${u.blocked ? 'ok' : 'bad'}">
                ${u.blocked ? 'Unblock user' : 'Block user (signs them out)'}
              </button>
            </form>
          </div>`,
        { flash: flash(req) },
      ),
    );
  });

  const userAction = (path: string, fn: (id: number, req: Request) => string) =>
    r.post(`/users/:id/${path}`, (req, res) => {
      const id = Number(req.params.id);
      if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(id)) return res.status(404).send('No such user');
      const msg = fn(id, req);
      res.redirect(`/admin/users/${id}?msg=${encodeURIComponent(msg)}`);
    });
  userAction('grant', (id, req) => {
    const plan = String(req.body.plan) as Plan;
    const days = Math.floor(Number(req.body.days));
    if (!(plan in PLANS) || !(days >= 1 && days <= 3650)) return 'Invalid plan or days';
    grantSubscription(db, id, plan, days, 'admin', String(req.body.note ?? '').slice(0, 200) || null);
    return `Gave ${days} days of ${PLANS[plan].name}`;
  });
  userAction('cancel', (id) => {
    cancelSubscriptions(db, id);
    return 'Subscriptions cancelled';
  });
  userAction('block', (id) => {
    db.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run(id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    return 'User blocked';
  });
  userAction('unblock', (id) => {
    db.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run(id);
    return 'User unblocked';
  });

  // ---- subscriptions ----
  r.get('/subscriptions', (req, res) => {
    const show = req.query.show === 'all' ? 'all' : 'active';
    const t = now();
    const rows = db
      .prepare(
        `SELECT s.*, u.phone, u.email FROM subscriptions s JOIN users u ON u.id = s.user_id
         ${show === 'active' ? "WHERE s.status = 'active' AND s.expires_at > ?" : 'WHERE ? > 0'} ORDER BY s.expires_at DESC LIMIT 500`,
      )
      .all(t) as (Subscription & { phone: string | null; email: string | null })[];
    res.send(
      page(
        'Subscriptions',
        html`<p><a href="?show=active">Active</a> · <a href="?show=all">All</a></p>
          <div class="tablewrap card" style="padding:0">
            <table>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Source</th>
                <th>From</th>
                <th>Until</th>
                <th>Note</th>
              </tr>
              ${rows.map(
                (s) =>
                  html`<tr>
                    <td><a href="/admin/users/${s.user_id}">${s.phone ?? s.email ?? `Google user ${s.user_id}`}</a></td>
                    <td>${PLANS[s.plan]?.name ?? s.plan}</td>
                    <td>
                      ${s.status === 'active' && s.expires_at > t ? html`<span class="pill ok">active</span>` : html`<span class="pill">${s.status === 'active' ? 'expired' : s.status}</span>`}
                    </td>
                    <td>${s.source}</td>
                    <td>${fmtDate(s.starts_at)}</td>
                    <td>${fmtDate(s.expires_at)}</td>
                    <td>${s.note ?? ''}</td>
                  </tr>`,
              )}
            </table>
          </div>`,
        { flash: flash(req) },
      ),
    );
  });

  // ---- ads ----
  const toMs = (v: unknown) => {
    const s = String(v ?? '').trim();
    if (!s) return null;
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  };
  const asInput = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 16) : '');

  const adForm = (a: Partial<Ad>, action: string): Raw =>
    html`<form method="post" action="${action}" enctype="multipart/form-data" class="card">
      <label>Title (for you; also shown as alt text)</label
      ><input name="title" required maxlength="80" value="${a.title ?? ''}" style="width:100%" />
      <label>Link: where a tap on the ad takes the player</label
      ><input
        name="target_url"
        type="url"
        required
        placeholder="https://…"
        value="${a.target_url ?? ''}"
        style="width:100%"
      />
      <div class="row">
        <div>
          <label>Type</label
          ><select name="placement">
            <option value="interstitial" ${raw(a.placement !== 'banner' ? 'selected' : '')}>
              Full screen (between levels)
            </option>
            <option value="banner" ${raw(a.placement === 'banner' ? 'selected' : '')}>
              Banner (bottom of the level screen)
            </option>
          </select>
        </div>
        <div>
          <label>Seconds before the ✕ close button appears</label
          ><input name="skip_after" type="number" min="0" max="60" value="${a.skip_after ?? 5}" />
        </div>
        <div>
          <label>Show in</label
          ><select name="games">
            ${(['all', 'bolt', 'wit'] as const).map((g) => html`<option value="${g}" ${raw(a.games === g ? 'selected' : '')}>${g === 'all' ? 'Both games' : g === 'bolt' ? 'Nutwise' : 'Wit Twist'}</option>`)}
          </select>
        </div>
        <div>
          <label>Weight (higher = shown more)</label
          ><input name="weight" type="number" min="1" max="100" value="${a.weight ?? 1}" />
        </div>
      </div>
      <div class="row">
        <div>
          <label>Start (optional, UTC)</label
          ><input name="starts_at" type="datetime-local" value="${asInput(a.starts_at ?? null)}" />
        </div>
        <div>
          <label>End (optional, UTC)</label
          ><input name="ends_at" type="datetime-local" value="${asInput(a.ends_at ?? null)}" />
        </div>
        <div>
          <label
            ><input type="checkbox" name="active" value="1" ${raw(a.active === 0 ? '' : 'checked')} /> Running</label
          >
        </div>
      </div>
      <label>Image: upload (PNG/JPG/WebP/GIF, max 2 MB; full screen ≈ 720×1100, banner ≈ 720×100)…</label
      ><input type="file" name="image_file" accept="image/png,image/jpeg,image/webp,image/gif" />
      <label>…or image link</label
      ><input
        name="image_url"
        type="url"
        placeholder="https://…"
        value="${a.image && /^https?:/.test(a.image) ? a.image : ''}"
        style="width:100%"
      />
      ${a.image ? html`<p><img class="thumb" src="${imageUrl(cfg.publicUrl, a.image)}" alt="" /></p>` : ''}
      <p><button class="ok">Save ad</button></p>
    </form>`;

  const readAd = (
    req: Request,
    existing?: Ad,
  ): { ad?: Omit<Ad, 'id' | 'impressions' | 'clicks' | 'created_at'>; error?: string } => {
    const b = req.body as Record<string, string>;
    const target = safeTargetUrl(b.target_url);
    if (!target) return { error: 'The link must start with https:// or http://' };
    const title = String(b.title ?? '')
      .trim()
      .slice(0, 80);
    if (!title) return { error: 'Title is required' };
    let image = existing?.image ?? '';
    if (req.file) image = req.file.filename;
    else if (b.image_url) {
      const u = safeTargetUrl(b.image_url);
      if (!u) return { error: 'Image link must be http(s)' };
      image = u;
    }
    if (!image) return { error: 'Upload an image or give an image link' };
    const skip = Math.floor(Number(b.skip_after));
    return {
      ad: {
        title,
        image,
        target_url: target,
        placement: b.placement === 'banner' ? 'banner' : 'interstitial',
        skip_after: Number.isFinite(skip) ? Math.max(0, Math.min(60, skip)) : 5,
        games: b.games === 'bolt' || b.games === 'wit' ? b.games : 'all',
        active: b.active === '1' ? 1 : 0,
        starts_at: toMs(b.starts_at),
        ends_at: toMs(b.ends_at),
        weight: Math.max(1, Math.min(100, Math.floor(Number(b.weight)) || 1)),
      },
    };
  };

  r.get('/ads', (req, res) => {
    const ads = db.prepare('SELECT * FROM ads ORDER BY id DESC').all() as Ad[];
    const t = now();
    const state = (a: Ad) =>
      !a.active
        ? html`<span class="pill">paused</span>`
        : a.ends_at && a.ends_at < t
          ? html`<span class="pill">ended</span>`
          : a.starts_at && a.starts_at > t
            ? html`<span class="pill">scheduled</span>`
            : html`<span class="pill ok">running</span>`;
    res.send(
      page(
        'Ads',
        html`<p><a class="btn" href="/admin/ads/new">+ New ad</a></p>
          <div class="tablewrap card" style="padding:0">
            <table>
              <tr>
                <th>Ad</th>
                <th>Type</th>
                <th>Close after</th>
                <th>Game</th>
                <th>State</th>
                <th>Views</th>
                <th>Clicks</th>
                <th>Click rate</th>
                <th></th>
              </tr>
              ${ads.map(
                (a) =>
                  html`<tr>
                    <td>
                      <img class="thumb" src="${imageUrl(cfg.publicUrl, a.image)}" alt="" /><br />${a.title}<br /><span
                        class="dim"
                        >${a.target_url}</span
                      >
                    </td>
                    <td>${a.placement === 'banner' ? 'Banner' : 'Full screen'}</td>
                    <td>${a.skip_after}s</td>
                    <td>${a.games}</td>
                    <td>${state(a)}</td>
                    <td>${a.impressions}</td>
                    <td>${a.clicks}</td>
                    <td>${a.impressions ? ((100 * a.clicks) / a.impressions).toFixed(1) + '%' : '—'}</td>
                    <td>
                      <a href="/admin/ads/${a.id}">Edit</a>
                      <form method="post" action="/admin/ads/${a.id}/toggle" class="inline">
                        <button class="link">${a.active ? 'Pause' : 'Run'}</button>
                      </form>
                      <form
                        method="post"
                        action="/admin/ads/${a.id}/delete"
                        class="inline"
                        onsubmit="return confirm('Delete this ad?')"
                      >
                        <button class="link">Delete</button>
                      </form>
                    </td>
                  </tr>`,
              )}
            </table>
          </div>`,
        { flash: flash(req) },
      ),
    );
  });

  r.get('/ads/new', (_req, res) => res.send(page('New ad', adForm({}, '/admin/ads/new'))));

  r.post('/ads/new', upload.single('image_file'), (req, res) => {
    const { ad, error } = readAd(req);
    if (!ad)
      return res.status(400).send(page('New ad', adForm(req.body as Partial<Ad>, '/admin/ads/new'), { flash: error }));
    db.prepare(
      `INSERT INTO ads (title, image, target_url, placement, skip_after, games, active, starts_at, ends_at, weight, created_at)
       VALUES (@title, @image, @target_url, @placement, @skip_after, @games, @active, @starts_at, @ends_at, @weight, ${now()})`,
    ).run(ad);
    res.redirect('/admin/ads?msg=Ad+saved');
  });

  const getAd = (id: unknown) => db.prepare('SELECT * FROM ads WHERE id = ?').get(Number(id)) as Ad | undefined;

  r.get('/ads/:id', (req, res) => {
    const a = getAd(req.params.id);
    if (!a) return res.status(404).send(page('Not found', html`<p>No such ad.</p>`));
    const days = db.prepare('SELECT * FROM ad_daily WHERE ad_id = ? ORDER BY day DESC LIMIT 30').all(a.id) as {
      day: string;
      impressions: number;
      clicks: number;
    }[];
    res.send(
      page(
        `Edit ad: ${a.title}`,
        html`${adForm(a, `/admin/ads/${a.id}`)}
          <div class="card">
            <h2 style="margin-top:0">Last 30 days</h2>
            <div class="tablewrap">
              <table>
                <tr>
                  <th>Day</th>
                  <th>Views</th>
                  <th>Clicks</th>
                </tr>
                ${days.map(
                  (d) =>
                    html`<tr>
                      <td>${d.day}</td>
                      <td>${d.impressions}</td>
                      <td>${d.clicks}</td>
                    </tr>`,
                )}
              </table>
            </div>
          </div>`,
        { flash: flash(req) },
      ),
    );
  });

  r.post('/ads/:id', upload.single('image_file'), (req, res) => {
    const a = getAd(req.params.id);
    if (!a) return res.status(404).send('No such ad');
    const { ad, error } = readAd(req, a);
    if (!ad) return res.redirect(`/admin/ads/${a.id}?msg=${encodeURIComponent(error ?? 'Error')}`);
    db.prepare(
      `UPDATE ads SET title=@title, image=@image, target_url=@target_url, placement=@placement, skip_after=@skip_after, games=@games,
       active=@active, starts_at=@starts_at, ends_at=@ends_at, weight=@weight WHERE id=${a.id}`,
    ).run(ad);
    res.redirect('/admin/ads?msg=Ad+saved');
  });

  r.post('/ads/:id/toggle', (req, res) => {
    db.prepare('UPDATE ads SET active = 1 - active WHERE id = ?').run(Number(req.params.id));
    res.redirect('/admin/ads');
  });

  r.post('/ads/:id/delete', (req, res) => {
    db.prepare('DELETE FROM ads WHERE id = ?').run(Number(req.params.id));
    res.redirect('/admin/ads?msg=Ad+deleted');
  });

  // ---- ad settings ----
  r.get('/settings', (req, res) => {
    const s = adSettings(db);
    res.send(
      page(
        'Ad settings',
        html`<form method="post" action="/admin/settings" class="card" style="max-width:560px">
          <label
            ><input type="checkbox" name="enabled" value="1" ${raw(s.enabled ? 'checked' : '')} /> Show ads in the
            app</label
          >
          <label
            ><input type="checkbox" name="banners" value="1" ${raw(s.banners ? 'checked' : '')} /> Show banner ads on
            the level screen</label
          >
          <label>Full-screen ad after every … wins (0 = never)</label
          ><input name="interstitial_every" type="number" min="0" max="50" value="${s.interstitialEvery}" />
          <label>No full-screen ads before level / puzzle</label
          ><input name="first_after_level" type="number" min="0" max="1000" value="${s.firstAfterLevel}" />
          <label>Default seconds before the ✕ appears (new ads start with this)</label
          ><input name="default_skip_after" type="number" min="0" max="60" value="${s.defaultSkipAfter}" />
          <p class="dim">Players with an active subscription never see ads.</p>
          <p><button class="ok">Save</button></p>
        </form>`,
        { flash: flash(req) },
      ),
    );
  });

  r.post('/settings', (req, res) => {
    const b = req.body as Record<string, string>;
    const clamp = (v: string, lo: number, hi: number, d: number) => {
      const n = Math.floor(Number(v));
      return String(Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d);
    };
    setSetting(db, 'ads_enabled', b.enabled === '1' ? '1' : '0');
    setSetting(db, 'banners_enabled', b.banners === '1' ? '1' : '0');
    setSetting(db, 'interstitial_every', clamp(b.interstitial_every, 0, 50, 3));
    setSetting(db, 'first_after_level', clamp(b.first_after_level, 0, 1000, 5));
    setSetting(db, 'default_skip_after', clamp(b.default_skip_after, 0, 60, 5));
    res.redirect('/admin/settings?msg=Saved');
  });

  return r;
}
