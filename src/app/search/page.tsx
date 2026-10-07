import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppTile } from '@/components/AppTile';
import { SearchForm } from '@/components/SearchForm';
import { lookupAddress, searchIndex } from '@/lib/explorer';
import { classifyQuery } from '@/lib/query';
import { EXAMPLE_APP_ID } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('Search Solana Apps and Link Evidence | OAR', 'Look up an App ID, program ID, domain or GitHub repository in Open App Registry on Solana Devnet.', '/search', false);
export const maxDuration = 60;

const KIND_LABEL = { address: 'Address', domain: 'Domain', repository: 'Repository', invalid: 'Query' } as const;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const raw = (Array.isArray(q) ? q[0] : q) ?? '';
  const query = classifyQuery(raw);

  if (query.kind === 'address') {
    const found = await lookupAddress(query.value);
    if (found === 'app') redirect(`/app/${query.value}`);
    if (found === 'program') redirect(`/program/${query.value}`);
  }
  const results = query.kind === 'domain' || query.kind === 'repository' ? await searchIndex(query) : [];

  return (
    <section className="search-page">
      <SearchForm defaultValue={raw} />
      <div className="results" data-kind={query.kind} data-count={results.length}>
        {query.kind !== 'invalid' ? (
          <p className="results-head">
            <span className="tag">{KIND_LABEL[query.kind]}</span> <code>{query.value}</code>
          </p>
        ) : null}

        {query.kind === 'invalid' ? (
          <Empty title="That doesn’t look searchable" body={query.reason} />
        ) : query.kind === 'address' ? (
          <Empty
            title="Nothing registered at this address"
            body="It is not an App ID, and no program at this address has an OAR backlink on Solana Devnet."
          />
        ) : results.length === 0 ? (
          <Empty
            title={`No app claims this ${query.kind}`}
            body={`No registered app on Solana Devnet lists ${query.value} in its manifest.`}
          />
        ) : (
          <>
            <p className="muted small">
              {results.length} {results.length === 1 ? 'app claims' : 'apps claim'} this {query.kind}. A claim is not proof: open an app to see its live checks.
            </p>
            <ul className="tiles">{results.map(r => <AppTile key={r.appId} entry={r} />)}</ul>
          </>
        )}
      </div>
    </section>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <h1>{title}</h1>
      <p className="muted">{body}</p>
      <p className="small">
        Try an App ID such as <Link href={`/app/${EXAMPLE_APP_ID}`}>Open App Registry</Link>, a program ID, a domain, or a GitHub repository URL.
      </p>
    </div>
  );
}
