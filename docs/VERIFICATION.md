# Milestone 1 verification and handoff

## What works

- Real Better Auth email/password registration, sign-in, sign-out and server sessions; a private collection per account.
- Persistent manual add/edit, owned/wishlist transitions, separate preferred editions and per-copy editions/locations, tags, notes, pitch and rating. No preseeded collection.
- Game pages with available metadata, original source attribution separated from personal edits, and explicit unknown values (including an unknown base/expansion type).
- Authorized BGG search/detail implementation behind an approval/token/logo gate. Unconfigured and failed providers return an explicit unavailable state and manual-entry fallback; no fixtures masquerade as live results.
- Unicode English/Chinese title and alias search; collection filters, grid/list, and conservative owned-only player/time/complexity matching.
- JSON v1 export and validated, transactional, idempotent merge import.
- Manifest, original install icons and a service worker. Cached collection/game pages are readable offline, with timestamp and disabled edits; APIs are not service-worker cached.

## Executed evidence

### Commands

- `npm run build`: optimized Next.js production build, TypeScript phase, all routes generated successfully.
- `npm start`: standard production Node server launched and exercised against persistent local PGlite. Not a managed PostgreSQL deployment.
- `npm run typecheck`: passed. A separate TypeScript run with unused-local/parameter checks also passed.
- `npm test`: 10 passing regressions across domain validation/search/play-fit, actual PGlite collection storage, and controlled provider XML/failures.
- `npm run smoke`: passed against both development and production-mode servers. Real HTTP requests, real authentication, real database writes; no mocked collection backend.
- `npm run db:migrate`: tracked/checksummed SQL migrations applied. Fresh in-memory databases also run all migrations during the regression suite.
- `npm audit --omit=dev`: reported zero vulnerabilities at the observed audit. This is not a guarantee of future dependency safety.

Initial implementation failures were fixed rather than hidden: reserved SQL index naming, filesystem parent creation, numeric auth rate-limit columns, TypeScript timer compatibility, and standard versus standalone Next.js start configuration. A physical-copy identity regression was reproduced failing before the fix and retained passing afterward; edits now preserve copy IDs and deterministic array order.

### HTTP smoke coverage

Anonymous denial; separate-account read/update/delete isolation; rejected cross-origin mutation; add/edit reread persistence; duplicate conflict with existing-entry ID; concurrent duplicate adds yielding exactly one creation; independent copy editions; whole-file invalid-import rejection without partial changes; export/re-import; repeat-import idempotence; imported stable IDs isolated per account; unconfigured provider 503; a second independent login session reading persisted changes; deletion; and invalidated signed-out session.

The smoke script creates uniquely named `smoke-*@example.test` accounts and empties their collection entries on success. It is for disposable local/review databases, not personal production data.

### Browser coverage

Real Chromium, ordinary browser mode, against the running app:

- Registration, sign-in, empty collection and persisted collection after server restart.
- BGG-unavailable message → manual-entry editor → saved game page.
- Manual English/Chinese title and aliases, numeric details, mechanics/categories, notes and tags.
- Add a second physical copy, edit notes, save and observe both copies on the game page.
- Chinese alias search, grid/list switching, wishlist file upload/import confirmation.
- Duplicate error → open existing entry to edit/add a copy.
- Player/time/complexity fit: 4 players / 60 minutes / complexity ≤3 matched the review game; reducing available time to 30 excluded it.
- Export produced a downloaded `game-shelf-2026-10-25.json` file (1,741 bytes in that review).
- Offline collection reload, offline game navigation, direct game-page reload offline, disabled editing, visible snapshot timestamp, and recovery after reconnect.
- Inspected service-worker cache: active `game-shelf-shell-v2`, zero `/api/` entries.
- Sign-out removed the local collection snapshot. Keyboard Escape dismissed the editor; focus returned to Edit game.
- Collection at 320, 390, 768 and 1440 CSS-pixel widths. An initial 320px overflow was reproduced and fixed; final collection measurements equaled viewport width at all four sizes.
- axe-core WCAG 2 A/AA + 2.1 AA-tag checks on collection, game detail, editor, search dialog and sign-in surfaces. Contrast defects were corrected. Final checked collection widths, detail/editor/search and desktop/mobile sign-in reported zero violations. The final source-applied mobile artwork fix was verified after a fresh page load: opacity 1, no horizontal overflow, zero audited violations. Automatic checks do not constitute a complete WCAG certification or replace screen-reader/user testing.

All review games were clearly titled `Review fixture · …`, manually entered/imported, and removed after review. No review data is seeded by application startup or migrations.

## Not exercised / external prerequisites

- **Live BGG**: no token or application approval supplied. Official access/terms direct fetches returned HTTP 403; indexed official sources informed the gated implementation. The operator must review the complete current terms, secure approval, provide the official attribution asset, and check real search/details/covers before enabling it. Commercial use needs separate authorization.
- **Production PostgreSQL, Docker, hosting, managed backups and restoration**: documented and implemented configuration/migrations, but no Docker/psql binaries or database/hosting credentials were available. Local PGlite is not evidence of a real PostgreSQL network/TLS or managed restore test. Run the documented release and restore drill before trusting a deployed collection.
- **Physical Android/iOS/WeChat**: none tested. Viewport emulation is not device testing. Actual install menus, Safari home-screen lifecycle/storage eviction, touch keyboards, accessibility technology and WeChat's embedded browser need hands-on checks. No automatic WeChat previews/sending are promised.
- **Email verification/recovery**: no mail service configured; registration is unverified and self-service recovery is unavailable. Use a password manager, close registration after provisioning intended accounts, and plan email delivery before wider use.
- **Offline security**: the browser snapshot is plaintext localStorage on a trusted profile, not encrypted storage. No offline editing queue, conflict resolution, push notifications, or cross-device real-time subscription is claimed. Refresh/reopen/focus/reconnect retrieves the shared backend state.
- **Localization**: Unicode search and a primary-copy dictionary are implemented; a full Chinese UI, locale selector and transliteration are not.
- **M2–M4**: no uploads, recognition, barcode/QR lookup, public sharing, invitation capacity or chat implementation is implied by M1. Their requirements remain in the project checklist.

## Review and next action

See README.md for commands, environment setup, costs, migrations, backup/restore, deployment and privacy. See FORMAT.md for the portable format, PROJECT.md for product/architecture decisions, and SOURCES.md for official references.

Recommended next milestone: **M2 photo/code capture**, after reviewing M1 on the intended deployment/devices. Select recognition only after separately verifying image/text capabilities, cost, credentials and retention; keep keys server-side, provide confirmation and manual fallbacks, and never fetch/navigate arbitrary QR URLs automatically. Do not skip ahead to sharing or invitations before that decision and verification.

## Final local review state

The local development preview is available at http://localhost:3000. Create a new account to review a clean collection. Temporary browser-import files and the temporary production-mode environment/secret were removed. Empty smoke/review accounts may remain in the ignored local development database; their review collection entries were removed. No live integration credentials were supplied or committed.
