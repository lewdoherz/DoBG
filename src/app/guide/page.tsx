import Link from 'next/link';
export default function Guide() {
  return (
    <main className="guide">
      <Link className="text-button" href="/">
        ← Your collection
      </Link>
      <p className="eyebrow">A LITTLE HOUSEKEEPING</p>
      <h1>Your shelf, kept safe.</h1>
      <h2>Your collection is private</h2>
      <p>
        Every game, copy, storage location, and note belongs to your signed-in account. There are no
        public collection or sharing pages in this milestone.
      </p>
      <h2>Offline reading</h2>
      <p>
        After a successful sync, this browser keeps a private read-only snapshot. The banner shows
        when it was saved. Changes require a connection. Sign out while online to clear the
        snapshot. On shared devices, clear browser data too. Box art may be unavailable offline.
      </p>
      <h2>Take your shelf with you</h2>
      <p>
        Use Export collection to download Game Shelf JSON format v1. It includes private notes,
        storage locations, all editions/copies, and source metadata. Keep the file safe. Import
        validates the whole file and adds new games only; matching game identities or stable IDs are
        skipped, never overwritten. The limit is 5 MB / 2,000 entries. Export is a portable
        collection backup, not an account backup.
      </p>
      <h2>Install Game Shelf</h2>
      <p>
        In a supported desktop or Android browser, use the browser’s Install app action. On iPhone
        or iPad, open in Safari, tap Share, then Add to Home Screen. Installation is optional. HTTPS
        is required outside localhost. Device-specific installation has not been verified on
        physical devices.
      </p>
      <h2>Catalog availability</h2>
      <p>
        BGG search requires an approved server token, reviewed terms, and official attribution
        assets. Until configured, manual entry works without external services. BGG supports title
        search, not assumed barcode lookup. No recognition, photos, public sharing, or invitations
        are implemented yet.
      </p>
      <h2>Account safety</h2>
      <p>
        Use a unique password of at least 10 characters. Email verification and automated recovery
        are not configured. Administrators should close registration after creating the intended
        accounts and configure backups before deployment.
      </p>
      <p className="muted">
        See repository README.md and docs/PROJECT.md for setup, migrations, deployment, and
        operational handoff.
      </p>
    </main>
  );
}
