#!/usr/bin/env bash
set -euo pipefail
container=${1:?Disposable container required}
[[ "$container" == ariadne-m3-* ]] || exit 1
sql() { docker exec -i "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1; }
sql <<'SQL'
begin;
set local app.system_reason='Activities concurrency fixtures';
insert into public.projects(id,code,title,start_date,end_date,currency_code) values ('82000000-0000-4000-8000-000000000001','ACT-RACE','Race','2026-01-01','2026-12-31','EUR');
insert into public.logical_framework_items(id,project_id,type,code,title) values ('82000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','general_objective','OG','Parent');
insert into public.logical_framework_items(id,project_id,parent_id,type,code,title) values ('82000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','specific_objective','OS','Specific'), ('82000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000003','expected_result','R','Result');
commit;
SQL
work=$(mktemp -d /tmp/ariadne-activity-race-XXXXXXXX)
trap 'rm -rf -- "$work"' EXIT
cat <<'SQL' | docker exec -i -e PGAPPNAME=ariadne_activity_race "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1 > "$work/first" 2>&1 &
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
update public.logical_framework_items set status='archived' where id='82000000-0000-4000-8000-000000000004';
select pg_sleep(3);
commit;
SQL
job=$!
ready=false
for attempt in $(seq 1 30); do
 if [[ "$(echo "select count(*) from pg_stat_activity where application_name='ariadne_activity_race' and wait_event='PgSleep'" | sql)" == 1 ]]; then ready=true; break; fi
 sleep 0.1
done
[[ "$ready" == true ]] || { cat "$work/first"; wait "$job"; exit 1; }
if sql > "$work/second" 2>&1 <<'SQL'
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
insert into public.activities(project_id,result_id,code,title,planned_start_date,planned_end_date) values ('82000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000004','A','Activity','2026-01-01','2026-02-01');
commit;
SQL
then wait "$job"; echo 'FAIL: activity inserted under concurrently archived result'; exit 1; fi
wait "$job"
grep -q 'Restore result before activity' "$work/second"
[[ "$(echo "select count(*) from public.activities where project_id='82000000-0000-4000-8000-000000000001'" | sql)" == 0 ]]
echo 'PASS: concurrent result archival blocks activity insertion'
