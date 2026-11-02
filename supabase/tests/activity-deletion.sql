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

select id as child_id from public.activities where code='SUB' \gset
select id as admin_id from public.activities where code='ADM' \gset
select public.edit_schedule(:'project_a','create',null,'{"title":"Initial","reason":"Planning"}') as draft_id \gset
select public.edit_schedule(:'project_a','period',1,jsonb_build_object('activity_id',:'activity_a','title','Phase','start_date','2026-01-01','end_date','2026-02-01'));
-- Manager can trash/restore; direct client deletion and forged deletion fields denied.
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.denied(format('update public.activities set deleted_at=now(),deleted_by=auth.uid() where id=%L',:'activity_a'));
select pg_temp.denied(format('delete from public.activities where id=%L',:'activity_a'));
select public.change_activity_deletion(:'project_a',:'activity_a',1,'trash');
select pg_temp.check_true((select deleted_at is not null and status='planned' from public.activities where id=:'activity_a'),'Trash preserves original status');
select pg_temp.check_true((select deleted_at is null from public.activities where id=:'child_id'),'No cascade on child');
select pg_temp.check_true((select status='cancelled' from public.activity_schedule_periods where activity_id=:'activity_a'),'Draft period cancelled');
select pg_temp.check_true((select row_version=3 from public.schedule_revisions where id=:'draft_id'),'Draft version incremented');
select pg_temp.denied(format('update public.activities set title=''Hidden write'' where id=%L',:'activity_a'));
select pg_temp.denied(format('select public.change_activity_deletion(%L,%L,2,''purge'')',:'project_a',:'activity_a'));
select public.change_activity_deletion(:'project_a',:'child_id',1,'trash');
select pg_temp.denied(format('select public.change_activity_deletion(%L,%L,2,''restore'')',:'project_a',:'child_id'));
select public.change_activity_deletion(:'project_a',:'activity_a',2,'restore');
select public.change_activity_deletion(:'project_a',:'child_id',2,'restore');
select pg_temp.check_true((select status='cancelled' from public.activity_schedule_periods where activity_id=:'activity_a'),'Restore does not reactivate periods');
-- Stale write cannot delete restored row.
do $$ begin
 begin perform public.change_activity_deletion((select project_id from public.activities where code='A1'),(select id from public.activities where code='A1'),1,'trash'); raise exception 'Expected stale failure';
 exception when serialization_failure then raise notice 'PASS stale activity rejected'; end;
end $$;
-- Publishing excludes trash; historical references protect physical records.
select public.change_activity_deletion(:'project_a',:'admin_id',1,'trash');
select public.edit_schedule(:'project_a','publish',3,'{"reason":"Preserve history"}');
select pg_temp.check_true((select jsonb_array_length(activity_snapshot)=2 from public.schedule_revisions where id=:'draft_id'),'Snapshot excludes deleted rows');
select public.change_activity_deletion(:'project_a',:'activity_a',3,'trash');
select public.change_activity_deletion(:'project_a',:'child_id',3,'trash');
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.denied(format('select public.change_activity_deletion(%L,%L,4,''purge'')',:'project_a',:'activity_a'));
select pg_temp.denied(format('select public.change_activity_deletion(%L,%L,4,''purge'')',:'project_a',:'child_id'));
select public.change_activity_deletion(:'project_a',:'admin_id',2,'purge');
select pg_temp.check_true(not exists(select 1 from public.activities where id=:'admin_id'),'Admin purges non-historical activity');
select pg_temp.check_true(exists(select 1 from public.audit_log where entity_table='activities' and entity_id=:'admin_id' and action='DELETE'),'Purge audited');
-- Archived row can go to trash and return to archive, independently of execution status.
insert into public.activities(project_id,code,title) values(:'project_a','TEMP','Temporary');
select id as temp_id from public.activities where code='TEMP' \gset
update public.activities set status='archived' where id=:'temp_id';
select public.change_activity_deletion(:'project_a',:'temp_id',2,'trash');
select public.change_activity_deletion(:'project_a',:'temp_id',3,'restore');
select pg_temp.check_true((select status='archived' from public.activities where id=:'temp_id'),'Restore preserves archive');
-- Removing draft-only periods is atomic and changes the draft version.
update public.activities set status='planned' where id=:'temp_id';
select public.edit_schedule(:'project_a','create',null,'{"title":"Next","reason":"Draft"}') as next_id \gset
select public.edit_schedule(:'project_a','period',1,jsonb_build_object('activity_id',:'temp_id','title','Temporary','start_date','2026-03-01','end_date','2026-03-31'));
select public.change_activity_deletion(:'project_a',:'temp_id',5,'trash');
select public.change_activity_deletion(:'project_a',:'temp_id',6,'purge');
select pg_temp.check_true(not exists(select 1 from public.activity_schedule_periods where activity_id=:'temp_id'),'Draft-only periods purged');
select pg_temp.check_true((select row_version=4 from public.schedule_revisions where id=:'next_id'),'Purge increments draft version');
-- Wrong project and unauthorized user denied.
select pg_temp.denied(format('select public.change_activity_deletion(%L,%L,4,''restore'')',:'project_b',:'activity_a'));
reset role;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.denied(format('select public.change_activity_deletion(%L,%L,4,''restore'')',:'project_a',:'activity_a'));
reset role;
set local role anon;
select pg_temp.denied('select public.change_activity_deletion(null,null,1,''trash'')');
reset role;
rollback;
