import type { Metadata } from 'next';
import Link from 'next/link';
import { CLUSTER_OPTIONS, OAR_RELEASE, OAR_RELEASE_URL, OAR_REPO_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'OAR Explorer — Devnet', template: '%s · OAR Explorer' },
  description: 'Read-only explorer for the Open App Registry: onchain application identity for Solana.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-head">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">OAR</span> Explorer
          </Link>
          <nav aria-label="Cluster" className="clusters">
            {CLUSTER_OPTIONS.map(c =>
              c.enabled ? (
                <span key={c.id} className="cluster cluster-active" aria-current="true">
                  {c.label}
                </span>
              ) : (
                <span key={c.id} className="cluster cluster-disabled" title={c.note}>
                  {c.label}
                </span>
              ),
            )}
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-foot">
          Read-only · built on{' '}
          <a href={OAR_RELEASE_URL} target="_blank" rel="noopener noreferrer">OAR {OAR_RELEASE}</a> ·{' '}
          <a href={OAR_REPO_URL} target="_blank" rel="noopener noreferrer">protocol source</a> · mainnet is not live yet
        </footer>
      </body>
    </html>
  );
}
