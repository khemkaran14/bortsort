import { OAuth2Client } from 'google-auth-library';
import type { GoogleIdentity } from './auth';

export type GoogleVerifier = (idToken: string) => Promise<GoogleIdentity | null>;

/** Checks a Google ID token's signature, issuer, expiry and audience (our client ids). */
export function googleVerifier(clientIds: string[]): GoogleVerifier {
  const client = new OAuth2Client();
  return async (idToken) => {
    if (!clientIds.length) return null;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientIds });
      const p = ticket.getPayload();
      if (!p?.sub) return null;
      return { sub: p.sub, email: p.email ?? null, emailVerified: p.email_verified === true, name: p.name ?? null };
    } catch {
      return null;
    }
  };
}
