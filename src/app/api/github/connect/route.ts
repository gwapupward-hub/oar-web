import { NextResponse } from 'next/server';
import { cookieSettings, cookiesNames, githubConfig, newOauthAttempt, sealCookie } from '@/lib/github-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Explicit GitHub App user authorization; no broad PAT or implicit installation. */
export async function GET(request: Request) {
  const config = githubConfig();
  if (!config) return Response.json({ error: 'GitHub proof publishing has not been configured.' }, { status: 503 });
  if (new URL(request.url).origin !== config.origin) return Response.json({ error: 'Open the canonical OAR website to connect GitHub.' }, { status: 403 });
  const attempt = newOauthAttempt();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', config.clientId);
  authorize.searchParams.set('redirect_uri', config.origin + '/api/github/callback');
  authorize.searchParams.set('state', attempt.state);
  authorize.searchParams.set('code_challenge', attempt.challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');
  const response = NextResponse.redirect(authorize);
  response.cookies.set(cookiesNames.pending, sealCookie(attempt, config.key), cookieSettings(config.origin, 600));
  return response;
}
