import { NextRequest, NextResponse } from 'next/server';
import { cookieSettings, cookiesNames, githubConfig, openCookie, sealCookie, stateMatches, validPending } from '@/lib/github-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const config = githubConfig();
  if (!config || new URL(request.url).origin !== config.origin) return Response.json({ error: 'GitHub sign-in unavailable on this origin.' }, { status: 503 });
  const url = new URL(request.url);
  const pending = openCookie(request.cookies.get(cookiesNames.pending)?.value, config.key);
  const destination = (state: string) => {
    const response = NextResponse.redirect(config.origin + '/register?github=' + state);
    response.cookies.set(cookiesNames.pending, '', cookieSettings(config.origin, 0));
    return response;
  };
  if (url.searchParams.has('error')) return destination('denied');
  if (!validPending(pending) || !stateMatches(pending.state, url.searchParams.get('state'))) return destination('expired');
  const code = url.searchParams.get('code');
  if (!code || code.length > 512) return destination('expired');
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId, client_secret: config.clientSecret, code,
        redirect_uri: config.origin + '/api/github/callback', code_verifier: pending.verifier,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!response.ok || !data.access_token?.startsWith('ghu_')) return destination('failed');
    const age = Math.min(typeof data.expires_in === 'number' ? data.expires_in : 3600, 3600);
    if (age <= 0) return destination('failed');
    const result = destination('connected');
    result.cookies.set(cookiesNames.session, sealCookie({ token: data.access_token, expiresAt: Date.now() + age * 1000 }, config.key), cookieSettings(config.origin, age));
    return result;
  } catch {
    return destination('failed');
  }
}
