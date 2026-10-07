'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBase58Encoder } from '@solana/kit';
import type { Wallet, WalletAccount } from '@wallet-standard/base';
import { ArrowRight, Check, CircleAlert, CircleCheck, CircleDashed, Copy, Download, ExternalLink, FileJson, LoaderCircle, PenLine, RotateCcw, ShieldCheck, Smartphone, Wallet as WalletIcon } from 'lucide-react';
import { CATEGORIES, type BuiltLink, type BuiltTransaction, type CheckResult, type CheckRow, type CategoryName, type PreparedClaim } from '@/lib/register-types';
import { CopyButton } from '../CopyButton';
import { base64ToBytes, bytesToBase64, download, inspectTransaction, post, programName, type DecodedTransaction } from './api';
import { connect, signTransaction, useWallets } from './wallet';

const STORE_KEY = 'oar-register-claim-v1';
const STEPS = ['Connect', 'Describe', 'Deploy & check', 'Register', 'Link programs'] as const;

const lines = (v: string) => v.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

function load(): PreparedClaim | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as PreparedClaim) : null;
  } catch {
    return null;
  }
}
function save(claim: PreparedClaim | null) {
  try {
    if (claim) localStorage.setItem(STORE_KEY, JSON.stringify(claim));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* storage unavailable: the claim lives for this page view only */
  }
}

export function RegisterWizard() {
  const wallets = useWallets();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [claim, setClaim] = useState<PreparedClaim | null>(null);
  const [saved, setSaved] = useState<PreparedClaim | null>(null);
  const [checked, setChecked] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSaved(load()), []);

  const step = !account ? 0 : !claim ? 1 : !checked?.registered ? (checked?.readyToRegister ? 3 : 2) : 4;

  async function onConnect(w: Wallet) {
    setError(null);
    try {
      const a = await connect(w);
      setWallet(w);
      setAccount(a);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runCheck(c: PreparedClaim) {
    setChecked(await post<CheckResult>('check', c));
  }

  function reset() {
    save(null);
    setSaved(null);
    setClaim(null);
    setChecked(null);
    setError(null);
  }

  return (
    <div className="wizard">
      <ol className="wizard-steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="step-num">{i < step ? <CircleCheck size={16} aria-hidden="true" /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {error ? (
        <p className="wizard-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" /> {error}
        </p>
      ) : null}

      {!account ? (
        <ConnectStep wallets={wallets} onConnect={onConnect} />
      ) : (
        <p className="connected small muted">
          <WalletIcon size={15} aria-hidden="true" /> {wallet?.name} · <code>{account.address}</code> · devnet
        </p>
      )}

      {account && wallet && !claim ? <UpdateCard wallet={wallet} account={account} /> : null}

      {account && !claim ? (
        <DescribeStep
          creator={account.address}
          saved={saved?.creator === account.address ? saved : null}
          onResume={async c => {
            setClaim(c);
            if (c.manifestUri) await runCheck(c).catch(e => setError((e as Error).message));
          }}
          onPrepared={c => {
            save(c);
            setClaim(c);
            setChecked(null);
          }}
          onError={setError}
        />
      ) : null}

      {claim && account && wallet ? (
        <>
          <DeployStep
            claim={claim}
            checked={checked}
            onCheck={() => runCheck(claim)}
            onReset={reset}
            onManifestUri={uri => {
              const next = { ...claim, manifestUri: uri };
              save(next);
              setClaim(next);
              setChecked(null);
            }}
          />
          {checked?.readyToRegister ? (
            <RegisterStep claim={claim} wallet={wallet} account={account} onDone={() => runCheck(claim)} />
          ) : null}
          {checked?.registered ? <LinkStep claim={claim} checked={checked} wallet={wallet} account={account} onDone={() => runCheck(claim)} /> : null}
        </>
      ) : null}
    </div>
  );
}

function ConnectStep({ wallets, onConnect }: { wallets: Wallet[]; onConnect: (w: Wallet) => void }) {
  return (
    <section className="card wizard-card" aria-labelledby="connect-h">
      <h2 id="connect-h">Connect the creator wallet</h2>
      <p className="muted">
        This wallet signs the registration and pays about 0.0039 SOL of devnet rent. The App ID is derived from it, so
        nobody else can take it. Switch your wallet to <strong>devnet</strong> first.
      </p>
      {wallets.length ? (
        <ul className="wallet-list">
          {wallets.map(w => (
            <li key={w.name}>
              <button type="button" className="wallet-button" onClick={() => onConnect(w)}>
                {/* Wallet Standard icons are data: URIs supplied by the extension. */}
                <img src={w.icon} alt="" width={28} height={28} />
                <span>{w.name}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <NoWallet />
      )}
    </section>
  );
}

/** Phone browsers have no wallet extensions; wallet apps expose one only inside their own browser. */
function isPhone(): boolean {
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Universal links that reopen this exact page inside the wallet app, in the official wallet adapters' format. */
export function walletBrowseLinks(href: string, origin: string) {
  const url = encodeURIComponent(href);
  const ref = encodeURIComponent(origin);
  return [
    { name: 'Phantom', href: `https://phantom.app/ul/browse/${url}?ref=${ref}`, devnet: 'Settings → Developer Settings → Testnet Mode, then Solana Devnet' },
    { name: 'Solflare', href: `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`, devnet: 'switch the network to Devnet in Settings' },
  ];
}

function NoWallet() {
  const [links, setLinks] = useState<ReturnType<typeof walletBrowseLinks> | null>(null);
  useEffect(() => {
    if (isPhone()) setLinks(walletBrowseLinks(window.location.href, window.location.origin));
  }, []);
  if (!links) {
    return (
      <p className="callout">
        No Solana wallet found. Install one that supports the Wallet Standard (for example Phantom, Solflare or
        Backpack), enable devnet, then reload this page.
      </p>
    );
  }
  return (
    <div className="mobile-wallets" data-field="mobile-wallets">
      <p className="callout">
        On a phone, your wallet is only available inside its own app. Open this page there; your progress is kept on this
        device only if you stay in the same app.
      </p>
      <ul className="wallet-list">
        {links.map(l => (
          <li key={l.name}>
            <a className="wallet-button" href={l.href} data-wallet={l.name}>
              <Smartphone size={20} aria-hidden="true" />
              <span>Open in {l.name}</span>
              <ExternalLink size={16} aria-hidden="true" />
            </a>
            <p className="small muted wallet-tip">Devnet in {l.name}: {l.devnet}.</p>
          </li>
        ))}
      </ul>
      <p className="small muted">Another wallet? Open this address in its built-in browser: <code className="wrap">{typeof window === 'undefined' ? '' : window.location.href}</code></p>
    </div>
  );
}

function DescribeStep({
  creator, saved, onResume, onPrepared, onError,
}: { creator: string; saved: PreparedClaim | null; onResume: (c: PreparedClaim) => void; onPrepared: (c: PreparedClaim) => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<CategoryName[]>([]);

  async function submit(form: FormData) {
    onError(null);
    setBusy(true);
    try {
      const prepared = await post<PreparedClaim>('prepare', {
        creator,
        name: String(form.get('name') ?? ''),
        summary: String(form.get('summary') ?? '') || undefined,
        categories,
        domains: lines(String(form.get('domains') ?? '')),
        programs: lines(String(form.get('programs') ?? '')),
        repositories: lines(String(form.get('repositories') ?? '')),
        authority: String(form.get('authority') ?? '').trim() || undefined,
        manifestUri: String(form.get('manifestUri') ?? '').trim() || undefined,
      });
      onPrepared(prepared);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card wizard-card" aria-labelledby="describe-h">
      <h2 id="describe-h">Describe the app</h2>
      {saved ? (
        <p className="callout">
          You started registering <strong>{String(saved.manifest.name)}</strong> (<code>{short(saved.appId)}</code>).{' '}
          <button type="button" className="link-button" onClick={() => onResume(saved)}>Resume it</button>
        </p>
      ) : null}
      <form action={submit} className="claim-form">
        <label className="field">
          <span>Name <em>required</em></span>
          <input name="name" required maxLength={64} autoComplete="off" />
        </label>
        <label className="field">
          <span>Summary</span>
          <input name="summary" maxLength={140} autoComplete="off" />
        </label>
        <fieldset className="field">
          <legend>Categories <em>up to 3</em></legend>
          <div className="chips">
            {CATEGORIES.map(c => {
              const on = categories.includes(c);
              return (
                <label key={c} className={`chip-check${on ? ' on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!on && categories.length >= 3}
                    onChange={() => setCategories(on ? categories.filter(x => x !== c) : [...categories, c])}
                  />
                  {c}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="field">
          <span>Domains <em>one per line; the first hosts the manifest</em></span>
          <textarea name="domains" rows={2} placeholder="myapp.xyz" spellCheck={false} />
        </label>
        <label className="field">
          <span>Programs <em>devnet program IDs, one per line</em></span>
          <textarea name="programs" rows={2} spellCheck={false} />
        </label>
        <label className="field">
          <span>Repositories <em>one per line</em></span>
          <textarea name="repositories" rows={2} placeholder="https://github.com/me/myapp" spellCheck={false} />
        </label>
        <details className="advanced">
          <summary>Advanced</summary>
          <label className="field">
            <span>Record authority <em>default: this wallet; a Squads vault is recommended for production</em></span>
            <input name="authority" spellCheck={false} autoComplete="off" />
          </label>
          <label className="field">
            <span>Manifest URI <em>default: https://&lt;first domain&gt;/.well-known/oar-manifest.json</em></span>
            <input name="manifestUri" spellCheck={false} autoComplete="off" placeholder="ar://… or ipfs://…" />
          </label>
        </details>
        <button type="submit" className="button" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <FileJson size={16} aria-hidden="true" />} Prepare files
        </button>
      </form>
    </section>
  );
}

const STATE_ICON = { ok: CircleCheck, pending: CircleDashed, fail: CircleAlert } as const;

function CheckList({ rows }: { rows: CheckRow[] }) {
  return (
    <ul className="check-list">
      {rows.map(r => {
        const Icon = STATE_ICON[r.state];
        return (
          <li key={`${r.kind}:${r.subject}`} className={`check-${r.state}`} data-kind={r.kind} data-state={r.state}>
            <Icon size={16} aria-hidden="true" />
            <div>
              <span className="link-kind">{r.kind}</span> <code className="wrap">{r.subject}</code>
              <p className="small muted">{r.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Downloads are unreliable inside wallet apps' browsers, so every file can also be copied as text. */
function FileActions({ filename, value }: { filename: string; value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2) + '\n';
  return (
    <div className="file-actions">
      <button type="button" className="button button-secondary" onClick={() => download(filename, value)}>
        <Download size={15} aria-hidden="true" /> {filename}
      </button>
      <button
        type="button"
        className="button button-secondary"
        data-copy={filename}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard unavailable: the JSON below stays selectable */
          }
        }}
      >
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? 'Copied' : 'Copy JSON'}
      </button>
      <details className="json-view">
        <summary>Show JSON</summary>
        <pre>{text}</pre>
      </details>
    </div>
  );
}

const URI_PATTERN = /^(https:\/\/|ar:\/\/|ipfs:\/\/)\S+$/;

function ManifestUriEditor({ value, onSave }: { value: string; onSave: (uri: string) => void }) {
  const [draft, setDraft] = useState(value);
  const valid = URI_PATTERN.test(draft.trim());
  return (
    <form
      className="uri-editor"
      onSubmit={e => {
        e.preventDefault();
        if (valid) onSave(draft.trim());
      }}
    >
      <label className="field">
        <span>Where is the manifest served?</span>
        <input
          name="manifestUri"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="https://gist.githubusercontent.com/…/raw/…/oar-manifest.json"
          spellCheck={false}
          autoComplete="off"
          inputMode="url"
        />
      </label>
      <button type="submit" className="button button-secondary" disabled={!valid || draft.trim() === value}>Use this address</button>
      <p className="small muted">
        No website? Paste the manifest into a public GitHub Gist, tap <strong>Raw</strong>, and copy that address. The file
        can live anywhere public: the record pins its SHA-256, so a changed file simply fails the check.
      </p>
    </form>
  );
}

function DeployStep({
  claim, checked, onCheck, onReset, onManifestUri,
}: { claim: PreparedClaim; checked: CheckResult | null; onCheck: () => Promise<void>; onReset: () => void; onManifestUri: (uri: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const domains = (claim.manifest.domains as string[] | undefined) ?? [];
  const repos = ((claim.manifest.repositories as { url: string }[] | undefined) ?? []).map(r => r.url);
  const onSite = domains[0] && claim.manifestUri.startsWith(`https://${domains[0]}/`);

  async function check() {
    setError(null);
    setBusy(true);
    try {
      await onCheck();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card wizard-card" aria-labelledby="deploy-h">
      <div className="section-head">
        <h2 id="deploy-h">Deploy the files</h2>
        <button type="button" className="link-button small" onClick={onReset}>
          <RotateCcw size={14} aria-hidden="true" /> Start over
        </button>
      </div>
      <div className="app-id-row">
        <span className="link-kind">App ID</span>
        <code data-field="app-id">{claim.appId}</code>
        <CopyButton value={claim.appId} label="App ID" />
      </div>
      <ol className="file-list">
        <li>
          <FileActions filename="oar-manifest.json" value={claim.manifest} />
          <span>
            {claim.manifestUri ? (
              <>Serve at <code className="wrap" data-field="manifest-uri">{claim.manifestUri}</code>{onSite ? null : ' (upload it there)'}.</>
            ) : (
              'Host it at any public address, then enter that address below.'
            )}
          </span>
          <ManifestUriEditor key={claim.manifestUri} value={claim.manifestUri} onSave={onManifestUri} />
        </li>
        {domains.length ? (
          <li>
            <FileActions filename="oar.json" value={claim.wellKnown} />
            <span>
              Serve at {domains.map((d, i) => (
                <span key={d}>{i ? ', ' : ''}<code>https://{d}/.well-known/oar.json</code></span>
              ))}{' '}
              with no redirects.
            </span>
          </li>
        ) : null}
        {repos.length && claim.repoProof ? (
          <li>
            <FileActions filename="oar.json" value={claim.repoProof} />
            <span>Commit to the root of {repos.map((r, i) => <span key={r}>{i ? ', ' : ''}<code className="wrap">{r}</code></span>)}.</span>
          </li>
        ) : null}
      </ol>
      <p className="small muted">
        The manifest is committed onchain by its SHA-256 (<code className="wrap">{claim.manifestSha256}</code>). Formatting
        does not matter; any change to its content does.
      </p>
      <button type="button" className="button" onClick={check} disabled={busy || !claim.manifestUri}>
        {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}{' '}
        {checked ? 'Check again' : 'Check the deployment'}
      </button>
      {error ? <p className="wizard-error" role="alert"><CircleAlert size={16} aria-hidden="true" /> {error}</p> : null}
      {checked ? <CheckList rows={checked.rows} /> : null}
      {checked && !checked.readyToRegister && !checked.registered ? (
        <p className="small muted">Registration unlocks once the manifest line is green. Nothing has been signed.</p>
      ) : null}
    </section>
  );
}

/** Review, sign and confirm one transaction. The browser decodes it before the wallet sees it. */
function SignPanel({
  built, wallet, account, label, onConfirmed,
}: { built: BuiltTransaction; wallet: Wallet; account: WalletAccount; label: string; onConfirmed: (signature: string) => void }) {
  const [phase, setPhase] = useState<'review' | 'signing' | 'sending' | 'confirming' | 'done'>('review');
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  let decoded: DecodedTransaction | null = null;
  let invalid: string | null = null;
  try {
    decoded = built.transaction ? inspectTransaction(base64ToBytes(built.transaction), account.address) : null;
  } catch (e) {
    invalid = (e as Error).message;
  }

  async function sign() {
    setError(null);
    try {
      setPhase('signing');
      const signed = await signTransaction(wallet, account, base64ToBytes(built.transaction!));
      try {
        inspectTransaction(signed, account.address);
      } catch (e) {
        throw new Error(`${wallet.name} changed the transaction while signing (${(e as Error).message.replace(/^Refusing to sign: /, '')}). Nothing was sent. Please report which wallet did this.`);
      }
      setPhase('sending');
      const { signature } = await post<{ signature: string }>('send', { transaction: bytesToBase64(signed) });
      setSignature(signature);
      setPhase('confirming');
      for (let i = 0; i < 40; i++) {
        const s = await post<{ state: string; error?: string }>('status', { signature });
        if (s.state === 'confirmed') {
          setPhase('done');
          onConfirmed(signature);
          return;
        }
        if (s.state === 'failed') throw new Error(`The transaction failed: ${s.error}`);
        await new Promise(r => setTimeout(r, 1500));
      }
      throw new Error(`Still waiting for ${signature}. Check it on Solana Explorer before trying again.`);
    } catch (e) {
      setError((e as Error).message);
      setPhase('review');
    }
  }

  return (
    <div className="tx-review" data-phase={phase}>
      <ul className="tx-summary">
        {built.summary.map(l => <li key={l}>{l}</li>)}
      </ul>
      {decoded ? (
        <p className="small muted">
          Checked in your browser: paid by your wallet ({short(decoded.feePayer)}), {decoded.instructionCount} instruction
          {decoded.instructionCount === 1 ? '' : 's'}, calling only {decoded.programs.map(programName).join(', ')}.
        </p>
      ) : null}
      {invalid ? <p className="wizard-error" role="alert"><CircleAlert size={16} aria-hidden="true" /> Not signing: {invalid}</p> : null}
      {error ? <p className="wizard-error" role="alert"><CircleAlert size={16} aria-hidden="true" /> {error}</p> : null}
      {phase === 'done' && signature ? (
        <p className="tx-done">
          <CircleCheck size={16} aria-hidden="true" /> Confirmed:{' '}
          <a href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`} target="_blank" rel="noreferrer">{short(signature)}</a>
        </p>
      ) : (
        <button type="button" className="button" onClick={sign} disabled={!decoded || phase !== 'review'}>
          {phase === 'review' ? <PenLine size={16} aria-hidden="true" /> : <LoaderCircle className="spin" size={16} aria-hidden="true" />}{' '}
          {phase === 'review' ? `${label} with ${wallet.name}` : phase === 'signing' ? 'Waiting for the wallet…' : phase === 'sending' ? 'Sending…' : 'Confirming…'}
        </button>
      )}
    </div>
  );
}

function RegisterStep({ claim, wallet, account, onDone }: { claim: PreparedClaim; wallet: Wallet; account: WalletAccount; onDone: () => Promise<void> }) {
  const [built, setBuilt] = useState<BuiltTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creatorMismatch = account.address !== claim.creator;

  useEffect(() => {
    if (creatorMismatch) return;
    post<BuiltTransaction>('build-register', claim).then(setBuilt, e => setError((e as Error).message));
  }, [claim, creatorMismatch]);

  return (
    <section className="card wizard-card" aria-labelledby="register-h">
      <h2 id="register-h">Register the App ID</h2>
      {creatorMismatch ? (
        <p className="wizard-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" /> This App ID belongs to creator <code>{claim.creator}</code>. Connect that wallet.
        </p>
      ) : null}
      {error ? <p className="wizard-error" role="alert"><CircleAlert size={16} aria-hidden="true" /> {error}</p> : null}
      {built ? <SignPanel built={built} wallet={wallet} account={account} label="Register" onConfirmed={() => setTimeout(() => void onDone(), 1500)} /> : !error && !creatorMismatch ? <p className="muted small">Preparing the transaction…</p> : null}
    </section>
  );
}

function ProgramLinkRow({ claim, row, wallet, account, onDone }: { claim: PreparedClaim; row: CheckRow; wallet: Wallet; account: WalletAccount; onDone: () => Promise<void> }) {
  const [built, setBuilt] = useState<BuiltLink | null>(null);
  const [decoded, setDecoded] = useState<DecodedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(false);
  const signer = row.signer;
  const canSign = signer === account.address;

  async function build(squads: boolean) {
    setError(null);
    try {
      const link = await post<BuiltLink>('build-link', { claim, program: row.subject, signer, squads, legacy });
      // A proposal is checked here too: paid by the vault, calling only registry programs.
      if (link.squads) setDecoded(inspectTransaction(Uint8Array.from(getBase58Encoder().encode(link.squads)), signer!));
      setBuilt(link);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <li className="program-row">
      <CheckList rows={[row]} />
      {row.state === 'pending' && signer ? (
        <div className="program-actions">
          {!built ? (
            canSign ? (
              <button type="button" className="button" onClick={() => build(false)}>Prepare the link</button>
            ) : (
              <>
                <p className="small muted">
                  The upgrade authority is <code>{signer}</code>, not the connected wallet. If it is a Squads vault, create a
                  proposal for its members to approve. Otherwise connect that wallet instead.
                </p>
                <label className="small"><input type="checkbox" checked={legacy} onChange={e => setLegacy(e.target.checked)} /> Legacy transaction (Squads v3)</label>{' '}
                <button type="button" className="button button-secondary" onClick={() => build(true)}>Create a Squads proposal</button>
              </>
            )
          ) : built.squads ? (
            <div className="tx-review">
              <ul className="tx-summary">{built.summary.map(l => <li key={l}>{l}</li>)}</ul>
              {decoded ? (
                <p className="small muted">
                  Checked in your browser: unsigned, paid by the vault ({short(decoded.feePayer)}), {decoded.instructionCount} instructions,
                  calling only {decoded.programs.map(programName).join(', ')}.
                </p>
              ) : null}
              <p className="small">
                In Squads, open the transaction builder, import this base58 transaction, then approve and execute it. The vault
                pays the rent, so it needs SOL. Check that the App ID in the content is <code>{claim.appId}</code>.
              </p>
              <div className="mono-row"><code className="wrap" data-field="squads-tx">{built.squads}</code><CopyButton value={built.squads} label="transaction" /></div>
              <button type="button" className="button button-secondary" onClick={() => void onDone()}>I executed it: check again</button>
            </div>
          ) : built.transaction ? (
            <SignPanel built={built} wallet={wallet} account={account} label="Link program" onConfirmed={() => setTimeout(() => void onDone(), 1500)} />
          ) : (
            <ul className="tx-summary">{built.summary.map(l => <li key={l}>{l}</li>)}</ul>
          )}
          {error ? <p className="wizard-error" role="alert"><CircleAlert size={16} aria-hidden="true" /> {error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

function LinkStep({ claim, checked, wallet, account, onDone }: { claim: PreparedClaim; checked: CheckResult; wallet: Wallet; account: WalletAccount; onDone: () => Promise<void> }) {
  const programs = checked.rows.filter(r => r.kind === 'program');
  const allLinked = programs.every(r => r.state === 'ok');
  return (
    <section className="card wizard-card" aria-labelledby="link-h">
      <h2 id="link-h">{programs.length ? 'Link the programs' : 'Registered'}</h2>
      {programs.length ? (
        <>
          <p className="muted small">
            Each program&apos;s upgrade authority writes a small onchain note pointing back to this App ID. It changes no code
            and no authority.
          </p>
          <ul className="program-list">
            {programs.map(r => <ProgramLinkRow key={r.subject} claim={claim} row={r} wallet={wallet} account={account} onDone={onDone} />)}
          </ul>
        </>
      ) : null}
      {allLinked ? (
        <p className="tx-done">
          <CircleCheck size={16} aria-hidden="true" /> Done. The explorer shows the app within a minute or so:{' '}
          <Link href={`/app/${claim.appId}`}>open its page</Link>.
        </p>
      ) : null}
    </section>
  );
}

/** For an App ID that is already registered: point its record at a new manifest address, signed by its authority. */
function UpdateCard({ wallet, account }: { wallet: Wallet; account: WalletAccount }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [built, setBuilt] = useState<(BuiltTransaction & { authority: string; appId: string }) | null>(null);
  const [done, setDone] = useState(false);

  async function submit(form: FormData) {
    setError(null);
    setBuilt(null);
    setBusy(true);
    try {
      const appId = String(form.get('appId') ?? '').trim();
      const update = await post<BuiltTransaction & { authority: string }>('build-update', {
        appId,
        manifestUri: String(form.get('manifestUri') ?? '').trim(),
      });
      if (update.authority !== account.address) {
        throw new Error(`Only this App ID's authority ${update.authority} can update it. Connect that wallet.`);
      }
      setBuilt({ ...update, appId });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="card wizard-card update-card" data-field="update">
      <summary><h2 id="update-h">Already registered? Move or change its manifest</h2></summary>
      <p className="muted small">
        Host the new manifest first (keep the repository&apos;s <code>oar.json</code> and the domain&apos;s{' '}
        <code>/.well-known/oar.json</code> for the ownership proofs), then enter its address. The record&apos;s authority
        signs; nothing else changes.
      </p>
      {/* onSubmit, not action: a form action resets the fields, which would wipe them after an error. */}
      <form onSubmit={e => { e.preventDefault(); void submit(new FormData(e.currentTarget)); }} className="claim-form">
        <label className="field">
          <span>App ID</span>
          <input name="appId" required spellCheck={false} autoComplete="off" />
        </label>
        <label className="field">
          <span>New manifest address <em>a link pinned to a commit stays stable</em></span>
          <input name="manifestUri" required spellCheck={false} autoComplete="off" inputMode="url" placeholder="https://raw.githubusercontent.com/me/myapp/<commit>/oar-manifest.json" />
        </label>
        <button type="submit" className="button button-secondary" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <FileJson size={16} aria-hidden="true" />} Prepare the update
        </button>
      </form>
      {error ? <p className="wizard-error" role="alert"><CircleAlert size={16} aria-hidden="true" /> {error}</p> : null}
      {built ? <SignPanel built={built} wallet={wallet} account={account} label="Update" onConfirmed={() => setDone(true)} /> : null}
      {done && built ? (
        <p className="tx-done">
          <CircleCheck size={16} aria-hidden="true" /> Updated. <Link href={`/app/${built.appId}`}>Open its page</Link> to see the
          checks run again.
        </p>
      ) : null}
    </details>
  );
}
