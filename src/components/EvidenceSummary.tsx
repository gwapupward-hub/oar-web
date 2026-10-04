import type { AppView } from '@/lib/display';

const ORDER = [
  ['verified', 'linked'],
  ['attested', 'attested'],
  ['unverified', 'unverified'],
  ['failed', 'disputed'],
] as const;

/** At-a-glance counts of link evidence. Deliberately not a score and not a single badge. */
export function EvidenceSummary({ app }: { app: AppView }) {
  const total = app.chips.length;
  if (!total) return null;
  const counts = ORDER.map(([state, word]) => ({ state, word, n: app.chips.filter(c => c.state === state).length }));
  return (
    <div className="evidence-summary" aria-label="Link evidence summary">
      {/* One equal segment per link: the CSP forbids inline style attributes, so no computed widths. */}
      <div className="evidence-bar" aria-hidden="true">
        {counts.flatMap(c => Array.from({ length: c.n }, (_, i) => <span key={`${c.state}-${i}`} className={`seg seg-${c.state}`} />))}
      </div>
      <p className="small">
        <strong>{total}</strong> {total === 1 ? 'link' : 'links'} claimed:{' '}
        {counts.filter(c => c.n).map((c, i, all) => (
          <span key={c.state} className={`count count-${c.state}`}>
            {c.n} {c.word}
            {i < all.length - 1 ? ' · ' : ''}
          </span>
        ))}
      </p>
    </div>
  );
}
