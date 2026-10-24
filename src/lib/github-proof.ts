import { hashManifestHex, validateManifest, type OarManifest } from '@open-app-registry/sdk';
import type { PreparedClaim } from './register-types';

/** Only repository-root control proofs; not a security audit and never a paid trust badge. */
export function parseGitHubRepository(uri: string): { owner: string; repo: string } {
  if (typeof uri !== 'string' || uri.length > 200) throw new Error('Use a public GitHub repository URL.');
  const match = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100})(?:\.git)?\/?$/.exec(uri);
  if (!match || match[2] === '.' || match[2] === '..') throw new Error('Enter a repository URL such as https://github.com/owner/repo.');
  const repo = match[2].replace(/\.git$/, '');
  if (!repo) throw new Error('Repository name is missing.');
  return { owner: match[1], repo };
}
export function prepareGitHubProof(claim: PreparedClaim, repository: string) {
  if (!claim || typeof claim !== 'object' || !claim.manifest || typeof claim.manifest !== 'object') throw new Error('Prepare an OAR registration draft first.');
  const { owner, repo } = parseGitHubRepository(repository);
  const manifest = claim.manifest;
  const v = validateManifest(manifest);
  if (!v.valid) throw new Error('The manifest is invalid. Prepare the registration again.');
  if (manifest.app_id !== claim.appId || manifest.cluster !== 'solana:devnet'
    || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(claim.appId)
    || hashManifestHex(manifest as OarManifest) !== claim.manifestSha256) throw new Error('This draft does not match its verified Devnet manifest. Prepare it again.');
  const listed = (manifest.repositories as Array<{ url: string }> | undefined) ?? [];
  if (!listed.some(item => item?.url === repository)) throw new Error('This repository must already be named in the manifest you prepared.');
  // Never trust arbitrary file bodies supplied by a browser; build the proof server-side.
  const proof = { oar: '0.1', apps: [{ app_id: claim.appId, cluster: 'solana:devnet' }] };
  const files = [
    { path: 'oar.json', content: JSON.stringify(proof, null, 2) + '\n' },
    { path: 'oar-manifest.json', content: JSON.stringify(manifest, null, 2) + '\n' },
  ];
  if (files.some(f => Buffer.byteLength(f.content, 'utf8') > 24_000)) throw new Error('The registration files are too large for guided publishing.');
  return { owner, repo, branch: `oar/claim-${claim.appId}`, files, manifestSha256: claim.manifestSha256 };
}
