#!/bin/sh
# ============================================================================
# Backend container entrypoint.
#
# Runs migrations and seeds the database on every boot. Both operations are
# idempotent — `migrate deploy` no-ops if all migrations are applied; the seed
# script no-ops if users/jobs already exist. The container then exec's into
# the production command (CMD) passed by the Dockerfile.
# ============================================================================
set -e

echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

echo "[entrypoint] running database seed..."
node dist/prisma/seed.js

echo "[entrypoint] starting server..."
exec "$@"