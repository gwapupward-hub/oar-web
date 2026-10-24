import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('OAR Independent Developer Beta | Open App Registry', 'Try free, neutral Solana app identity registration and report onboarding friction without exposing any wallet secrets.', '/beta');

export default function BetaPage() {
  return (
    <div className="register-page">
      <p className="eyebrow">Open beta checklist · Devnet</p>
      <h1>Try OAR from outside GWAP</h1>
      <p className="lede">We are testing whether any Solana team can publish an independently verifiable App ID without special GWAP access. You keep your keys, repository approval and signing authority.</p>
      <section className="card">
        <h2>A six-step independent walkthrough</h2>
        <ol className="mobile-setup">
          <li>Use your own public repository or domain and a wallet that supports Solana Devnet. No GWAP profile is needed.</li>
          <li>Open <Link href="/register">registration</Link>, connect the wallet and prepare your App ID.</li>
          <li>Publish the manifest and any claimed control proofs. The guided GitHub PR is optional; manual publishing always works.</li>
          <li>Open each proof link and read its status. A pending proof must not appear verified.</li>
          <li>If comfortable, personally approve your wallet's OAR-only Devnet registration transaction. Never send OAR your key file or seed phrase.</li>
          <li>Reopen the explorer. Check which evidence passed and which remains pending. A valid identity proof is not an audit.</li>
        </ol>
      </section>
      <section className="card">
        <h2>What to tell us</h2>
        <p>Time to reach each step, iPhone or Android browser, wallet type, confusing wording, failed file publication, and any problem recovering a draft. Include public error text or a public demo link only if you want.</p>
        <p><strong>Never include:</strong> seed phrases, keys, GitHub access tokens, private company data or signed-but-unsubmitted transactions.</p>
        <a className="button button-secondary" target="_blank" rel="noopener noreferrer" href="https://github.com/gwapupward-hub/oar-web/issues/new?template=oar-beta.yml">Submit voluntary beta feedback</a>
      </section>
      <p className="small muted">No paid placement. The beta uses exactly the same verification rules as any other OAR application. Human device testing is still ongoing; this checklist is an invitation, not evidence that all beta cases passed.</p>
    </div>
  );
}
