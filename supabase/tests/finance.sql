\set ON_ERROR_STOP on
begin;
set local app.system_reason='Synthetic financial plan tests';
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label;
end $$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$ begin
 begin execute statement; exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation or not_null_violation or serialization_failure then raise notice 'PASS denied'; return; end;
 raise exception 'FAIL unexpectedly allowed: %',statement;
end $$;
insert into auth.users(id,email_confirmed_at) values ('90000000-0000-4000-8000-000000000001',now()),('90000000-0000-4000-8000-000000000002',now()),('90000000-0000-4000-8000-000000000003',now());
insert into public.global_user_roles(user_id) values ('90000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
set local role authenticated;
insert into public.projects(code,title,start_date,end_date,currency_code) values ('FIN-A','Finance A','2026-07-01','2028-06-30','EUR'),('FIN-B','Finance B','2026-01-01','2026-12-31','EUR');
select id as pa from public.projects where code='FIN-A' \gset
select id as pb from public.projects where code='FIN-B' \gset
insert into public.project_memberships(project_id,user_id) values (:'pa','90000000-0000-4000-8000-000000000002'),(:'pb','90000000-0000-4000-8000-000000000003');
insert into public.organizations(code,name) values ('FIN-A','Partner A'),('FIN-B','Partner B');
insert into public.project_organizations(project_id,organization_id,role) select :'pa',id,case when code='FIN-A' then 'lead' else 'partner' end from public.organizations where code in ('FIN-A','FIN-B');
insert into public.project_organizations(project_id,organization_id,role) select :'pb',id,'sole' from public.organizations where code='FIN-A';
select id as p1 from public.project_organizations where project_id=:'pa' and role='lead' \gset
select id as p2 from public.project_organizations where project_id=:'pa' and role='partner' \gset
select id as p3 from public.project_organizations where project_id=:'pb' \gset
select public.edit_financial_plan(:'pa','save_account',null,jsonb_build_object('partner_id',:'p1','name','Account A')) as a1 \gset
select public.edit_financial_plan(:'pa','save_account',null,jsonb_build_object('partner_id',:'p2','name','Account B')) as a2 \gset
select public.edit_financial_plan(:'pb','save_account',null,jsonb_build_object('partner_id',:'p3','name','Other account')) as a3 \gset
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_entry'',null,%L)',:'pa',jsonb_build_object('kind','income','reference','NO-PLAN','description','No plan','partner_id',:'p1','account_id',:'a1','entry_date','2026-07-01','original_currency_code','EUR','original_amount','100','register','true')::text));
select public.edit_financial_plan(:'pa','create_revision',null,'{"title":"Initial","reason":"Donor approval"}') as r1 \gset
select public.edit_financial_plan(:'pa','save_line',1,jsonb_build_object('revision_id',:'r1','code','A1','category_code','A','category_name','Personnel','description','Staff','planned_amount','1000'));
select id as line, line_item_id as item from public.budget_lines where revision_id=:'r1' \gset
select public.edit_financial_plan(:'pa','save_allocation',2,jsonb_build_object('revision_id',:'r1','budget_line_id',:'line','partner_id',:'p1','project_year','1','amount','600'));
select public.edit_financial_plan(:'pa','save_allocation',3,jsonb_build_object('revision_id',:'r1','budget_line_id',:'line','partner_id',:'p2','project_year','2','amount','400'));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_allocation'',4,%L)',:'pa',jsonb_build_object('revision_id',:'r1','budget_line_id',:'line','partner_id',:'p2','project_year','2','amount','401')::text));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_line'',4,%L)',:'pa',jsonb_build_object('revision_id',:'r1','line_item_id',:'item','category_code','A','category_name','Personnel','description','Staff','planned_amount','999')::text));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_allocation'',4,%L)',:'pa',jsonb_build_object('revision_id',:'r1','budget_line_id',:'line','partner_id',:'p3','amount','1')::text));
select public.edit_financial_plan(:'pa','publish',4,jsonb_build_object('revision_id',:'r1','title','Initial','reason','Donor approval'));
select pg_temp.denied(format('update public.projects set currency_code=''USD'' where id=%L',:'pa'));
insert into public.organizations(code,name) values ('FIN-C','Unused organization');
select pg_temp.denied(format('update public.project_organizations set organization_id=(select id from public.organizations where code=''FIN-C'') where id=%L',:'p1'));
select pg_temp.check_true((select initial_revision_id=current_revision_id from public.project_budget_state where project_id=:'pa'),'Baseline and current pointers');
select pg_temp.denied('update public.budget_lines set planned_amount=1');
select public.edit_financial_plan(:'pa','save_entry',null,jsonb_build_object('kind','income','reference','IN-1','description','Donor tranche','partner_id',:'p1','account_id',:'a1','entry_date','2026-07-01','original_currency_code','EUR','original_amount','800','register','true')) as income \gset
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_entry'',null,%L)',:'pa',jsonb_build_object('kind','income','reference','WRONG-ACCOUNT','description','Bad','partner_id',:'p1','account_id',:'a2','entry_date','2026-07-01','original_currency_code','EUR','original_amount','100','register','true')::text));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_entry'',null,%L)',:'pa',jsonb_build_object('kind','income','reference','OTHER-ACCOUNT','description','Bad','partner_id',:'p3','account_id',:'a3','entry_date','2026-07-01','original_currency_code','EUR','original_amount','100','register','true')::text));
select public.edit_financial_plan(:'pa','save_entry',null,jsonb_build_object('kind','commitment','reference','CO-1','description','Contract','partner_id',:'p1','line_item_id',:'item','entry_date','2026-07-02','original_currency_code','EUR','original_amount','600','register','true')) as commitment \gset
select public.edit_financial_plan(:'pa','save_entry',null,jsonb_build_object('kind','expense','reference','EX-1','description','Partial payment','partner_id',:'p1','account_id',:'a1','line_item_id',:'item','commitment_id',:'commitment','entry_date','2026-07-03','original_currency_code','EUR','original_amount','200','register','true')) as expense \gset
select public.edit_financial_plan(:'pa','save_entry',null,jsonb_build_object('kind','expense','reference','EX-2','description','Direct payment','partner_id',:'p2','line_item_id',:'item','entry_date','2026-07-04','original_currency_code','EUR','original_amount','100','register','true'));
reset role;
select pg_temp.check_true(app_private.finance_used(:'pa',:'item')=700,'1000 plan - 300 paid - 400 open = 300 available; no double count');
set local role authenticated;
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_entry'',null,%L)',:'pa',jsonb_build_object('kind','expense','reference','OVER','description','Overpayment','partner_id',:'p1','line_item_id',:'item','commitment_id',:'commitment','entry_date','2026-07-05','original_currency_code','EUR','original_amount','401','register','true','notes','Cannot override hard cap')::text));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''void_entry'',1,%L)',:'pa',jsonb_build_object('id',:'commitment','reason','Has payments')::text));
select public.edit_financial_plan(:'pa','save_entry',null,jsonb_build_object('kind','transfer','reference','TR-1','description','Partner funding','partner_id',:'p1','account_id',:'a1','destination_partner_id',:'p2','destination_account_id',:'a2','entry_date','2026-07-05','original_currency_code','EUR','original_amount','300','register','true'));
select pg_temp.check_true((select sum(amount)=800 from public.financial_entries where project_id=:'pa' and kind='income' and status='posted'),'Transfer does not increase donor receipts');
select public.edit_financial_plan(:'pa','close_commitment',1,jsonb_build_object('id',:'commitment','reason','Contract settled below estimate'));
reset role;
select pg_temp.check_true(app_private.finance_used(:'pa',:'item')=300,'Closing frees unpaid commitment');
set local role authenticated;
select public.edit_financial_plan(:'pa','void_entry',1,jsonb_build_object('id',:'expense','reason','Correction'));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_entry'',null,%L)',:'pa',jsonb_build_object('kind','expense','reference','CLOSED','description','Closed commitment','partner_id',:'p1','line_item_id',:'item','commitment_id',:'commitment','entry_date','2026-07-06','original_currency_code','EUR','original_amount','1','register','true')::text));
select public.edit_financial_plan(:'pa','save_entry',null,jsonb_build_object('kind','expense','reference','FX-DRAFT','description','Missing exchange rate','partner_id',:'p2','line_item_id',:'item','entry_date','2026-08-06','original_currency_code','USD','original_amount','100','register','false')) as foreign_draft \gset
select pg_temp.check_true((select amount is null from public.financial_entries where id=:'foreign_draft'),'Missing rate remains unknown, not 1');
select public.edit_financial_plan(:'pa','void_entry',1,jsonb_build_object('id',:'foreign_draft','reason','Discard draft'));
select public.edit_financial_plan(:'pa','save_rate',0,'{"source_currency_code":"USD","rate_month":"2026-08-01","rate":"0.9","source":"Synthetic source","calculation_method":"Monthly mean","observed_at":"2026-08-31"}') as rate1 \gset
select public.edit_financial_plan(:'pa','save_entry',null,jsonb_build_object('kind','expense','reference','FX-POSTED','description','Foreign payment','partner_id',:'p2','line_item_id',:'item','entry_date','2026-08-06','original_currency_code','USD','original_amount','100','register','true')) as fx \gset
select public.edit_financial_plan(:'pa','save_rate',1,'{"source_currency_code":"USD","rate_month":"2026-08-01","rate":"0.92","source":"Synthetic source","calculation_method":"Monthly mean","observed_at":"2026-08-31","reason":"Correction"}');
select pg_temp.check_true((select amount=90 and applied_rate=0.9 and exchange_rate_id=:'rate1' from public.financial_entries where id=:'fx'),'Posted exchange rate frozen across rate revisions');
select public.edit_financial_plan(:'pa','create_revision',null,'{"title":"Second","reason":"Revision"}') as r2 \gset
select pg_temp.check_true((select count(*)=2 from public.budget_allocations ba join public.budget_lines l on l.id=ba.budget_line_id where revision_id=:'r2'),'Complete allocations cloned');
select pg_temp.denied(format('select public.edit_financial_plan(%L,''publish'',99,%L)',:'pa',jsonb_build_object('revision_id',:'r2','title','Second','reason','Stale')::text));
reset role;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.financial_entries),'Other manager cannot read movements');
select pg_temp.check_true(public.financial_snapshot(:'pa') is null,'Snapshot respects project authorization');
select pg_temp.denied(format('select public.edit_financial_plan(%L,''publish'',1,%L)',:'pa',jsonb_build_object('revision_id',:'r2','title','Second','reason','Forbidden')::text));
reset role;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select public.edit_financial_plan(:'pa','publish',1,jsonb_build_object('revision_id',:'r2','title','Second','reason','Assigned manager approval'));
select pg_temp.check_true((select initial_revision_id=:'r1' and current_revision_id=:'r2' from public.project_budget_state where project_id=:'pa'),'Manager publishes without changing baseline');
select pg_temp.check_true(exists(select 1 from public.audit_log where entity_table='financial_entries' and new_values->>'amount'='90.00'),'Financial values audited');
select pg_temp.check_true(not exists(select 1 from public.audit_log where entity_table='project_bank_accounts' and new_values ? 'account_reference'),'Bank references excluded from audit');
select public.edit_financial_plan(:'pa','create_revision',null,'{"title":"Shorter project","reason":"Remove out-of-period allocation"}') as r3 \gset
select id as shorter_line from public.budget_lines where revision_id=:'r3' \gset
update public.projects set end_date='2027-06-30' where id=:'pa';
select pg_temp.denied(format('select public.edit_financial_plan(%L,''publish'',1,%L)',:'pa',jsonb_build_object('revision_id',:'r3','title','Shorter project','reason','Invalid allocation')::text));
select public.edit_financial_plan(:'pa','save_allocation',1,jsonb_build_object('revision_id',:'r3','budget_line_id',:'shorter_line','partner_id',:'p2','project_year','2','amount','0'));
select public.edit_financial_plan(:'pa','publish',2,jsonb_build_object('revision_id',:'r3','title','Shorter project','reason','Out-of-period allocation removed'));
select pg_temp.check_true((select current_revision_id=:'r3' from public.project_budget_state where project_id=:'pa'),'Shortened project can remove obsolete year allocation and publish');
update public.projects set status='archived' where id=:'pa';
select pg_temp.denied(format('select public.edit_financial_plan(%L,''create_revision'',null,''{"title":"No","reason":"Archived"}'')',:'pa'));
reset role;
set local role anon;
select pg_temp.denied('select * from public.financial_entries');
select pg_temp.denied('select public.financial_snapshot(null)');
select pg_temp.denied('select public.edit_financial_plan(null,''create_revision'',null,''{}'')');
reset role;
rollback;
