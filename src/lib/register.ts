import 'server-only';
import {
  address,
  createNoopSigner,
  getBase64Encoder,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  isAddress,
  type Address,
  type Base64EncodedWireTransaction,
  type Signature,
} from '@solana/kit';
import {
  MAX_URI_LEN,
  OAR_PROGRAM_ID,
  PROGRAM_METADATA_PROGRAM_ID,
  assertRegistrationInstructions,
  backlinkMatches,
  buildClaimFiles,
  bytesEqual,
  checkDomain,
  checkManifestHosting,
  checkRepository,
  describeProgramLink,
  describeRegistration,
  exportUnsignedTransaction,
  fetchMaybeAppRecord,
  fetchProgramBacklink,
  findAppId,
  getProgramLinkInstructions,
  getProgramUpgradeAuthority,
  getRegisterInstructionAsync,
  hashManifest,
  hashManifestHex,
  nextAppNonce,
  validateManifest,
  type Category,
  type OarManifest,
} from '@open-app-registry/sdk';
import { CLUSTER } from './config';
import type { ServerRpc } from './rpc';
import { CATEGORIES, type BuiltLink, type BuiltTransaction, type CheckResult, type CheckRow, type Claim, type ClaimForm, type PreparedClaim } from './register-types';

// Server side of the /register wizard. It builds unsigned transactions for the connected wallet and relays signed
// ones, so the RPC key never reaches the browser. It holds no keys and stores nothing: every request carries the
// claim and every field is checked again. Devnet only.

export class RegisterError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Injected in tests; production uses the SDK's protected transport (public destinations only, bounded). */
export interface HttpOptions {
  fetch?: typeof fetch;
  resolveTxt?: ((name: string) => Promise<string[][]>) | null;
}

const MAX_WIRE_BYTES = 1232;

function fail(message: string): never {
  throw new RegisterError(message);
}

function str(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') return fail(`${field} must be text.`);
  const v = value.trim();
  if (!v || v.length > max) return fail(`${field} must be 1 to ${max} characters.`);
  return v;
}

function optStr(value: unknown, field: string, max: number): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : str(value, field, max);
}

/** Trimmed, normalized, then de-duplicated, so `MyApp.xyz` and `myapp.xyz` count once. */
function list(value: unknown, field: string, max: number, itemMax: number, normalize = (v: string) => v): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max) return fail(`${field} takes at most ${max} entries.`);
  return [...new Set(value.map(v => normalize(str(v, field, itemMax))))];
}

function addr(value: unknown, field: string): Address {
  const v = str(value, field, 44);
  return isAddress(v) ? address(v) : fail(`${field} is not a Solana address.`);
}

function manifestUri(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!/^(https:\/\/|ar:\/\/|ipfs:\/\/)[\x21-\x7e]+$/.test(value)) return fail('The manifest URI must be an https://, ar:// or ipfs:// address.');
  if (new TextEncoder().encode(value).length > MAX_URI_LEN) return fail(`The manifest URI is longer than ${MAX_URI_LEN} bytes.`);
  return value;
}

export function parseForm(body: unknown): ClaimForm {
  const b = (body ?? {}) as Record<string, unknown>;
  const categories = list(b.categories, 'Categories', 3, 32);
  for (const c of categories) if (!(CATEGORIES as readonly string[]).includes(c)) fail(`Unknown category "${c}".`);
  return {
    creator: addr(b.creator, 'Creator'),
    name: str(b.name, 'Name', 64),
    summary: optStr(b.summary, 'Summary', 140),
    categories: categories as ClaimForm['categories'],
    domains: list(b.domains, 'Domains', 10, 253, d => d.toLowerCase()),
    programs: list(b.programs, 'Programs', 32, 44).map(p => addr(p, 'Program')),
    repositories: list(b.repositories, 'Repositories', 10, 256),
    authority: b.authority ? addr(b.authority, 'Authority') : undefined,
    manifestUri: manifestUri(optStr(b.manifestUri, 'Manifest URI', MAX_URI_LEN)),
  };
}

/** A claim sent back by the client: the App ID must derive from creator and nonce, and the manifest must be valid. */
export async function parseClaim(body: unknown): Promise<{ claim: Claim; manifest: OarManifest; appId: Address; creator: Address; authority: Address; nonce: bigint }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const creator = addr(b.creator, 'Creator');
  const authority = addr(b.authority, 'Authority');
  const appId = addr(b.appId, 'App ID');
  if (typeof b.nonce !== 'string' || !/^\d{1,19}$/.test(b.nonce)) fail('Nonce must be a whole number.');
  const nonce = BigInt(b.nonce as string);
  if ((await findAppId({ creator, nonce })) !== appId) fail('The App ID does not derive from this creator and nonce.');
  const uri = manifestUri(str(b.manifestUri, 'Manifest URI', MAX_URI_LEN))!;
  const v = validateManifest(b.manifest);
  if (!v.valid) fail(`The manifest is invalid: ${v.errors.join('; ')}`);
  const manifest = b.manifest as OarManifest;
  if (manifest.app_id !== appId) fail('The manifest names a different App ID.');
  if (manifest.cluster !== CLUSTER) fail(`The manifest must name ${CLUSTER}.`);
  return { claim: { appId, nonce: nonce.toString(), creator, authority, manifestUri: uri, manifest: b.manifest as Record<string, unknown> }, manifest, appId, creator, authority, nonce };
}

/** Step 1: the App ID (first unused nonce for this creator) and the files to deploy. */
export async function prepare(rpc: ServerRpc, form: ClaimForm): Promise<PreparedClaim> {
  if (!form.domains?.length && !form.manifestUri) fail('Add a domain, or a URI where the manifest will be served.');
  const creator = address(form.creator);
  // Bounded: each probe is an RPC read, and a creator rarely has more than a few apps.
  const { nonce, appId } = await nextAppNonce(rpc, creator, { limit: 16n });
  const files = buildClaimFiles({
    appId, cluster: CLUSTER, name: form.name, summary: form.summary, categories: form.categories as Category[],
    domains: form.domains, programs: form.programs?.map(p => address(p)), repositories: form.repositories, manifestUri: form.manifestUri,
  });
  const v = validateManifest(files.manifest);
  if (!v.valid) fail(`The manifest would be invalid: ${v.errors.join('; ')}`);
  manifestUri(files.manifestUri);
  return {
    appId, nonce: nonce.toString(), creator, authority: form.authority ?? creator, manifestUri: files.manifestUri,
    manifest: files.manifest as unknown as Record<string, unknown>, manifestSha256: hashManifestHex(files.manifest),
    wellKnown: files.wellKnown as unknown as Record<string, unknown>,
    ...(files.repoProof ? { repoProof: files.repoProof as unknown as Record<string, unknown> } : {}),
  };
}

/** Step 2: every check, before anything is signed. */
export async function check(rpc: ServerRpc, body: unknown, http: HttpOptions = {}): Promise<CheckResult> {
  const { claim, manifest, appId } = await parseClaim(body);
  const rows: CheckRow[] = [];
  const record = await fetchMaybeAppRecord(rpc, appId, { commitment: 'confirmed' });
  const registered = record.exists;
  if (record.exists) {
    const same = bytesEqual(record.data.manifestHash, hashManifest(manifest));
    rows.push({ kind: 'record', subject: appId, state: same ? 'ok' : 'fail', detail: same ? 'Registered with this manifest.' : 'Registered with a different manifest.' });
  } else {
    rows.push({ kind: 'record', subject: appId, state: 'pending', detail: 'Not registered yet.' });
  }
  const hosting = await checkManifestHosting(claim.manifestUri, manifest, { fetch: http.fetch });
  rows.push({ kind: 'manifest', subject: claim.manifestUri, state: hosting.ok ? 'ok' : 'fail', detail: hosting.ok ? 'Served exactly as it will be committed.' : hosting.detail });
  for (const host of manifest.domains ?? []) {
    const r = await checkDomain(host, appId, CLUSTER, { fetch: http.fetch, resolveTxt: http.resolveTxt });
    rows.push({ kind: 'domain', subject: host, state: r.state === 'verified' ? 'ok' : r.state === 'failed' ? 'fail' : 'pending', detail: r.state === 'verified' ? `Proof found (${r.method}).` : r.detail ?? 'No proof found yet.' });
  }
  for (const repo of manifest.repositories ?? []) {
    const r = await checkRepository(repo.url, appId, CLUSTER, { fetch: http.fetch });
    rows.push({ kind: 'repository', subject: repo.url, state: r.state === 'verified' ? 'ok' : r.state === 'failed' ? 'fail' : 'pending', detail: r.state === 'verified' ? 'oar.json found.' : r.detail ?? 'No oar.json yet.' });
  }
  for (const p of manifest.programs ?? []) {
    const program = address(p.address);
    const link = backlinkMatches(await fetchProgramBacklink(rpc, program), appId, CLUSTER);
    const owner = await getProgramUpgradeAuthority(rpc, program).catch(() => null);
    const signer = owner?.authority ?? null;
    const detail = link.state === 'verified' ? 'Linked.'
      : !owner ? 'Not a deployed program on devnet.'
      : !signer ? 'Frozen or not upgradeable: it can be linked only by an issuer attestation.'
      : `Not linked yet. Its upgrade authority ${signer} signs the link.`;
    rows.push({ kind: 'program', subject: program, state: link.state === 'verified' ? 'ok' : link.state === 'failed' || !signer ? 'fail' : 'pending', detail, signer });
  }
  return { rows, registered, readyToRegister: hosting.ok && !registered };
}

const latestBlockhash = async (rpc: ServerRpc) => (await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()).value;

/** Step 3: the register transaction, for the creator's wallet. Refused until the manifest is served exactly. */
export async function buildRegister(rpc: ServerRpc, body: unknown, http: HttpOptions = {}): Promise<BuiltTransaction> {
  const { claim, manifest, appId, creator, authority, nonce } = await parseClaim(body);
  if ((await fetchMaybeAppRecord(rpc, appId, { commitment: 'confirmed' })).exists) throw new RegisterError(`${appId} is already registered.`, 409);
  const hosting = await checkManifestHosting(claim.manifestUri, manifest, { fetch: http.fetch });
  if (!hosting.ok) fail(`Not ready to register: ${hosting.detail}`);
  const ix = await getRegisterInstructionAsync({
    creator: createNoopSigner(creator), nonce, authority, manifestUri: claim.manifestUri, manifestHash: hashManifest(manifest),
  });
  const summary = describeRegistration({ appId, cluster: CLUSTER, creator, nonce, authority, manifestUri: claim.manifestUri, manifestSha256: hosting.sha256 });
  return { summary, transaction: exportUnsignedTransaction([ix], creator, await latestBlockhash(rpc)).base64 };
}

/**
 * Step 4: one program's backlink, for its upgrade authority. The program must be listed in the manifest the record
 * commits to, so the link verifies the moment it lands.
 */
export async function buildLink(rpc: ServerRpc, body: unknown): Promise<BuiltLink> {
  const b = (body ?? {}) as Record<string, unknown>;
  const { manifest, appId } = await parseClaim(b.claim);
  const program = addr(b.program, 'Program');
  const signer = addr(b.signer, 'Signer');
  const squads = b.squads === true;
  const legacy = b.legacy === true;
  const record = await fetchMaybeAppRecord(rpc, appId, { commitment: 'confirmed' });
  if (!record.exists) fail('Register the App ID before linking programs.');
  if (!bytesEqual(record.data.manifestHash, hashManifest(manifest))) fail('The registered record points at a different manifest.');
  if (!(manifest.programs ?? []).some(p => p.address === program && p.cluster === CLUSTER)) fail(`${program} is not listed in the manifest.`);
  const noop = createNoopSigner(signer);
  let plan;
  try {
    plan = await getProgramLinkInstructions(rpc, { program, appId, cluster: CLUSTER, authority: noop, payer: noop });
  } catch (e) {
    throw new RegisterError((e as Error).message);
  }
  const summary = describeProgramLink(plan, signer);
  if (plan.action === 'unchanged') return { action: 'unchanged', summary };
  const exported = exportUnsignedTransaction(plan.instructions, signer, await latestBlockhash(rpc), { version: legacy ? 'legacy' : 0 });
  return squads ? { action: plan.action, summary, squads: exported.base58 } : { action: plan.action, summary, transaction: exported.base64 };
}

/** The programs a wire transaction calls, read from its compiled message. Lookup tables are refused. */
export function transactionPrograms(wire: Uint8Array): { programs: Address[]; feePayer: Address; signed: boolean } {
  if (wire.length > MAX_WIRE_BYTES) fail('Transaction too large.');
  let tx, message;
  try {
    tx = getTransactionDecoder().decode(wire);
    message = getCompiledTransactionMessageDecoder().decode(tx.messageBytes);
  } catch {
    return fail('Not a valid Solana transaction.');
  }
  if (message.version !== 'legacy' && message.version !== 0) fail('Only legacy and version 0 transactions are accepted.');
  if ('addressTableLookups' in message && (message.addressTableLookups?.length ?? 0) > 0) fail('Transactions with address lookup tables are not accepted.');
  const programs = message.instructions.map(ix => message.staticAccounts[ix.programAddressIndex]);
  const signed = Object.values(tx.signatures).every(s => s !== null);
  return { programs, feePayer: message.staticAccounts[0], signed };
}

/** Step 5: relay a wallet-signed registration transaction. Anything outside the registry programs is refused. */
export async function relay(rpc: ServerRpc, body: unknown): Promise<{ signature: string }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const encoded = str(b.transaction, 'Transaction', 2000);
  let wire: Uint8Array;
  try {
    wire = Uint8Array.from(getBase64Encoder().encode(encoded));
  } catch {
    return fail('Transaction must be base64.');
  }
  const { programs, signed } = transactionPrograms(wire);
  if (!signed) fail('The transaction is not fully signed.');
  try {
    assertRegistrationInstructions(programs.map(programAddress => ({ programAddress })));
  } catch (e) {
    throw new RegisterError((e as Error).message);
  }
  // System and Compute Budget instructions alone (a plain transfer) are not a registration: this is not a general relay.
  if (!programs.some(p => p === OAR_PROGRAM_ID || p === PROGRAM_METADATA_PROGRAM_ID)) {
    fail('Only transactions that call the OAR registry or Program Metadata are relayed.');
  }
  try {
    const signature = await rpc
      .sendTransaction(encoded as Base64EncodedWireTransaction, { encoding: 'base64', preflightCommitment: 'confirmed' })
      .send();
    return { signature };
  } catch (e) {
    const logs = (e as { context?: { logs?: string[] } }).context?.logs ?? [];
    const line = logs.find(l => l.includes('Error Message:')) ?? logs.find(l => /failed|error/i.test(l));
    throw new RegisterError(line ? `Simulation failed: ${line.replace(/^Program log: /, '')}` : 'The network rejected the transaction.', 422);
  }
}

/** Step 6: confirmation, polled by the wizard. */
export async function status(rpc: ServerRpc, body: unknown): Promise<{ state: 'pending' | 'confirmed' | 'failed'; error?: string }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const signature = str(b.signature, 'Signature', 88);
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) fail('Not a transaction signature.');
  const { value } = await rpc.getSignatureStatuses([signature as Signature]).send();
  const s = value[0];
  if (!s) return { state: 'pending' };
  if (s.err) return { state: 'failed', error: JSON.stringify(s.err, (_, v) => (typeof v === 'bigint' ? v.toString() : v)) };
  return s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized' ? { state: 'confirmed' } : { state: 'pending' };
}
