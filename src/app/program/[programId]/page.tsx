import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftRight, ArrowRight, Box, CircleCheck, CircleDashed } from 'lucide-react';
import { AddressValue } from '@/components/AddressValue';
import { AppDetail } from '@/components/AppDetail';
import { Avatar } from '@/components/Avatar';
import { EvidencePill } from '@/components/Pill';
import { TRUSTED_ISSUERS } from '@/lib/config';
import { getProgram } from '@/lib/explorer';

export const maxDuration = 60;
type Props = { params: Promise<{ programId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await getProgram((await params).programId);
  return { title: view ? `Program of ${view.app.title}` : 'Not found' };
}

function Direction({ ok, title, body }: { ok: boolean; title: string; body: string }) {
  return (
    <li className={ok ? 'dir ok' : 'dir'}>
      {ok ? <CircleCheck size={18} aria-hidden="true" /> : <CircleDashed size={18} aria-hidden="true" />}
      <div>
        <strong>{title}</strong>
        <p className="small muted">{body}</p>
      </div>
    </li>
  );
}

export default async function ProgramPage({ params }: Props) {
  const view = await getProgram((await params).programId);
  if (!view) notFound();
  const state = view.link?.state ?? 'unverified';
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Explorer</Link> <span aria-hidden="true">/</span> <span>Program</span>
      </nav>
      <section className="card program-link" data-program={view.program} data-state={state}>
        <div className="title-row">
          <h1>Program link</h1>
          <EvidencePill state={state} kind="program" />
        </div>
        <div className="link-diagram">
          <div className="node">
            <span className="link-icon kind-program"><Box size={18} aria-hidden="true" /></span>
            <div>
              <p className="eyebrow">Program{view.link?.name ? ` · ${view.link.name}` : ''}</p>
              <AddressValue value={view.program} cluster="solana:devnet" label="program ID" />
            </div>
          </div>
          <span className="diagram-arrow" aria-hidden="true"><ArrowLeftRight size={20} /></span>
          <Link href={`/app/${view.app.appId}`} className="node node-link">
            <Avatar name={view.app.title} size="sm" />
            <div>
              <p className="eyebrow">App</p>
              <strong>{view.app.unverified ? 'Unverified ' : ''}{view.app.title}</strong>
            </div>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <ul className="directions">
          <Direction
            ok
            title="Program → App"
            body="The program’s canonical oar backlink in Program Metadata names this App ID. Only the program’s upgrade authority can write it."
          />
          <Direction
            ok={view.link !== null}
            title="App → Program"
            body={view.link ? 'The app’s manifest lists this program on Solana Devnet.' : 'The app’s manifest does not list this program on Solana Devnet, so the link is one-sided.'}
          />
        </ul>
        {view.link?.detail ? <p className="link-detail">{view.link.detail}</p> : null}
      </section>
      <AppDetail app={view.app} trustedIssuers={TRUSTED_ISSUERS.length} />
    </>
  );
}
