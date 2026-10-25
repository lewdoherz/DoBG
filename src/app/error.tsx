'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state">
      <h1>We lost our place on the shelf.</h1>
      <p>Something unexpected happened. Your saved collection is still on the server.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <a className="text-button" href="/">
        Return to collection
      </a>
    </main>
  );
}
