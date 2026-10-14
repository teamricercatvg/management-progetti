#!/usr/bin/env bash
set -euo pipefail
container=${1:?Disposable container required}
[[ "$container" == ariadne-m3-* ]] || exit 1
sql() { docker exec -i "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1; }
sql <<'SQL'
begin;
set local app.system_reason='M5 concurrent authorization fixtures';
insert into auth.users(id,email_confirmed_at) values ('60000000-0000-0000-0000-000000000001',now()),('60000000-0000-0000-0000-000000000002',now());
insert into public.global_user_roles(user_id) select id from public.profiles where id::text like '60000000%';
commit;
SQL
work=$(mktemp -d /tmp/ariadne-rls-race-XXXXXXXX)
trap 'rm -rf -- "$work"' EXIT
{
cat <<'SQL'
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.set_profile_active('60000000-0000-0000-0000-000000000001',false);
select pg_sleep(3);
commit;
SQL
} | docker exec -i -e PGAPPNAME=ariadne_rls_race "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1 > "$work/first" 2>&1 &
job=$!
ready=false
for attempt in $(seq 1 30); do
 if [[ "$(echo "select count(*) from pg_stat_activity where application_name='ariadne_rls_race' and wait_event='PgSleep'" | sql)" == 1 ]]; then ready=true; break; fi
 sleep 0.1
done
[[ "$ready" == true ]] || { cat "$work/first"; wait "$job"; exit 1; }
if sql > "$work/second" 2>&1 <<'SQL'
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.set_admin_role('60000000-0000-0000-0000-000000000002',false);
commit;
SQL
then wait "$job"; echo 'FAIL concurrent last Admin removal succeeded'; exit 1; fi
wait "$job"
grep -q 'last active admin' "$work/second"
[[ "$(echo 'select count(*) from public.global_user_roles r join public.profiles p on p.id=r.user_id where p.is_active' | sql)" == 1 ]]
echo 'PASS: authenticated concurrent Admin RPCs preserve last active Admin'
