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


insert into public.activities(project_id,result_id,code,title) values (:'project_a',:'result_a','A1','QL activity');
select id as activity_a from public.activities where code='A1' \gset
insert into public.activities(project_id,code,title,category,parent_activity_id) values (:'project_a','SUB','Phase','subactivity',:'activity_a');
insert into public.activities(project_id,code,title,category) values (:'project_a','ADM','Administration','administrative');
select pg_temp.check_true((select count(*)=3 from public.activities),'QL, child and independent activities');
select pg_temp.denied(format('update public.activities set result_id=null where id=%L',:'activity_a'));
select pg_temp.denied(format('insert into public.activities(project_id,parent_activity_id,code,title) values(%L,%L,''BAD'',''Bad'')',:'project_b',:'activity_a'));
select pg_temp.denied('update public.activities set planned_start_date=''2026-01-01''');
select pg_temp.denied('update public.activities set status=''cancelled''');
update public.activities set actual_start_date='2026-01-02',actual_end_date='2027-01-01',cancellation_reason='Stopped',status='cancelled' where id=:'activity_a';
update public.activities set status='archived' where id=:'activity_a';
update public.activities set status='planned' where id=:'activity_a';
select pg_temp.check_true((select status='cancelled' and actual_end_date='2027-01-01' from public.activities where id=:'activity_a'),'Archive/restore preserves cancellation and actual dates');
update public.activities set cancellation_reason=null,status='planned' where id=:'activity_a';
select pg_temp.check_true((select status='completed' from public.activities where id=:'activity_a'),'Resume derives state from retained dates');
select public.edit_schedule(:'project_a','create',null,'{"title":"Initial","reason":"Planning"}') as draft_id \gset
select public.edit_schedule(:'project_a','period',1,jsonb_build_object('activity_id',:'activity_a','title','Phase 1','start_date','2026-01-01','end_date','2026-02-01'));
select public.edit_schedule(:'project_a','period',2,jsonb_build_object('activity_id',:'activity_a','title','Phase 2','start_date','2026-03-01','end_date','2026-04-01'));
select pg_temp.denied(format('insert into public.schedule_revisions(project_id,revision_number,title,reason) values(%L,8,''Forged'',''Forged'')',:'project_a'));
select public.edit_schedule(:'project_a','publish',3,'{"reason":"Initial agreement"}');
select pg_temp.check_true((select initial_revision_id=current_revision_id from public.project_schedule_state where project_id=:'project_a'),'First publish establishes both pointers');
select pg_temp.check_true((select jsonb_array_length(activity_snapshot)=3 from public.schedule_revisions where id=:'draft_id'),'Complete activity snapshot');
select pg_temp.denied('update public.schedule_revisions set status=''draft''');
select pg_temp.denied('update public.activity_schedule_periods set end_date=''2026-12-31''');
select pg_temp.denied(format('update public.projects set start_date=''2026-02-01'' where id=%L',:'project_a'));
select public.edit_schedule(:'project_a','create',null,'{"title":"Revision","reason":"Change"}') as second_id \gset
select pg_temp.check_true((select count(*)=2 from public.activity_schedule_periods where revision_id=:'second_id'),'Complete snapshot copy');
select period_key as key from public.activity_schedule_periods where revision_id=:'second_id' order by start_date limit 1 \gset
select public.edit_schedule(:'project_a','period',1,jsonb_build_object('activity_id',:'activity_a','period_key',:'key','title','Phase changed','start_date','2025-12-01','end_date','2026-02-01'));
select pg_temp.denied(format('select public.edit_schedule(%L,''publish'',2,''{"reason":"Invalid dates"}'')',:'project_a'));
select public.edit_schedule(:'project_a','period',2,jsonb_build_object('activity_id',:'activity_a','period_key',:'key','title','Phase cancelled','start_date','2025-12-01','end_date','2026-02-01','status','cancelled'));
-- Assigned manager can publish; unauthorized manager cannot see or mutate.
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.schedule_revisions),'Other project manager sees no revisions');
select pg_temp.denied(format('select public.edit_schedule(%L,''publish'',3,''{"reason":"Forbidden"}'')',:'project_a'));
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select public.edit_schedule(:'project_a','publish',3,'{"reason":"Manager revision"}');
select pg_temp.check_true((select initial_revision_id=:'draft_id' and current_revision_id=:'second_id' from public.project_schedule_state where project_id=:'project_a'),'Revision preserves baseline and advances current');
select pg_temp.check_true((select start_date='2026-01-01' from public.activity_schedule_periods where revision_id=:'draft_id' and period_key=:'key'),'Original interval unchanged');
select pg_temp.check_true(exists(select 1 from public.audit_log where entity_table='schedule_revisions' and new_values->>'status'='approved'),'Publication audited');
-- Check stale write explicitly (serialization failure is intentionally retriable).
do $$ begin
 begin perform public.edit_schedule((select project_id from public.schedule_revisions limit 1),'publish',1,'{"reason":"stale"}'); raise exception 'Expected stale failure';
 exception when serialization_failure then raise notice 'PASS stale revision rejected'; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
set local role authenticated;
update public.project_memberships set status='inactive' where project_id=:'project_a';
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.schedule_revisions),'Revoked manager loses schedule access');
select pg_temp.denied(format('select public.edit_schedule(%L,''create'',null,''{"title":"No","reason":"No"}'')',:'project_a'));
reset role;
set local role anon;
select pg_temp.denied('select * from public.activity_schedule_periods');
select pg_temp.denied('select public.edit_schedule(null,''create'',null,''{}'')');
reset role;
rollback;
