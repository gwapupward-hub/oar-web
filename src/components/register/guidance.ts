import type { CheckRow } from '@/lib/register-types';

/** Human-readable recovery steps for each independent identity proof.
 * These are guidance only; the server's strict proof verdict remains authoritative.
 */
export function explainProof(row: CheckRow): string | null {
  if (row.state === 'ok') return null;
  switch (row.kind) {
    case 'record':
      return row.state === 'fail'
        ? 'This App ID already points to a different manifest. Its record authority must sign an Update after hosting the new file.'
        : 'No record exists yet. Registration becomes available when the manifest is reachable and matches.';
    case 'manifest':
      return /SHA-256|different|does not serve/i.test(row.detail)
        ? 'The file at this URI differs from the downloaded manifest. Upload the exact current JSON, or prepare a new claim before signing.'
        : /unsafe|refused|private|redirect/i.test(row.detail)
          ? 'Use a public HTTPS URL or a supported ar:// or ipfs:// URI. Avoid private hosts, redirects and login walls.'
          : 'Publish oar-manifest.json at this exact public address. Check that the link opens raw JSON (HTTP 200), not a GitHub HTML page or login screen.';
    case 'domain':
      return `Deploy the supplied oar.json proof to https://${row.subject}/.well-known/oar.json with HTTP 200 and no redirect. Its App ID and cluster must match this claim.`;
    case 'repository':
      return 'Commit the supplied oar.json file at the root of the public repository on its default branch. A manifest file alone does not prove repository control.';
    case 'program':
      return row.signer
        ? `After the App ID is registered, connect its program upgrade-authority wallet (${row.signer}) or prepare a Squads proposal to publish the backlink.`
        : 'Check that this is an upgradeable program deployed on Devnet. Immutable programs need a separately identified issuer attestation; this flow cannot create that proof.';
  }
}

/** Keep wallet rejection and wrong-network messages useful on phones without implying a signature happened. */
export function friendlyWalletError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown wallet error');
  const code = error && typeof error === 'object' && 'code' in error ? (error as { code: unknown }).code : null;
  if (code === 4001 || /user reject|rejected by user|user denied|cancelled|canceled/i.test(message)) {
    return 'The wallet request was cancelled. Nothing was signed or sent. You can try again when ready.';
  }
  if (/devnet|unsupported chain|wrong network|network mismatch/i.test(message)) {
    return 'This wallet is not ready for Solana Devnet. Enable Devnet in wallet settings, return to OAR and reconnect.';
  }
  if (/no account|did not share an account/i.test(message)) {
    return 'No wallet account was shared. Unlock the wallet, allow the connection, then try again.';
  }
  return message;
}
