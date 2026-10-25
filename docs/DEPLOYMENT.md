# Oracle / Cloudflare deployment

Live: **https://bg.lewsherz.org**. Source: https://github.com/lewdoherz/DoBG (public repository), branch `main`. Deployment and verification were completed on the existing Oracle VM; this is not a proposed hosting configuration.

## Isolation and ingress

The existing Oracle ARM64 Ubuntu VM already runs other applications, Nginx on 80/443, and PostgreSQL on host loopback. Game Shelf uses its own Compose project (`game-shelf`), PostgreSQL 17 container/volume, application container, and a dedicated Cloudflare Tunnel. No host ports are published; existing sites, tunnels, databases, firewall rules, and Nginx configuration are not replaced. Cloudflare terminates public HTTPS; an encrypted outbound tunnel reaches the private Docker network and `http://app:3000`. The tunnel has only `bg.lewsherz.org` plus a 404 catch-all, not a wildcard route.

The source checkout lives at `/opt/game-shelf`. Runtime credentials live only in `/etc/game-shelf/production.env` (root-only), outside the repository/build context. Fields: random URL-safe `POSTGRES_PASSWORD`, random `BETTER_AUTH_SECRET`, tunnel-specific `TUNNEL_TOKEN`, and `DISABLE_SIGNUP=false`. Public `BETTER_AUTH_URL` is fixed to the requested HTTPS origin in Compose. BGG remains disabled until separately approved/configured. Neither the Cloudflare account API token nor any GitHub token is needed by the running application or stored in this environment file.

## Deploy/update

Requires Docker Engine/Compose, Git, working SSH/sudo, and a public or otherwise authorized checkout. After fetching the intended commit into `/opt/game-shelf`:

```sh
sudo sh /opt/game-shelf/deploy/deploy.sh
```

This builds commit-tagged app/migration images, waits for PostgreSQL, applies checksummed transactional migrations, then starts the app and tunnel and waits for app health. Docker restarts services after host reboot. Old images are retained for rollback; do not prune other projects. Use `git -C /opt/game-shelf log -1` to identify source. Container image tags carry the deployed commit prefix.

Inspect state without displaying interpolated secrets:

```sh
sudo docker compose --project-directory /opt/game-shelf --env-file /etc/game-shelf/production.env -f /opt/game-shelf/compose.production.yaml ps
```

Do not run/print `docker compose config` without `--quiet`, `docker inspect` environment dumps, tunnel-token commands, or authenticated curl headers into shared logs. Do not commit secret files. Compose rotates service logs at 3 × 10 MB. Cloudflared uses its tunnel-scoped token via environment rather than a process argument.

## Accounts

Public registration is enabled in production at the owner's request (`DISABLE_SIGNUP=false` in the persistent environment file). Compose still defaults to closed registration for an unconfigured deployment. The existing application image was recreated without rebuilding or restarting the database/tunnel. Real public HTTPS signup and authenticated access to the new account's collection both returned HTTP 200; the temporary verification account was signed out and removed. Email verification/recovery remains unconfigured. Optional operator provisioning accepts JSON on stdin inside the migration/tool image:

```sh
sudo sh -c 'GAME_SHELF_MIGRATION_IMAGE="game-shelf-migrate:$(git -C /opt/game-shelf rev-parse --short=12 HEAD)" docker compose --project-directory /opt/game-shelf --env-file /etc/game-shelf/production.env -f /opt/game-shelf/compose.production.yaml run --rm -T migrate npx tsx scripts/create-account.ts < /root/protected-account-input.json'
```

The protected input contains `name`, `email`, `password`. Create it securely with mode 600, do not paste passwords into shell history, and remove the input afterward. The command prints only the created email, never its password/session token. It enables registration in that one CLI process only, not in the app. The intended owner is `lihp1987@gmail.com`; any generated initial password is kept in `/etc/game-shelf/initial-owner-password` (root-only) for retrieval over existing trusted SSH, not published in Git/chat. Email verification and mail-based password recovery are not configured. Keep the password in a password manager.

Run provisioning only after deploying the current checkout, so its migration image exists. The existing administrator SSH alias is `fotj-oci`. Retrieve the initial password privately, not in shared logs:

```sh
ssh fotj-oci "sudo cat /etc/game-shelf/initial-owner-password"
```

## Backup and restore

```sh
sudo sh /opt/game-shelf/deploy/backup.sh
```

Backups go to `/var/backups/game-shelf/game-shelf-<UTC timestamp>.dump`, mode 600, with 14-day retention. A partial dump is never presented as a complete backup. The tracked `deploy/backup.cron` is installed at `/etc/cron.d/game-shelf-backup`: **03:17 UTC daily**; the server uses `Etc/UTC` and its cron daemon was verified active. Output goes to `/var/log/game-shelf-backup.log` (root-only). Reinstall a changed schedule with `sudo install -o root -g root -m 644 /opt/game-shelf/deploy/backup.cron /etc/cron.d/game-shelf-backup`.

These are **local private dumps, not encrypted offsite disaster recovery**. Oracle Free Tier reclamation or VM/disk loss can destroy both the live volume and local dumps. Configure encrypted offsite copies before relying on this as the only home for valuable data. Preserve runtime secrets separately.

Restore into a newly created temporary database first. Use the database container's `createdb`, `pg_restore --no-owner --exit-on-error`, and `psql` to verify expected accounts/entries/copies. Do not restore over the live database or use `docker compose down -v`; the named volume contains all account data. A destructive live restore requires an explicit maintenance window and verified backup. For a code rollback, select the prior Git commit/image and rerun deployment only if the schema remains compatible; otherwise restore a reviewed backup and matching code.

Disposable restore drill, using a retained dump path (replace the example filename as needed). Run while the collection is quiet; changes since the dump can legitimately make the live counts differ. The temporary database is removed on exit, including on failure:

```sh
sudo sh -s /var/backups/game-shelf/game-shelf-20261025T082115Z.dump <<'SH'
set -eu
dump=$1
test -r "$dump"
dc() {
  docker compose --project-directory /opt/game-shelf --env-file /etc/game-shelf/production.env -f /opt/game-shelf/compose.production.yaml "$@"
}
restore_db="gameshelf_restore_$(date -u +%s)"
dc exec -T db createdb -U gameshelf "$restore_db" < /dev/null
trap 'dc exec -T db dropdb --if-exists -U gameshelf "$restore_db" < /dev/null' EXIT
dc exec -T db pg_restore -U gameshelf --dbname="$restore_db" --no-owner --exit-on-error < "$dump"
counts='SELECT (SELECT count(*) FROM "user"), (SELECT count(*) FROM collection_entry), (SELECT count(*) FROM physical_copy)'
restored=$(dc exec -T db psql -U gameshelf -d "$restore_db" -At -c "$counts" < /dev/null)
live=$(dc exec -T db psql -U gameshelf -d gameshelf -At -c "$counts" < /dev/null)
printf 'Restored: %s; live: %s\n' "$restored" "$live"
test "$restored" = "$live"
SH
```

## DNS / Cloudflare

Use a proxied CNAME `bg.lewsherz.org` → `<dedicated-tunnel-id>.cfargotunnel.com`. No A/AAAA record exposing the app or database is required. Manage only the dedicated tunnel and DNS record; don't replace account-wide routing, SSL settings, or another application's configuration. Automatic edge certificates are managed by Cloudflare. No paid Cloudflare features or new Oracle instances/disks are required by this setup; VM storage/network usage and existing provider/free-tier limits still apply.

A hostname-scoped Single Redirect rule enforces HTTP → HTTPS while preserving the path and query string: `(http.host eq "bg.lewsherz.org" and not ssl)`, HTTP 301, target `concat("https://bg.lewsherz.org", http.request.uri.path)`, preserve query string enabled. Rule reference: `game_shelf_https_only`. This does not enable zone-wide redirects or change other hostnames. Dedicated tunnel ID: `38a2bc69-744d-4d23-be20-a6c1cd7070a8`.

Official references checked: [Cloudflare remote tunnel API](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel-api/), [hostname-scoped redirect API](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-api/), [TLS predicate](https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/ssl/), [Docker Compose production](https://docs.docker.com/compose/how-tos/production/), [PostgreSQL official image](https://hub.docker.com/_/postgres).

Treat credentials shared in chat as exposed. Rotate the supplied Cloudflare/GitHub tokens after deployment. Rotating the account API token does not require changing the separate tunnel token or the application's auth/database secrets. Keep SSH and OCI private keys outside Git.

## Observed production verification

- ARM64 Docker build, production TypeScript compilation, three applied migrations, healthy app/database, and an active tunnel. No host app/database ports published; the existing application container remained running.
- Ten regression tests passed in the actual migration/build image. Runtime dependency audit reported zero vulnerabilities. Patched Sharp 0.35.5 also generated all four install icons successfully.
- Actual HTTPS authentication with Secure/HttpOnly cookies; anonymous denial, cross-account read/update isolation, cross-origin denial, persistent add/edit and two physical copies, duplicate conflict, export/import and idempotent re-import, invalid-import rejection, provider-unavailable fallback, and closed public registration.
- Live Chromium mobile-width editing, offline reload/read-only indication, persistence across container replacement, and sign-out snapshot removal. Physical Android, iOS, and WeChat were not tested.
- Real custom-format PostgreSQL dump restored into a disposable database. Accounts/entries/copies matched the source at `3 / 2 / 4`; the disposable restore database, two verification accounts, their games/copies, and the verification-data dump were removed afterward. The final clean database and a second restored clean backup both matched at `1 / 0 / 0`: only the intended owner and an empty collection. HTTP 301 was verified to preserve a non-root path and Unicode query parameters.

Encrypted offsite recovery and email recovery remain unconfigured. Live BGG approval/credentials and physical-device verification are separate prerequisites, not deployment claims. See VERIFICATION.md for the implementation and browser evidence.
