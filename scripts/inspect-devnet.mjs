// Read-only report on one devnet address: an OAR App ID (record, manifest, claims and what its register transaction
// called) or a wallet (balance and the App IDs it registered). Writes nothing and holds no keys.
//   ADDRESS=<base58> node scripts/inspect-devnet.mjs
// Optional: OAR_DEVNET_RPC_URL (default public devnet), REPORT_JSON (path for a JSON copy), GITHUB_STEP_SUMMARY.
import { appendFileSync, writeFileSync } from 'node:fs';
import { address, createSolanaRpc, getBase58Encoder, isAddress } from '@solana/kit';
import { OAR_PROGRAM_ID, decodeAppRecord, findAppId, resolveApp } from '@open-app-registry/sdk';

const RPC_URL = process.env.OAR_DEVNET_RPC_URL || 'https://api.devnet.solana.com';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const KNOWN = {
  [OAR_PROGRAM_ID]: 'OAR registry',
  [SYSTEM_PROGRAM]: 'System',
  ComputeBudget111111111111111111111111111111: 'Compute Budget',
  ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S: 'Program Metadata',
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: 'Memo',
};
const name = p => (KNOWN[p] ? `${p} (${KNOWN[p]})` : `${p} (unknown)`);

const input = (process.env.ADDRESS ?? '').trim();
if (!isAddress(input) || getBase58Encoder().encode(input).length !== 32) {
  console.error('ADDRESS must be one base58 Solana address (32 bytes).');
  process.exit(2);
}

const rpc = createSolanaRpc(RPC_URL);
const lines = [];
const out = (s = '') => { console.log(s); lines.push(s); };
const report = { address: input, cluster: 'solana:devnet', checkedAt: new Date().toISOString() };
const b64 = data => Buffer.from(data[0], 'base64');

/** Every program a transaction invoked, top level and inner, in first-seen order. */
async function transactionPrograms(signature) {
  const tx = await rpc.getTransaction(signature, { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }).send();
  if (!tx) return null;
  const keys = [
    ...tx.transaction.message.accountKeys,
    ...(tx.meta?.loadedAddresses?.writable ?? []),
    ...(tx.meta?.loadedAddresses?.readonly ?? []),
  ];
  const top = tx.transaction.message.instructions.map(ix => keys[ix.programIdIndex]);
  const inner = (tx.meta?.innerInstructions ?? []).flatMap(g => g.instructions.map(ix => keys[ix.programIdIndex]));
  return {
    signature,
    slot: Number(tx.slot),
    ok: tx.meta?.err == null,
    feePayer: keys[0],
    signers: keys.slice(0, tx.transaction.message.header.numRequiredSignatures),
    topLevel: top,
    inner: [...new Set(inner)],
    keys,
  };
}

async function inspectApp(appId, account) {
  const record = decodeAppRecord({ address: appId, data: b64(account.data), executable: false, lamports: account.lamports, programAddress: account.owner, space: 0n }).data;
  const derived = await findAppId({ creator: record.creator, nonce: record.nonce });
  const resolved = await resolveApp(rpc, address(appId), { cluster: 'solana:devnet', live: true, trustedIssuers: [] });
  const manifestHash = Buffer.from(record.manifestHash).toString('hex');
  const app = {
    appId,
    derivedFromCreatorAndNonce: derived === appId,
    creator: record.creator,
    nonce: record.nonce.toString(),
    authority: record.authority,
    pendingAuthority: record.pendingAuthority === SYSTEM_PROGRAM ? null : record.pendingAuthority,
    status: resolved?.status ?? 'Unknown',
    revision: record.revision,
    createdSlot: record.createdSlot.toString(),
    manifestUri: record.manifestUri,
    manifestHash,
    manifest: resolved
      ? resolved.manifest.ok
        ? { ok: true, name: resolved.manifest.manifest.name }
        : { ok: false, reason: resolved.manifest.reason, errors: resolved.manifest.errors ?? [] }
      : { ok: false, reason: 'record did not resolve' },
    claims: resolved
      ? [
          ...resolved.programs.map(c => ({ kind: 'program', subject: c.subject, state: c.state, detail: c.detail ?? null })),
          ...resolved.domains.map(c => ({ kind: 'domain', subject: c.subject, state: c.state, detail: c.detail ?? null })),
          ...resolved.repositories.map(c => ({ kind: 'repository', subject: c.subject, state: c.state, detail: c.detail ?? null })),
        ]
      : [],
  };

  // The oldest signature touching the record is the register transaction.
  const sigs = await rpc.getSignaturesForAddress(address(appId), { limit: 1000 }).send();
  const history = [];
  for (const s of [...sigs].reverse().slice(0, 10)) history.push(await transactionPrograms(s.signature));
  app.transactions = history.filter(Boolean).map(({ keys, ...t }) => t);

  out(`## App ID ${appId}`);
  out();
  out(`- App ID derives from creator + nonce: ${app.derivedFromCreatorAndNonce ? 'yes' : 'NO'}`);
  out(`- Creator: ${app.creator} (nonce ${app.nonce})`);
  out(`- Authority: ${app.authority}${app.pendingAuthority ? ` (pending: ${app.pendingAuthority})` : ''}`);
  out(`- Status: ${app.status}, revision ${app.revision}, created at slot ${app.createdSlot}`);
  out(`- Manifest URI: ${app.manifestUri}`);
  out(`- Manifest hash (onchain): ${manifestHash}`);
  out(`- Manifest: ${app.manifest.ok ? `ok, fetched and hash matches ("${app.manifest.name}")` : `NOT ok: ${app.manifest.reason}${app.manifest.errors?.length ? ` (${app.manifest.errors.join('; ')})` : ''}`}`);
  for (const c of app.claims) out(`- ${c.kind} ${c.subject}: ${c.state}${c.detail ? ` (${c.detail})` : ''}`);
  if (!app.claims.length) out('- Claims: none');
  out();
  out(`### Transactions (oldest first, ${app.transactions.length} of ${sigs.length})`);
  for (const t of app.transactions) {
    out();
    out(`- ${t.signature} at slot ${t.slot}: ${t.ok ? 'succeeded' : 'FAILED'}; fee payer ${t.feePayer}`);
    out(`  - top-level programs: ${t.topLevel.map(name).join(', ')}`);
    if (t.inner.length) out(`  - inner programs: ${t.inner.map(name).join(', ')}`);
  }
  return app;
}

async function inspectWallet(wallet, account) {
  const sigs = await rpc.getSignaturesForAddress(address(wallet), { limit: 20 }).send();
  const apps = new Set();
  for (const s of sigs) {
    const t = await transactionPrograms(s.signature);
    if (!t?.ok || !t.topLevel.includes(OAR_PROGRAM_ID)) continue;
    for (const key of t.keys) {
      if (key === wallet || key === OAR_PROGRAM_ID || key === SYSTEM_PROGRAM) continue;
      const a = (await rpc.getAccountInfo(address(key), { encoding: 'base64' }).send()).value;
      if (a?.owner === OAR_PROGRAM_ID) apps.add(key);
    }
  }
  out(`## Wallet ${wallet}`);
  out();
  out(`- Balance: ${Number(account?.lamports ?? 0n) / 1e9} SOL`);
  out(`- Recent transactions read: ${sigs.length}`);
  out(`- OAR records touched: ${apps.size ? [...apps].join(', ') : 'none'}`);
  out();
  const results = [];
  for (const id of apps) {
    const a = (await rpc.getAccountInfo(address(id), { encoding: 'base64' }).send()).value;
    results.push(await inspectApp(id, a));
    out();
  }
  return { wallet, lamports: (account?.lamports ?? 0n).toString(), recentTransactions: sigs.length, apps: results };
}

const account = (await rpc.getAccountInfo(address(input), { encoding: 'base64' }).send()).value;
out(`# Devnet inspection of ${input}`);
out();
if (account?.owner === OAR_PROGRAM_ID) {
  report.kind = 'app';
  report.app = await inspectApp(input, account);
} else if (!account || account.owner === SYSTEM_PROGRAM) {
  report.kind = 'wallet';
  report.wallet = await inspectWallet(input, account);
} else {
  report.kind = 'other';
  report.owner = account.owner;
  out(`Owned by ${name(account.owner)}; executable: ${account.executable}. Not an OAR record or a wallet.`);
}

if (process.env.REPORT_JSON) writeFileSync(process.env.REPORT_JSON, JSON.stringify(report, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
