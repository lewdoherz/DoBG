#!/bin/sh
set -eu
umask 077
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${GAME_SHELF_ENV_FILE:-/etc/game-shelf/production.env}
BACKUP_DIR=${GAME_SHELF_BACKUP_DIR:-/var/backups/game-shelf}
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/game-shelf-$(date -u +%Y%m%dT%H%M%SZ).dump"
trap 'rm -f "$FILE.partial"' EXIT HUP INT TERM
docker compose --project-directory "$ROOT" --env-file "$ENV_FILE" -f "$ROOT/compose.production.yaml" exec -T db pg_dump -U gameshelf -d gameshelf --format=custom --no-owner > "$FILE.partial"
test -s "$FILE.partial"
mv "$FILE.partial" "$FILE"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'game-shelf-*.dump' -mtime +13 -delete
printf 'Created private database backup: %s\n' "$FILE"
