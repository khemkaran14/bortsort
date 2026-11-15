import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/** Light buzz on lift and drop, stronger on bolt complete; can be switched off in Settings. */
export class HapticsService {
  on = true;
  private run(fn: () => Promise<void>) {
    if (!this.on) return;
    fn().catch(() => {
      /* not supported on this device */
    });
  }
  lift() {
    this.run(() => Haptics.impact({ style: ImpactStyle.Light }));
  }
  drop() {
    this.run(() => Haptics.impact({ style: ImpactStyle.Light }));
  }
  invalid() {
    this.run(() => Haptics.notification({ type: NotificationType.Warning }));
  }
  complete() {
    this.run(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  }
  win() {
    this.run(() => Haptics.notification({ type: NotificationType.Success }));
  }
}
