#!/usr/bin/env bash
set -euo pipefail
container=${1:?Disposable container required}
[[ "$container" == ariadne-m3-* ]] || exit 1
sql() { docker exec -i "$container" psql -X -qAt -h /tmp -U postgres -d foundation_replay -v ON_ERROR_STOP=1; }
sql <<'SQL'
begin;
set local app.system_reason='synthetic concurrency fixture';
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.profiles(id,display_name) select id,'Synthetic admin' from auth.users;
insert into public.global_user_roles(user_id) select id from public.profiles;
insert into public.organizations(id,code,name) values
 ('10000000-0000-0000-0000-000000000001','LEAD','Synthetic'),
 ('10000000-0000-0000-0000-000000000002','PARTNER1','Synthetic'),
 ('10000000-0000-0000-0000-000000000003','PARTNER2','Synthetic');
insert into public.projects(id,code,title,start_date,end_date,currency_code) values
 ('20000000-0000-0000-0000-000000000001','CONCURRENCY','Synthetic','2026-01-01','2026-12-31','EUR');
insert into public.project_organizations(project_id,organization_id,role)
 select '20000000-0000-0000-0000-000000000001',id,case when code='LEAD' then 'lead' else 'partner' end from public.organizations;
update public.projects set status='active';
commit;
SQL
work=$(mktemp -d /tmp/ariadne-concurrency-XXXXXXXX)
trap 'rm -rf -- "$work"' EXIT
run_race() {
  local label=$1 first=$2 second=$3
  {
    echo 'begin;'; echo "set local app.system_reason='synthetic race';";
    echo "$first"; echo 'select pg_sleep(3);'; echo 'commit;';
  } | docker exec -i -e PGAPPNAME=ariadne_race_first "$container" psql -X -qAt -h /tmp -U postgres -d foundation_replay -v ON_ERROR_STOP=1 > "$work/first" 2>&1 &
  local job=$!
  local ready=false
  for attempt in $(seq 1 30); do
    if [[ "$(echo "select count(*) from pg_stat_activity where application_name='ariadne_race_first' and wait_event='PgSleep'" | sql)" == 1 ]]; then ready=true; break; fi
    sleep 0.1
  done
  [[ "$ready" == true ]] || { cat "$work/first"; wait "$job"; exit 1; }
  if { echo 'begin;'; echo "set local app.system_reason='synthetic race';"; echo "$second"; echo 'commit;'; } | sql > "$work/second" 2>&1; then
    echo "FAIL: $label second transaction unexpectedly succeeded"; wait "$job"; exit 1
  fi
  wait "$job"
  if ! grep -Eq 'last active admin|requires sole organization' "$work/second"; then cat "$work/second"; exit 1; fi
  echo "PASS: $label serializes and rejects the conflicting write"
}
run_race 'concurrent admin disable/revoke' \
 "update public.profiles set is_active=false where id='00000000-0000-0000-0000-000000000001';" \
 "delete from public.global_user_roles where user_id='00000000-0000-0000-0000-000000000002';"
run_race 'concurrent removal of two partners' \
 "delete from public.project_organizations where organization_id='10000000-0000-0000-0000-000000000002';" \
 "delete from public.project_organizations where organization_id='10000000-0000-0000-0000-000000000003';"
[[ "$(echo "select count(*) from public.global_user_roles r join public.profiles p on p.id=r.user_id where p.is_active" | sql)" == 1 ]]
[[ "$(echo "select count(*) from public.project_organizations where role='partner'" | sql)" == 1 ]]
if echo "begin isolation level repeatable read; set local app.system_reason='test'; update public.projects set title='Unsafe snapshot'; commit;" | sql > "$work/isolation" 2>&1; then exit 1; fi
grep -q 'require READ COMMITTED' "$work/isolation"
echo 'PASS: unsupported isolation rejected; final admin and partnership states consistent'
