import { domainToASCII } from 'node:url';
import type { ClaimResult, LinkState, ProgramClaimResult, ResolvedApp } from '@open-app-registry/sdk';

// Maps an SDK resolution onto the spec's display rules (docs/spec-v0.1.md, "Display rules for wallets and explorers").
// Pure and serializable: no bigints, no SDK objects, so views can be cached and rendered anywhere.

export type ChipKind = 'program' | 'domain' | 'repository';

export interface ChipView {
  kind: ChipKind;
  subject: string;
  /** What to print: hostnames in punycode, everything else verbatim (rendered as plain text). */
  display: string;
  state: LinkState;
  label: string;
  how?: string;
  detail?: string;
  cluster?: string;
  name?: string;
  attestedBy: string[];
}

export interface AppView {
  appId: string;
  cluster: string;
  status: 'Active' | 'Deprecated' | 'Retired' | 'Unknown';
  /** Manifest name, or "metadata unavailable" (rule 4). */
  title: string;
  /** Rule 3: no verified domain or program link. */
  unverified: boolean;
  summary: string | null;
  categories: string[];
  publisher: string | null;
  manifest: { ok: true } | { ok: false; reason: string; errors: string[] };
  manifestUri: string;
  manifestSha256: string;
  revision: number;
  createdSlot: string;
  updatedSlot: string;
  creator: string;
  authority: string;
  /** Rule 8: the authority is not an endorsement until it has signed for the record. */
  authorityNote: string;
  pendingAuthority: string | null;
  /** Rule 1: one chip per link. Rule 5: none for a retired app. */
  chips: ChipView[];
}

const ZERO_ADDRESS = '11111111111111111111111111111111';

export const STATE_LABEL: Record<LinkState, string> = {
  verified: 'Verified',
  attested: 'Attested',
  unverified: 'Unverified',
  failed: 'Failed',
};

const METHOD_LABEL: Record<string, string> = {
  'program-metadata': 'program backlink (Program Metadata)',
  'well-known': '/.well-known/oar.json',
  'dns-txt': 'DNS TXT record',
  'repo-file': 'oar.json in the repository',
};

const MANIFEST_REASON: Record<string, string> = {
  'hash-mismatch': 'The manifest does not match the hash recorded onchain.',
  schema: 'The manifest is not a valid OAR v0.1 manifest.',
  'app-id-mismatch': 'The manifest names a different App ID.',
  'cluster-mismatch': 'The manifest names a different cluster.',
  unavailable: 'The manifest could not be fetched.',
};

const hex = (bytes: ArrayLike<number>) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

/** Hostnames are shown in punycode so look-alike Unicode cannot pass as a familiar name (rule 7). */
export function displayHost(host: string): string {
  return domainToASCII(host) || host;
}

function chip(kind: ChipKind, c: ClaimResult | ProgramClaimResult): ChipView {
  const p = c as ProgramClaimResult;
  return {
    kind,
    subject: c.subject,
    display: kind === 'domain' ? displayHost(c.subject) : c.subject,
    state: c.state,
    label: STATE_LABEL[c.state],
    how: c.method ? METHOD_LABEL[c.method] ?? c.method : c.state === 'attested' ? 'trusted attestation' : undefined,
    detail: c.detail,
    cluster: kind === 'program' ? p.cluster : undefined,
    name: kind === 'program' ? p.name : undefined,
    attestedBy: c.attestedBy.map(String),
  };
}

export function authorityNote(revision: number): string {
  return revision > 0
    ? `This key has signed ${revision} manifest update${revision === 1 ? '' : 's'} for the record.`
    : 'Named by the creator at registration. It has not signed an update yet, so it is not an endorsement.';
}

export function toAppView(r: ResolvedApp): AppView {
  const rec = r.record;
  const m = r.manifest.ok ? r.manifest.manifest : null;
  const retired = r.status === 'Retired';
  const chips = retired
    ? []
    : [
        ...r.programs.map(c => chip('program', c)),
        ...r.domains.map(c => chip('domain', c)),
        ...r.repositories.map(c => chip('repository', c)),
      ];
  const anchored = chips.some(c => (c.kind === 'program' || c.kind === 'domain') && c.state === 'verified');
  return {
    appId: String(r.appId),
    cluster: r.cluster,
    status: r.status,
    title: m ? m.name : 'metadata unavailable',
    unverified: m !== null && !retired && !anchored,
    summary: m?.summary ?? null,
    categories: m?.categories ?? [],
    publisher: m?.publisher?.name ?? null,
    manifest: r.manifest.ok
      ? { ok: true }
      : { ok: false, reason: MANIFEST_REASON[r.manifest.reason] ?? r.manifest.reason, errors: r.manifest.errors ?? [] },
    manifestUri: rec.manifestUri,
    manifestSha256: hex(rec.manifestHash),
    revision: rec.revision,
    createdSlot: rec.createdSlot.toString(),
    updatedSlot: rec.updatedSlot.toString(),
    creator: String(rec.creator),
    authority: String(rec.authority),
    authorityNote: authorityNote(rec.revision),
    pendingAuthority: String(rec.pendingAuthority) === ZERO_ADDRESS ? null : String(rec.pendingAuthority),
    chips,
  };
}
