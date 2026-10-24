import { NextRequest } from 'next/server';
import { cookiesNames, githubConfig, openCookie, validSession } from '@/lib/github-auth';
import { createProofPR, GitHubApiError } from '@/lib/github-pr';
import type { PreparedClaim } from '@/lib/register-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  const config = githubConfig();
  if (!config) return json({ error: 'GitHub publishing is not configured yet. Use the manual file path.' }, 503);
  if (new URL(request.url).origin !== config.origin || request.headers.get('origin') !== config.origin)
    return json({ error: 'This request must come from the OAR registration page.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Send JSON.' }, 415);
  const session = openCookie(request.cookies.get(cookiesNames.session)?.value, config.key);
  if (!validSession(session)) return json({ error: 'Your GitHub connection expired. Reconnect to create a proof PR.' }, 401);
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > 48_000) return json({ error: 'Registration payload too large.' }, 413);
  try {
    const data = JSON.parse(text) as { repository?: string; claim?: PreparedClaim };
    if (!data || typeof data !== 'object' || typeof data.repository !== 'string' || !data.claim)
      return json({ error: 'Choose a repository from this app draft.' }, 400);
    return json(await createProofPR(session.token, data.claim, data.repository));
  } catch (e) {
    if (e instanceof GitHubApiError) return json({ error: e.message }, e.status);
    if (e instanceof SyntaxError) return json({ error: 'Invalid JSON.' }, 400);
    if (e instanceof Error && /draft|manifest|repository|large|GitHub/.test(e.message)) return json({ error: e.message }, 400);
    // Avoid logging tokens, OAuth responses, or other secret-bearing network errors.
    return json({ error: 'GitHub could not prepare the proof PR. Try again, or use the manual proof files.' }, 502);
  }
}
