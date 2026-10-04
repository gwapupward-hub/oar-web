import { ExternalLink } from 'lucide-react';
import { explorerAddressUrl } from '@/lib/site';
import { CopyButton } from './CopyButton';

/** A full, selectable address with copy and an outbound Solana Explorer link. */
export function AddressValue({ value, cluster, label }: { value: string; cluster: string; label: string }) {
  return (
    <span className="address">
      <code>{value}</code>
      <span className="address-actions">
        <CopyButton value={value} label={label} />
        <a className="icon-button" href={explorerAddressUrl(value, cluster)} target="_blank" rel="noopener noreferrer" title="Open in Solana Explorer" aria-label={`Open ${label} in Solana Explorer`}>
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </span>
    </span>
  );
}
