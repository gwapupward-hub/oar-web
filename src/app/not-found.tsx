import { SearchForm } from '@/components/SearchForm';

export default function NotFound() {
  return (
    <section className="empty center">
      <p className="eyebrow">404</p>
      <h1>Nothing registered here</h1>
      <p className="muted">There is no valid OAR record, and no OAR-linked program, at that address on Solana Devnet.</p>
      <SearchForm />
    </section>
  );
}
