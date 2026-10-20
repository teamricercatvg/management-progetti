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

update public.activities set output='Manuale' where id=:'activity_a';
select pg_temp.check_true((select output='Manuale' from public.activities where id=:'activity_a'),'Output persists');
select pg_temp.denied('update public.activities set output=repeat(''x'',10001)');
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.denied(format('select public.archive_framework_branch(%L,%L,1)',:'project_a',:'general_a'));
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.check_true(not public.archive_framework_branch(:'project_a',:'general_a',999),'Stale root rejected');
select pg_temp.check_true((select status='planned' from public.activities where id=:'activity_a'),'Stale root leaves activity untouched');
select pg_temp.check_true(public.archive_framework_branch(:'project_a',:'general_a',1),'Manager archives branch');
select pg_temp.check_true((select count(*)=3 from public.logical_framework_items where project_id=:'project_a' and status='archived'),'All descendants archived');
select pg_temp.check_true((select status='archived' and output='Manuale' from public.activities where id=:'activity_a'),'Activity archived with output preserved');
reset role;
select pg_temp.check_true((select status='active' from public.logical_framework_items where id=:'general_b'),'Other project unchanged');
set local role anon;
select pg_temp.denied(format('select public.archive_framework_branch(%L,%L,1)',:'project_a',:'general_a'));
reset role;
rollback;
