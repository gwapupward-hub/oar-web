export function SearchForm({ defaultValue = '', autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/search" method="get" role="search" className="search">
      <label htmlFor="q" className="sr-only">
        Search the Open App Registry
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="App ID, program ID, domain or repository"
        autoComplete="off"
        spellCheck={false}
        maxLength={256}
        required
        autoFocus={autoFocus}
      />
      <button type="submit">Search</button>
    </form>
  );
}
