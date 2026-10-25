# Oracle / Cloudflare deployment

Target: https://bg.lewsherz.org. Source: https://github.com/lewdoherz/DoBG (public repository).

## Isolation and ingress

The existing Oracle ARM64 Ubuntu VM already runs other applications, Nginx on 80/443, and PostgreSQL on host loopback. Game Shelf uses its own Compose project (`game-shelf`), PostgreSQL 17 container/volume, application container, and a dedicated Cloudflare Tunnel. No host ports are published; existing sites, tunnels, databases, firewall rules, and Nginx configuration are not replaced. Cloudflare terminates public HTTPS; an encrypted outbound tunnel reaches the private Docker network and `http://app:3000`. The tunnel has only `bg.lewsherz.org` plus a 404 catch-all, not a wildcard route.

The source checkout lives at `/opt/game-shelf`. Runtime credentials live only in `/etc/game-shelf/production.env` (root-only), outside the repository/build context. Fields: random URL-safe `POSTGRES_PASSWORD`, random `BETTER_AUTH_SECRET`, tunnel-specific `TUNNEL_TOKEN`, and `DISABLE_SIGNUP=true`. Public `BETTER_AUTH_URL` is fixed to the requested HTTPS origin in Compose. BGG remains disabled until separately approved/configured. Neither the Cloudflare account API token nor any GitHub token is needed by the running application or stored in this environment file.

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

Public registration is closed by default. Operator provisioning accepts JSON on stdin inside the migration/tool image:

```sh
sudo sh -c 'docker compose --project-directory /opt/game-shelf --env-file /etc/game-shelf/production.env -f /opt/game-shelf/compose.production.yaml run --rm -T migrate npx tsx scripts/create-account.ts < /root/protected-account-input.json'
```

The protected input contains `name`, `email`, `password`. Create it securely with mode 600, do not paste passwords into shell history, and remove the input afterward. The command prints only the created email, never its password/session token. It enables registration in that one CLI process only, not in the app. The intended owner is `lihp1987@gmail.com`; any generated initial password is kept in `/etc/game-shelf/initial-owner-password` (root-only) for retrieval over existing trusted SSH, not published in Git/chat. Email verification and mail-based password recovery are not configured. Keep the password in a password manager.

## Backup and restore

```sh
sudo sh /opt/game-shelf/deploy/backup.sh
```

Backups go to `/var/backups/game-shelf/game-shelf-<UTC timestamp>.dump`, mode 600, with 14-day retention. A partial dump is never presented as a complete backup. The operator should install a root cron entry invoking this daily after initial verification. These are **local private dumps, not encrypted offsite disaster recovery**. Oracle Free Tier reclamation or VM/disk loss can destroy both the live volume and local dumps. Configure encrypted offsite copies before relying on this as the only home for valuable data. Preserve runtime secrets separately.

Restore into a newly created temporary database first. Use the database container's `createdb`, `pg_restore --no-owner --exit-on-error`, and `psql` to verify expected accounts/entries/copies. Do not restore over the live database or use `docker compose down -v`; the named volume contains all account data. A destructive live restore requires an explicit maintenance window and verified backup. For a code rollback, select the prior Git commit/image and rerun deployment only if the schema remains compatible; otherwise restore a reviewed backup and matching code.

## DNS / Cloudflare

Use a proxied CNAME `bg.lewsherz.org` → `<dedicated-tunnel-id>.cfargotunnel.com`. No A/AAAA record exposing the app or database is required. Manage only the dedicated tunnel and DNS record; don't replace account-wide routing, SSL settings, or another application's configuration. Automatic edge certificates are managed by Cloudflare. No paid Cloudflare features or new Oracle instances/disks are required by this setup; VM storage/network usage and existing provider/free-tier limits still apply.

Official references checked: [Cloudflare remote tunnel API](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel-api/), [Docker Compose production](https://docs.docker.com/compose/how-tos/production/), [PostgreSQL official image](https://hub.docker.com/_/postgres).

Treat credentials shared in chat as exposed. Rotate the supplied Cloudflare/GitHub tokens after deployment. Rotating the account API token does not require changing the separate tunnel token or the application's auth/database secrets. Keep SSH and OCI private keys outside Git.
