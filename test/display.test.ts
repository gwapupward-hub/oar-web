import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ResolvedApp } from '@open-app-registry/sdk';
import { authorityNote, displayHost, toAppView } from '../src/lib/display';

const APP = 'Bu1JCyxiVDdDGjtNLLkKhq6KZv6E4LcUgqNkS5t5Nf2K';
const PROGRAM = 'oariw8YXcYJh9sa9VcmBU3ZCdo2WVGMYPsLjEuUxfrC';
const KEY = '91N96ZPGHcFWe2jEZie9rUVqyHF5BWMV7mYnHMurhWB7';

function resolved(over: Partial<ResolvedApp> = {}, record: Record<string, unknown> = {}): ResolvedApp {
  return {
    appId: APP,
    cluster: 'solana:devnet',
    status: 'Active',
    record: {
      discriminator: new Uint8Array(8), layoutVersion: 1, bump: 255, status: 0, creator: KEY, nonce: 0n, authority: KEY,
      pendingAuthority: '11111111111111111111111111111111', manifestHash: new Uint8Array(32).fill(0xab), revision: 0,
      createdSlot: 507_400_000n, updatedSlot: 507_400_000n,
      manifestUri: 'https://raw.githubusercontent.com/gwapupward-hub/oar/2b39329/release/devnet/oar.manifest.json',
      ...record,
    },
    manifest: { ok: true, manifest: { oar: '0.1', app_id: APP, cluster: 'solana:devnet', name: 'Open App Registry', summary: 'Identity', categories: ['identity'], publisher: { name: 'GWAP' } } },
    programs: [{ subject: PROGRAM, state: 'verified', method: 'program-metadata', attestedBy: [], cluster: 'solana:devnet', name: 'OAR Registry' }],
    domains: [],
    repositories: [{ subject: 'https://github.com/gwapupward-hub/oar', state: 'verified', method: 'repo-file', attestedBy: [] }],
    ...over,
  } as unknown as ResolvedApp;
}

test('an app with a verified program link shows its name and one chip per link', () => {
  const v = toAppView(resolved());
  assert.equal(v.title, 'Open App Registry');
  assert.equal(v.unverified, false);
  assert.deepEqual(v.chips.map(c => [c.kind, c.state, c.how]), [
    ['program', 'verified', 'program backlink (Program Metadata)'],
    ['repository', 'verified', 'oar.json in the repository'],
  ]);
  assert.equal(v.manifestSha256, 'ab'.repeat(32));
  assert.equal(v.createdSlot, '507400000');
  assert.equal(v.pendingAuthority, null);
  assert.doesNotThrow(() => JSON.stringify(v), 'views are serializable (no bigints)');
});

test('rule 3: without a verified domain or program link the name is prefixed Unverified', () => {
  const repoOnly = toAppView(resolved({ programs: [] }));
  assert.equal(repoOnly.unverified, true, 'a verified repository alone does not anchor the name');
  const failed = toAppView(resolved({ programs: [{ subject: PROGRAM, state: 'failed', method: 'program-metadata', detail: 'backlink names X', attestedBy: [], cluster: 'solana:devnet' }] } as never));
  assert.equal(failed.unverified, true);
  assert.equal(failed.chips[0].detail, 'backlink names X');
  const domain = toAppView(resolved({ programs: [], domains: [{ subject: 'oar.example', state: 'verified', method: 'well-known', attestedBy: [] }] }));
  assert.equal(domain.unverified, false);
});

test('rule 4: an unusable manifest shows "metadata unavailable", no claims and no prefix', () => {
  const v = toAppView(resolved({ manifest: { ok: false, reason: 'hash-mismatch' }, programs: [], repositories: [] }));
  assert.equal(v.title, 'metadata unavailable');
  assert.equal(v.unverified, false);
  assert.deepEqual(v.manifest, { ok: false, reason: 'The manifest does not match the hash recorded onchain.', errors: [] });
  assert.equal(v.authority, KEY, 'App ID and authority stay visible');
});

test('rule 5: a retired app shows no chips; a deprecated app keeps them', () => {
  assert.deepEqual(toAppView(resolved({ status: 'Retired' }, { status: 2 })).chips, []);
  assert.equal(toAppView(resolved({ status: 'Retired' }, { status: 2 })).unverified, false);
  assert.equal(toAppView(resolved({ status: 'Deprecated' }, { status: 1 })).chips.length, 2);
});

test('rule 7: hostnames are displayed in punycode', () => {
  assert.equal(displayHost('phäntom.app'), 'xn--phntom-cua.app');
  const v = toAppView(resolved({ domains: [{ subject: 'phäntom.app', state: 'unverified', attestedBy: [] }] }));
  assert.equal(v.chips.find(c => c.kind === 'domain')?.display, 'xn--phntom-cua.app');
});

test('rule 8: the authority is not presented as an endorsement until it signs', () => {
  assert.match(authorityNote(0), /not an endorsement/);
  assert.match(authorityNote(1), /signed 1 manifest update for/);
  assert.match(authorityNote(3), /signed 3 manifest updates/);
  assert.equal(toAppView(resolved({}, { pendingAuthority: PROGRAM })).pendingAuthority, PROGRAM);
});

test('attestation-only links say so and name the issuer', () => {
  const v = toAppView(resolved({ repositories: [{ subject: 'https://github.com/a/b', state: 'attested', attestedBy: ['GFHnocWSaJBAVwfrT4yuzGA1QkGFuA5Eg7NUWcSQ8yUK'] }] } as never));
  const c = v.chips.find(x => x.kind === 'repository')!;
  assert.deepEqual([c.label, c.how, c.attestedBy], ['Attested', 'trusted attestation', ['GFHnocWSaJBAVwfrT4yuzGA1QkGFuA5Eg7NUWcSQ8yUK']]);
});
