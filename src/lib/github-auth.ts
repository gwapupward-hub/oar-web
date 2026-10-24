import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const PENDING_COOKIE = 'oar_gh_pending';
const SESSION_COOKIE = 'oar_gh_session';
const SESSION_SECONDS = 3600;
const STATE_SECONDS = 600;

export const cookiesNames = { pending: PENDING_COOKIE, session: SESSION_COOKIE };

export function githubConfig(): { clientId: string; clientSecret: string; origin: string; appSlug: string; key: Buffer } | null {
  const clientId = process.env.OAR_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAR_GITHUB_CLIENT_SECRET;
  const appSlug = process.env.OAR_GITHUB_APP_SLUG;
  const origin = process.env.OAR_GITHUB_ORIGIN ?? 'https://oarprotocol.xyz';
  const keyString = process.env.OAR_GITHUB_SESSION_KEY;
  if (!clientId || !clientSecret || !keyString || !appSlug) return null;
  const key = Buffer.from(keyString, 'base64');
  if (key.length !== 32 || key.toString('base64') !== keyString || !/^https?:\/\/[^/?#]+$/.test(origin) || !/^[a-z0-9-]+$/.test(appSlug)) {
    throw new Error('Invalid GitHub App configuration.');
  }
  return { clientId, clientSecret, appSlug, origin, key };
}

export function cookieSettings(origin: string, maxAge: number) {
  return { httpOnly: true, secure: origin.startsWith('https://'), sameSite: 'lax' as const, path: '/api/github', maxAge };
}

/** AES-256-GCM authenticated, expiring cookie. Never expose GitHub tokens to client JavaScript. */
export function sealCookie(data: Record<string, unknown>, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}
export function openCookie(input: string | undefined, key: Buffer): Record<string, unknown> | null {
  if (!input || input.length > 4096) return null;
  try {
    const all = Buffer.from(input, 'base64url');
    if (all.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, all.subarray(0, 12));
    decipher.setAuthTag(all.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(all.subarray(28)), decipher.final()]).toString('utf8'));
    return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : null;
  } catch { return null; }
}

export function newOauthAttempt() {
  const state = randomBytes(24).toString('hex');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { state, verifier, challenge, expiresAt: Date.now() + STATE_SECONDS * 1000 };
}
export function stateMatches(expected: unknown, actual: unknown): boolean {
  if (typeof expected !== 'string' || typeof actual !== 'string' || expected.length !== 48 || actual.length !== 48) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
export function validPending(value: Record<string, unknown> | null): value is { state: string; verifier: string; expiresAt: number } {
  return !!value && typeof value.state === 'string' && typeof value.verifier === 'string'
    && typeof value.expiresAt === 'number' && value.expiresAt > Date.now()
    && value.expiresAt < Date.now() + STATE_SECONDS * 1000 + 10_000;
}
export function validSession(value: Record<string, unknown> | null): value is { token: string; expiresAt: number } {
  return !!value && typeof value.token === 'string' && value.token.startsWith('ghu_')
    && value.token.length < 1024 && typeof value.expiresAt === 'number' && value.expiresAt > Date.now();
}
export const githubSessionSeconds = SESSION_SECONDS;
