import { test } from 'node:test';
import assert from 'node:assert/strict';
import { address } from '@solana/kit';
import { buildClaimFiles, findAppId, validateManifest } from '@open-app-registry/sdk';
import { explainProof, friendlyWalletError } from '../src/components/register/guidance';
import type { CheckRow } from '../src/lib/register-types';

// Dry-run fixture coverage for five planned GWAP adopters; never claim a live registration or owner signature.
const candidates = [
  { name: 'OAR', domain: 'oarprotocol.xyz', repo: 'https://github.com/gwapupward-hub/oar', category: 'identity' },
  { name: 'GwapSpot OS', domain: 'gwapspot.com', repo: 'https://github.com/gwapupward-hub/gwapspot-web', category: 'marketplace' },
  { name: 'Gwap Name Service', domain: 'gwapspot.fun', repo: undefined, category: 'identity' },
  { name: 'GwapScore', domain: 'gwapscore.live', repo: 'https://github.com/gwapupward-hub/GwapScore-Official-v1', category: 'data' },
  { name: 'Lil Gwapz', domain: 'lilgwapz.xyz', repo: 'https://github.com/gwapupward-hub/lil-gwapz', category: 'media' },
] as const;
const creator = address('91N96ZPGHcFWe2jEZie9rUVqyHF5BWMV7mYnHMurhWB7');

test('five GWAP pilot claims produce valid independent Devnet manifests and distinct App IDs', async () => {
  const ids = new Set<string>();
  for (const [nonce, candidate] of candidates.entries()) {
    const appId = await findAppId({ creator, nonce: BigInt(nonce + 10) });
    ids.add(appId);
    const files = buildClaimFiles({
      appId,
      cluster: 'solana:devnet',
      name: candidate.name,
      categories: [candidate.category],
      domains: [candidate.domain],
      repositories: candidate.repo ? [candidate.repo] : [],
    });
    assert.equal(validateManifest(files.manifest).valid, true, candidate.name);
    assert.equal(files.manifestUri, `https://${candidate.domain}/.well-known/oar-manifest.json`);
    assert.deepEqual(files.wellKnown.apps, [{ app_id: appId, cluster: 'solana:devnet' }]);
    assert.equal(files.manifest.app_id, appId);
  }
  assert.equal(ids.size, candidates.length);
});

test('proof guidance never upgrades an unverified claim into an audit or a verified status', () => {
  const row = (kind: CheckRow['kind'], state: CheckRow['state'], detail = '', signer?: string): CheckRow =>
    ({ kind, state, detail, subject: kind === 'domain' ? 'gwapspot.com' : 'https://github.com/team/app', signer });
  assert.equal(explainProof(row('domain', 'ok')), null);
  assert.match(explainProof(row('manifest', 'fail', 'SHA-256 mismatch'))!, /exact current JSON/);
  assert.match(explainProof(row('manifest', 'fail', 'HTTP 404'))!, /HTTP 200/);
  assert.match(explainProof(row('domain', 'pending'))!, /\.well-known\/oar.json/);
  assert.match(explainProof(row('repository', 'fail'))!, /default branch/);
  assert.match(explainProof(row('program', 'pending', '', 'UpgradeWallet'))!, /UpgradeWallet/);
  assert.match(explainProof(row('program', 'fail'))!, /issuer attestation/);
  assert.match(explainProof(row('record', 'fail'))!, /authority/);
});

test('wallet cancellation and wrong-network errors offer recovery without requesting keys', () => {
  assert.match(friendlyWalletError({ code: 4001, message: 'Rejected' }), /Nothing was signed or sent/);
  assert.match(friendlyWalletError(new Error('No account supports solana:devnet')), /Enable Devnet/);
  assert.match(friendlyWalletError(new Error('did not share an account')), /Unlock the wallet/);
  assert.equal(friendlyWalletError(new Error('Unknown fault')), 'Unknown fault');
});
