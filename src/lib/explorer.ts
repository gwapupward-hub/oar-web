import 'server-only';
import {
  address,
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
  getBase58Decoder,
  isAddress,
  type Address,
  type Base58EncodedBytes,
  type RpcTransport,
} from '@solana/kit';
import {
  APP_RECORD_DISCRIMINATOR,
  APP_RECORD_SIZE,
  OAR_PROGRAM_ID,
  resolveApp,
  resolveProgram,
  type ResolveOptions,
} from '@open-app-registry/sdk';
import { CLUSTER, INDEX_LIMIT, RPC_TIMEOUT_MS, RPC_URL, TRUSTED_ISSUERS } from './config';
import { ttlCache } from './cache';
import { toAppView, type AppView, type ChipView } from './display';
import type { Query } from './query';

// Every RPC call is bounded: a slow or hung provider fails the request instead of holding it open.
const baseTransport = createDefaultRpcTransport({ url: RPC_URL });
const transport: RpcTransport = config => baseTransport({ ...config, signal: config.signal ?? AbortSignal.timeout(RPC_TIMEOUT_MS) });
const rpc = createSolanaRpcFromTransport(transport);

const options = (live: boolean): ResolveOptions => ({ cluster: CLUSTER, live, trustedIssuers: TRUSTED_ISSUERS });

const appCache = ttlCache<AppView | null>(60_000, 500);
const programCache = ttlCache<ProgramView | null>(60_000, 500);
const indexCache = ttlCache<IndexEntry[]>(5 * 60_000, 1);

export interface ProgramView {
  program: string;
  /** The program's own chip inside the app: `verified` only when both sides agree. */
  link: ChipView | null;
  app: AppView;
}

export interface IndexEntry {
  appId: string;
  title: string;
  summary: string | null;
  status: AppView['status'];
  domains: string[];
  repositories: string[];
  programs: number;
}

/** App ID → record, manifest and one live-checked state per claim. Null when no valid AppRecord exists there. */
export function getApp(appId: string): Promise<AppView | null> {
  if (!isAddress(appId)) return Promise.resolve(null);
  return appCache(appId, async () => {
    const resolved = await resolveApp(rpc, address(appId), options(true));
    return resolved ? toAppView(resolved) : null;
  });
}

/** Program ID → its canonical `oar` backlink → the app, with the program's link state. */
export function getProgram(programId: string): Promise<ProgramView | null> {
  if (!isAddress(programId)) return Promise.resolve(null);
  return programCache(programId, async () => {
    const resolved = await resolveProgram(rpc, address(programId), options(true));
    if (!resolved) return null;
    const app = toAppView(resolved.app);
    const link = app.chips.find(c => c.kind === 'program' && c.subject === programId && c.cluster === CLUSTER) ?? null;
    return { program: programId, link, app };
  });
}

/** Where an address leads: an App ID, a program with an OAR backlink, or nothing. */
export async function lookupAddress(value: string): Promise<'app' | 'program' | null> {
  if (await getApp(value)) return 'app';
  if (await getProgram(value)) return 'program';
  return null;
}

/**
 * Domain and repository search over registered manifests. Matches are claims, not proof: the app page runs the
 * live checks. User input is only compared against the index, never fetched.
 */
export async function searchIndex(query: Query): Promise<IndexEntry[]> {
  if (query.kind !== 'domain' && query.kind !== 'repository') return [];
  const index = await indexCache('index', buildIndex);
  return index.filter(e => (query.kind === 'domain' ? e.domains : e.repositories).includes(query.value));
}

/** Registered apps with a valid manifest, for browsing. Claims only: each app page runs the live checks. */
export function listApps(): Promise<IndexEntry[]> {
  return indexCache('index', buildIndex);
}

async function buildIndex(): Promise<IndexEntry[]> {
  const discriminator = getBase58Decoder().decode(APP_RECORD_DISCRIMINATOR) as Base58EncodedBytes;
  const accounts = await rpc
    .getProgramAccounts(OAR_PROGRAM_ID, {
      commitment: 'finalized',
      encoding: 'base64',
      dataSlice: { offset: 0, length: 0 },
      filters: [{ dataSize: BigInt(APP_RECORD_SIZE) }, { memcmp: { offset: 0n, bytes: discriminator, encoding: 'base58' } }],
    })
    .send();
  const ids = accounts.map(a => a.pubkey).sort().slice(0, INDEX_LIMIT);
  const entries: IndexEntry[] = [];
  // A few at a time: each resolution fetches a manifest from the host the app chose.
  for (let i = 0; i < ids.length; i += 4) {
    const batch = await Promise.all(
      ids.slice(i, i + 4).map(id => resolveApp(rpc, id as Address, options(false)).catch(() => null)),
    );
    for (const r of batch) {
      if (!r?.manifest.ok) continue;
      const m = r.manifest.manifest;
      entries.push({
        appId: String(r.appId),
        title: m.name,
        summary: m.summary ?? null,
        status: r.status,
        domains: (m.domains ?? []).map(d => d.toLowerCase()),
        repositories: (m.repositories ?? []).map(x => x.url.replace(/\.git$/, '').replace(/\/$/, '').toLowerCase()),
        programs: (m.programs ?? []).length,
      });
    }
  }
  // Active apps first, then by name, so browsing starts with what is live.
  const rank = { Active: 0, Deprecated: 1, Retired: 2, Unknown: 3 } as const;
  return entries.sort((a, b) => rank[a.status] - rank[b.status] || a.title.localeCompare(b.title));
}
