#!/usr/bin/env bash
set -euo pipefail
container=${1:?Disposable container required}
[[ "$container" == ariadne-m3-* ]] || exit 1
sql() { docker exec -i "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1; }
work=$(mktemp -d /tmp/ariadne-finance-race-XXXXXXXX)
trap 'rm -rf -- "$work"' EXIT
sql <<'SQL'
begin;
set local app.system_reason='Finance concurrency fixtures';
insert into public.projects(id,code,title,start_date,end_date,currency_code) values ('94000000-0000-4000-8000-000000000001','FIN-RACE','Finance race','2026-01-01','2026-12-31','EUR');
insert into public.organizations(id,code,name) values ('94000000-0000-4000-8000-000000000002','FIN-RACE','Race organization');
insert into public.project_organizations(id,project_id,organization_id,role) values ('94000000-0000-4000-8000-000000000003','94000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002','sole');
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.edit_financial_plan('94000000-0000-4000-8000-000000000001','create_revision',null,'{"title":"Race","reason":"Concurrency test"}') as r \gset
select public.edit_financial_plan('94000000-0000-4000-8000-000000000001','save_line',1,jsonb_build_object('revision_id',:'r','code','RACE','category_code','R','category_name','Race','description','Race line','planned_amount','1000'));
select public.edit_financial_plan('94000000-0000-4000-8000-000000000001','publish',2,jsonb_build_object('revision_id',:'r','title','Race','reason','Concurrency test'));
select id as item from public.budget_line_items where project_id='94000000-0000-4000-8000-000000000001' \gset
select public.edit_financial_plan('94000000-0000-4000-8000-000000000001','save_entry',null,jsonb_build_object('id','94000000-0000-4000-8000-000000000004','kind','commitment','reference','CONTRACT','description','Contract','partner_id','94000000-0000-4000-8000-000000000003','line_item_id',:'item','entry_date','2026-01-01','original_currency_code','EUR','original_amount','600','register','true','notes','Partner allocation pending'));
commit;
SQL
cat <<'SQL' | docker exec -i -e PGAPPNAME=ariadne_finance_race "$container" psql -X -qAt -h /tmp -U postgres -d foundation_test -v ON_ERROR_STOP=1 > "$work/first" 2>&1 &
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
select id as item from public.budget_line_items where project_id='94000000-0000-4000-8000-000000000001' \gset
select public.edit_financial_plan('94000000-0000-4000-8000-000000000001','save_entry',null,jsonb_build_object('kind','expense','reference','PAY-1','description','Concurrent payment','partner_id','94000000-0000-4000-8000-000000000003','line_item_id',:'item','commitment_id','94000000-0000-4000-8000-000000000004','entry_date','2026-02-01','original_currency_code','EUR','original_amount','400','register','true','notes','Concurrency test'));
select pg_sleep(3);
commit;
SQL
job=$!
ready=false
for attempt in $(seq 1 30); do
 if [[ "$(echo "select count(*) from pg_stat_activity where application_name='ariadne_finance_race' and wait_event='PgSleep'" | sql)" == 1 ]]; then ready=true; break; fi
 sleep 0.1
done
[[ "$ready" == true ]] || { cat "$work/first"; wait "$job"; exit 1; }
if sql > "$work/second" 2>&1 <<'SQL'
begin;
set local request.jwt.claim.sub='60000000-0000-0000-0000-000000000002';
set local role authenticated;
select id as item from public.budget_line_items where project_id='94000000-0000-4000-8000-000000000001' \gset
select public.edit_financial_plan('94000000-0000-4000-8000-000000000001','save_entry',null,jsonb_build_object('kind','expense','reference','PAY-2','description','Concurrent payment','partner_id','94000000-0000-4000-8000-000000000003','line_item_id',:'item','commitment_id','94000000-0000-4000-8000-000000000004','entry_date','2026-02-01','original_currency_code','EUR','original_amount','400','register','true','notes','Concurrency test'));
commit;
SQL
then wait "$job"; echo 'FAIL: concurrent payments exceeded commitment'; exit 1; fi
wait "$job"
grep -q 'Il pagamento supera il residuo' "$work/second"
[[ "$(echo "select sum(amount) from public.financial_entries where commitment_id='94000000-0000-4000-8000-000000000004' and status='posted'" | sql)" == 400.00 ]]
echo 'PASS: concurrent payments serialized; second payment cannot exceed commitment'
