'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section>
      <h1>Could not finish the lookup</h1>
      <p>The Solana RPC or one of the app’s hosts did not answer in time. Nothing is shown as verified when a check fails.</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </section>
  );
}
