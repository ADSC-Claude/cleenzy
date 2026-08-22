#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres and exercises the
# order/payment/status logic. Requires a running postgres on $PGPORT (5433).
set -euo pipefail
cd "$(dirname "$0")/../.."
PORT="${PGPORT:-5433}"
HOST="${PGHOST:-/tmp}"
DB=cleenzy_test

psql -h "$HOST" -p "$PORT" -U postgres -qc "drop database if exists $DB;" -c "create database $DB;"
psql -h "$HOST" -p "$PORT" -U postgres -d $DB -q -v ON_ERROR_STOP=1 -f supabase/tests/00_local_shim.sql
for f in supabase/migrations/*.sql; do
  echo "applying $f"
  psql -h "$HOST" -p "$PORT" -U postgres -d $DB -q -v ON_ERROR_STOP=1 -f "$f"
done
psql -h "$HOST" -p "$PORT" -U postgres -d $DB -v ON_ERROR_STOP=1 -f supabase/tests/01_order_logic.sql
echo "OK — schema and order logic verified"
