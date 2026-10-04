'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="empty center">
      <p className="eyebrow">Lookup interrupted</p>
      <h1>Could not finish the checks</h1>
      <p className="muted">
        The Solana RPC or one of the app’s hosts did not answer in time. Nothing is shown as linked when a check cannot finish.
      </p>
      <button type="button" className="button" onClick={() => reset()}>
        Try again
      </button>
    </section>
  );
}
