// Live check of a running explorer against Solana devnet, using OAR's own registration as the fixture.
//   BASE_URL=http://127.0.0.1:3000 node scripts/devnet-smoke.mjs
// With EXPECT_COMMIT set (post-deploy runs), it first waits until BASE_URL serves that commit.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const EXPECT_COMMIT = process.env.EXPECT_COMMIT;
const APP = 'Bu1JCyxiVDdDGjtNLLkKhq6KZv6E4LcUgqNkS5t5Nf2K';
const PROGRAM = 'oariw8YXcYJh9sa9VcmBU3ZCdo2WVGMYPsLjEuUxfrC';
const REPO = 'https://github.com/gwapupward-hub/oar';
const failures = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures.push(what); };
const get = async (path) => {
  const res = await fetch(BASE + path, { redirect: 'manual', signal: AbortSignal.timeout(90_000) });
  return { status: res.status, location: res.headers.get('location'), csp: res.headers.get('content-security-policy'), html: await res.text() };
};
const servedCommit = html => /<meta name="oar-web-commit" content="([0-9a-f]+)"/.exec(html)?.[1] ?? null;
const chip = (html, kind, subject) => new RegExp(`data-kind="${kind}" data-state="(\\w+)" data-subject="${subject.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"`).exec(html)?.[1];

// A production alias moves to a new build only once it is ready: wait (up to 3 minutes) rather than check the old one.
if (EXPECT_COMMIT) {
  let served = null;
  for (let i = 0; i < 36 && served !== EXPECT_COMMIT; i++) {
    if (i) await new Promise(r => setTimeout(r, 5_000));
    served = await get('/').then(r => servedCommit(r.html)).catch(() => null);
  }
  check(served === EXPECT_COMMIT, `${BASE} serves commit ${EXPECT_COMMIT} (got ${served ?? 'no commit marker'})`);
  if (served !== EXPECT_COMMIT) process.exit(1);
}

const app = await get(`/app/${APP}`);
check(app.status === 200, `GET /app/${APP} → 200 (got ${app.status})`);
check(/<h1[^>]*>(?:<!-- -->)?Open App Registry/.test(app.html) && /data-unverified="false"/.test(app.html), 'app title is "Open App Registry" with no Unverified prefix');
check(/data-status="Active"/.test(app.html), 'status Active');
check(/data-field="manifest" data-ok="true"/.test(app.html), 'manifest valid');
check(chip(app.html, 'program', PROGRAM) === 'verified', `program ${PROGRAM} verified (got ${chip(app.html, 'program', PROGRAM)})`);
check(chip(app.html, 'repository', REPO) === 'verified', `repository ${REPO} verified (got ${chip(app.html, 'repository', REPO)})`);
check(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/.test(app.csp ?? ''), 'nonce-based CSP header');

const program = await get(`/program/${PROGRAM}`);
check(program.status === 200 && new RegExp(`data-program="${PROGRAM}" data-state="verified"`).test(program.html), 'program page: backlink verified both ways');

const byApp = await get(`/search?q=${APP}`);
check(byApp.status === 307 && byApp.location?.endsWith(`/app/${APP}`), 'search by App ID redirects to the app');
const byProgram = await get(`/search?q=${PROGRAM}`);
check(byProgram.status === 307 && byProgram.location?.endsWith(`/program/${PROGRAM}`), 'search by program ID redirects to the program');
const byRepo = await get(`/search?q=${encodeURIComponent(REPO)}`);
check(new RegExp(`data-app-id="${APP}"`).test(byRepo.html), 'search by repository finds the app');
check((await get('/app/11111111111111111111111111111112')).status === 404, 'unknown App ID → 404');

// The RPC URL may carry a provider key: it must never appear in client assets. Against a local build, scan every
// file in .next/static; against a deployment, scan every script the fetched pages reference.
const secrets = [process.env.OAR_DEVNET_RPC_URL, 'api.devnet.solana.com', 'OAR_DEVNET_RPC_URL'].filter(Boolean);
let assets;
if (existsSync('.next/static')) {
  const walk = d => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  assets = walk('.next/static').map(f => ({ name: f, text: readFileSync(f, 'utf8') }));
} else {
  const paths = [...new Set([app, program, byRepo].flatMap(p => p.html.match(/\/_next\/static\/[\w\-.~/]+?\.js/g) ?? []))];
  assets = await Promise.all(paths.map(async p => { const r = await get(p); return { name: p, text: r.html, missing: r.status !== 200 }; }));
}
const missing = assets.filter(a => a.missing).map(a => a.name);
check(missing.length === 0, `every referenced client script loads${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
const leaked = assets.filter(a => secrets.some(s => a.text.includes(s))).map(a => a.name);
check(assets.length > 0 && leaked.length === 0, `no RPC URL in ${assets.length} client asset(s)${leaked.length ? `: ${leaked.join(', ')}` : ''}`);

if (failures.length) { console.error(`\n${failures.length} check(s) failed`); process.exit(1); }
console.log('\nDevnet smoke passed');
