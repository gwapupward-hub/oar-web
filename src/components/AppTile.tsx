import Link from 'next/link';
import type { IndexEntry } from '@/lib/explorer';
import { Avatar } from './Avatar';
import { StatusPill } from './Pill';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`;

export function AppTile({ entry }: { entry: IndexEntry }) {
  const claims = [
    entry.programs ? `${entry.programs} program${entry.programs === 1 ? '' : 's'}` : null,
    entry.domains.length ? `${entry.domains.length} domain${entry.domains.length === 1 ? '' : 's'}` : null,
    entry.repositories.length ? `${entry.repositories.length} repo${entry.repositories.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return (
    <li className="app-tile" data-app-id={entry.appId}>
      <Link href={`/app/${entry.appId}`} className="tile-link">
        <Avatar name={entry.title} size="sm" />
        <span className="tile-main">
          <span className="tile-title">
            {entry.title}
            <StatusPill status={entry.status} />
          </span>
          {entry.summary ? <span className="tile-summary">{entry.summary}</span> : null}
          <span className="tile-meta">
            <code>{short(entry.appId)}</code>
            {claims.length ? <> · claims {claims.join(', ')}</> : null}
          </span>
        </span>
      </Link>
    </li>
  );
}
