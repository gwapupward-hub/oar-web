// Copies the site's icons from the OAR brand kit (gwapupward-hub/oar, brand/) and pins them in brand.lock.json.
//   node scripts/sync-brand.mjs [ref]        ref: a branch, tag or commit of gwapupward-hub/oar (default: main)
// test/brand.test.ts fails if any icon drifts from the lock, so icons change only through this script.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync('brand.lock.json', 'utf8'));
const REPO = lock.repository;
const ref = process.argv[2] ?? 'main';

// Resolve the ref to a commit so the lock records exactly what was copied.
const commit = /^[0-9a-f]{40}$/.test(ref) ? ref
  : execFileSync('git', ['ls-remote', `https://github.com/${REPO}`, ref, `${ref}^{}`], { encoding: 'utf8' }).trim().split('\n').at(-1)?.split('\t')[0];
if (!commit || !/^[0-9a-f]{40}$/.test(commit)) throw new Error(`cannot resolve ${REPO}@${ref}`);

for (const asset of lock.assets) {
  const url = `https://raw.githubusercontent.com/${REPO}/${commit}/${asset.source}`;
  const file = await fetch(url);
  if (!file.ok) throw new Error(`${url}: HTTP ${file.status}`);
  const bytes = Buffer.from(await file.arrayBuffer());
  writeFileSync(asset.path, bytes);
  asset.sha256 = createHash('sha256').update(bytes).digest('hex');
  console.log(`${asset.path} ← ${asset.source} (${asset.sha256.slice(0, 12)})`);
}
lock.commit = commit;
writeFileSync('brand.lock.json', JSON.stringify(lock, null, 2) + '\n');
console.log(`\nbrand.lock.json pinned to ${REPO}@${commit}`);
