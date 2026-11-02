-- Approved 30 October: recoverable trash, Admin-only purge without historical references.
begin;
alter table public.activities add column deleted_at timestamptz,
 add column deleted_by uuid references public.profiles(id),
 add check ((deleted_at is null) = (deleted_by is null));
create index activities_deleted_by_idx on public.activities(deleted_by) where deleted_by is not null;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='ariadne_activity_lifecycle') then create role ariadne_activity_lifecycle nologin noinherit; end if;
 if exists(select 1 from pg_roles where rolname='ariadne_activity_lifecycle' and (rolcanlogin or rolsuper or rolbypassrls or rolcreaterole or rolcreatedb)) or exists(select 1 from pg_auth_members where roleid='ariadne_activity_lifecycle'::regrole) then raise exception 'Unsafe lifecycle role'; end if;
end $$;
grant usage on schema public,app_private,auth to ariadne_activity_lifecycle;
grant execute on function auth.uid(),app_private.can_access_project(uuid),app_private.is_admin() to ariadne_activity_lifecycle;
grant select,update on public.projects to ariadne_activity_lifecycle;
grant select,delete on public.activities,public.activity_schedule_periods to ariadne_activity_lifecycle;
grant update(deleted_at,deleted_by) on public.activities to ariadne_activity_lifecycle;
grant update(status) on public.activity_schedule_periods to ariadne_activity_lifecycle;
grant select,update on public.schedule_revisions to ariadne_activity_lifecycle;
create policy lifecycle_projects on public.projects to ariadne_activity_lifecycle using(true) with check(true);
create policy lifecycle_activities on public.activities to ariadne_activity_lifecycle using(true) with check(true);
create policy lifecycle_periods on public.activity_schedule_periods to ariadne_activity_lifecycle using(true) with check(true);
create policy lifecycle_revisions on public.schedule_revisions to ariadne_activity_lifecycle using(true) with check(true);
create or replace function app_private.guard_activity() returns trigger
language plpgsql security definer set search_path='' as $$
declare r record;
begin
 if tg_op='UPDATE' then
  if old.deleted_at is not null and new.deleted_at is not null then
   raise exception 'Restore deleted activity separately' using errcode='23514'; end if;
  if (new.deleted_at,new.deleted_by) is distinct from (old.deleted_at,old.deleted_by) then
   if (to_jsonb(new)-array['deleted_at','deleted_by']) is distinct from (to_jsonb(old)-array['deleted_at','deleted_by']) then
    raise exception 'Deletion and restore are separate operations' using errcode='23514'; end if;
   if new.deleted_at is not null then return new; end if;
  end if;
  if new.planned_start_date is distinct from old.planned_start_date or new.planned_end_date is distinct from old.planned_end_date then
   raise exception 'Use schedule periods' using errcode='23514'; end if;
  if old.deleted_at is null and old.status='archived' and (new.status='archived' or (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status')) then
   raise exception 'Restore separately' using errcode='23514'; end if;
  if new.result_id is null and old.result_id is not null and exists(select 1 from public.activities where parent_activity_id=old.id) then
   raise exception 'Activity referenced by subactivities must stay in framework' using errcode='23514'; end if;
 end if;
 if new.result_id is not null then
  select type,status into r from public.logical_framework_items where id=new.result_id and project_id=new.project_id;
  if r.type is distinct from 'expected_result' or (new.status<>'archived' and r.status is distinct from 'active') then
   raise exception 'Active result in same project required' using errcode='23514'; end if;
 end if;
 if new.parent_activity_id is not null then
  select result_id,status,deleted_at into r from public.activities where id=new.parent_activity_id and project_id=new.project_id;
  if r.result_id is null or r.deleted_at is not null or (new.status<>'archived' and r.status='archived') then
   raise exception 'Active framework activity required as parent' using errcode='23514'; end if;
 end if;
 if new.status='cancelled' and new.cancellation_reason is null then
  raise exception 'Cancellation reason required' using errcode='23514'; end if;
 if new.status<>'archived' then
  new.status := case when new.cancellation_reason is not null then 'cancelled' when new.actual_end_date is not null then 'completed' when new.actual_start_date is not null then 'in_progress' else 'planned' end;
 end if;
 return new;
end $$;
create or replace function public.edit_schedule(target_project uuid, command text, expected_version bigint default null, payload jsonb default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare p record; d record; current_id uuid; initial_id uuid; new_id uuid; n integer;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'READ COMMITTED required' using errcode='25000'; end if;
 select * into p from public.projects where id=target_project for update;
 if not found or not app_private.can_access_project(target_project) or p.status='archived' then raise insufficient_privilege; end if;
 select current_revision_id,initial_revision_id into current_id,initial_id from public.project_schedule_state where project_id=target_project;
 select * into d from public.schedule_revisions where project_id=target_project and status='draft';
 if command='create' then
  if d.id is not null then raise exception 'Draft already exists' using errcode='40001'; end if;
  select coalesce(max(revision_number),0)+1 into n from public.schedule_revisions where project_id=target_project;
  insert into public.schedule_revisions(project_id,revision_number,based_on_id,title,reason)
   values(target_project,n,current_id,payload->>'title',payload->>'reason') returning id into new_id;
  insert into public.activity_schedule_periods(project_id,revision_id,activity_id,period_key,start_date,end_date,title,status,notes)
   select project_id,new_id,activity_id,period_key,start_date,end_date,title,status,notes from public.activity_schedule_periods where revision_id=current_id;
  return new_id;
 end if;
 if d.id is null or d.row_version is distinct from expected_version or d.based_on_id is distinct from current_id then
  raise exception 'Stale draft; reload' using errcode='40001'; end if;
 if command='period' then
  if not exists(select 1 from public.activities where id=(payload->>'activity_id')::uuid and project_id=target_project and deleted_at is null and status not in ('archived','cancelled')) and coalesce(payload->>'status','planned')<>'cancelled' then
   raise exception 'Active activity required' using errcode='23514'; end if;
  insert into public.activity_schedule_periods(project_id,revision_id,activity_id,period_key,start_date,end_date,title,status,notes)
   values(target_project,d.id,(payload->>'activity_id')::uuid,coalesce((payload->>'period_key')::uuid,gen_random_uuid()),(payload->>'start_date')::date,(payload->>'end_date')::date,payload->>'title',coalesce(payload->>'status','planned'),nullif(payload->>'notes',''))
   on conflict(project_id,revision_id,period_key) do update set start_date=excluded.start_date,end_date=excluded.end_date,title=excluded.title,status=excluded.status,notes=excluded.notes;
  update public.schedule_revisions set title=title where id=d.id;
 elsif command='publish' then
  if exists(select 1 from public.activity_schedule_periods s join public.activities a on a.id=s.activity_id where s.revision_id=d.id and s.status='planned' and (s.start_date<p.start_date or s.end_date>p.end_date or a.deleted_at is not null or a.status in ('archived','cancelled'))) then
   raise exception 'Periods outside project or inactive activities: revise or cancel periods' using errcode='23514'; end if;
  update public.schedule_revisions set status='approved',reason=payload->>'reason',approved_at=clock_timestamp(),approved_by=auth.uid(),
   activity_snapshot=(select coalesce(jsonb_agg(to_jsonb(a)-'planned_start_date'-'planned_end_date'),'[]') from public.activities a where a.project_id=target_project and a.deleted_at is null),
   project_snapshot=jsonb_build_object('start_date',p.start_date,'end_date',p.end_date,'title',p.title)
   where id=d.id;
  insert into public.project_schedule_state(project_id,initial_revision_id,current_revision_id) values(target_project,coalesce(initial_id,d.id),d.id)
   on conflict(project_id) do update set current_revision_id=excluded.current_revision_id;
 else raise exception 'Unknown command' using errcode='22023'; end if;
 return d.id;
end $$;
create or replace function public.archive_framework_branch(target_project uuid, target_item uuid, expected_version bigint)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare node record; project_status text; current_version bigint; current_status text; branch_ids uuid[];
begin
  -- Same project lock used by write guards: concurrent descendants cannot escape.
  select status into project_status from public.projects where id=target_project for update;
  if project_status is null or project_status='archived' then
    raise exception 'Project not writable' using errcode='42501';
  end if;
  select row_version,status into current_version,current_status from public.logical_framework_items
    where id=target_item and project_id=target_project;
  if current_version is distinct from expected_version or current_status is distinct from 'active' then return false; end if;
  with recursive branch as (
    select id from public.logical_framework_items where id=target_item and project_id=target_project
    union all
    select child.id from public.logical_framework_items child join branch on child.parent_id=branch.id where child.project_id=target_project
  ) select array_agg(id) into branch_ids from branch;
  update public.indicators set status='archived' where project_id=target_project and framework_item_id=any(branch_ids) and status<>'archived';
  update public.activities set status='archived' where project_id=target_project and result_id=any(branch_ids) and deleted_at is null and status<>'archived';
  for node in
    with recursive branch as (
      select id,0 as depth from public.logical_framework_items where id=target_item and project_id=target_project
      union all
      select child.id,branch.depth+1 from public.logical_framework_items child join branch on child.parent_id=branch.id where child.project_id=target_project
    ) select id from branch order by depth desc,id
  loop
    update public.logical_framework_items set status='archived' where id=node.id and project_id=target_project and status<>'archived';
  end loop;
  return true;
end $$;
create or replace function app_private.guard_result_activities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.type<>old.type and exists(select 1 from public.activities where result_id=old.id) then
  raise exception 'Result referenced by activities cannot change type' using errcode='23514';
 end if;
 if new.status='archived' and exists(select 1 from public.activities where result_id=old.id and deleted_at is null and status<>'archived') then
  raise exception 'Archive activities before result' using errcode='23514';
 end if;
 return new;
end $$;

create function public.change_activity_deletion(target_project uuid,target_activity uuid,expected_version bigint,command text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.activities; p public.projects; d uuid;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'READ COMMITTED required' using errcode='25000'; end if;
 select * into p from public.projects where id=target_project for update;
 if not found or not app_private.can_access_project(target_project) or p.status='archived' then raise insufficient_privilege; end if;
 select * into a from public.activities where id=target_activity and project_id=target_project for update;
 if not found then raise insufficient_privilege; end if;
 if a.row_version is distinct from expected_version then raise exception 'Stale activity' using errcode='40001'; end if;
 select id into d from public.schedule_revisions where project_id=target_project and status='draft';
 if command='trash' and a.deleted_at is null then
  update public.activities set deleted_at=clock_timestamp(),deleted_by=auth.uid() where id=a.id;
  update public.activity_schedule_periods set status='cancelled' where activity_id=a.id and revision_id=d and status='planned';
  if found then update public.schedule_revisions set title=title where id=d; end if;
 elsif command='restore' and a.deleted_at is not null then
  update public.activities set deleted_at=null,deleted_by=null where id=a.id;
 elsif command='purge' and a.deleted_at is not null then
  if not app_private.is_admin() then raise insufficient_privilege; end if;
  if exists(select 1 from public.activities where parent_activity_id=a.id)
    or exists(select 1 from public.activity_schedule_periods s join public.schedule_revisions r on r.id=s.revision_id where s.activity_id=a.id and r.status='approved')
    or exists(select 1 from public.schedule_revisions r where r.project_id=target_project and r.status='approved' and r.activity_snapshot @> jsonb_build_array(jsonb_build_object('id',a.id))) then
   raise exception 'Activity has children or published references' using errcode='23503'; end if;
  delete from public.activity_schedule_periods where activity_id=a.id and revision_id=d;
  if found then update public.schedule_revisions set title=title where id=d; end if;
  delete from public.activities where id=a.id;
 else raise exception 'Invalid deletion transition' using errcode='23514'; end if;
end $$;
alter function public.change_activity_deletion(uuid,uuid,bigint,text) owner to ariadne_activity_lifecycle;
revoke all on function public.change_activity_deletion(uuid,uuid,bigint,text) from public,anon,service_role;
grant execute on function public.change_activity_deletion(uuid,uuid,bigint,text) to authenticated;
-- Only the non-login RPC owner can perform physical deletion; no client DELETE grants.
create function app_private.guard_activity_purge() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user<>'ariadne_activity_lifecycle' or not app_private.is_admin() then raise insufficient_privilege; end if;
 if tg_table_name='activities' then
  if old.deleted_at is null then raise exception 'Trash first' using errcode='23514'; end if;
 else
  if exists(select 1 from public.schedule_revisions where id=old.revision_id and status='approved') then
   raise exception 'Published period immutable' using errcode='23514'; end if;
 end if;
 return old;
end $$;
revoke all on function app_private.guard_activity_purge() from public,anon,authenticated,service_role;
drop trigger deny_delete on public.activities;
create trigger deny_delete before delete on public.activities for each row execute function app_private.guard_activity_purge();
drop trigger deny_delete on public.activity_schedule_periods;
create trigger deny_delete before delete on public.activity_schedule_periods for each row execute function app_private.guard_activity_purge();
drop trigger record_audit on public.activities;
create trigger record_audit after insert or update or delete on public.activities for each row execute function app_private.record_audit();
drop trigger record_audit on public.activity_schedule_periods;
create trigger record_audit after insert or update or delete on public.activity_schedule_periods for each row execute function app_private.record_audit();
create or replace function app_private.audit_payload(entity text, data jsonb) returns jsonb
language sql immutable set search_path = '' as $$
 select jsonb_object_agg(key,value) from jsonb_each(data)
 where key = any(case entity
   when 'profiles' then array['id','is_active','row_version']
   when 'global_user_roles' then array['user_id','role','row_version']
   when 'organizations' then array['id','code','status','row_version']
   when 'projects' then array['id','code','status','start_date','end_date','currency_code','row_version']
   when 'project_memberships' then array['id','project_id','user_id','role','status','row_version']
   when 'project_organizations' then array['id','project_id','organization_id','role','row_version']
   when 'logical_framework_items' then array['id','project_id','parent_id','type','code','status','sort_order','row_version']
   when 'activities' then array['id','project_id','result_id','parent_activity_id','category','code','status','priority','sort_order','planned_start_date','planned_end_date','actual_start_date','actual_end_date','deleted_at','deleted_by','row_version']
   when 'indicators' then array['id','project_id','framework_item_id','code','status','type','unit','aggregation_method','direction','ratio_scale','baseline_date','baseline_value','baseline_numerator','baseline_denominator','target_date','target_value','target_numerator','target_denominator','row_version']
   when 'schedule_revisions' then array['id','project_id','revision_number','based_on_id','status','approved_at','approved_by','row_version']
   when 'activity_schedule_periods' then array['id','project_id','revision_id','activity_id','period_key','start_date','end_date','status','row_version']
   else array[]::text[] end);
$$;
notify pgrst, 'reload schema';
commit;
