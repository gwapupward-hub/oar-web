import type { PreparedClaim } from './register-types';

const PREFIX = 'OAR2.';
const MAX_BYTES = 24_000;
const MAX_CODE_LENGTH = 40_000;

/**
 * Portable, non-secret draft for crossing browser boundaries on mobile.
 * This is not an authentication token. The registration API re-derives and revalidates it before signing.
 */
export function encodeClaimHandoff(claim: PreparedClaim): string {
  // Whitelist fields so future UI-only state or unintended properties cannot leak into a handoff.
  const draft = {
    v: 1, appId: claim.appId, nonce: claim.nonce, creator: claim.creator, authority: claim.authority,
    manifestUri: claim.manifestUri, manifest: claim.manifest, manifestSha256: claim.manifestSha256,
    wellKnown: claim.wellKnown, ...(claim.repoProof ? { repoProof: claim.repoProof } : {}),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(draft));
  if (bytes.length > MAX_BYTES) throw new Error('This registration draft is too large to export.');
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return PREFIX + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeClaimHandoff(input: string): PreparedClaim {
  const text = input.trim();
  if (text.length > MAX_CODE_LENGTH || !text.startsWith(PREFIX)) {
    throw new Error('Not an OAR 2.0 resume code. Copy the full code from the Deploy step.');
  }
  const payload = text.slice(PREFIX.length);
  if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload)) throw new Error('The resume code contains invalid characters.');
  let draft: Record<string, unknown>;
  try {
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    if (binary.length > MAX_BYTES) throw new Error('Too large');
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    draft = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as Record<string, unknown>;
  } catch {
    throw new Error('Could not read that resume code. Copy the full code and try again.');
  }
  if (!draft || typeof draft !== 'object' || Array.isArray(draft) || draft.v !== 1
    || !['appId', 'creator', 'authority'].every(k => typeof draft[k] === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(draft[k] as string))
    || typeof draft.nonce !== 'string' || !/^\d{1,19}$/.test(draft.nonce)
    || typeof draft.manifestUri !== 'string' || draft.manifestUri.length > 200
    || typeof draft.manifestSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(draft.manifestSha256)
    || !draft.manifest || typeof draft.manifest !== 'object' || Array.isArray(draft.manifest)
    || !draft.wellKnown || typeof draft.wellKnown !== 'object' || Array.isArray(draft.wellKnown)
    || (draft.repoProof !== undefined && (typeof draft.repoProof !== 'object' || !draft.repoProof || Array.isArray(draft.repoProof)))) {
    throw new Error('The resume code is incomplete or malformed. Prepare a fresh claim if necessary.');
  }
  return {
    appId: draft.appId as string, nonce: draft.nonce as string, creator: draft.creator as string,
    authority: draft.authority as string, manifestUri: draft.manifestUri as string,
    manifest: draft.manifest as Record<string, unknown>,
    manifestSha256: draft.manifestSha256 as string,
    wellKnown: draft.wellKnown as Record<string, unknown>,
    ...(draft.repoProof ? { repoProof: draft.repoProof as Record<string, unknown> } : {}),
  };
}
