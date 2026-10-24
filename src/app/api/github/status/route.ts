import { NextRequest } from 'next/server';
import { cookiesNames, githubConfig, openCookie, validSession } from '@/lib/github-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const config = githubConfig();
  if (!config) return Response.json({ configured: false, connected: false }, { headers: { 'Cache-Control': 'no-store' } });
  const session = openCookie(request.cookies.get(cookiesNames.session)?.value, config.key);
  return Response.json({ configured: true, connected: validSession(session), installUrl: `https://github.com/apps/${config.appSlug}/installations/new` }, { headers: { 'Cache-Control': 'no-store' } });
}
