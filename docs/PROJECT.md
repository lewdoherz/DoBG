# Game Shelf — product and architecture

## Product specification

Milestone 1: a private physical board-game library, usable in an ordinary browser or installed PWA. Account owners can search authorized metadata, add custom games, manage editions and individual copies, browse/filter their shelf, and round-trip a portable JSON export. Warm paper, ink, and terracotta design; large targets; Unicode throughout. No collection is public.

## Assumptions

- Empty repository; no existing instructions, code, credentials, or infrastructure.
- English UI initially; English/Chinese names and aliases are first-class. Primary navigation/copy lives in a locale dictionary; component-specific prose remains ready for later extraction. No full Chinese UI or language switcher is claimed.
- Email/password accounts using Better Auth. No email-delivery service is assumed. Registration works without verification; password recovery requires an administrator until an email service is added. Public deployments must consciously configure registration policy.
- One backend synchronizes all devices. Embedded PGlite is for a single-process local review only; deployed instances require PostgreSQL.
- Unknown metadata is null/empty, never guessed. Personal edits do not rewrite provider metadata. Custom metadata belongs to the account, not a globally editable catalog.
- No fixture games are seeded or represented as provider results.
- External cover URLs are optional HTTPS links, loaded by the browser without server fetching. Object storage and uploads belong to Milestone 2, not a new unnecessary service now.
- Owned entries have at least one physical copy; wishlist entries have zero physical copies. Each copy has its own stable identity, edition, order, and storage location. Duplicate add prompts an explicit additional-copy/update choice.

## Architecture

Next.js App Router + React + TypeScript. Better Auth with its official Drizzle adapter. Drizzle PostgreSQL schema, pg in production, persistent PGlite in local development. Versioned SQL migrations. Server routes authenticate each request, scope every collection query to its owner, validate input, and reject cross-origin mutations. Transactions and a unique account/game identity prevent duplicate races. Import is validated in full, transactional, bounded, and idempotent by stable entry ID; it never overwrites another account's data.

Canonical game and edition are separate records; collection entries hold personal fields; copy records reference editions. External IDs/provenance and source metadata remain separate from editable user metadata. BGG responses are server-cached with bounded retries and an explicit unavailable state. No barcode assumptions. No secrets in client bundles.

Offline: an authenticated successful collection snapshot is stored in this browser for read-only use. Sign-out clears it. App shell/static assets are service-worker cached; auth/API responses are never service-worker cached. Offline state and snapshot timestamp stay visible. This is not offline editing or a full encrypted backup. Use a trusted device; clear browser data on shared computers.

Deployment: one Node service plus managed PostgreSQL behind HTTPS. No required object storage in M1. Dockerfile targets a conventional container host. Cost planning and operational procedures are in README.md. Native packaging remains possible because the browser calls ordinary authenticated JSON APIs.

## Milestone checklist

- [x] M1 authenticated, isolated, persistent collection
- [x] M1 metadata search implementation + manual fallback + game details (live BGG approval/token still required)
- [x] M1 editions, stable physical copies, wishlist, private fields, duplicate handling
- [x] M1 search/filter, grid/list, play-fit filters
- [x] M1 versioned import/export + offline read + PWA manifest/icons (physical-device installation not tested)
- [x] M1 meaningful API/browser/accessibility checks and operator docs — see VERIFICATION.md for evidence and external prerequisites
- [ ] M2 photos, recognition, safe code capture (not implemented)
- [ ] M3 selective revocable sharing + PNG cards (not implemented)
- [ ] M4 invitations, guest authorization, transactional capacity (not implemented)

## Continuation rules

Finish and verify M1 before M2. Never claim external/provider/device verification without evidence. Keep private data out of future public routes. Keep recognition capabilities separate from model availability. Do not auto-open/fetch QR destinations. Preserve attribution and review provider terms before public release.
