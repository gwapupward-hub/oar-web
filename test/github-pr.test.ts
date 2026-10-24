import { test } from 'node:test';
import assert from 'node:assert/strict';
import { address } from '@solana/kit';
import { buildClaimFiles, findAppId, hashManifestHex } from '@open-app-registry/sdk';
import { createProofPR } from '../src/lib/github-pr';
import type { PreparedClaim } from '../src/lib/register-types';

const repository = 'https://github.com/external-dev/demo';
async function claim(): Promise<PreparedClaim> {
  const creator = address('91N96ZPGHcFWe2jEZie9rUVqyHF5BWMV7mYnHMurhWB7');
  const appId = await findAppId({ creator, nonce: 11n });
  const files = buildClaimFiles({ appId, cluster: 'solana:devnet', name: 'Independent demo', repositories: [repository], manifestUri: 'https://example.org/oar-manifest.json' });
  return { appId, creator, authority: creator, nonce: '11', manifestUri: files.manifestUri, manifest: files.manifest as unknown as Record<string, unknown>, manifestSha256: hashManifestHex(files.manifest), wellKnown: files.wellKnown as unknown as Record<string, unknown>, repoProof: files.repoProof as unknown as Record<string, unknown> };
}

test('GitHub assistant writes only to new branch, with two JSON files and owner-review PR', async () => {
  const draft = await claim();
  const original = globalThis.fetch;
  const calls: Array<{method: string; url: string; body: Record<string, unknown> | null}> = [];
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    const address = String(url);
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.parse(String(options.body)) as Record<string, unknown> : null;
    calls.push({ method, url: address, body });
    if (method === 'GET') {
      if (/\/contents\//.test(address) || /\/git\/ref\/heads\//.test(address)) return Response.json({ message: 'Not Found' }, { status: 404 });
      if (address.endsWith('/branches/main')) return Response.json({ commit: { sha: 'baseSHA' } });
      if (address.endsWith('/git/commits/baseSHA')) return Response.json({ tree: { sha: 'treeSHA' } });
      return Response.json({ private: false, archived: false, default_branch: 'main' });
    }
    if (address.endsWith('/git/blobs')) return Response.json({ sha: 'blob' + calls.length }, { status: 201 });
    if (address.endsWith('/git/trees')) return Response.json({ sha: 'newTree' }, { status: 201 });
    if (address.endsWith('/git/commits')) return Response.json({ sha: 'newCommit' }, { status: 201 });
    if (address.endsWith('/git/refs')) return Response.json({ ref: 'newBranch' }, { status: 201 });
    if (address.endsWith('/pulls')) return Response.json({ html_url: 'https://github.com/external-dev/demo/pull/17' }, { status: 201 });
    return Response.json({}, { status: 500 });
  }) as typeof fetch;
  try {
    const result = await createProofPR('ghu_test', draft, repository);
    assert.equal(result.url, 'https://github.com/external-dev/demo/pull/17');
    assert.equal(calls.filter(c => c.method === 'POST' && c.url.endsWith('/git/blobs')).length, 2);
    const tree = calls.find(c => c.url.endsWith('/git/trees'))?.body;
    const paths = (tree?.tree as Array<{path:string}>).map(x => x.path);
    assert.deepEqual(paths, ['oar.json', 'oar-manifest.json']);
    const branch = calls.find(c => c.url.endsWith('/git/refs'))?.body;
    assert.equal(branch?.ref, 'refs/heads/oar/claim-' + draft.appId);
    assert.equal(calls.some(c => c.method === 'PUT' || c.url.includes('/merges')), false);
  } finally { globalThis.fetch = original; }
});

test('GitHub assistant refuses to overwrite an existing proof', async () => {
  const draft = await claim();
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    if (options?.method === 'POST') throw new Error('Never reached write path');
    const address = String(url);
    if (address.endsWith('/contents/oar.json?ref=main')) return Response.json({ path: 'oar.json' });
    if (address.includes('/git/ref/heads/')) return Response.json({ message: 'Not Found' }, { status: 404 });
    return Response.json({ private: false, default_branch: 'main' });
  }) as typeof fetch;
  try {
    await assert.rejects(createProofPR('ghu_test', draft, repository), /already exists/);
  } finally { globalThis.fetch = original; }
});
