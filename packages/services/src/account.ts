import { Preferences } from '@capacitor/preferences';
import { SocialLogin } from '@capgo/capacitor-social-login';

export interface AccountUser {
  id: number;
  phone: string | null;
  email: string | null;
  name: string | null;
  subscription: { plan: string; name: string; expiresAt: number } | null;
  adFree: boolean;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryAfter?: number,
  ) {
    super(code);
  }
}

/** Talks to the Bolt Sort server. With no server URL configured the game simply stays offline. */
export class ApiClient {
  token: string | null = null;
  constructor(readonly baseUrl: string) {}

  get enabled() {
    return !!this.baseUrl;
  }

  async call<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
    if (!this.enabled) throw new ApiError(0, 'offline');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(this.baseUrl + path, {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number };
      if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.retryAfter);
      return data as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(0, 'network');
    } finally {
      clearTimeout(timer);
    }
  }
}

const TOKEN_KEY = 'bolt-sort.session';
const USER_KEY = 'bolt-sort.user';

/** Optional login with a one-time code sent by SMS or email. */
export class AccountService {
  user: AccountUser | null = null;
  private lastSync = 0;
  constructor(readonly api: ApiClient) {}

  get loggedIn() {
    return !!this.api.token && !!this.user;
  }

  get adFree() {
    return !!this.user?.adFree && !!this.user.subscription && this.user.subscription.expiresAt > Date.now();
  }

  /** Who is shown in the app: masked phone or email. */
  get label(): string {
    const u = this.user;
    if (!u) return '';
    if (u.name) return u.name;
    if (u.phone) return u.phone.slice(0, -6) + '••' + u.phone.slice(-4);
    if (u.email) return u.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2');
    return '';
  }

  async init() {
    try {
      this.api.token = (await Preferences.get({ key: TOKEN_KEY })).value;
      const cached = (await Preferences.get({ key: USER_KEY })).value;
      this.user = cached ? (JSON.parse(cached) as AccountUser) : null;
    } catch {
      /* storage unavailable */
    }
    if (this.api.token) void this.refresh();
  }

  /** Refresh the account (subscription may have changed). Signs out if the session ended. */
  async refresh() {
    try {
      const r = await this.api.call<{ user: AccountUser }>('GET', '/api/me');
      await this.setUser(r.user);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await this.clear();
    }
  }

  requestCode(channel: 'phone' | 'email', dest: string) {
    return this.api.call<{ ok: true; expiresIn: number }>('POST', '/api/auth/otp', { channel, [channel]: dest });
  }

  async verify(channel: 'phone' | 'email', dest: string, code: string) {
    const r = await this.api.call<{ token: string; user: AccountUser }>('POST', '/api/auth/verify', {
      channel,
      [channel]: dest,
      code,
    });
    this.api.token = r.token;
    await Preferences.set({ key: TOKEN_KEY, value: r.token });
    await this.setUser(r.user);
    return r.user;
  }

  private googleReady = false;

  /**
   * Sign in with Google: Google shows its own account picker; we send the signed ID token to our
   * server, which checks it with Google before logging in.
   */
  async googleLogin(ids: { webClientId: string; iOSClientId?: string }) {
    if (!this.googleReady) {
      await SocialLogin.initialize({
        google: {
          webClientId: ids.webClientId,
          iOSClientId: ids.iOSClientId,
          iOSServerClientId: ids.webClientId,
          mode: 'online',
          skipAuthOnlyAuthorizationAfterSignIn: true,
        },
      });
      this.googleReady = true;
    }
    const res = await SocialLogin.login({ provider: 'google', options: {} });
    const idToken = 'idToken' in res.result ? res.result.idToken : null;
    if (!idToken) throw new ApiError(0, 'google_failed');
    const r = await this.api.call<{ token: string; user: AccountUser }>('POST', '/api/auth/google', { idToken });
    this.api.token = r.token;
    await Preferences.set({ key: TOKEN_KEY, value: r.token });
    await this.setUser(r.user);
    return r.user;
  }

  async logout() {
    if (this.googleReady) SocialLogin.logout({ provider: 'google' }).catch(() => {});
    try {
      await this.api.call('POST', '/api/auth/logout');
    } catch {
      /* sign out locally anyway */
    }
    await this.clear();
  }

  async deleteAccount() {
    await this.api.call('DELETE', '/api/me');
    await this.clear();
  }

  /** Send a small progress summary (at most once a minute). */
  syncProgress(p: { boltLevel: number; witSolved: number; coins: number }) {
    if (!this.loggedIn || Date.now() - this.lastSync < 60_000) return;
    this.lastSync = Date.now();
    this.api.call('POST', '/api/me/progress', p).catch(() => {});
  }

  private async setUser(u: AccountUser) {
    this.user = u;
    await Preferences.set({ key: USER_KEY, value: JSON.stringify(u) }).catch(() => {});
  }

  private async clear() {
    this.api.token = null;
    this.user = null;
    await Preferences.remove({ key: TOKEN_KEY }).catch(() => {});
    await Preferences.remove({ key: USER_KEY }).catch(() => {});
  }
}
