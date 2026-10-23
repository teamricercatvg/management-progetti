#!/usr/bin/env bash
set -euo pipefail
container=${1:?Disposable container required}
[[ "$container" == ariadne-m3-* ]] || exit 1
sql() { docker exec -i "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1; }
sql <<'SQL'
begin;
set local app.system_reason='Schedule concurrency fixtures';
insert into public.projects(id,code,title,start_date,end_date,currency_code) values ('93000000-0000-4000-8000-000000000001','SCH-RACE','Race','2026-01-01','2026-12-31','EUR');
commit;
SQL
work=$(mktemp -d /tmp/ariadne-schedule-race-XXXXXXXX)
trap 'rm -rf -- "$work"' EXIT
cat <<'SQL' | docker exec -i -e PGAPPNAME=ariadne_schedule_race "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1 > "$work/first" 2>&1 &
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.edit_schedule('93000000-0000-4000-8000-000000000001','create',null,'{"title":"First","reason":"First writer"}');
select pg_sleep(3);
commit;
SQL
job=$!
ready=false
for attempt in $(seq 1 30); do
 if [[ "$(echo "select count(*) from pg_stat_activity where application_name='ariadne_schedule_race' and wait_event='PgSleep'" | sql)" == 1 ]]; then ready=true; break; fi
 sleep 0.1
done
[[ "$ready" == true ]] || { cat "$work/first"; wait "$job"; exit 1; }
if sql > "$work/second" 2>&1 <<'SQL'
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.edit_schedule('93000000-0000-4000-8000-000000000001','create',null,'{"title":"Second","reason":"Second writer"}');
commit;
SQL
then wait "$job"; echo 'FAIL: concurrent drafts created'; exit 1; fi
wait "$job"
grep -q 'Draft already exists' "$work/second"
[[ "$(echo "select count(*) from public.schedule_revisions where project_id='93000000-0000-4000-8000-000000000001'" | sql)" == 1 ]]
echo 'PASS: concurrent draft creation serialized, only one revision allocated'
