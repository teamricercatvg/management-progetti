#!/usr/bin/env bash
# Disposable PostgreSQL 15 cluster, Unix socket only, no production access.
set -euo pipefail
cd "$(dirname "$0")/.."
pgbin=${PG_BIN:-/opt/homebrew/opt/postgresql@15/bin}
work=$(mktemp -d /tmp/ariadne-deletion-XXXXXXXX)
cleanup() { "$pgbin/pg_ctl" -D "$work/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf -- "$work"; }
trap cleanup EXIT
"$pgbin/initdb" -D "$work/data" -A trust --no-locale >/dev/null
"$pgbin/pg_ctl" -D "$work/data" -l "$work/postgres.log" -o "-k $work -c listen_addresses=''" -w start >/dev/null
sql() { "$pgbin/psql" -X -q -h "$work" -d "$1" -v ON_ERROR_STOP=1; }
for db in deletion_test deletion_replay; do
  "$pgbin/createdb" -h "$work" "$db"
  if [[ "$db" == deletion_test ]]; then sql "$db" < supabase/tests/bootstrap.sql;
  else sed '/^create role /d' supabase/tests/bootstrap.sql | sql "$db"; fi
  for migration in supabase/migrations/*.sql; do sql "$db" < "$migration"; done
  "$pgbin/pg_dump" -h "$work" -d "$db" --schema-only --schema public --schema app_private | sed '/^\\restrict /d; /^\\unrestrict /d' > "$work/$db.sql"
done
diff -u "$work/deletion_test.sql" "$work/deletion_replay.sql"
sql deletion_test < supabase/tests/schedule.sql
sql deletion_test < supabase/tests/activity-deletion.sql
sql deletion_test <<'SQL'
begin;
set local app.system_reason='Isolated deletion concurrency test';
insert into auth.users(id,email_confirmed_at) values ('94000000-0000-4000-8000-000000000001',now());
insert into public.global_user_roles(user_id) values ('94000000-0000-4000-8000-000000000001');
insert into public.projects(id,code,title,start_date,end_date,currency_code) values ('94000000-0000-4000-8000-000000000002','DELETE-RACE','Race','2026-01-01','2026-12-31','EUR');
insert into public.activities(id,project_id,code,title) values ('94000000-0000-4000-8000-000000000003','94000000-0000-4000-8000-000000000002','RACE','Race');
commit;
SQL
PGAPPNAME=ariadne_delete_race "$pgbin/psql" -X -q -h "$work" -d deletion_test -v ON_ERROR_STOP=1 > "$work/first" 2>&1 <<'SQL' &
begin;
set local request.jwt.claim.sub='94000000-0000-4000-8000-000000000001';
set local role authenticated;
select public.change_activity_deletion('94000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000003',1,'trash');
select pg_sleep(2);
commit;
SQL
job=$!
ready=false
for attempt in $(seq 1 50); do
 if [[ "$(echo "select count(*) from pg_stat_activity where application_name='ariadne_delete_race' and wait_event='PgSleep'" | "$pgbin/psql" -X -At -h "$work" -d deletion_test)" == 1 ]]; then ready=true; break; fi
 sleep .1
done
[[ "$ready" == true ]] || { cat "$work/first"; wait "$job"; exit 1; }
if sql deletion_test > "$work/second" 2>&1 <<'SQL'
begin;
set local request.jwt.claim.sub='94000000-0000-4000-8000-000000000001';
set local role authenticated;
select public.change_activity_deletion('94000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000003',1,'trash');
commit;
SQL
then wait "$job"; echo 'FAIL concurrent stale deletion accepted'; exit 1; fi
wait "$job"
grep -q 'Stale activity' "$work/second"
echo 'PASS schema replay, schedule regression, deletion permissions, history, audit and concurrent stale deletion'
