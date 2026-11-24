import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { openDb, type DB } from '../src/db';
import { makeSender, outbox } from '../src/senders';

let server: Server;
let base = '';
let db: DB;
const dir = mkdtempSync(join(tmpdir(), 'boltsort-'));

beforeAll(async () => {
  const cfg = loadConfig({
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'correct horse battery',
    UPLOAD_DIR: join(dir, 'uploads'),
    PUBLIC_URL: 'http://test.local',
    GOOGLE_CLIENT_IDS: 'test-client',
  } as NodeJS.ProcessEnv);
  db = openDb(':memory:');
  // Fake Google check: tokens look like "good:<sub>:<email>:<verified>".
  const fakeGoogle = async (t: string) => {
    const [ok, sub, email, verified] = t.split(':');
    return ok === 'good' ? { sub, email: email || null, emailVerified: verified === '1', name: 'G User' } : null;
  };
  server = createApp(db, cfg, makeSender(cfg), fakeGoogle).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const post = (path: string, body: unknown, token?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
const lastCode = (to: string) => [...outbox].reverse().find((m) => m.to === to)!.code;

async function loginPhone(phone: string) {
  expect((await post('/api/auth/otp', { channel: 'phone', phone })).status).toBe(200);
  const r = await post('/api/auth/verify', { channel: 'phone', phone, code: lastCode(phone) });
  expect(r.status).toBe(200);
  return (await r.json()) as { token: string; user: { id: number; adFree: boolean } };
}

/** Admin session cookie. */
async function adminCookie() {
  const r = await fetch(base + '/admin/login', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'email=admin%40example.com&password=correct+horse+battery',
  });
  expect(r.status).toBe(302);
  return r.headers.get('set-cookie')!.split(';')[0];
}
const adminPost = (cookie: string, path: string, form: Record<string, string>) =>
  fetch(base + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });

describe('OTP login', () => {
  it('logs in with a phone number and returns the account', async () => {
    const { token, user } = await loginPhone('+919876543210');
    expect(token.length).toBeGreaterThan(30);
    const me = await (await fetch(base + '/api/me', { headers: { authorization: `Bearer ${token}` } })).json();
    expect(me.user.phone).toBe('+919876543210');
    expect(me.user.id).toBe(user.id);
  });

  it('logs in with email (case-insensitive) and logging in again gives the same user', async () => {
    await post('/api/auth/otp', { channel: 'email', email: 'Player@Example.com' });
    const a = await (
      await post('/api/auth/verify', {
        channel: 'email',
        email: 'player@example.com',
        code: lastCode('player@example.com'),
      })
    ).json();
    db.prepare('UPDATE otps SET created_at = created_at - 60000').run(); // skip the resend wait
    await post('/api/auth/otp', { channel: 'email', email: 'player@example.com' });
    const b = await (
      await post('/api/auth/verify', {
        channel: 'email',
        email: 'player@example.com',
        code: lastCode('player@example.com'),
      })
    ).json();
    expect(b.user.id).toBe(a.user.id);
  });

  it('rejects bad numbers, wrong codes, and locks after 5 tries', async () => {
    expect((await post('/api/auth/otp', { channel: 'phone', phone: '12345' })).status).toBe(400);
    const phone = '+919000000001';
    await post('/api/auth/otp', { channel: 'phone', phone });
    const good = lastCode(phone);
    const bad = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++)
      expect((await post('/api/auth/verify', { channel: 'phone', phone, code: bad })).status).toBe(400);
    const r = await post('/api/auth/verify', { channel: 'phone', phone, code: good });
    expect((await r.json()).error).toBe('too_many_attempts');
  });

  it('a code works only once', async () => {
    const phone = '+919000000002';
    await post('/api/auth/otp', { channel: 'phone', phone });
    const code = lastCode(phone);
    expect((await post('/api/auth/verify', { channel: 'phone', phone, code })).status).toBe(200);
    expect((await post('/api/auth/verify', { channel: 'phone', phone, code })).status).toBe(400);
  });

  it('makes you wait before asking for another code', async () => {
    const phone = '+919000000003';
    await post('/api/auth/otp', { channel: 'phone', phone });
    const r = await post('/api/auth/otp', { channel: 'phone', phone });
    expect(r.status).toBe(429);
    expect((await r.json()).error).toBe('wait');
  });

  it('logout ends the session; delete removes the account', async () => {
    const { token } = await loginPhone('+919000000004');
    expect((await post('/api/auth/logout', {}, token)).status).toBe(200);
    expect((await fetch(base + '/api/me', { headers: { authorization: `Bearer ${token}` } })).status).toBe(401);
    db.prepare('UPDATE otps SET created_at = created_at - 60000').run();
    const again = await loginPhone('+919000000004');
    const del = await fetch(base + '/api/me', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${again.token}` },
    });
    expect(del.status).toBe(200);
    expect(db.prepare('SELECT 1 FROM users WHERE phone = ?').get('+919000000004')).toBeUndefined();
  });
});

describe('Sign in with Google', () => {
  it('rejects tokens Google did not sign', async () => {
    expect((await post('/api/auth/google', { idToken: 'forged' })).status).toBe(401);
  });

  it('creates an account and finds it again by Google id', async () => {
    const a = await (await post('/api/auth/google', { idToken: 'good:sub-1:new@example.com:1' })).json();
    expect(a.user.email).toBe('new@example.com');
    const b = await (await post('/api/auth/google', { idToken: 'good:sub-1:new@example.com:1' })).json();
    expect(b.user.id).toBe(a.user.id);
  });

  it('links to an existing email account only when Google verified the email', async () => {
    await post('/api/auth/otp', { channel: 'email', email: 'linked@example.com' });
    const e = await (
      await post('/api/auth/verify', {
        channel: 'email',
        email: 'linked@example.com',
        code: lastCode('linked@example.com'),
      })
    ).json();
    const unverified = await (await post('/api/auth/google', { idToken: 'good:sub-2:linked@example.com:0' })).json();
    expect(unverified.user.id).not.toBe(e.user.id);
    const verified = await (await post('/api/auth/google', { idToken: 'good:sub-3:linked@example.com:1' })).json();
    expect(verified.user.id).toBe(e.user.id);
  });

  it('tells the app Google login is available', async () => {
    expect(await (await fetch(base + '/api/auth/options')).json()).toEqual({ phone: true, email: true, google: true });
  });
});

describe('admin panel', () => {
  it('needs a login and rejects a wrong password', async () => {
    const r = await fetch(base + '/admin/users', { redirect: 'manual' });
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/admin/login');
    const bad = await fetch(base + '/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=admin%40example.com&password=nope',
    });
    expect(bad.status).toBe(401);
  });

  it('lists users and gives a subscription that removes ads', async () => {
    const cookie = await adminCookie();
    const { token, user } = await loginPhone('+919111111111');
    const list = await (await fetch(base + '/admin/users?q=9111', { headers: { cookie } })).text();
    expect(list).toContain('+919111111111');
    const g = await adminPost(cookie, `/admin/users/${user.id}/grant`, { plan: 'premium', days: '30', note: 'UPI' });
    expect(g.status).toBe(302);
    const me = await (await fetch(base + '/api/me', { headers: { authorization: `Bearer ${token}` } })).json();
    expect(me.user.adFree).toBe(true);
    expect(me.user.subscription.plan).toBe('premium');
    const subs = await (await fetch(base + '/admin/subscriptions', { headers: { cookie } })).text();
    expect(subs).toContain('+919111111111');
  });

  it('escapes user data in pages', async () => {
    const cookie = await adminCookie();
    const { token } = await loginPhone('+919222222222');
    await post('/api/me/name', { name: '<script>alert(1)</script>' }, token);
    const html = await (await fetch(base + '/admin/users?q=9222', { headers: { cookie } })).text();
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('blocks posts from other sites', async () => {
    const cookie = await adminCookie();
    const r = await fetch(base + '/admin/settings', {
      method: 'POST',
      headers: { cookie, origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' },
      body: 'enabled=0',
    });
    expect(r.status).toBe(403);
  });
});

describe('ads', () => {
  let adId = 0;

  it('admin creates an ad with a close delay; the app receives it', async () => {
    const cookie = await adminCookie();
    const fd = new FormData();
    fd.set('title', 'Divyrs tools');
    fd.set('target_url', 'https://example.com/landing?src=boltsort');
    fd.set('placement', 'interstitial');
    fd.set('skip_after', '7');
    fd.set('games', 'all');
    fd.set('weight', '1');
    fd.set('active', '1');
    fd.set('image_file', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }), 'ad.png');
    const r = await fetch(base + '/admin/ads/new', {
      method: 'POST',
      redirect: 'manual',
      headers: { cookie },
      body: fd,
    });
    expect(r.status).toBe(302);
    const cfg = await (await fetch(base + '/api/ads?game=wit')).json();
    expect(cfg.enabled).toBe(true);
    expect(cfg.ads).toHaveLength(1);
    expect(cfg.ads[0].skipAfter).toBe(7);
    expect(cfg.ads[0].image).toMatch(/^http:\/\/test\.local\/uploads\/[0-9a-f]+\.png$/);
    adId = cfg.ads[0].id;
  });

  it('a click is counted and redirects to the advertiser', async () => {
    const r = await fetch(`${base}/r/${adId}`, { redirect: 'manual' });
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('https://example.com/landing?src=boltsort');
    await post(`/api/ads/${adId}/impression`, {});
    const row = db.prepare('SELECT impressions, clicks FROM ads WHERE id = ?').get(adId) as {
      impressions: number;
      clicks: number;
    };
    expect(row).toEqual({ impressions: 1, clicks: 1 });
  });

  it('refuses non-web links', async () => {
    const cookie = await adminCookie();
    const fd = new FormData();
    fd.set('title', 'Bad');
    fd.set('target_url', 'javascript:alert(1)');
    fd.set('image_url', 'https://example.com/a.png');
    const r = await fetch(base + '/admin/ads/new', { method: 'POST', headers: { cookie }, body: fd });
    expect(r.status).toBe(400);
  });

  it('subscribers get no ads; settings can switch ads off', async () => {
    db.prepare('UPDATE otps SET created_at = created_at - 60000').run();
    const { token } = await loginPhone('+919111111111'); // has premium from the admin test
    const cfg = await (
      await fetch(base + '/api/ads?game=bolt', { headers: { authorization: `Bearer ${token}` } })
    ).json();
    expect(cfg).toMatchObject({ enabled: false, adFree: true, ads: [] });
    const cookie = await adminCookie();
    await adminPost(cookie, '/admin/settings', {
      interstitial_every: '2',
      first_after_level: '3',
      default_skip_after: '5',
    });
    expect((await (await fetch(base + '/api/ads')).json()).enabled).toBe(false);
  });

  it('sends CORS headers only to the app origins', async () => {
    const ok = await fetch(base + '/api/ads', { headers: { origin: 'https://localhost' } });
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://localhost');
    const no = await fetch(base + '/api/ads', { headers: { origin: 'https://evil.example' } });
    expect(no.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('web account deletion page', () => {
  it('is served for the store listing', async () => {
    const r = await fetch(base + '/delete-account');
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('Delete your account');
  });
  it('serves the privacy policy', async () => {
    const r = await fetch(base + '/privacy');
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('Privacy Policy');
  });
});

describe('production settings', () => {
  it('refuses to start with unsafe settings', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(/OTP_SECRET/);
  });
});
