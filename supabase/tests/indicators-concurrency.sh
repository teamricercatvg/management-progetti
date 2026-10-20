#!/usr/bin/env bash
set -euo pipefail
container=${1:?Disposable container required}
[[ "$container" == ariadne-m3-* ]] || exit 1
sql() { docker exec -i "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1; }
sql <<'SQL'
begin;
set local app.system_reason='Indicators concurrency fixtures';
insert into public.projects(id,code,title,start_date,end_date,currency_code) values ('92000000-0000-4000-8000-000000000001','IND-RACE','Race','2026-01-01','2026-12-31','EUR');
insert into public.logical_framework_items(id,project_id,type,code,title) values ('92000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','general_objective','OG','Parent');
insert into public.logical_framework_items(id,project_id,parent_id,type,code,title) values ('92000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000002','specific_objective','OS','Specific'), ('92000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000003','expected_result','R','Result');
commit;
SQL
work=$(mktemp -d /tmp/ariadne-indicator-race-XXXXXXXX)
trap 'rm -rf -- "$work"' EXIT
cat <<'SQL' | docker exec -i -e PGAPPNAME=ariadne_indicator_race "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1 > "$work/first" 2>&1 &
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
update public.logical_framework_items set status='archived' where id='92000000-0000-4000-8000-000000000004';
select pg_sleep(3);
commit;
SQL
job=$!
ready=false
for attempt in $(seq 1 30); do
 if [[ "$(echo "select count(*) from pg_stat_activity where application_name='ariadne_indicator_race' and wait_event='PgSleep'" | sql)" == 1 ]]; then ready=true; break; fi
 sleep 0.1
done
[[ "$ready" == true ]] || { cat "$work/first"; wait "$job"; exit 1; }
if sql > "$work/second" 2>&1 <<'SQL'
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
insert into public.indicators(project_id,framework_item_id,code,title,type,unit,aggregation_method,direction,verification_source) values ('92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000004','I','Indicator','absolute','people','last','increase','Source');
commit;
SQL
then wait "$job"; echo 'FAIL: indicator inserted under concurrently archived result'; exit 1; fi
wait "$job"
grep -q 'Indicator requires active framework item' "$work/second"
[[ "$(echo "select count(*) from public.indicators where project_id='92000000-0000-4000-8000-000000000001'" | sql)" == 0 ]]
echo 'PASS: concurrent result archival blocks indicator insertion'
