import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { now, type DB } from './db';

export const OTP = {
  ttlMs: 5 * 60_000,
  maxAttempts: 5,
  resendMs: 45_000,
  perDestinationHour: 5,
  perIpHour: 20,
} as const;

export type Channel = 'phone' | 'email';

/** E.164 phone numbers, e.g. +919876543210. */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.replace(/[\s()-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  return s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null;
}

const hash = (secret: string, dest: string, code: string) =>
  createHash('sha256').update(`${secret}:${dest}:${code}`).digest('hex');

export type IssueResult = { ok: true; code: string } | { ok: false; error: 'wait' | 'too_many'; retryAfter?: number };

/** Create a 6-digit code, unless rate limits say no. The caller sends it. */
export function issueOtp(db: DB, secret: string, channel: Channel, dest: string, ip: string): IssueResult {
  const t = now();
  const last = db
    .prepare('SELECT created_at FROM otps WHERE destination = ? ORDER BY created_at DESC LIMIT 1')
    .get(dest) as { created_at: number } | undefined;
  if (last && t - last.created_at < OTP.resendMs) {
    return { ok: false, error: 'wait', retryAfter: Math.ceil((OTP.resendMs - (t - last.created_at)) / 1000) };
  }
  const hourAgo = t - 3_600_000;
  const byDest = (
    db.prepare('SELECT COUNT(*) n FROM otps WHERE destination = ? AND created_at > ?').get(dest, hourAgo) as {
      n: number;
    }
  ).n;
  const byIp = (
    db.prepare('SELECT COUNT(*) n FROM otps WHERE ip = ? AND created_at > ?').get(ip, hourAgo) as { n: number }
  ).n;
  if (byDest >= OTP.perDestinationHour || byIp >= OTP.perIpHour) return { ok: false, error: 'too_many' };
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  db.prepare('UPDATE otps SET used = 1 WHERE destination = ? AND used = 0').run(dest);
  db.prepare(
    'INSERT INTO otps (channel, destination, code_hash, created_at, expires_at, ip) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(channel, dest, hash(secret, dest, code), t, t + OTP.ttlMs, ip);
  // Housekeeping: forget codes older than a day.
  db.prepare('DELETE FROM otps WHERE created_at < ?').run(t - 86_400_000);
  return { ok: true, code };
}

export type VerifyResult = { ok: true } | { ok: false; error: 'invalid' | 'expired' | 'too_many_attempts' };

export function verifyOtp(db: DB, secret: string, dest: string, code: unknown): VerifyResult {
  const row = db
    .prepare(
      'SELECT id, code_hash, expires_at, attempts FROM otps WHERE destination = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
    )
    .get(dest) as { id: number; code_hash: string; expires_at: number; attempts: number } | undefined;
  if (!row) return { ok: false, error: 'invalid' };
  if (row.expires_at < now()) return { ok: false, error: 'expired' };
  if (row.attempts >= OTP.maxAttempts) return { ok: false, error: 'too_many_attempts' };
  db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE id = ?').run(row.id);
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return { ok: false, error: 'invalid' };
  const a = Buffer.from(hash(secret, dest, code), 'hex');
  const b = Buffer.from(row.code_hash, 'hex');
  if (!timingSafeEqual(a, b)) return { ok: false, error: 'invalid' };
  db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(row.id);
  return { ok: true };
}
