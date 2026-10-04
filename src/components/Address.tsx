import { explorerAddressUrl } from '@/lib/site';

/** A full address as selectable text, with an outbound link to Solana Explorer. */
export function Address({ value, cluster }: { value: string; cluster: string }) {
  return (
    <span className="address">
      <code>{value}</code>{' '}
      <a href={explorerAddressUrl(value, cluster)} target="_blank" rel="noopener noreferrer" className="ext">
        Explorer<span aria-hidden="true"> ↗</span>
      </a>
    </span>
  );
}
