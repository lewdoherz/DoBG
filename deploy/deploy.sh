#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${GAME_SHELF_ENV_FILE:-/etc/game-shelf/production.env}
REVISION=$(git -C "$ROOT" rev-parse --short=12 HEAD)
export GAME_SHELF_IMAGE="game-shelf:$REVISION"
export GAME_SHELF_MIGRATION_IMAGE="game-shelf-migrate:$REVISION"
dc() { docker compose --project-directory "$ROOT" --env-file "$ENV_FILE" -f "$ROOT/compose.production.yaml" "$@"; }
dc config --quiet
dc build app migrate
dc up -d --wait db
dc run --rm migrate
dc up -d --wait app tunnel
printf 'Game Shelf release %s is running. Verify https://bg.lewsherz.org before considering the release complete.\n' "$REVISION"
