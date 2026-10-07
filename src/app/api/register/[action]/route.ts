import { parseJsonStrict } from '@open-app-registry/sdk';
import { rpc } from '@/lib/rpc';
import { RegisterError, buildLink, buildRegister, check, parseForm, prepare, relay, status } from '@/lib/register';

// JSON API behind the /register wizard. POST only, small bodies, no cookies or sessions: it builds unsigned
// transactions and relays signed registration transactions, so nothing here can act for anyone.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 96 * 1024;

const actions: Record<string, (body: unknown) => Promise<unknown>> = {
  prepare: body => prepare(rpc, parseForm(body)),
  check: body => check(rpc, body),
  'build-register': body => buildRegister(rpc, body),
  'build-link': body => buildLink(rpc, body),
  send: body => relay(rpc, body),
  status: body => status(rpc, body),
};

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const handler = actions[(await params).action];
  if (!handler) return json({ error: 'Unknown action.' }, 404);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Send JSON.' }, 415);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json({ error: 'Request too large.' }, 413);
  try {
    return json(await handler(parseJsonStrict(text)));
  } catch (e) {
    if (e instanceof RegisterError) return json({ error: e.message }, e.status);
    if (e instanceof SyntaxError) return json({ error: `Invalid JSON: ${e.message}` }, 400);
    // RPC and network errors can carry provider details; log them here and return a generic message.
    console.error('register API error', e);
    return json({ error: 'The devnet RPC request failed. Try again in a moment.' }, 502);
  }
}
