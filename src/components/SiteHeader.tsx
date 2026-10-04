import Link from 'next/link';
import { CLUSTER_OPTIONS } from '@/lib/site';
import { Logo } from './Logo';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-row">
        <Logo />
        <nav className="header-nav" aria-label="Main">
          <Link href="/about">How it works</Link>
          <div className="cluster-switch" role="group" aria-label="Cluster">
            {CLUSTER_OPTIONS.map(c =>
              c.enabled ? (
                <span key={c.id} className="cluster on" aria-current="true">
                  <span className="live-dot" aria-hidden="true" />
                  {c.label}
                </span>
              ) : (
                <span key={c.id} className="cluster off" title={`${c.label}: ${c.note}`} aria-disabled="true">
                  {c.label}
                </span>
              ),
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
