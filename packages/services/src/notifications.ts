import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { t } from './i18n';

/** At most one reminder per day: the daily challenge (or streak at risk). Players can turn it off. */
export class NotificationService {
  async scheduleDaily(opts: { daily: boolean; streak: boolean; streakDay: number; lang: 'en' | 'hi' }) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      if (!opts.daily && !opts.streak) return;
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;
      const at = new Date();
      at.setDate(at.getDate() + 1);
      at.setHours(18, 30, 0, 0);
      const streakRisk = opts.streak && opts.streakDay >= 2;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1,
            title: t(opts.lang, streakRisk ? 'notif.streak.title' : 'notif.daily.title'),
            body: t(opts.lang, streakRisk ? 'notif.streak.body' : 'notif.daily.body'),
            schedule: { at, allowWhileIdle: true },
          },
        ],
      });
    } catch {
      /* ignore */
    }
  }
}
