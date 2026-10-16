\set ON_ERROR_STOP on
begin;
set local app.system_reason='Activities synthetic tests';
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label;
end $$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$ begin
 begin execute statement; exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation or not_null_violation then raise notice 'PASS denied: %',statement; return; end;
 raise exception 'FAIL unexpectedly allowed: %',statement;
end $$;
insert into auth.users(id,email_confirmed_at) values
 ('80000000-0000-4000-8000-000000000001',now()),('80000000-0000-4000-8000-000000000002',now()),('80000000-0000-4000-8000-000000000003',now());
insert into public.global_user_roles(user_id) values ('80000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
set local role authenticated;
insert into public.projects(code,title,start_date,end_date,currency_code) values ('ACT-A','A','2026-01-01','2026-12-31','EUR'),('ACT-B','B','2026-01-01','2026-12-31','EUR');
select id as project_a from public.projects where code='ACT-A' \gset
select id as project_b from public.projects where code='ACT-B' \gset
insert into public.project_memberships(project_id,user_id) values (:'project_a','80000000-0000-4000-8000-000000000002'),(:'project_b','80000000-0000-4000-8000-000000000003');
insert into public.logical_framework_items(project_id,type,code,title) values (:'project_a','general_objective','OG1','General'),(:'project_b','general_objective','OG1','Other project');
select id as general_a from public.logical_framework_items where project_id=:'project_a' \gset
select id as general_b from public.logical_framework_items where project_id=:'project_b' \gset
insert into public.logical_framework_items(project_id,type,code,title,parent_id) values (:'project_a','specific_objective','OS1','Specific',:'general_a');
select id as specific_a from public.logical_framework_items where code='OS1' \gset
insert into public.logical_framework_items(project_id,type,code,title,parent_id) values (:'project_a','expected_result','R1','Result',:'specific_a');
select id as result_a from public.logical_framework_items where code='R1' \gset

insert into public.activities(project_id,result_id,code,title,planned_start_date,planned_end_date)
values (:'project_a',:'result_a','A1','Activity','2026-10-01','2026-10-31');
select id as activity_a from public.activities where code='A1' \gset
select pg_temp.check_true((select status='planned' and actual_start_date is null and actual_end_date is null from public.activities where id=:'activity_a'),'Planned activity needs no actual dates');
select pg_temp.denied(format('insert into public.activities(project_id,result_id,code,title,planned_start_date,planned_end_date) values (%L,%L,''X'',''X'',''2026-10-01'',''2026-10-31'')',:'project_b',:'result_a'));
select pg_temp.denied(format('update public.activities set result_id=%L where id=%L',:'specific_a',:'activity_a'));
select pg_temp.denied('update public.activities set planned_end_date=''2026-09-01''');
select pg_temp.denied('update public.activities set planned_start_date=null');
select pg_temp.denied('update public.activities set actual_end_date=''2026-10-31''');
select pg_temp.denied('update public.activities set actual_start_date=''infinity''');
select pg_temp.denied('update public.activities set actual_start_date=''2026-10-10'', actual_end_date=''2026-10-01''');
select pg_temp.denied('update public.activities set created_by=auth.uid()');
select pg_temp.denied('update public.activities set row_version=10');
select pg_temp.denied(format('update public.activities set project_id=%L',:'project_b'));
select pg_temp.denied('delete from public.activities');
select pg_temp.denied(format('update public.logical_framework_items set type=''general_objective'',parent_id=null where id=%L',:'result_a'));
select pg_temp.denied(format('update public.logical_framework_items set status=''archived'' where id=%L',:'result_a'));
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.check_true((select count(*)=1 from public.activities),'Assigned manager sees activity');
update public.activities set actual_start_date='2026-10-03' where id=:'activity_a' and row_version=1;
select pg_temp.check_true((select status='in_progress' and row_version=2 and created_by<>updated_by and planned_start_date='2026-10-01' from public.activities where id=:'activity_a'),'Actual start updates status and preserves plan and author');
with changed as (update public.activities set title='stale' where id=:'activity_a' and row_version=1 returning *) select pg_temp.check_true(not exists(select 1 from changed),'Stale activity write refused');
update public.activities set actual_end_date='2026-11-04' where id=:'activity_a';
select pg_temp.check_true((select status='completed' and planned_end_date='2026-10-31' from public.activities where id=:'activity_a'),'Actual finish may exceed plan without changing it');
update public.activities set actual_end_date=null where id=:'activity_a';
select pg_temp.check_true((select status='in_progress' from public.activities where id=:'activity_a'),'Correcting actual finish updates status');
update public.activities set actual_end_date='2026-11-04',sort_order=10 where id=:'activity_a';
select pg_temp.denied(format('update public.logical_framework_items set status=''archived'' where id=%L',:'result_a'));
update public.activities set status='archived' where id=:'activity_a';
select pg_temp.denied('update public.activities set title=''Archived edit''');
update public.logical_framework_items set status='archived' where id=:'result_a';
select pg_temp.denied('update public.activities set status=''planned''');
select pg_temp.denied(format('update public.logical_framework_items set type=''general_objective'',parent_id=null where id=%L',:'result_a'));
update public.logical_framework_items set status='active' where id=:'result_a';
update public.activities set status='planned' where id=:'activity_a';
select pg_temp.check_true((select status='completed' and actual_end_date='2026-11-04' from public.activities where id=:'activity_a'),'Restore preserves dates and derives correct state');
insert into public.logical_framework_items(project_id,parent_id,type,code,title) values (:'project_a',:'specific_a','expected_result','R2','Second result');
update public.activities set result_id=(select id from public.logical_framework_items where code='R2') where id=:'activity_a';
select pg_temp.check_true(exists(select 1 from public.audit_log where entity_table='activities' and project_id=:'project_a' and actor_id=auth.uid() and new_values->>'actual_end_date'='2026-11-04'),'Audit includes date changes');
update public.projects set status='archived' where id=:'project_a';
select pg_temp.denied('update public.activities set title=''Project archived''');
update public.projects set status='draft' where id=:'project_a';
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.activities),'Other project manager sees no activities');
with changed as (update public.activities set title='Forbidden' where id=:'activity_a' returning *) select pg_temp.check_true(not exists(select 1 from changed),'Cross-project update affects zero rows');
select pg_temp.denied(format('insert into public.activities(project_id,result_id,code,title,planned_start_date,planned_end_date) values (%L,%L,''X'',''X'',''2026-10-01'',''2026-10-31'')',:'project_a',:'result_a'));
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
set local role authenticated;
update public.project_memberships set status='inactive' where project_id=:'project_a';
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.activities),'Membership revocation hides activities');
reset role;
set local role anon;
select pg_temp.denied('select * from public.activities');
reset role;
select pg_temp.check_true(not has_table_privilege('service_role','public.activities','SELECT'),'Service role has no ordinary application grants');
rollback;
