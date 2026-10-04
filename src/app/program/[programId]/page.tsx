import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Address } from '@/components/Address';
import { AppCard } from '@/components/AppCard';
import { StateBadge } from '@/components/StateBadge';
import { TRUSTED_ISSUERS } from '@/lib/config';
import { getProgram } from '@/lib/explorer';

export const maxDuration = 60;
type Props = { params: Promise<{ programId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await getProgram((await params).programId);
  return { title: view ? `Program of ${view.app.title}` : 'Not found' };
}

export default async function ProgramPage({ params }: Props) {
  const view = await getProgram((await params).programId);
  if (!view) notFound();
  const state = view.link?.state ?? 'unverified';
  return (
    <>
      <section className="card program-link" data-program={view.program} data-state={state}>
        <p className="eyebrow">Program</p>
        <p>
          <Address value={view.program} cluster="solana:devnet" />
        </p>
        <p>
          Its canonical <code>oar</code> backlink names the app below. <StateBadge state={state} />
        </p>
        <p className="muted small">
          {view.link
            ? state === 'verified'
              ? 'Both sides agree: the program’s upgrade authority wrote the backlink and the manifest lists this program.'
              : view.link.detail ?? 'The link is not verified.'
            : 'The app’s manifest does not list this program on Solana Devnet, so the link is one-sided.'}
        </p>
      </section>
      <AppCard app={view.app} trustedIssuers={TRUSTED_ISSUERS.length} />
    </>
  );
}
