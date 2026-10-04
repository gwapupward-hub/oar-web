import Link from 'next/link';
import { connection } from 'next/server';
import { SearchForm } from '@/components/SearchForm';
import { EXAMPLE_APP_ID } from '@/lib/site';

export default async function Home() {
  await connection(); // per-request rendering, so the CSP nonce applies
  return (
    <section className="hero">
      <h1>Open App Registry</h1>
      <p className="lede">Search applications across Solana</p>
      <SearchForm autoFocus />
      <p className="muted small">
        Example: <Link href={`/app/${EXAMPLE_APP_ID}`}>Open App Registry itself</Link> · names prove nothing; every link is
        checked from both sides.
      </p>
    </section>
  );
}
