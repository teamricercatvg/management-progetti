\set ON_ERROR_STOP on
begin;
set local app.system_reason='Indicators synthetic tests';
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

insert into public.indicators(project_id,framework_item_id,code,title,type,unit,aggregation_method,direction,verification_source)
values (:'project_a',:'general_a','I1','Numeric','absolute','people','last','increase','Registry');
select id as indicator_a from public.indicators where code='I1' \gset
select pg_temp.check_true((select status='draft' and baseline_value is null from public.indicators where id=:'indicator_a'),'Draft missing baseline remains NULL');
select pg_temp.denied('update public.indicators set status=''active''');
select pg_temp.denied('update public.indicators set baseline_value=0');
select pg_temp.denied('update public.indicators set baseline_date=''2026-01-01''');
select pg_temp.denied('update public.indicators set aggregation_method=''ratio_of_sums''');
select pg_temp.denied('update public.indicators set ratio_scale=100');
select pg_temp.denied('update public.indicators set baseline_value=''NaN'',baseline_date=''2026-01-01''');
select pg_temp.denied(format('update public.indicators set framework_item_id=%L',:'general_b'));
select pg_temp.denied('update public.indicators set created_by=auth.uid()');
select pg_temp.denied('update public.indicators set row_version=50');
select pg_temp.denied(format('update public.indicators set project_id=%L',:'project_b'));
select pg_temp.denied('delete from public.indicators');
update public.indicators set baseline_date='2026-01-01',baseline_value=0,target_date='2026-12-31',target_value=300,status='active' where id=:'indicator_a';
select pg_temp.check_true((select baseline_value=0 and status='active' from public.indicators where id=:'indicator_a'),'True zero baseline permits activation');
select pg_temp.denied('update public.indicators set target_date=''2025-12-31''');
select pg_temp.denied('update public.indicators set baseline_numerator=1');
select pg_temp.denied(format('insert into public.indicators(project_id,framework_item_id,code,title,type,unit,aggregation_method,direction,verification_source) values (%L,%L,''I1'',''Duplicate'',''absolute'',''people'',''last'',''increase'',''Source'')',:'project_a',:'general_a'));
insert into public.indicators(project_id,framework_item_id,code,title,type,unit,aggregation_method,direction,verification_source,ratio_scale,baseline_date,baseline_numerator,baseline_denominator,target_date,target_numerator,target_denominator,status)
values (:'project_a',:'result_a','I2','Ratio','ratio','percent','ratio_of_sums','increase','Registry',100,'2026-01-01',0,25,'2026-12-31',22,25,'active');
select id as indicator_b from public.indicators where code='I2' \gset
select pg_temp.denied('update public.indicators set target_denominator=0 where code=''I2''');
select pg_temp.denied('update public.indicators set target_denominator=null where code=''I2''');
select pg_temp.denied('update public.indicators set target_value=88 where code=''I2''');
select pg_temp.denied('update public.indicators set aggregation_method=''mean'' where code=''I2''');
update public.indicators set target_numerator=30 where code='I2';
select pg_temp.check_true((select target_numerator/target_denominator*ratio_scale=120 from public.indicators where code='I2'),'Ratios may exceed 100 percent');
select pg_temp.denied(format('update public.logical_framework_items set status=''archived'' where id=%L',:'result_a'));
select pg_temp.denied(format('update public.logical_framework_items set type=''general_objective'',parent_id=null where id=%L',:'result_a'));
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.check_true((select count(*)=2 from public.indicators),'Assigned Manager reads indicators');
select row_version as old_version from public.indicators where id=:'indicator_a' \gset
update public.indicators set title='Manager update' where id=:'indicator_a' and row_version=:'old_version';
with changed as (update public.indicators set title='Stale' where id=:'indicator_a' and row_version=:'old_version' returning *) select pg_temp.check_true(not exists(select 1 from changed),'Stale indicator write refused');
select pg_temp.check_true(exists(select 1 from public.audit_log where entity_table='indicators' and project_id=:'project_a' and actor_id=auth.uid() and (new_values->>'baseline_value')::numeric=0),'Indicator audit stores baseline');
select row_version as root_version from public.logical_framework_items where id=:'general_a' \gset
select pg_temp.check_true(public.archive_framework_branch(:'project_a',:'general_a',:'root_version'),'Archive hierarchy including indicators');
select pg_temp.check_true((select count(*)=2 from public.indicators where status='archived'),'Cascade archives all indicators');
select pg_temp.denied('update public.indicators set title=''Archived edit''');
select pg_temp.denied('update public.indicators set status=''draft''');
update public.logical_framework_items set status='active' where id=:'general_a';
update public.indicators set status='draft' where id=:'indicator_a';
select pg_temp.check_true((select baseline_value=0 and target_value=300 from public.indicators where id=:'indicator_a'),'Restore preserves baseline and target');
update public.projects set status='archived' where id=:'project_a';
select pg_temp.denied('update public.indicators set title=''Read only''');
update public.projects set status='draft' where id=:'project_a';
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.indicators),'Unassigned Manager reads no indicators');
with changed as (update public.indicators set title='Forbidden' returning *) select pg_temp.check_true(not exists(select 1 from changed),'Unassigned Manager updates no indicators');
select pg_temp.denied(format('insert into public.indicators(project_id,framework_item_id,code,title,type,unit,aggregation_method,direction,verification_source) values (%L,%L,''X'',''X'',''absolute'',''people'',''last'',''increase'',''Source'')',:'project_a',:'general_a'));
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
set local role authenticated;
update public.project_memberships set status='inactive' where project_id=:'project_a';
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.indicators),'Revocation hides indicators immediately');
reset role;
set local role anon;
select pg_temp.denied('select * from public.indicators');
reset role;
select pg_temp.check_true(not has_table_privilege('service_role','public.indicators','SELECT'),'No service-role application grant');
rollback;
