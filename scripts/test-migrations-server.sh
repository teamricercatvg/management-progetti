#!/usr/bin/env bash
set -euo pipefail
work=${1:?Temporary test archive directory required}
[[ "$work" == /tmp/ariadne-m3-* ]] || exit 1
container="ariadne-m3-${work##*-}"
image=supabase/postgres:15.8.1.085
cleanup() { docker rm -f -v "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# initdb from the SAME image as production, but on a disposable tmpfs cluster.
docker run -d --name "$container" --network none --user postgres \
  --tmpfs /tmp:rw,noexec,nosuid,size=512m --entrypoint bash "$image" -c \
  'mkdir /tmp/pgdata; initdb -D /tmp/pgdata -A trust --no-locale >/dev/null; exec postgres -D /tmp/pgdata -k /tmp -c listen_addresses=' >/dev/null
ready=false
for attempt in $(seq 1 30); do
  if docker exec "$container" pg_isready -h /tmp -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [[ "$ready" != true ]]; then docker logs "$container"; exit 1; fi
[[ "$(docker inspect "$container" --format '{{.HostConfig.NetworkMode}}')" == none ]]
run_sql() { docker exec -i "$container" psql -X -q -h /tmp -U postgres -d "$1" -v ON_ERROR_STOP=1; }
for db in foundation_test foundation_replay; do
  docker exec "$container" createdb -h /tmp -U postgres "$db"
  if [[ "$db" == foundation_test ]]; then
    run_sql "$db" < "$work/supabase/tests/bootstrap.sql"
  else
    # Roles are cluster-wide and already exist.
    sed '/^create role /d' "$work/supabase/tests/bootstrap.sql" | run_sql "$db"
  fi
  for migration in "$work"/supabase/migrations/20261007*.sql; do run_sql "$db" < "$migration"; done
done
run_sql foundation_test < "$work/supabase/tests/foundations.sql"
bash "$work/supabase/tests/concurrency.sh" "$container"
for db in foundation_test foundation_replay; do
  for migration in "$work"/supabase/migrations/20261009*.sql; do run_sql "$db" < "$migration"; done
  docker exec "$container" pg_dump -h /tmp -U postgres -d "$db" --schema-only --schema public --schema app_private > "$work/$db.sql"
done
# pg_dump 15 does not include database-specific headers, normalize optional restrict tokens.
sed '/^\\restrict /d; /^\\unrestrict /d' "$work/foundation_test.sql" > "$work/schema-first.sql"
sed '/^\\restrict /d; /^\\unrestrict /d' "$work/foundation_replay.sql" > "$work/schema-replay.sql"
diff -u "$work/schema-first.sql" "$work/schema-replay.sql"
echo 'PASS: migrations apply from zero twice; schema dumps match'
run_sql foundation_test < "$work/supabase/tests/auth.sql"
# Test transaction rollback of the entire migration chain, omitting their wrappers.
docker exec "$container" createdb -h /tmp -U postgres foundation_rollback
sed '/^create role /d' "$work/supabase/tests/bootstrap.sql" | run_sql foundation_rollback
{ echo BEGIN\;; sed '/^begin;$/d; /^commit;$/d' "$work"/supabase/migrations/*.sql; echo ROLLBACK\;; } | run_sql foundation_rollback
count=$(echo "select count(*) from pg_tables where schemaname in ('public','app_private')" | docker exec -i "$container" psql -X -At -h /tmp -U postgres -d foundation_rollback)
[[ "$count" == 0 ]]
echo 'PASS: transactional rollback leaves no application tables; isolated container removed on exit'
