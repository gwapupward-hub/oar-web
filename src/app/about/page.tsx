import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { EvidencePill } from '@/components/Pill';
import { OAR_RELEASE, OAR_REPO_URL } from '@/lib/site';

export const metadata: Metadata = { title: 'How it works' };

export default async function About() {
  await connection(); // per-request rendering, so the CSP nonce applies
  return (
    <article className="prose">
      <p className="eyebrow">How it works</p>
      <h1>Evidence, not endorsements</h1>
      <p className="lede">
        The Open App Registry links an app’s onchain identity to its programs, domains and source code. OAR Explorer shows
        that evidence, one link at a time, so you can decide what to trust.
      </p>

      <h2>What each state means</h2>
      <dl className="legend">
        <div><dt><EvidencePill state="verified" kind="program" /></dt><dd>The program’s upgrade authority published a backlink to this App ID, and the app’s manifest lists the program.</dd></div>
        <div><dt><EvidencePill state="verified" kind="domain" /></dt><dd>The domain serves <code>/.well-known/oar.json</code> or an <code>_oar</code> DNS TXT record naming this App ID, and the manifest lists the domain.</dd></div>
        <div><dt><EvidencePill state="verified" kind="repository" /></dt><dd>The repository’s root <code>oar.json</code> names this App ID, and the manifest lists the repository.</dd></div>
        <div><dt><EvidencePill state="attested" /></dt><dd>A trusted issuer signed a Solana Attestation Service attestation for the link. This explorer trusts no issuer by default.</dd></div>
        <div><dt><EvidencePill state="unverified" /></dt><dd>Claimed in the manifest, but no proof was found. An app with no linked program or domain is labelled “Unverified” before its name.</dd></div>
        <div><dt><EvidencePill state="failed" /></dt><dd>The proof points to a different app or cluster.</dd></div>
      </dl>

      <h2>What the explorer checks</h2>
      <ol>
        <li>The <strong>AppRecord</strong> on Solana: owner, layout and address, and the manifest hash it pins.</li>
        <li>The <strong>manifest</strong>: fetched from its URI, hashed in canonical form, and compared with the onchain hash. Any mismatch makes it unavailable, never partly trusted.</li>
        <li>Each <strong>link</strong> it claims, checked live from the other side, every time you look. Results are cached for about a minute.</li>
      </ol>

      <h2>What it does not mean</h2>
      <p>
        A linked program, domain or repository shows who controls them, not whether the app is safe, audited or endorsed.
        There is no overall “verified app” badge, by design. Names, publishers and descriptions are self-declared.
      </p>

      <h2>Status</h2>
      <p>
        This explorer runs on Solana Devnet against OAR {OAR_RELEASE}. Mainnet is not live yet: it waits on an independent
        security review, multisig governance and operations readiness. Read the{' '}
        <a href={`${OAR_REPO_URL}/blob/${OAR_RELEASE}/docs/spec-v0.1.md`} target="_blank" rel="noopener noreferrer">specification</a> or the{' '}
        <a href={OAR_REPO_URL} target="_blank" rel="noopener noreferrer">protocol source</a>.
      </p>
      <p>
        <Link href="/">Back to search</Link>
      </p>
    </article>
  );
}
