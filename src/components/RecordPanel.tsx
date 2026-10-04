import type { AppView } from '@/lib/display';
import { AddressValue } from './AddressValue';
import { CopyButton } from './CopyButton';
import { EvidencePill } from './Pill';

const CLUSTER_LABEL: Record<string, string> = { 'solana:devnet': 'Solana Devnet', 'solana:mainnet': 'Solana Mainnet', 'solana:testnet': 'Solana Testnet' };

export function RecordPanel({ app }: { app: AppView }) {
  return (
    <section className="card record" aria-labelledby="record-title">
      <h2 id="record-title">Onchain record</h2>
      <dl className="record-list">
        <div>
          <dt>App ID</dt>
          <dd><AddressValue value={app.appId} cluster={app.cluster} label="App ID" /></dd>
        </div>
        <div>
          <dt>Cluster</dt>
          <dd>{CLUSTER_LABEL[app.cluster] ?? app.cluster}</dd>
        </div>
        <div>
          <dt>Manifest</dt>
          <dd data-field="manifest" data-ok={app.manifest.ok}>
            {app.manifest.ok ? (
              <>
                <EvidencePill state="verified" label="Published" />
                <span className="muted small"> hash matches the record</span>
              </>
            ) : (
              <>
                <EvidencePill state="failed" label="Invalid" />
                <span className="small"> {app.manifest.reason}</span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Manifest URI</dt>
          <dd className="mono-row">
            <code className="wrap">{app.manifestUri}</code>
            <CopyButton value={app.manifestUri} label="manifest URI" />
          </dd>
        </div>
        <div>
          <dt>Manifest SHA-256</dt>
          <dd className="mono-row">
            <code className="wrap">{app.manifestSha256}</code>
            <CopyButton value={app.manifestSha256} label="manifest hash" />
          </dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd>
            {app.revision} <span className="muted small">· created at slot {app.createdSlot}, updated at slot {app.updatedSlot}</span>
          </dd>
        </div>
        <div>
          <dt>Authority</dt>
          <dd>
            <AddressValue value={app.authority} cluster={app.cluster} label="authority" />
            <p className="note">{app.authorityNote}</p>
            {app.pendingAuthority ? <p className="note">Transfer proposed to <code>{app.pendingAuthority}</code></p> : null}
          </dd>
        </div>
        <div>
          <dt>Creator</dt>
          <dd><AddressValue value={app.creator} cluster={app.cluster} label="creator" /></dd>
        </div>
      </dl>
    </section>
  );
}
