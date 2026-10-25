# Implementation decision references

Official documentation consulted for Milestone 1. These are evidence for implementation choices, not claims that a provider account or deployed service was tested.

- Next.js: https://nextjs.org/docs/app/guides/progressive-web-apps — App Router manifest, service worker, HTTPS and platform installation requirements. Also read installed Next 16.4 route-handler and layout/page guides under `node_modules/next/dist/docs/` after Next generated AGENTS.md.
- Better Auth email/password: https://www.better-auth.com/docs/authentication/email-password — maintained password/session APIs; email recovery requires a delivery implementation, not assumed.
- Better Auth Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle — use the official separately packaged adapter and PostgreSQL provider.
- Better Auth cookies: https://www.better-auth.com/docs/concepts/cookies — signed opaque session cookie, HttpOnly/SameSite, HTTPS production deployment.
- Drizzle PostgreSQL: https://orm.drizzle.team/docs/get-started-postgresql — native node-postgres support. Stable 0.45 release line retained rather than adopting the current 1.0 release candidate during initial implementation.
- PGlite: https://pglite.dev/docs/ — persistent Node filesystem mode and a single exclusive connection. Used for local development/review only, not a substitute for deployed multi-process PostgreSQL.
- Zod: https://zod.dev/ — stable v4 runtime parsing and strict TypeScript.
- fast-xml-parser: https://github.com/NaturalIntelligence/fast-xml-parser — v5 XML parser options. Entity expansion disabled; upstream output passes domain validation before saving.
- axe-core: https://github.com/dequelabs/axe-core — browser accessibility engine. Automatic checks are partial coverage, not a full accessibility certification.
- BGG access: https://boardgamegeek.com/using_the_xml_api — application registration and server-side bearer authorization.
- BGG terms: https://boardgamegeek.com/xmlapi/termsofuse and https://boardgamegeek.com/wiki/page/BGG_XML_API_Commercial_Use — name/logo attribution and separate commercial authorization.
- BGG API2: https://boardgamegeek.com/wiki/page/BGG_XML_API2 — search and thing metadata; no assumed barcode service.
- Render costs: https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses and https://render.com/pricing — approximately $13/month baseline example before extra storage/egress; verify actual prices before purchasing.

BGG access/terms direct reads were HTTP 403; indexed official-page excerpts supplied the summarized registration/attribution/commercial-use requirements. Full current terms and application approval remain an operator prerequisite before enabling the integration. No scraping bypass or unauthorized access was attempted. No WeChat or image-recognition integration was selected for M1.
