import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { address } from '@solana/kit';
import { buildClaimFiles, findAppId, hashManifestHex } from '@open-app-registry/sdk';
import { parseGitHubRepository, prepareGitHubProof } from '../src/lib/github-proof';
import { newOauthAttempt, openCookie, sealCookie, stateMatches, validPending, validSession } from '../src/lib/github-auth';
import type { PreparedClaim } from '../src/lib/register-types';

const creator = address('91N96ZPGHcFWe2jEZie9rUVqyHF5BWMV7mYnHMurhWB7');
const repo = 'https://github.com/gwapupward-hub/lil-gwapz';
async function sample(): Promise<PreparedClaim> {
  const appId = await findAppId({ creator, nonce: 44n });
  const files = buildClaimFiles({ appId, cluster: 'solana:devnet', name: 'External creator pilot', repositories: [repo], manifestUri: 'https://example.com/oar-manifest.json' });
  return { appId, creator, authority: creator, nonce: '44', manifestUri: files.manifestUri, manifest: files.manifest as unknown as Record<string, unknown>, manifestSha256: hashManifestHex(files.manifest), wellKnown: files.wellKnown as unknown as Record<string, unknown>, repoProof: files.repoProof as unknown as Record<string, unknown> };
}

test('GitHub URL parser rejects arbitrary origins, path injections and query parameters', () => {
  assert.deepEqual(parseGitHubRepository(repo), { owner: 'gwapupward-hub', repo: 'lil-gwapz' });
  assert.deepEqual(parseGitHubRepository(repo + '.git'), { owner: 'gwapupward-hub', repo: 'lil-gwapz' });
  for (const url of ['http://github.com/a/b', 'https://evil.com/a/b', 'https://github.com/a/b/tree/main', 'https://github.com/a/b?x=1', 'https://github.com/a/b#x', 'https://github.com/a/../b']) {
    assert.throws(() => parseGitHubRepository(url), /repository|GitHub/i, url);
  }
});

test('repo publishing creates only fixed root proof and manifest files', async () => {
  const claim = await sample();
  const result = prepareGitHubProof(claim, repo);
  assert.equal(result.branch, 'oar/claim-' + claim.appId);
  assert.deepEqual(result.files.map(f => f.path), ['oar.json', 'oar-manifest.json']);
  assert.deepEqual(JSON.parse(result.files[0].content), { oar: '0.1', apps: [{ app_id: claim.appId, cluster: 'solana:devnet' }] });
  assert.equal(JSON.parse(result.files[1].content).app_id, claim.appId);
  assert.throws(() => prepareGitHubProof(claim, 'https://github.com/other/repo'), /named in the manifest/);
  assert.throws(() => prepareGitHubProof({ ...claim, manifestSha256: 'a'.repeat(64) }, repo), /does not match/);
  assert.throws(() => prepareGitHubProof({ ...claim, manifest: { ...claim.manifest, name: '' } }, repo), /invalid/);
});

test('GitHub session cookie is encrypted, authenticated, expiring and contains no plaintext token', () => {
  const key = randomBytes(32);
  const token = 'ghu_test-example-not-real';
  const input = { token, expiresAt: Date.now() + 60_000 };
  const sealed = sealCookie(input, key);
  assert.ok(!sealed.includes(token));
  assert.deepEqual(openCookie(sealed, key), input);
  assert.equal(validSession(openCookie(sealed, key)), true);
  assert.equal(openCookie(sealed.slice(0, 20) + (sealed[20] === 'A' ? 'B' : 'A') + sealed.slice(21), key), null);
  assert.equal(validSession({ token, expiresAt: Date.now() - 1 }), false);
  const pending = newOauthAttempt();
  assert.equal(validPending(openCookie(sealCookie(pending, key), key)), true);
  assert.equal(stateMatches(pending.state, pending.state), true);
  assert.equal(stateMatches(pending.state, pending.state.replace(/^./, '0')), false);
});
