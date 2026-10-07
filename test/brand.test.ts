import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

type Lock = { repository: string; commit: string; assets: { path: string; source: string; sha256: string }[] };
const lock: Lock = JSON.parse(readFileSync('brand.lock.json', 'utf8'));
const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('every site icon is byte-identical to the pinned OAR brand kit asset', () => {
  assert.match(lock.commit, /^[0-9a-f]{40}$/);
  for (const { path, source, sha256: want } of lock.assets) {
    assert.equal(sha256(path), want, `${path} differs from ${lock.repository}@${lock.commit.slice(0, 7)}:${source}; run node scripts/sync-brand.mjs`);
  }
});

test('no icon file outside the brand lock', () => {
  const locked = new Set(lock.assets.map(a => a.path));
  // Next.js file-convention icons in the app root, plus any favicon-like file in public/.
  const candidates = [
    ...readdirSync('src/app').filter(f => /^(favicon|icon|apple-icon)\d*\.\w+$/.test(f)).map(f => `src/app/${f}`),
    ...readdirSync('public').filter(f => /favicon|icon|logo|mark/i.test(f) || /\.(ico|png|svg|webp)$/.test(f)).map(f => `public/${f}`),
  ];
  assert.deepEqual(candidates.filter(f => !locked.has(f)), []);
});

test('layout metadata does not override the file-convention icons', () => {
  assert.doesNotMatch(readFileSync('src/app/layout.tsx', 'utf8'), /\bicons\s*:/);
});
