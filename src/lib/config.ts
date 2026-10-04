import 'server-only';
import { address, type Address } from '@solana/kit';

// Server-only configuration. The RPC URL can carry a provider key, so it must never reach a client bundle.

export const CLUSTER = 'solana:devnet' as const;

/** Dedicated devnet RPC in production (set in Vercel); the public endpoint is a development fallback. */
export const RPC_URL = process.env.OAR_DEVNET_RPC_URL || 'https://api.devnet.solana.com';

/** SAS credentials whose OAR attestations this explorer trusts. Empty by default, per the spec. */
export const TRUSTED_ISSUERS: Address[] = (process.env.OAR_TRUSTED_ISSUERS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => address(s));

export const RPC_TIMEOUT_MS = 10_000;
/** Upper bound on registry records read into the search index. */
export const INDEX_LIMIT = 200;
