// Public, non-secret site constants. Safe to import from any component.

/** The OAR protocol release this explorer is built against. */
export const OAR_RELEASE = 'v0.1.1-rc.1';
export const OAR_REPO_URL = 'https://github.com/gwapupward-hub/oar';
export const OAR_RELEASE_URL = `${OAR_REPO_URL}/releases/tag/${OAR_RELEASE}`;
export const SAS_REHEARSAL_EVIDENCE_URL =
  `${OAR_REPO_URL}/blob/${OAR_RELEASE}/release/evidence/devnet-sas-rehearsal-2026-10-04-GFHnocWS.json`;

/** OAR's own devnet registration, shown as the example search. */
export const EXAMPLE_APP_ID = 'Bu1JCyxiVDdDGjtNLLkKhq6KZv6E4LcUgqNkS5t5Nf2K';

export interface ClusterOption {
  id: 'solana:devnet' | 'solana:mainnet';
  label: string;
  enabled: boolean;
  note?: string;
}

/** Devnet only until the OAR mainnet gate passes; the selector is ready for mainnet. */
export const CLUSTER_OPTIONS: ClusterOption[] = [
  { id: 'solana:devnet', label: 'Devnet', enabled: true },
  { id: 'solana:mainnet', label: 'Mainnet', enabled: false, note: 'after the OAR mainnet gate' },
];

export function explorerAddressUrl(addr: string, cluster: string): string {
  const suffix = cluster === 'solana:mainnet' ? '' : `?cluster=${cluster.replace('solana:', '')}`;
  return `https://explorer.solana.com/address/${addr}${suffix}`;
}
