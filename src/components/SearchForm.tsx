import { Search } from 'lucide-react';

export function SearchForm({ defaultValue = '', autoFocus = false, size = 'md' }: { defaultValue?: string; autoFocus?: boolean; size?: 'md' | 'lg' }) {
  return (
    <form action="/search" method="get" role="search" className={`search search-${size}`}>
      <label htmlFor="q" className="sr-only">
        Search the Open App Registry
      </label>
      <Search className="search-icon" aria-hidden="true" size={size === 'lg' ? 22 : 18} />
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="App ID, program ID, domain or GitHub repo"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={256}
        required
        autoFocus={autoFocus}
      />
      <button type="submit">Search</button>
    </form>
  );
}
