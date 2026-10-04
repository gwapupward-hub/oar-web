import type { LinkState } from '@open-app-registry/sdk';
import { STATE_LABEL } from '@/lib/display';

const MARK: Record<LinkState, string> = { verified: '✓', attested: '✓', unverified: '–', failed: '!' };

export function StateBadge({ state }: { state: LinkState }) {
  return (
    <span className={`state state-${state}`} data-state={state}>
      <span aria-hidden="true">{MARK[state]}</span> {STATE_LABEL[state]}
    </span>
  );
}
