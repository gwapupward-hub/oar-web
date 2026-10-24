import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { RegisterWizard } from '@/components/register/RegisterWizard';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('Register a Solana App ID | Open App Registry', 'Give an existing Solana app its OAR App ID on Devnet, then prove program, domain and source links from the side you control. Sign with your own wallet.', '/register');

export default async function RegisterPage() {
  await connection(); // per-request rendering, so the CSP nonce applies
  return (
    <div className="register-page">
      <p className="eyebrow">Devnet</p>
      <h1>Register an app</h1>
      <p className="lede">
        One wallet signature creates your App ID. Each link then becomes verified once you prove it from the side you
        already control: your site, your program&apos;s upgrade authority, your repository.
      </p>
      <ul className="assurances small">
        <li>No account, custody or OAR verification fee. A Devnet registration still uses network rent and transaction fees. Never share a seed phrase or key file.</li>
        <li>Before every signature, the page shows what the transaction does and checks that it calls only OAR registry programs.</li>
        <li>On a phone, open OAR inside Phantom or Solflare. A resume code lets you carry a prepared draft into the same connected wallet on another browser. After GitHub sign-in, reconnect your wallet and resume the saved draft.</li>
        <li>A verified domain, repository or program link proves control of that resource — not a security audit, endorsement or safety guarantee.</li>
        <li>
          Prefer the command line? The same flow is <code>oar claim</code>; see{' '}
          <a href="https://github.com/gwapupward-hub/oar/blob/main/docs/REGISTERING.md">the registration guide</a>.
        </li>
      </ul>
      <p className="small muted">Helping us improve onboarding? Try the <Link href="/beta">independent developer beta checklist</Link>; feedback is voluntary and never changes an app's verification status.</p>
      <RegisterWizard />
    </div>
  );
}
