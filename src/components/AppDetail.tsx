import { Info } from 'lucide-react';
import type { AppView, ChipView } from '@/lib/display';
import { OAR_RELEASE, SAS_REHEARSAL_EVIDENCE_URL } from '@/lib/site';
import { Avatar } from './Avatar';
import { EvidenceSummary } from './EvidenceSummary';
import { LinkCard } from './LinkCard';
import { StatusPill } from './Pill';
import { RecordPanel } from './RecordPanel';

const SECTIONS: { kind: ChipView['kind']; title: string }[] = [
  { kind: 'program', title: 'Programs' },
  { kind: 'domain', title: 'Domains' },
  { kind: 'repository', title: 'Repositories' },
];

export function AppDetail({ app, trustedIssuers }: { app: AppView; trustedIssuers: number }) {
  return (
    <article className="app-detail" data-app-id={app.appId} data-status={app.status} data-unverified={app.unverified}>
      <header className="card app-hero">
        <Avatar name={app.manifest.ok ? app.title : '?'} />
        <div className="app-hero-main">
          <p className="eyebrow">App</p>
          <div className="title-row">
            <h1>
              {app.unverified ? <span className="prefix">Unverified </span> : null}
              {app.title}
            </h1>
            <StatusPill status={app.status} />
          </div>
          {app.summary ? <p className="summary">{app.summary}</p> : null}
          {app.categories.length || app.publisher ? (
            <p className="tags">
              {app.categories.map(c => <span key={c} className="tag">{c}</span>)}
              {app.publisher ? <span className="tag tag-quiet">by {app.publisher} (self-declared)</span> : null}
            </p>
          ) : null}
          {app.unverified ? (
            <p className="callout warn small">
              No program or domain link is proven yet, so this name is only a claim. Check the App ID before trusting it.
            </p>
          ) : null}
        </div>
      </header>

      <div className="detail-grid">
        <section className="card" aria-labelledby="links-title">
          <h2 id="links-title">Link evidence</h2>
          {app.status === 'Retired' ? (
            <p className="callout">This app is retired. Its record is frozen, and its links are no longer shown.</p>
          ) : !app.manifest.ok ? (
            <p className="callout warn">Metadata unavailable: no links can be checked until the manifest is valid.</p>
          ) : app.chips.length === 0 ? (
            <p className="muted">The manifest claims no programs, domains or repositories.</p>
          ) : (
            <>
              <EvidenceSummary app={app} />
              {SECTIONS.filter(s => app.chips.some(c => c.kind === s.kind)).map(s => (
                <div key={s.kind} className="link-group">
                  <h3>{s.title}</h3>
                  <ul className="link-list">
                    {app.chips.filter(c => c.kind === s.kind).map(c => <LinkCard key={`${c.kind}:${c.cluster ?? ''}:${c.subject}`} chip={c} />)}
                  </ul>
                </div>
              ))}
            </>
          )}
          <div className="sas" data-field="sas">
            <h3>SAS attestations</h3>
            <p className="small muted">
              {trustedIssuers === 0
                ? 'This explorer trusts no attestation issuer yet, so every state above comes from a live check. '
                : `Attestations from ${trustedIssuers} trusted issuer${trustedIssuers === 1 ? '' : 's'} are included above. `}
              <a href={SAS_REHEARSAL_EVIDENCE_URL} target="_blank" rel="noopener noreferrer">
                Devnet SAS rehearsal evidence ({OAR_RELEASE}) ↗
              </a>
            </p>
          </div>
        </section>
        <RecordPanel app={app} />
      </div>

      <p className="disclaimer small">
        <Info size={14} aria-hidden="true" /> Each link is proven separately, from both sides. OAR surfaces evidence; it does not certify that an app is safe or endorsed.
      </p>
    </article>
  );
}
