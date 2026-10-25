import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="empty-state">
      <h1>Nothing on this shelf.</h1>
      <p>This page doesn’t exist.</p>
      <Link href="/" className="button primary">
        Back to your collection
      </Link>
    </main>
  );
}
