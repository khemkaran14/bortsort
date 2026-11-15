/** Analytics events from the plan. Firebase Analytics plugs in behind this interface (Phase 3). */
export type AnalyticsEvent =
  | { name: 'level_start'; level: number }
  | { name: 'level_win'; level: number; moves: number; time: number; hints: number; undos: number; stars: number }
  | { name: 'level_quit'; level: number; moves: number; time: number; hints: number; undos: number }
  | { name: 'booster_used'; booster: string; level: number }
  | { name: 'coins_earned'; amount: number; source: string }
  | { name: 'coins_spent'; amount: number; item: string }
  | { name: 'daily_challenge_played'; date: string; won: boolean; moves: number }
  | { name: 'streak_day'; day: number }
  | { name: 'tutorial_step'; step: number }
  | { name: 'notification_opened'; type: string }
  | { name: 'mode_played'; mode: 'blueprint' | 'rush' | 'zen'; won: boolean; score?: number };

export interface AnalyticsService {
  log(e: AnalyticsEvent): void;
}

/** Default: keeps the last events in memory and prints them in development builds. */
export class LocalAnalytics implements AnalyticsService {
  readonly events: AnalyticsEvent[] = [];
  constructor(private readonly debug = false) {}
  log(e: AnalyticsEvent) {
    this.events.push(e);
    if (this.events.length > 200) this.events.shift();
    if (this.debug) console.debug('[analytics]', e);
  }
}
