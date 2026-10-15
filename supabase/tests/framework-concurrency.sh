#!/usr/bin/env bash
set -euo pipefail
container=${1:?Disposable container required}
[[ "$container" == ariadne-m3-* ]] || exit 1
sql() { docker exec -i "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1; }
sql <<'SQL'
begin;
set local app.system_reason='M8 concurrent hierarchy fixtures';
insert into public.projects(id,code,title,start_date,end_date,currency_code) values ('81000000-0000-4000-8000-000000000001','M8-RACE','Race','2026-01-01','2026-12-31','EUR');
insert into public.logical_framework_items(id,project_id,type,code,title) values ('81000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000001','general_objective','OG','Parent');
commit;
SQL
work=$(mktemp -d /tmp/ariadne-framework-race-XXXXXXXX)
trap 'rm -rf -- "$work"' EXIT
cat <<'SQL' | docker exec -i -e PGAPPNAME=ariadne_framework_race "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1 > "$work/first" 2>&1 &
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
update public.logical_framework_items set status='archived' where id='81000000-0000-4000-8000-000000000002';
select pg_sleep(3);
commit;
SQL
job=$!
ready=false
for attempt in $(seq 1 30); do
 if [[ "$(echo "select count(*) from pg_stat_activity where application_name='ariadne_framework_race' and wait_event='PgSleep'" | sql)" == 1 ]]; then ready=true; break; fi
 sleep 0.1
done
[[ "$ready" == true ]] || { cat "$work/first"; wait "$job"; exit 1; }
if sql > "$work/second" 2>&1 <<'SQL'
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
insert into public.logical_framework_items(project_id,parent_id,type,code,title) values ('81000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000002','specific_objective','OS','Child');
commit;
SQL
then wait "$job"; echo 'FAIL: active child inserted under concurrently archived parent'; exit 1; fi
wait "$job"
grep -q 'Active child requires active parent' "$work/second"
[[ "$(echo "select count(*) from public.logical_framework_items where project_id='81000000-0000-4000-8000-000000000001' and status='active'" | sql)" == 0 ]]
echo 'PASS: concurrent parent archival blocks active child insertion'
