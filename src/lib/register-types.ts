// Shapes exchanged between the /register wizard and its API. Plain JSON: safe for client and server.

export const CATEGORIES = [
  'defi', 'dex', 'lending', 'payments', 'wallet', 'nft', 'marketplace', 'gaming', 'social', 'identity',
  'infrastructure', 'developer-tools', 'dao', 'ai-agent', 'data', 'depin', 'media', 'other',
] as const;
export type CategoryName = (typeof CATEGORIES)[number];

/** What the team typed. Addresses and URLs are checked on the server. */
export interface ClaimForm {
  creator: string;
  name: string;
  summary?: string;
  categories?: CategoryName[];
  domains?: string[];
  programs?: string[];
  repositories?: string[];
  /** Record authority; defaults to the creator. A Squads vault is recommended for production. */
  authority?: string;
  manifestUri?: string;
}

/** A prepared claim. The client keeps it and sends it back; the server re-validates every field each time. */
export interface Claim {
  appId: string;
  nonce: string;
  creator: string;
  authority: string;
  manifestUri: string;
  manifest: Record<string, unknown>;
}

export interface PreparedClaim extends Claim {
  manifestSha256: string;
  wellKnown: Record<string, unknown>;
  repoProof?: Record<string, unknown>;
}

export type CheckState = 'ok' | 'pending' | 'fail';

export interface CheckRow {
  kind: 'record' | 'manifest' | 'domain' | 'repository' | 'program';
  subject: string;
  state: CheckState;
  detail: string;
  /** Programs only: the key that must sign the link, or null when the program cannot be linked. */
  signer?: string | null;
}

export interface CheckResult {
  rows: CheckRow[];
  /** True once the manifest is served exactly and the App ID is still free. */
  readyToRegister: boolean;
  registered: boolean;
}

/** An unsigned transaction for the connected wallet, with what it does in plain sentences. */
export interface BuiltTransaction {
  summary: string[];
  /** Base64 wire transaction, unsigned; absent when there is nothing to sign. */
  transaction?: string;
}

export interface BuiltLink extends BuiltTransaction {
  action: 'create' | 'update' | 'unchanged';
  /** Base58 unsigned transaction for a Squads vault to import as a proposal. */
  squads?: string;
}
