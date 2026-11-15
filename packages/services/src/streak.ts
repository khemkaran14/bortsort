/** Login streak: day 1–7 rewards; a missed day restarts at 1 unless the weekly streak freeze is unused. */
export type StreakReward = { coins: number } | { booster: 'hint' | 'extraBolt' | 'undo' } | { skin: string };

export const STREAK_REWARDS: StreakReward[] = [
  { coins: 20 },
  { coins: 30 },
  { booster: 'hint' },
  { coins: 50 },
  { booster: 'undo' },
  { booster: 'extraBolt' },
  { skin: 'gems' },
];

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

function weekOf(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

/** Returns the new streak state and the reward for today, or null when already claimed today. */
export function checkIn(
  streak: { day: number; lastDate: string | null; freezesUsedWeek: string | null },
  today: string,
): { streak: typeof streak; reward: StreakReward; usedFreeze: boolean } | null {
  if (streak.lastDate === today) return null;
  let day = 1;
  let usedFreeze = false;
  let freezesUsedWeek = streak.freezesUsedWeek;
  if (streak.lastDate) {
    const gap = dayDiff(streak.lastDate, today);
    if (gap === 1) day = streak.day + 1;
    else if (gap === 2 && freezesUsedWeek !== weekOf(today)) {
      day = streak.day + 1;
      usedFreeze = true;
      freezesUsedWeek = weekOf(today);
    }
  }
  if (day > 7) day = 1;
  return { streak: { day, lastDate: today, freezesUsedWeek }, reward: STREAK_REWARDS[day - 1], usedFreeze };
}

export function todayLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
