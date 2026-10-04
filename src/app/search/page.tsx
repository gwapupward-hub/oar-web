import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SearchForm } from '@/components/SearchForm';
import { lookupAddress, searchIndex } from '@/lib/explorer';
import { classifyQuery } from '@/lib/query';

export const metadata: Metadata = { title: 'Search' };
export const maxDuration = 60;

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
    <section>
      <SearchForm defaultValue={raw} />
      <div className="results" data-kind={query.kind} data-count={results.length}>
        {query.kind === 'invalid' ? <p>{query.reason}</p> : null}
        {query.kind === 'address' ? (
          <p>No app and no OAR-linked program at <code>{query.value}</code> on Solana Devnet.</p>
        ) : null}
        {query.kind === 'domain' || query.kind === 'repository' ? (
          results.length === 0 ? (
            <p>
              No registered app on Solana Devnet claims <code>{query.value}</code>.
            </p>
          ) : (
            <>
              <p className="muted small">
                Apps whose manifest claims <code>{query.value}</code>. A claim is not proof: open an app to see its live
                checks.
              </p>
              <ul className="result-list">
                {results.map(r => (
                  <li key={r.appId} data-app-id={r.appId}>
                    <Link href={`/app/${r.appId}`}>{r.title}</Link> <span className="muted small">{r.status}</span>
                    <br />
                    <code className="small">{r.appId}</code>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : null}
      </div>
    </section>
  );
}
