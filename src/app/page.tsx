import Link from 'next/link';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { ArrowRight, Box, FolderGit2, Globe, Link2, Radio, Stamp } from 'lucide-react';
import { AppTile } from '@/components/AppTile';
import { SearchForm } from '@/components/SearchForm';
import { listApps } from '@/lib/explorer';
import { EXAMPLE_APP_ID } from '@/lib/site';

export const maxDuration = 60;

const EXAMPLES = [
  { label: 'Open App Registry', q: EXAMPLE_APP_ID, Icon: Stamp },
  { label: 'OAR registry program', q: 'oariw8YXcYJh9sa9VcmBU3ZCdo2WVGMYPsLjEuUxfrC', Icon: Box },
  { label: 'github.com/gwapupward-hub/oar', q: 'https://github.com/gwapupward-hub/oar', Icon: FolderGit2 },
];

export default async function Home() {
  await connection(); // per-request rendering, so the CSP nonce applies
  return (
    <>
      <section className="hero">
        <p className="eyebrow">
          <span className="live-dot" aria-hidden="true" /> OAR Explorer · Solana Devnet
        </p>
        <h1>
          Open by default.
          <br />
          <span className="gradient-text">Verifiable by design.</span>
        </h1>
        <p className="lede">
          Look up any app, program, domain or repository in the Open App Registry. Names prove nothing on their own, so every
          link is checked live, from both sides.
        </p>
        <SearchForm size="lg" autoFocus />
        <div className="examples" aria-label="Example searches">
          <span className="muted small">Try</span>
          {EXAMPLES.map(({ label, q, Icon }) => (
            <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="example">
              <Icon size={14} aria-hidden="true" /> {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="steps" aria-label="How evidence works">
        <div className="step">
          <span className="step-icon"><Stamp size={20} aria-hidden="true" /></span>
          <h2>Registered onchain</h2>
          <p>Each app has an App ID. Its onchain record pins the exact hash of a public manifest.</p>
        </div>
        <div className="step">
          <span className="step-icon"><Link2 size={20} aria-hidden="true" /></span>
          <h2>Linked from both sides</h2>
          <p>Programs, domains and repositories must point back to the same App ID: a backlink, a proof file or DNS.</p>
        </div>
        <div className="step">
          <span className="step-icon"><Radio size={20} aria-hidden="true" /></span>
          <h2>Checked live</h2>
          <p>Each link gets its own state, checked when you look. There is no single badge to fake.</p>
        </div>
      </section>

      <section className="registered" aria-labelledby="registered-title">
        <div className="section-head">
          <h2 id="registered-title">Registered on devnet</h2>
          <Link href="/about" className="small">
            What the states mean <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <Suspense fallback={<TileSkeleton />}>
          <RegisteredApps />
        </Suspense>
      </section>
    </>
  );
}

async function RegisteredApps() {
  let apps;
  try {
    apps = await listApps();
  } catch {
    return <p className="callout">The registry could not be read right now. Search still works by App ID or program ID.</p>;
  }
  if (!apps.length) return <p className="muted">No apps with a valid manifest are registered on devnet yet.</p>;
  return (
    <>
      <p className="muted small">
        {apps.length} {apps.length === 1 ? 'app has' : 'apps have'} a valid manifest. These are claims until you open an app and
        its links are checked.
      </p>
      <ul className="tiles">
        {apps.slice(0, 12).map(a => <AppTile key={a.appId} entry={a} />)}
      </ul>
    </>
  );
}

function TileSkeleton() {
  return (
    <ul className="tiles" aria-busy="true" aria-label="Loading registered apps">
      {[0, 1, 2].map(i => <li key={i} className="app-tile skeleton" />)}
    </ul>
  );
}
