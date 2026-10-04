import type { LinkState } from '@open-app-registry/sdk';
import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-react';
import type { AppView, ChipKind } from '@/lib/display';
import { evidenceLabel } from '@/lib/display';

const ICON = { verified: CircleCheck, attested: CircleCheck, unverified: CircleDashed, failed: CircleAlert } as const;

/** One link's evidence state. Color is never the only signal: every state has its own icon and words. */
export function EvidencePill({ state, kind = null, label }: { state: LinkState; kind?: ChipKind | null; label?: string }) {
  const Icon = ICON[state];
  const tone = state === 'verified' ? `linked-${kind ?? 'any'}` : state;
  return (
    <span className={`pill pill-${tone}`} data-state={state}>
      <Icon size={14} aria-hidden="true" />
      {label ?? evidenceLabel(kind, state)}
    </span>
  );
}

export function StatusPill({ status }: { status: AppView['status'] }) {
  return (
    <span className={`pill status-${status.toLowerCase()}`} data-field="status">
      {status === 'Active' ? <span className="live-dot" aria-hidden="true" /> : null}
      {status}
    </span>
  );
}
