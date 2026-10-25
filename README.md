# Game Shelf

A warm, private library for physical board games. Milestone 1: accounts, custom games, authorized catalog search, editions and copies, owned/wishlist, play-fit filters, grid/list, portable import/export, installable PWA, and read-only offline snapshots. No sample collection is seeded. Photo recognition, codes, public sharing, WeChat integration, and invitations are deliberately not implemented yet.

## Run locally

Requires Node 22.13+ and npm. No Docker, database account, BGG token, or object store is needed for manual collection management.

```sh
npm ci
# Copy .env.example to .env.local using your editor or OS.
# Set BETTER_AUTH_SECRET to a random 32+ character value.
npm run dev
```

Open http://localhost:3000, create an account, choose Add a game → Add manually. The local server automatically creates and migrates `.data/postgres`. Use **one process only** with PGlite; do not run migration scripts or another app against the same local directory while the server is running. Multiple browsers/devices can connect to that one server. For another device, use a reachable HTTPS origin and set `BETTER_AUTH_URL` to that exact origin; localhost on a phone refers to the phone, not the PC. Ordinary browser access does not require installation.

Next.js loads `.env.local`; CLI scripts use shell environment variables (or run `node --env-file=.env.local --import tsx scripts/migrate.ts`). Never commit real secrets. The fallback auth secret is local-development-only. Production refuses to start the database/auth path without PostgreSQL and a secret. Create intended users, then set `DISABLE_SIGNUP=true` and restart. Email verification/delivery and self-service recovery are not configured; use a password manager. This is a private-library deployment, not a public sign-up service with abuse/email infrastructure.

## Review and checks

```sh
npm run typecheck
npm test
# While the app is running with registration enabled, against a disposable local database:
npm run smoke
npm run build
```

`smoke` drives real HTTP authentication and collection routes, creates uniquely named `smoke-*@example.test` accounts, and removes their collection entries on success. It checks isolation, CSRF, persistence, duplicates including concurrent adds, separate copy editions, full import validation, round-trip/idempotent import, unavailable providers, a second login session, deletion, and sign-out. It leaves empty test accounts; do not run it on a personal production database. Provider tests use XML fixtures and controlled failure responses, explicitly not live BGG access. Physical-device tests are separate from Chromium viewport emulation. Detailed observed results live in `docs/VERIFICATION.md`.

## Data and import/export

See [docs/FORMAT.md](docs/FORMAT.md) for Game Shelf JSON v1. Export includes private data. Import is bounded to 5 MB/2,000 entries, validates the entire file, and runs one transaction. It merges new games only, skipping matching stable IDs or normalized identities; it **never silently overwrites existing games**. Use edit to change an existing entry. No CSV or BGG collection import is implied.

Canonical game, edition, collection entry, and physical copy are separate tables. Games are account-scoped, so a custom-game edit cannot affect another user. A game's provider ID/source snapshot is separate from editable metadata and personal notes. A copy points to its own edition and storage location. One collection entry per account/game; use Add a copy rather than another entry. Manual identity is NFKC-normalized, case-folded title, not fuzzy recognition; distinct custom games with identical names need a disambiguating title. Alias matching supports English and Chinese substrings; it does not promise transliteration, translation, or complete BGG Chinese-title coverage.

## BGG access, terms, and costs

Official references checked during implementation:

- [Using the XML API](https://boardgamegeek.com/using_the_xml_api): register an application and obtain an authorization token; server requests use `Authorization: Bearer …`.
- [XML API terms](https://boardgamegeek.com/xmlapi/termsofuse) and [commercial use](https://boardgamegeek.com/wiki/page/BGG_XML_API_Commercial_Use): standard license is non-commercial; attribute BoardGameGeek by name, and public-facing applications must show the official **Powered by BGG** logo linking back. Commercial use needs explicit authorization.
- [XML API2](https://boardgamegeek.com/wiki/page/BGG_XML_API2): title search and thing details. No assumed barcode lookup.

Direct automated reads of BGG's access/terms pages returned HTTP 403. Indexed official pages supplied the requirements above. **The operator must review the full current terms and approval conditions before enabling or publicly releasing the integration.** No BGG credentials, approval, copyrighted covers, or official logo asset are supplied. BGG access and costs/conditions may change; no price or commercial permission is assumed.

Enable only after approval: set `BGG_API_TOKEN`, `BGG_INTEGRATION_APPROVED=true`, and `BGG_ATTRIBUTION_LOGO_URL` to the official approved HTTPS logo asset. All are server settings; only the logo URL is sent to the browser. Local assets do not include a fabricated BGG logo. Search/detail routes require a session and a 12-request/account/minute quota. Responses cache in PostgreSQL for 24 hours; failed upstream calls can use a labelled stale response for up to seven days. Requests have a 10-second attempt timeout, at most three attempts, conservative five-second spacing per server process, and bounded Retry-After handling. Authorization failures are not retried. Run one backend instance initially; spacing is per process, not a distributed global BGG limiter. Expired cache rows can be periodically purged: `DELETE FROM provider_cache WHERE expires_at < now() - interval '7 days';`.

Metadata search never returns local fixtures as live results. When unavailable, manual entry stays usable. Box art is displayed only from supplied HTTPS URLs, with no-referrer and no server-side URL fetching. Only use images you have permission to display. Unknown edition/language/publisher data stays unknown. No image storage, upload, recognition, or recognition-provider charges exist in M1.

## Deploy on the existing Oracle VM

Production is live at **https://bg.lewsherz.org**, using the existing Oracle ARM64 VM, an isolated PostgreSQL container, and a dedicated Cloudflare Tunnel. No new Oracle instance or public database/app port is needed; existing Nginx sites remain untouched. Public registration is enabled at the owner's request; each account has its own private collection. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for owner access, the release command, private credential locations, account provisioning, daily backup/restore, rollback, and hostname-scoped HTTPS routing.

## Alternative managed deployment: Node + PostgreSQL

A paid Render Node web service and managed PostgreSQL in the same region is an alternative, not a requirement for the Oracle deployment. Any conventional Node/container host plus PostgreSQL also works. Avoid an expiring free database for your real collection.

1. Provision PostgreSQL, enable managed backups, obtain its internal TLS connection URL. Configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL=https://your-host` as secret environment variables. Use the database provider's verified TLS settings; do not disable certificate verification.
2. Build command: `npm ci && npm run build`. Pre-deploy/release command: `npm run db:migrate` with runtime database variables. Start: `npm start`. The standard Node deployment retains migrations and script dependencies. `PORT` is respected by Next.
3. Keep one web instance initially. Set HTTPS/TLS at the host/reverse proxy, preserve correct origin/host, limit request bodies to 5 MB, redact cookies/auth headers, and configure rate limiting at the edge if registration is internet-facing.
4. Create the intended accounts, set `DISABLE_SIGNUP=true`, restart. Verify a second browser can sign in and access the same account; another account must see no entries.
5. Check `/`, `/manifest.webmanifest`, auth, manual add/edit, import/export, and sign-out in the deployed environment. Do not enable BGG until its authorization gate is satisfied.

A Dockerfile is included for the standard `next start` Node runtime, matching `npm start` locally. Run migrations **from a checkout with dependencies or the Docker build stage**, not the production-only runtime image: `npm run db:migrate`. For a release image: `docker build --target build -t game-shelf-release .`, then run that image with the database secret and command `npm run db:migrate`. Deploy the final runtime image with `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `PORT=3000`. It includes SQL migrations but does not mutate the production schema automatically. The Oracle ARM64 Docker/PostgreSQL deployment was exercised on the actual server; the alternative managed-host deployment was not.

Budget reference: [Render's official July 2026 cost example](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses) puts Starter web + Basic-256mb PostgreSQL at approximately **US$13/month**, before storage/bandwidth growth. [Current pricing](https://render.com/pricing) lists Starter web at $7/month; database storage and egress are separate. Allow roughly $15–25/month for a small private deployment plus a domain if desired; this is a planning allowance, not a quote or measured bill. More RAM may be needed for builds. No object storage, Redis, worker, recognition subscription, or email provider is required for M1. Add private S3-compatible storage with explicit retention policy only in M2.

## Migrations

`migrations/NNN_description.sql` files run in sorted order inside a transaction, with a table lock, SHA-256 checksums, and a `game_shelf_migrations` ledger. Never edit an applied migration; add a new numbered file and update `src/lib/schema.ts`. Run `npm run db:migrate` during release before serving new code. Local initialization applies unapplied migrations automatically. Migration script closes its database connection. Back up before a schema change; use a forward fix or restore a tested backup, not an unreviewed down migration.

## Backup and restore

**Production backup plan:** Oracle currently has daily private local dumps and a tested disposable-database restoration; encrypted offsite copies and point-in-time recovery are not configured. Local dumps do not protect against VM/disk loss. Add encrypted offsite PostgreSQL dumps and provider-managed recovery where available. Example with PostgreSQL client tools (not bundled):

```sh
pg_dump --format=custom --no-owner --file=game-shelf.dump "$DATABASE_URL"
# Restore to a NEW empty database, not over the live one:
pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" game-shelf.dump
```

Backups include account/password hashes, sessions, private notes, and locations; restrict access, encrypt, and set retention. Preserve the auth secret separately in a secret manager. Do a quarterly restore drill against a disposable database; sign in and compare exported entries/copies/notes. Rotate/revoke sessions after suspected compromise. Restoring the same auth secret can preserve old sessions; choose consciously. A real production PostgreSQL dump/restore and account/entry/copy count comparison passed during Oracle deployment; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

**Local full backup:** stop the server, copy the whole `.data/postgres` directory to a protected backup location, then restart. Restore only while stopped and with a compatible PGlite version, to a separate directory first (`PGLITE_PATH`); verify login and exported records. Never copy an actively written PGlite directory or open it from two processes.

**Portable collection backup:** Export collection → secure JSON file. Restore into an empty account with Import. This does not restore credentials or session history. Store exports privately; they include private fields. Importing an export into a non-empty account skips existing records rather than rolling them back.

## Offline, privacy, and installability

The service worker caches the public app shell and static code only, never auth/API responses. A successful authenticated collection snapshot is stored in localStorage on this trusted browser, timestamped, with no offline edits. Sign-out clears the snapshot and notifies other tabs in the same browser; suspended tabs still cannot make authenticated writes after session revocation. Failed refreshes show stale/read-only content; 401 clears it. A cached snapshot is not encrypted and remains readable to someone with access to the browser profile. Clear site data on shared computers. Covers may be missing offline. Browser-managed PWA installation uses the manifest and original 192/512/maskable icons; iOS uses Share → Add to Home Screen. Camera functionality requires HTTPS in M2. No actual Android, iOS, or WeChat device testing is implied.

## Continuation

[Product, architecture, assumptions, checklist](docs/PROJECT.md). [Verification and known external prerequisites](docs/VERIFICATION.md). [Official decision references](docs/SOURCES.md). Primary interface copy is centralized in `src/lib/strings.ts`; component-specific descriptive copy remains in components for later locale extraction. Unicode data/search are supported now; a language-switcher/Chinese UI is not claimed. Next recommended milestone: M2 photo/code capture only after M1 deployment review, BGG authorization decisions, and physical-device verification.
