import { now, type DB } from './db';

/** Plans. 'premium' removes all ads. Payments (Google Play / App Store) can add rows with source 'google_play' etc. */
export const PLANS = { premium: { name: 'Premium (no ads)', adFree: true } } as const;
export type Plan = keyof typeof PLANS;

export interface Subscription {
  id: number;
  user_id: number;
  plan: Plan;
  status: 'active' | 'cancelled';
  source: string;
  starts_at: number;
  expires_at: number;
  note: string | null;
  created_at: number;
}

export function activeSubscription(db: DB, userId: number): Subscription | null {
  return (
    (db
      .prepare(
        "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND starts_at <= ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 1",
      )
      .get(userId, now(), now()) as Subscription | undefined) ?? null
  );
}

export function isAdFree(db: DB, userId: number | undefined): boolean {
  if (!userId) return false;
  const s = activeSubscription(db, userId);
  return !!s && PLANS[s.plan]?.adFree === true;
}

/** Give or extend a subscription: if one is active, the new days are added after it ends. */
export function grantSubscription(
  db: DB,
  userId: number,
  plan: Plan,
  days: number,
  source: string,
  note: string | null,
) {
  const current = activeSubscription(db, userId);
  const start = current ? current.expires_at : now();
  db.prepare(
    "INSERT INTO subscriptions (user_id, plan, status, source, starts_at, expires_at, note, created_at) VALUES (?, ?, 'active', ?, ?, ?, ?, ?)",
  ).run(userId, plan, source, start, start + days * 86_400_000, note, now());
}

export function cancelSubscriptions(db: DB, userId: number) {
  db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'").run(userId);
}
