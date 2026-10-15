\set ON_ERROR_STOP on
begin;
set local app.system_reason='Milestone 8 synthetic tests';
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label;
end $$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$ begin
 begin execute statement; exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation then raise notice 'PASS denied: %',statement; return; end;
 raise exception 'FAIL unexpectedly allowed: %',statement;
end $$;
insert into auth.users(id,email_confirmed_at) values
 ('80000000-0000-4000-8000-000000000001',now()),('80000000-0000-4000-8000-000000000002',now()),('80000000-0000-4000-8000-000000000003',now());
insert into public.global_user_roles(user_id) values ('80000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
set local role authenticated;
insert into public.projects(code,title,start_date,end_date,currency_code) values ('M8-A','A','2026-01-01','2026-12-31','EUR'),('M8-B','B','2026-01-01','2026-12-31','EUR');
select id as project_a from public.projects where code='M8-A' \gset
select id as project_b from public.projects where code='M8-B' \gset
insert into public.project_memberships(project_id,user_id) values (:'project_a','80000000-0000-4000-8000-000000000002'),(:'project_b','80000000-0000-4000-8000-000000000003');
insert into public.logical_framework_items(project_id,type,code,title) values (:'project_a','general_objective','OG1','General'),(:'project_b','general_objective','OG1','Other project');
select id as general_a from public.logical_framework_items where project_id=:'project_a' \gset
select id as general_b from public.logical_framework_items where project_id=:'project_b' \gset
insert into public.logical_framework_items(project_id,type,code,title,parent_id) values (:'project_a','specific_objective','OS1','Specific',:'general_a');
select id as specific_a from public.logical_framework_items where code='OS1' \gset
insert into public.logical_framework_items(project_id,type,code,title,parent_id) values (:'project_a','expected_result','R1','Result',:'specific_a');
select id as result_a from public.logical_framework_items where code='R1' \gset
select pg_temp.denied(format('insert into public.logical_framework_items(project_id,type,code,title,parent_id) values (%L,''specific_objective'',''X'',''X'',%L)',:'project_a',:'general_b'));
select pg_temp.denied(format('insert into public.logical_framework_items(project_id,type,code,title,parent_id) values (%L,''expected_result'',''X'',''X'',%L)',:'project_a',:'general_a'));
select pg_temp.denied(format('insert into public.logical_framework_items(project_id,type,code,title) values (%L,''specific_objective'',''X'',''X'')',:'project_a'));
select pg_temp.denied(format('update public.logical_framework_items set type=''expected_result'',parent_id=%L where id=%L',:'specific_a',:'general_a'));
select pg_temp.denied(format('update public.logical_framework_items set status=''archived'' where id=%L',:'general_a'));
select pg_temp.denied(format('update public.logical_framework_items set parent_id=id where id=%L',:'specific_a'));
select pg_temp.denied('delete from public.logical_framework_items');
select pg_temp.denied('update public.logical_framework_items set created_by=auth.uid()');
select pg_temp.denied('update public.logical_framework_items set row_version=10');
select pg_temp.denied(format('update public.logical_framework_items set project_id=%L',:'project_b'));
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.check_true((select count(*)=3 from public.logical_framework_items),'Manager reads only assigned hierarchy');
update public.logical_framework_items set sort_order=20,title='Manager edit' where id=:'result_a' and row_version=1;
select pg_temp.check_true((select sort_order=20 and row_version=2 and created_by <> updated_by from public.logical_framework_items where id=:'result_a'),'Order, version and attribution');
with changed as (update public.logical_framework_items set title='Stale' where id=:'result_a' and row_version=1 returning *) select pg_temp.check_true(not exists(select 1 from changed),'Stale update rejected');
with changed as (update public.logical_framework_items set title='Forbidden' where id=:'general_b' returning *) select pg_temp.check_true(not exists(select 1 from changed),'Cross-project update denied');
select pg_temp.denied(format('insert into public.logical_framework_items(project_id,type,code,title) values (%L,''general_objective'',''X'',''X'')',:'project_b'));
select pg_temp.denied(format('insert into public.logical_framework_items(project_id,type,code,title) values (%L,''general_objective'',''OG1'',''Duplicate'')',:'project_a'));
select pg_temp.denied('update public.logical_framework_items set sort_order=-1');
update public.logical_framework_items set status='archived' where id=:'result_a';
select pg_temp.denied(format('update public.logical_framework_items set title=''Archived edit'' where id=%L',:'result_a'));
update public.logical_framework_items set status='archived' where id=:'specific_a';
select pg_temp.denied(format('update public.logical_framework_items set status=''active'' where id=%L',:'result_a'));
update public.logical_framework_items set status='active' where id=:'specific_a';
update public.logical_framework_items set status='active' where id=:'result_a';
insert into public.logical_framework_items(project_id,type,code,title,parent_id) values (:'project_a','specific_objective','OS2','Second',:'general_a');
update public.logical_framework_items set parent_id=(select id from public.logical_framework_items where code='OS2') where id=:'result_a';
select pg_temp.check_true(exists(select 1 from public.audit_log where entity_table='logical_framework_items' and project_id=:'project_a' and actor_id=auth.uid() and new_values->>'sort_order'='20'),'Project-scoped audit records structural changes');
update public.projects set status='archived' where id=:'project_a';
select pg_temp.denied(format('update public.logical_framework_items set title=''Archived project edit'' where id=%L',:'result_a'));
select pg_temp.denied(format('insert into public.logical_framework_items(project_id,type,code,title) values (%L,''general_objective'',''X'',''X'')',:'project_a'));
update public.projects set status='draft' where id=:'project_a';
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
set local role authenticated;
update public.project_memberships set status='inactive' where project_id=:'project_a';
select public.set_profile_active('80000000-0000-4000-8000-000000000003',false);
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.logical_framework_items),'Revoked membership hides hierarchy');
select pg_temp.denied(format('insert into public.logical_framework_items(project_id,type,code,title) values (%L,''general_objective'',''X'',''X'')',:'project_a'));
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.logical_framework_items),'Disabled profile hides hierarchy');
reset role;
set local role anon;
select pg_temp.denied('select * from public.logical_framework_items');
reset role;
select pg_temp.check_true(not has_table_privilege('service_role','public.logical_framework_items','SELECT'),'No service role application access');
rollback;
