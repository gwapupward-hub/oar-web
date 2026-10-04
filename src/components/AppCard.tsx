import type { AppView, ChipView } from '@/lib/display';
import { OAR_RELEASE, SAS_REHEARSAL_EVIDENCE_URL } from '@/lib/site';
import { Address } from './Address';
import { StateBadge } from './StateBadge';

const CLUSTER_LABEL: Record<string, string> = { 'solana:devnet': 'Solana Devnet', 'solana:mainnet': 'Solana Mainnet', 'solana:testnet': 'Solana Testnet' };
const SECTION: Record<ChipView['kind'], string> = { program: 'Programs', domain: 'Domains', repository: 'Repositories' };

function Chip({ chip }: { chip: ChipView }) {
  return (
    <li className="chip" data-kind={chip.kind} data-state={chip.state} data-subject={chip.subject}>
      <div className="chip-main">
        <span className="chip-subject">
          {chip.name ? <span className="chip-name">{chip.name} </span> : null}
          <code>{chip.display}</code>
          {chip.cluster && chip.cluster !== 'solana:devnet' ? <span className="muted"> on {CLUSTER_LABEL[chip.cluster] ?? chip.cluster}</span> : null}
        </span>
        <StateBadge state={chip.state} />
      </div>
      {chip.how || chip.detail ? (
        <p className="chip-note">
          {chip.how ? <>via {chip.how}</> : null}
          {chip.how && chip.detail ? ' · ' : null}
          {chip.detail}
        </p>
      ) : null}
      {chip.attestedBy.length ? <p className="chip-note">Attested by {chip.attestedBy.join(', ')}</p> : null}
    </li>
  );
}

export function AppCard({ app, trustedIssuers }: { app: AppView; trustedIssuers: number }) {
  const kinds = (['program', 'domain', 'repository'] as const).filter(k => app.chips.some(c => c.kind === k));
  return (
    <article className="card" data-app-id={app.appId} data-status={app.status}>
      <header className="card-head">
        <p className="eyebrow">App</p>
        <h1>
          {app.unverified ? <span className="prefix">Unverified </span> : null}
          {app.title}
          {app.status === 'Deprecated' || app.status === 'Retired' ? <span className={`status status-${app.status.toLowerCase()}`}>{app.status}</span> : null}
        </h1>
        {app.summary ? <p className="summary">{app.summary}</p> : null}
      </header>

      <dl className="facts">
        <dt>App ID</dt>
        <dd><Address value={app.appId} cluster={app.cluster} /></dd>
        <dt>Status</dt>
        <dd data-field="status">{app.status.toUpperCase()}</dd>
        <dt>Cluster</dt>
        <dd>{CLUSTER_LABEL[app.cluster] ?? app.cluster}</dd>
        <dt>Manifest</dt>
        <dd data-field="manifest" data-ok={app.manifest.ok}>
          {app.manifest.ok ? (
            <StateBadge state="verified" />
          ) : (
            <>
              <StateBadge state="failed" /> <span>{app.manifest.reason}</span>
            </>
          )}
          <p className="muted small">
            <code className="wrap">{app.manifestUri}</code>
            <br />
            SHA-256 <code>{app.manifestSha256}</code> · revision {app.revision}
          </p>
        </dd>
        {app.publisher ? (
          <>
            <dt>Publisher</dt>
            <dd>{app.publisher} <span className="muted small">(self-declared)</span></dd>
          </>
        ) : null}
        {app.categories.length ? (
          <>
            <dt>Categories</dt>
            <dd>{app.categories.join(', ')}</dd>
          </>
        ) : null}
        <dt>Authority</dt>
        <dd>
          <Address value={app.authority} cluster={app.cluster} />
          <p className="muted small">{app.authorityNote}</p>
          {app.pendingAuthority ? <p className="muted small">Transfer proposed to <code>{app.pendingAuthority}</code></p> : null}
        </dd>
      </dl>

      {app.status === 'Retired' ? (
        <p className="notice">This app is retired. Its record is frozen and no links are shown.</p>
      ) : !app.manifest.ok ? (
        <p className="notice">Metadata unavailable: no links can be checked until the manifest is valid.</p>
      ) : (
        <section aria-labelledby="links">
          <h2 id="links">Links</h2>
          <p className="muted small">Each link is checked from both sides. There is no overall “verified” badge.</p>
          {kinds.length === 0 ? <p className="muted">The manifest claims no programs, domains or repositories.</p> : null}
          {kinds.map(kind => (
            <div key={kind}>
              <h3>{SECTION[kind]}</h3>
              <ul className="chips">
                {app.chips.filter(c => c.kind === kind).map(c => <Chip key={`${c.kind}:${c.cluster ?? ''}:${c.subject}`} chip={c} />)}
              </ul>
            </div>
          ))}
          <h3>SAS evidence</h3>
          <p className="muted small" data-field="sas">
            {trustedIssuers === 0
              ? 'No attestation issuer is trusted by this explorer, so links are shown from live checks only. '
              : `Attestations from ${trustedIssuers} trusted issuer${trustedIssuers === 1 ? '' : 's'} are included above. `}
            <a href={SAS_REHEARSAL_EVIDENCE_URL} target="_blank" rel="noopener noreferrer">
              View the devnet SAS rehearsal evidence ({OAR_RELEASE})<span aria-hidden="true"> ↗</span>
            </a>
          </p>
        </section>
      )}
    </article>
  );
}
