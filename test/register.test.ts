import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  address,
  generateKeyPairSigner,
  getAddressEncoder,
  getBase58Encoder,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getCompiledTransactionMessageDecoder,
  getProgramDerivedAddress,
  getTransactionDecoder,
  getU32Encoder,
  getU64Encoder,
  signTransaction,
  type Address,
  type KeyPairSigner,
} from '@solana/kit';
import { OAR_PROGRAM_ID, PROGRAM_METADATA_PROGRAM_ID, findAppId, getAppRecordEncoder, hashManifest } from '@open-app-registry/sdk';
import { RegisterError, buildLink, buildRegister, buildUpdate, check, followsBranch, parseClaim, parseForm, prepare, relay, status, transactionPrograms } from '../src/lib/register';
import type { ServerRpc } from '../src/lib/rpc';

const SYSTEM = address('11111111111111111111111111111111');
const LOADER_V3 = address('BPFLoaderUpgradeab1e11111111111111111111111');
const BLOCKHASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
type Account = { owner: Address; data: Uint8Array; executable?: boolean };

/** In-memory devnet: getAccountInfo from a map, fixed rent and blockhash, a recorded sendTransaction. */
function fakeRpc(accounts: Map<string, Account> = new Map()) {
  const sent: string[] = [];
  const statuses = new Map<string, unknown>();
  const call = (fn: (...a: never[]) => unknown) => (...a: never[]) => ({ send: async () => fn(...a) });
  const rpc = {
    getAccountInfo: call((addr: string) => {
      const a = accounts.get(addr);
      return {
        context: { slot: 1n },
        value: a ? { data: [Buffer.from(a.data).toString('base64'), 'base64'], executable: a.executable ?? false, lamports: 1_000_000n, owner: a.owner, rentEpoch: 0n, space: BigInt(a.data.length) } : null,
      };
    }),
    getMinimumBalanceForRentExemption: call((space: bigint) => (128n + BigInt(space)) * 6960n),
    getLatestBlockhash: call(() => ({ context: { slot: 1n }, value: { blockhash: BLOCKHASH, lastValidBlockHeight: 100n } })),
    sendTransaction: call((wire: string) => {
      sent.push(wire);
      const tx = getTransactionDecoder().decode(getBase64Encoder().encode(wire));
      return Object.values(tx.signatures)[0] ? 'sig' + sent.length : 'unsigned';
    }),
    getSignatureStatuses: call((sigs: string[]) => ({ context: { slot: 1n }, value: sigs.map(s => statuses.get(s) ?? null) })),
  } as unknown as ServerRpc;
  return { rpc, accounts, sent, statuses };
}

/** Serve exact URLs; everything else is a 404. */
const stubFetch = (routes: Record<string, string>) =>
  (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    return url in routes ? new Response(routes[url], { status: 200 }) : new Response('not found', { status: 404 });
  }) as typeof fetch;

async function upgradeable(accounts: Map<string, Account>, authority: Address): Promise<Address> {
  const program = (await generateKeyPairSigner()).address;
  const [programData] = await getProgramDerivedAddress({ programAddress: LOADER_V3, seeds: [getAddressEncoder().encode(program)] });
  accounts.set(program, { owner: LOADER_V3, executable: true, data: Uint8Array.from([...getU32Encoder().encode(2), ...getAddressEncoder().encode(programData)]) });
  accounts.set(programData, { owner: LOADER_V3, data: Uint8Array.from([...getU32Encoder().encode(3), ...getU64Encoder().encode(1n), 1, ...getAddressEncoder().encode(authority)]) });
  return program;
}

function setRecord(accounts: Map<string, Account>, appId: Address, creator: Address, manifest: unknown, manifestUri: string) {
  const encoded = getAppRecordEncoder().encode({
    layoutVersion: 1, bump: 255, status: 0, creator, nonce: 0n, authority: creator, pendingAuthority: SYSTEM,
    manifestHash: hashManifest(manifest), revision: 0, createdSlot: 1n, updatedSlot: 1n, manifestUri,
  });
  const data = new Uint8Array(427);
  data.set(encoded);
  accounts.set(appId, { owner: OAR_PROGRAM_ID, data });
}

async function prepared(rpc: ServerRpc, creator: KeyPairSigner, programs: Address[] = []) {
  return prepare(rpc, parseForm({ creator: creator.address, name: 'Example App', categories: ['defi'], domains: ['MyApp.xyz'], programs }));
}

const programsOf = (wireBase64: string) => transactionPrograms(Uint8Array.from(getBase64Encoder().encode(wireBase64)));

async function sign(wireBase64: string, signer: KeyPairSigner): Promise<string> {
  const tx = getTransactionDecoder().decode(getBase64Encoder().encode(wireBase64));
  return getBase64EncodedWireTransaction(await signTransaction([signer.keyPair], tx));
}

test('the form is checked field by field before anything else runs', async () => {
  const creator = (await generateKeyPairSigner()).address;
  const ok = parseForm({ creator, name: ' Example ', domains: ['MyApp.XYZ', 'myapp.xyz'], categories: ['defi'] });
  assert.equal(ok.name, 'Example');
  assert.deepEqual(ok.domains, ['myapp.xyz']);
  for (const [body, message] of [
    [{ creator: 'nope', name: 'x' }, /Creator is not a Solana address/],
    [{ creator, name: 'x'.repeat(65) }, /Name must be 1 to 64 characters/],
    [{ creator, name: 'x', categories: ['casino'] }, /Unknown category "casino"/],
    [{ creator, name: 'x', categories: ['defi', 'dex', 'nft', 'dao'] }, /at most 3 entries/],
    [{ creator, name: 'x', programs: ['not-an-address'] }, /Program is not a Solana address/],
    [{ creator, name: 'x', manifestUri: 'http://myapp.xyz/m.json' }, /https:\/\/, ar:\/\/ or ipfs:\/\//],
    [{ creator, name: 'x', manifestUri: 'javascript:alert(1)' }, /https:\/\/, ar:\/\/ or ipfs:\/\//],
  ] as const) assert.throws(() => parseForm(body), (e: Error) => e instanceof RegisterError && message.test(e.message));
});

test('prepare derives the first free App ID and the files to deploy', async () => {
  const { rpc, accounts } = fakeRpc();
  const creator = await generateKeyPairSigner();
  const first = await prepared(rpc, creator);
  assert.equal(first.appId, await findAppId({ creator: creator.address, nonce: 0 }));
  assert.equal(first.nonce, '0');
  assert.equal(first.authority, creator.address);
  assert.equal(first.manifestUri, 'https://myapp.xyz/.well-known/oar-manifest.json');
  assert.deepEqual(first.wellKnown, { oar: '0.1', apps: [{ app_id: first.appId, cluster: 'solana:devnet' }] });
  assert.match(first.manifestSha256, /^[0-9a-f]{64}$/);

  setRecord(accounts, first.appId as Address, creator.address, first.manifest, first.manifestUri);
  const second = await prepared(rpc, creator);
  assert.equal(second.nonce, '1');
  // No domain and no URI yet (a phone, before the Gist exists): the URI is set after hosting, and nothing runs until then.
  const later = await prepare(rpc, parseForm({ creator: creator.address, name: 'Example App' }));
  assert.equal(later.manifestUri, '');
  assert.equal('domains' in later.manifest, false);
  await assert.rejects(check(rpc, later, { fetch: stubFetch({}) }), /Set where the manifest is served first/);
  await assert.rejects(buildRegister(rpc, later, { fetch: stubFetch({}) }), /Set where the manifest is served first/);
  const gist = 'https://gist.githubusercontent.com/me/abc/raw/def/oar-manifest.json';
  const hosted = { ...later, manifestUri: gist };
  const ready = await check(rpc, hosted, { fetch: stubFetch({ [gist]: JSON.stringify(later.manifest) }) });
  assert.equal(ready.readyToRegister, true);
});

test('a claim sent back is re-derived and re-validated, so a client cannot swap fields', async () => {
  const { rpc } = fakeRpc();
  const creator = await generateKeyPairSigner();
  const other = await generateKeyPairSigner();
  const claim = await prepared(rpc, creator);
  await parseClaim(claim);
  await assert.rejects(parseClaim({ ...claim, creator: other.address }), /does not derive from this creator and nonce/);
  await assert.rejects(parseClaim({ ...claim, nonce: '1' }), /does not derive/);
  await assert.rejects(parseClaim({ ...claim, manifest: { ...claim.manifest, cluster: 'solana:mainnet' } }), /must name solana:devnet/);
  const otherApp = await findAppId({ creator: other.address, nonce: 0 });
  await assert.rejects(parseClaim({ ...claim, manifest: { ...claim.manifest, app_id: otherApp } }), /names a different App ID/);
  await assert.rejects(parseClaim({ ...claim, manifest: { ...claim.manifest, name: '' } }), /manifest is invalid/);
});

test('check reports hosting, domain and program state; register is refused until the manifest is served', async () => {
  const { rpc, accounts } = fakeRpc();
  const creator = await generateKeyPairSigner();
  const program = await upgradeable(accounts, creator.address);
  const claim = await prepared(rpc, creator, [program]);
  const served = { fetch: stubFetch({ [claim.manifestUri]: JSON.stringify(claim.manifest), 'https://myapp.xyz/.well-known/oar.json': JSON.stringify(claim.wellKnown) }), resolveTxt: null };

  const before = await check(rpc, claim, { fetch: stubFetch({}), resolveTxt: null });
  assert.equal(before.readyToRegister, false);
  assert.equal(before.rows.find(r => r.kind === 'manifest')?.state, 'fail');
  await assert.rejects(buildRegister(rpc, claim, { fetch: stubFetch({}) }), /Not ready to register/);

  const after = await check(rpc, claim, served);
  assert.equal(after.readyToRegister, true);
  assert.deepEqual(after.rows.map(r => [r.kind, r.state]), [['record', 'pending'], ['manifest', 'ok'], ['domain', 'ok'], ['program', 'pending']]);
  assert.equal(after.rows.find(r => r.kind === 'program')?.signer, creator.address);

  const built = await buildRegister(rpc, claim, served);
  const { programs, feePayer, signed } = programsOf(built.transaction!);
  assert.deepEqual(programs, [OAR_PROGRAM_ID]);
  assert.equal(feePayer, creator.address);
  assert.equal(signed, false);
  assert.ok(built.summary[0].includes(claim.appId));

  setRecord(accounts, claim.appId as Address, creator.address, claim.manifest, claim.manifestUri);
  await assert.rejects(buildRegister(rpc, claim, served), (e: RegisterError) => e.status === 409);
  assert.equal((await check(rpc, claim, served)).registered, true);
});

test('program links need the registered manifest to list the program, and the signer to be its upgrade authority', async () => {
  const { rpc, accounts } = fakeRpc();
  const creator = await generateKeyPairSigner();
  const vault = (await generateKeyPairSigner()).address;
  const mine = await upgradeable(accounts, creator.address);
  const multisig = await upgradeable(accounts, vault);
  const unlisted = await upgradeable(accounts, creator.address);
  const claim = await prepared(rpc, creator, [mine, multisig]);

  await assert.rejects(buildLink(rpc, { claim, program: mine, signer: creator.address }), /Register the App ID before linking/);
  setRecord(accounts, claim.appId as Address, creator.address, claim.manifest, claim.manifestUri);

  const wallet = await buildLink(rpc, { claim, program: mine, signer: creator.address });
  assert.equal(wallet.action, 'create');
  assert.deepEqual(programsOf(wallet.transaction!).programs, [SYSTEM, PROGRAM_METADATA_PROGRAM_ID]);
  assert.ok(wallet.summary.some(l => l.includes(`"app":"${claim.appId}"`)));

  const squads = await buildLink(rpc, { claim, program: multisig, signer: vault, squads: true });
  assert.equal(squads.transaction, undefined);
  const tx = getTransactionDecoder().decode(getBase58Encoder().encode(squads.squads!));
  assert.deepEqual(Object.keys(tx.signatures), [vault]);
  const legacy = await buildLink(rpc, { claim, program: multisig, signer: vault, squads: true, legacy: true });
  assert.equal(getCompiledTransactionMessageDecoder().decode(getTransactionDecoder().decode(getBase58Encoder().encode(legacy.squads!)).messageBytes).version, 'legacy');

  await assert.rejects(buildLink(rpc, { claim, program: unlisted, signer: creator.address }), /is not listed in the manifest/);
  await assert.rejects(buildLink(rpc, { claim, program: multisig, signer: creator.address }), /Only the upgrade authority/);
  const changed = { ...claim, manifest: { ...claim.manifest, name: 'Changed' } };
  await assert.rejects(buildLink(rpc, { claim: changed, program: mine, signer: creator.address }), /points at a different manifest/);
});

test('the relay sends only fully signed registration transactions', async () => {
  const { rpc, accounts, sent, statuses } = fakeRpc();
  const creator = await generateKeyPairSigner();
  const claim = await prepared(rpc, creator);
  const served = { fetch: stubFetch({ [claim.manifestUri]: JSON.stringify(claim.manifest) }) };
  const built = await buildRegister(rpc, claim, served);

  await assert.rejects(relay(rpc, { transaction: built.transaction }), /not fully signed/);
  const signed = await sign(built.transaction!, creator);
  const { signature } = await relay(rpc, { transaction: signed });
  assert.equal(signature, 'sig1');
  assert.equal(sent.length, 1);

  // A signed transfer is a valid transaction, but not a registration: refused before it reaches the network.
  const program = await upgradeable(accounts, creator.address);
  const memo = await import('@solana/kit').then(async k => {
    const message = k.pipe(
      k.createTransactionMessage({ version: 0 }),
      m => k.setTransactionMessageFeePayerSigner(creator, m),
      m => k.setTransactionMessageLifetimeUsingBlockhash({ blockhash: BLOCKHASH as never, lastValidBlockHeight: 100n }, m),
      m => k.appendTransactionMessageInstruction({ programAddress: address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'), data: new Uint8Array([1]) }, m),
    );
    return k.getBase64EncodedWireTransaction(await k.signTransactionMessageWithSigners(message));
  });
  await assert.rejects(relay(rpc, { transaction: memo }), /Refusing to sign: an instruction calls MemoSq4/);
  await assert.rejects(relay(rpc, { transaction: 'not base64 at all!' }), /base64|valid Solana transaction/);

  // A plain transfer uses only allowed programs, but it is not a registration.
  const transfer = await import('@solana/kit').then(async k => {
    const data = new Uint8Array(12);
    new DataView(data.buffer).setUint32(0, 2, true); // System Program: Transfer
    new DataView(data.buffer).setBigUint64(4, 1n, true);
    const message = k.pipe(
      k.createTransactionMessage({ version: 0 }),
      m => k.setTransactionMessageFeePayerSigner(creator, m),
      m => k.setTransactionMessageLifetimeUsingBlockhash({ blockhash: BLOCKHASH as never, lastValidBlockHeight: 100n }, m),
      m => k.appendTransactionMessageInstruction({
        programAddress: SYSTEM, data,
        accounts: [{ address: creator.address, role: k.AccountRole.WRITABLE_SIGNER, signer: creator }, { address: program, role: k.AccountRole.WRITABLE }],
      }, m),
    );
    return k.getBase64EncodedWireTransaction(await k.signTransactionMessageWithSigners(message));
  });
  await assert.rejects(relay(rpc, { transaction: transfer }), /Only transactions that call the OAR registry or Program Metadata are relayed/);
  assert.equal(sent.length, 1);
  void program;

  statuses.set('sig1', { confirmationStatus: 'confirmed', err: null });
  assert.deepEqual(await status(rpc, { signature: '5'.repeat(88) }), { state: 'pending' });
  await assert.rejects(status(rpc, { signature: 'sig1' }), /Not a transaction signature/);
});

test('a manifest cannot be served from a proof file, and branch links get a pinning tip', async () => {
  const creator = await generateKeyPairSigner();
  for (const uri of ['https://raw.githubusercontent.com/me/app/main/oar.json', 'https://myapp.xyz/.well-known/OAR.json?x=1']) {
    assert.throws(() => parseForm({ creator: creator.address, name: 'A', manifestUri: uri }), /reserved for the ownership proof/);
  }
  const { rpc } = fakeRpc();
  const c = await prepared(rpc, creator);
  await assert.rejects(parseClaim({ ...c, manifestUri: 'https://raw.githubusercontent.com/me/app/main/oar.json' }), /reserved for the ownership proof/);
  assert.equal(followsBranch('https://raw.githubusercontent.com/me/app/main/oar-manifest.json'), true);
  assert.equal(followsBranch(`https://raw.githubusercontent.com/me/app/${'a'.repeat(40)}/oar-manifest.json`), false);
  assert.equal(followsBranch('https://myapp.xyz/.well-known/oar-manifest.json'), false);
});

test('an update repoints a registered record, signed and paid by its authority only', async () => {
  const creator = await generateKeyPairSigner();
  const { rpc, accounts } = fakeRpc();
  const c = await prepared(rpc, creator);
  const oldUri = 'https://raw.githubusercontent.com/me/app/main/oar.manifest.old';
  const newUri = `https://raw.githubusercontent.com/me/app/${'b'.repeat(40)}/oar-manifest.json`;
  const http = { fetch: stubFetch({ [newUri]: JSON.stringify(c.manifest), [oldUri]: JSON.stringify(c.manifest) }) };

  await assert.rejects(buildUpdate(rpc, { appId: c.appId, manifestUri: newUri }, http), /not a registered App ID/);
  setRecord(accounts, c.appId as Address, creator.address, c.manifest, oldUri);

  const built = await buildUpdate(rpc, { appId: c.appId, manifestUri: newUri }, http);
  assert.equal(built.authority, creator.address);
  const tx = programsOf(built.transaction!);
  assert.deepEqual(tx.programs, [OAR_PROGRAM_ID]);
  assert.equal(tx.feePayer, creator.address);
  assert.ok(built.summary.some(l => l.includes(`${oldUri} → ${newUri}`)));
  assert.ok(built.summary.includes('Manifest content: unchanged.'));

  await assert.rejects(buildUpdate(rpc, { appId: c.appId, manifestUri: oldUri }, http), /Nothing to update/);
  await assert.rejects(buildUpdate(rpc, { appId: c.appId, manifestUri: 'https://raw.githubusercontent.com/me/app/main/oar.json' }, http), /reserved for the ownership proof/);
  await assert.rejects(buildUpdate(rpc, { appId: c.appId, manifestUri: 'https://example.com/missing.json' }, http), /Could not read a manifest/);
  const other = { ...c.manifest, app_id: creator.address };
  const otherUri = 'https://example.com/other.json';
  await assert.rejects(buildUpdate(rpc, { appId: c.appId, manifestUri: otherUri }, { fetch: stubFetch({ [otherUri]: JSON.stringify(other) }) }), /different App ID/);
});
