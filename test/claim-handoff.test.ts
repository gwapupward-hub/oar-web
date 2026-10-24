import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeClaimHandoff, encodeClaimHandoff } from '../src/lib/claim-handoff';
import type { PreparedClaim } from '../src/lib/register-types';

const claim: PreparedClaim = {
  appId: '2gJB5wqCowb6d8pNFiwkWwFCykwUzcMbb5TafDuQdXZV',
  nonce: '0', creator: '91N96ZPGHcFWe2jEZie9rUVqyHF5BWMV7mYnHMurhWB7',
  authority: '91N96ZPGHcFWe2jEZie9rUVqyHF5BWMV7mYnHMurhWB7',
  manifestUri: 'https://lilgwapz.xyz/.well-known/oar-manifest.json',
  manifest: { oar: '0.1', name: 'Lil Gwapz 🎃', cluster: 'solana:devnet' },
  manifestSha256: 'f'.repeat(64),
  wellKnown: { oar: '0.1', apps: [{ app_id: '2gJB5wqCowb6d8pNFiwkWwFCykwUzcMbb5TafDuQdXZV', cluster: 'solana:devnet' }] },
};

test('resume code round-trips Unicode and has no wallet secrets or implicit authority', () => {
  const code = encodeClaimHandoff({ ...claim, secretKey: 'never-export' } as PreparedClaim);
  assert.match(code, /^OAR2\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeClaimHandoff(code), claim);
  assert.ok(!code.includes('never-export'));
});

test('resume code rejects invalid, malformed and oversized input', () => {
  assert.throws(() => decodeClaimHandoff('not a code'), /Not an OAR/);
  assert.throws(() => decodeClaimHandoff('OAR2.!!!'), /invalid characters/);
  assert.throws(() => decodeClaimHandoff('OAR2.' + 'a'.repeat(40_001)), /Not an OAR/);
  const bad = 'OAR2.' + btoa(JSON.stringify({ v: 1, creator: claim.creator })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.throws(() => decodeClaimHandoff(bad), /incomplete or malformed/);
});

test('a changed draft remains untrusted; valid shape never authorizes a signature', () => {
  const tampered = { ...claim, appId: '11111111111111111111111111111111' };
  assert.deepEqual(decodeClaimHandoff(encodeClaimHandoff(tampered)), tampered);
  // The server's parseClaim is the authority; this codec intentionally performs only bounded shape validation.
});
