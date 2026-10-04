import { SearchForm } from '@/components/SearchForm';

export default function NotFound() {
  return (
    <section>
      <h1>Nothing registered here</h1>
      <p>There is no valid OAR record or OAR-linked program at that address on Solana Devnet.</p>
      <SearchForm />
    </section>
  );
}
