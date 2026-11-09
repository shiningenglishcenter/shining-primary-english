#!/usr/bin/env bash
# Runs every migration plus the RLS/RPC test suite against a throwaway local
# PostgreSQL server (no Supabase CLI or Docker needed). Usage:
#   scripts/test-db.sh            # uses pg binaries from PATH or /usr/lib/postgresql/*/bin
# Exit code is non-zero if any assertion fails or any SQL errors unexpectedly.
set -euo pipefail
shopt -s nullglob

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
PORT="${PGPORT_TEST:-54329}"
WORK="$(mktemp -d)"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$WORK"
  RUN_AS=(runuser -u postgres --)
fi

cleanup() { "${RUN_AS[@]}" pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

"${RUN_AS[@]}" initdb -D "$WORK/data" -U postgres -A trust --locale=C.UTF-8 -E UTF8 >/dev/null
"${RUN_AS[@]}" pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" start >/dev/null

PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -X -q -v ON_ERROR_STOP=1)

echo "== applying shim + migrations"
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "   $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
# Supabase grants service_role everything after migrations
"${PSQL[@]}" -c "grant all on all tables in schema public to service_role;"

echo "== loading test helpers + fixtures"
"${PSQL[@]}" -f "$ROOT/supabase/tests/01_helpers.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/02_fixtures.sql"

pass=0; fail=0; errors=0
for f in "$ROOT"/supabase/tests/[1-9]*_*.sql; do
  name="$(basename "$f")"
  out="$("${PSQL[@]}" -f "$f" 2>&1)" || { echo "!! $name: SQL error"; echo "$out" | grep -E 'ERROR|FAIL' | head -5; errors=$((errors+1)); }
  p=$(grep -c 'ok - ' <<<"$out" || true)
  q=$(grep -c 'FAIL - ' <<<"$out" || true)
  pass=$((pass+p)); fail=$((fail+q))
  printf '   %-34s %3d passed  %d failed\n' "$name" "$p" "$q"
  grep 'FAIL - ' <<<"$out" | sed 's/^.*FAIL - /      ✗ /' || true
done

echo "== total: $pass passed, $fail failed, $errors file(s) with unexpected SQL errors"
[ "$fail" -eq 0 ] && [ "$errors" -eq 0 ]
