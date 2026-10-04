import type { ChipView } from '@/lib/display';
import { EvidencePill } from './Pill';
import { KIND_NAME, KindIcon } from './KindIcon';

const CLUSTER_LABEL: Record<string, string> = { 'solana:mainnet': 'Mainnet', 'solana:testnet': 'Testnet', 'solana:devnet': 'Devnet' };

export function LinkCard({ chip }: { chip: ChipView }) {
  return (
    <li className={`link-card link-${chip.state}`} data-kind={chip.kind} data-state={chip.state} data-subject={chip.subject}>
      <span className={`link-icon kind-${chip.kind}`}>
        <KindIcon kind={chip.kind} />
      </span>
      <div className="link-body">
        <div className="link-top">
          <span className="link-kind">
            {KIND_NAME[chip.kind]}
            {chip.cluster && chip.cluster !== 'solana:devnet' ? <span className="tag">{CLUSTER_LABEL[chip.cluster] ?? chip.cluster}</span> : null}
          </span>
          <EvidencePill state={chip.state} kind={chip.kind} label={chip.label} />
        </div>
        <p className="link-subject">
          {chip.name ? <strong>{chip.name} </strong> : null}
          <code>{chip.display}</code>
        </p>
        <p className="link-explain">{chip.explain}</p>
        {chip.detail ? <p className="link-detail">{chip.detail}</p> : null}
        {chip.attestedBy.length ? <p className="link-detail">Attested by {chip.attestedBy.join(', ')}</p> : null}
      </div>
    </li>
  );
}
