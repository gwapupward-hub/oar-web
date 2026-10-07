import Link from 'next/link';
import { OAR_RELEASE, OAR_RELEASE_URL, OAR_REPO_URL } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <div>
          <p className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/oar-mark.svg" alt="" width={18} height={18} /> OAR Explorer
          </p>
          <p className="muted">Open by default. Verifiable by design.</p>
          <p className="muted small">
            OAR surfaces evidence. It does not certify that an app is safe or endorsed. Solana Devnet only; mainnet is not live.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/register">Register an app</Link>
          <Link href="/about">How it works</Link>
          <a href={OAR_REPO_URL} target="_blank" rel="noopener noreferrer">Protocol source</a>
          <a href={`${OAR_REPO_URL}/blob/${OAR_RELEASE}/docs/spec-v0.1.md`} target="_blank" rel="noopener noreferrer">Spec v0.1</a>
          <a href={OAR_RELEASE_URL} target="_blank" rel="noopener noreferrer">Release {OAR_RELEASE}</a>
          <a href={`${OAR_REPO_URL}/security`} target="_blank" rel="noopener noreferrer">Security</a>
        </nav>
      </div>
    </footer>
  );
}
