import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { RegisterWizard } from '@/components/register/RegisterWizard';

export const metadata: Metadata = {
  title: 'Register an app',
  description: 'Give an existing Solana app its App ID on devnet, then prove each link from the side you control.',
};

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
        <li>No account and no custody. Transactions are signed in your wallet, and this site never asks for a seed phrase or key file.</li>
        <li>Before every signature, the page shows what the transaction does and checks that it calls only OAR registry programs.</li>
        <li>On a phone, the Connect step opens this page inside your wallet app (Phantom or Solflare), where the wallet is available.</li>
        <li>
          Prefer the command line? The same flow is <code>oar claim</code>; see{' '}
          <a href="https://github.com/gwapupward-hub/oar/blob/main/docs/REGISTERING.md">the registration guide</a>.
        </li>
      </ul>
      <RegisterWizard />
    </div>
  );
}
