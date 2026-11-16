import { createHash, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { now, type DB } from './db';

export const SESSION_DAYS = 180;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export interface User {
  id: number;
  phone: string | null;
  email: string | null;
  name: string | null;
  created_at: number;
  last_seen_at: number;
  blocked: number;
  progress: string | null;
}

/** Find or create the user for a verified phone/email and start a session. Returns the token. */
export function login(db: DB, channel: 'phone' | 'email', dest: string): { token: string; user: User } {
  const col = channel === 'phone' ? 'phone' : 'email';
  let user = db.prepare(`SELECT * FROM users WHERE ${col} = ?`).get(dest) as User | undefined;
  if (!user) {
    const t = now();
    const info = db.prepare(`INSERT INTO users (${col}, created_at, last_seen_at) VALUES (?, ?, ?)`).run(dest, t, t);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as User;
  }
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    sha(token),
    user.id,
    now(),
    now() + SESSION_DAYS * 86_400_000,
  );
  return { token, user };
}

export function userForToken(db: DB, token: string | undefined): User | null {
  if (!token) return null;
  const row = db
    .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .get(sha(token), now()) as User | undefined;
  if (!row || row.blocked) return null;
  return row;
}

export function logout(db: DB, token: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
}

export function bearer(req: Request): string | undefined {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: User | null;
  }
}

/** Attach req.user when a valid token is sent (optional login). */
export function optionalUser(db: DB) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.user = userForToken(db, bearer(req));
    if (req.user && now() - req.user.last_seen_at > 60_000) {
      db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now(), req.user.id);
    }
    next();
  };
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'login_required' });
  next();
}

export { sha as hashToken };
