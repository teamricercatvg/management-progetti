-- M10/11: retained activity identities, independent rows, immutable schedule snapshots.
begin;
set local app.system_reason='M11 import of legacy planned dates into unapproved drafts';
alter table public.activities alter column result_id drop not null,
 alter column planned_start_date drop not null, alter column planned_end_date drop not null,
 add column parent_activity_id uuid,
 add column category text not null default 'general' check(category in ('general','preparatory','administrative','subactivity')),
 add column stakeholders text check(length(stakeholders)<=2000),
 add column cancellation_reason text check(cancellation_reason is null or length(btrim(cancellation_reason)) between 1 and 2000),
 add foreign key(project_id,parent_activity_id) references public.activities(project_id,id),
 add check(parent_activity_id is null or (result_id is null and parent_activity_id<>id));
revoke insert(planned_start_date,planned_end_date),update(planned_start_date,planned_end_date) on public.activities from authenticated;
grant insert(parent_activity_id,category,stakeholders,cancellation_reason),update(parent_activity_id,category,stakeholders,cancellation_reason) on public.activities to authenticated;
update public.activities set cancellation_reason='Annullamento precedente alla migrazione M11' where status='cancelled';
create or replace function app_private.guard_activity() returns trigger
language plpgsql security definer set search_path='' as $$
declare r record;
begin
 if tg_op='UPDATE' then
  if new.planned_start_date is distinct from old.planned_start_date or new.planned_end_date is distinct from old.planned_end_date then
   raise exception 'Use schedule periods' using errcode='23514'; end if;
  if old.status='archived' and (new.status='archived' or (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status')) then
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
  select result_id,status into r from public.activities where id=new.parent_activity_id and project_id=new.project_id;
  if r.result_id is null or (new.status<>'archived' and r.status='archived') then
   raise exception 'Active framework activity required as parent' using errcode='23514'; end if;
 end if;
 if new.status='cancelled' and new.cancellation_reason is null then
  raise exception 'Cancellation reason required' using errcode='23514'; end if;
 if new.status<>'archived' then
  new.status := case when new.cancellation_reason is not null then 'cancelled' when new.actual_end_date is not null then 'completed' when new.actual_start_date is not null then 'in_progress' else 'planned' end;
 end if;
 return new;
end $$;
-- No recursion/cascade for independent schedule rows: keep links even when the QL is archived.
create table public.schedule_revisions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 revision_number integer not null check(revision_number>0), based_on_id uuid,
 title text not null check(length(btrim(title)) between 1 and 240), reason text not null check(length(btrim(reason)) between 1 and 4000),
 status text not null default 'draft' check(status in ('draft','approved')),
 approved_at timestamptz, approved_by uuid references public.profiles(id),
 activity_snapshot jsonb not null default '[]', project_snapshot jsonb,
 created_at timestamptz not null default now(),created_by uuid references public.profiles(id),
 updated_at timestamptz not null default now(),updated_by uuid references public.profiles(id),row_version bigint not null default 1,
 unique(project_id,id), unique(project_id,revision_number),
 foreign key(project_id,based_on_id) references public.schedule_revisions(project_id,id)
);
create unique index schedule_one_draft on public.schedule_revisions(project_id) where status='draft';
create table public.activity_schedule_periods (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),revision_id uuid not null,
 activity_id uuid not null,period_key uuid not null default gen_random_uuid(),
 start_date date not null check(isfinite(start_date)),end_date date not null check(isfinite(end_date) and end_date>=start_date),
 title text not null check(length(btrim(title)) between 1 and 240),
 status text not null default 'planned' check(status in ('planned','cancelled')),
 notes text check(length(notes)<=4000),
 created_at timestamptz not null default now(),created_by uuid references public.profiles(id),
 updated_at timestamptz not null default now(),updated_by uuid references public.profiles(id),row_version bigint not null default 1,
 unique(project_id,revision_id,period_key),
 foreign key(project_id,revision_id) references public.schedule_revisions(project_id,id),
 foreign key(project_id,activity_id) references public.activities(project_id,id)
);
create table public.project_schedule_state (
 project_id uuid primary key references public.projects(id),initial_revision_id uuid not null,current_revision_id uuid not null,
 foreign key(project_id,initial_revision_id) references public.schedule_revisions(project_id,id),
 foreign key(project_id,current_revision_id) references public.schedule_revisions(project_id,id)
);
do $$ begin
 if not exists(select 1 from pg_roles where rolname='ariadne_scheduler') then create role ariadne_scheduler nologin noinherit; end if;
 if exists(select 1 from pg_roles where rolname='ariadne_scheduler' and (rolcanlogin or rolsuper or rolbypassrls or rolcreaterole or rolcreatedb)) or exists(select 1 from pg_auth_members where roleid='ariadne_scheduler'::regrole) then raise exception 'Unsafe scheduler role'; end if;
end $$;
grant usage on schema public,app_private,auth to ariadne_scheduler;
grant execute on function auth.uid(),app_private.can_access_project(uuid) to ariadne_scheduler;
grant select,update on public.projects to ariadne_scheduler;
create policy scheduler_projects on public.projects to ariadne_scheduler using(true) with check(true);
grant select on public.activities to ariadne_scheduler;
create policy scheduler_activities on public.activities for select to ariadne_scheduler using(true);
do $$ declare t text; begin
 foreach t in array array['schedule_revisions','activity_schedule_periods','project_schedule_state'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to authenticated,ariadne_guard',t);
  execute format('grant select,insert,update on public.%I to ariadne_scheduler',t);
  execute format('create policy project_read on public.%I for select to authenticated using(app_private.can_access_project(project_id))',t);
  execute format('create policy internal_read on public.%I for select to ariadne_guard using(true)',t);
  execute format('create policy scheduler_write on public.%I to ariadne_scheduler using(true) with check(true)',t);
  execute format('create trigger deny_delete before delete on public.%I for each row execute function app_private.deny_destructive_write()',t);
  execute format('create trigger deny_truncate before truncate on public.%I for each statement execute function app_private.deny_destructive_write()',t);
 end loop;
end $$;
-- Import every legacy interval, including archived activities and dates outside project bounds.
insert into public.schedule_revisions(project_id,revision_number,title,reason)
 select distinct project_id,1,'Piano importato — da verificare','Importazione M11 delle date precedenti, non approvazione retroattiva' from public.activities;
insert into public.activity_schedule_periods(project_id,revision_id,activity_id,start_date,end_date,title,status)
 select a.project_id,r.id,a.id,a.planned_start_date,a.planned_end_date,a.title,
 case when a.status in ('archived','cancelled') then 'cancelled' else 'planned' end
 from public.activities a join public.schedule_revisions r on r.project_id=a.project_id
 where a.planned_start_date is not null and a.planned_end_date is not null;
create function app_private.guard_schedule_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='schedule_revisions' then
  if tg_op='UPDATE' and old.status='approved' then raise exception 'Published snapshot is immutable' using errcode='23514'; end if;
 else
  if exists(select 1 from public.schedule_revisions where id=new.revision_id and status='approved') then raise exception 'Published periods are immutable' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function app_private.guard_schedule_immutable() from public,anon,authenticated,service_role;
do $$ declare t text; begin
 foreach t in array array['schedule_revisions','activity_schedule_periods'] loop
  execute format('create trigger immutable before insert or update on public.%I for each row execute function app_private.guard_schedule_immutable()',t);
  execute format('create trigger z_stamp_row before insert or update on public.%I for each row execute function app_private.stamp_row()',t);
  execute format('create trigger record_audit after insert or update on public.%I for each row execute function app_private.record_audit()',t);
 end loop;
end $$;
create function public.edit_schedule(target_project uuid, command text, expected_version bigint default null, payload jsonb default '{}') returns uuid
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
  if not exists(select 1 from public.activities where id=(payload->>'activity_id')::uuid and project_id=target_project and status not in ('archived','cancelled')) and coalesce(payload->>'status','planned')<>'cancelled' then
   raise exception 'Active activity required' using errcode='23514'; end if;
  insert into public.activity_schedule_periods(project_id,revision_id,activity_id,period_key,start_date,end_date,title,status,notes)
   values(target_project,d.id,(payload->>'activity_id')::uuid,coalesce((payload->>'period_key')::uuid,gen_random_uuid()),(payload->>'start_date')::date,(payload->>'end_date')::date,payload->>'title',coalesce(payload->>'status','planned'),nullif(payload->>'notes',''))
   on conflict(project_id,revision_id,period_key) do update set start_date=excluded.start_date,end_date=excluded.end_date,title=excluded.title,status=excluded.status,notes=excluded.notes;
  update public.schedule_revisions set title=title where id=d.id;
 elsif command='publish' then
  if exists(select 1 from public.activity_schedule_periods s join public.activities a on a.id=s.activity_id where s.revision_id=d.id and s.status='planned' and (s.start_date<p.start_date or s.end_date>p.end_date or a.status in ('archived','cancelled'))) then
   raise exception 'Periods outside project or inactive activities: revise or cancel periods' using errcode='23514'; end if;
  update public.schedule_revisions set status='approved',reason=payload->>'reason',approved_at=clock_timestamp(),approved_by=auth.uid(),
   activity_snapshot=(select coalesce(jsonb_agg(to_jsonb(a)-'planned_start_date'-'planned_end_date'),'[]') from public.activities a where a.project_id=target_project),
   project_snapshot=jsonb_build_object('start_date',p.start_date,'end_date',p.end_date,'title',p.title)
   where id=d.id;
  insert into public.project_schedule_state(project_id,initial_revision_id,current_revision_id) values(target_project,coalesce(initial_id,d.id),d.id)
   on conflict(project_id) do update set current_revision_id=excluded.current_revision_id;
 else raise exception 'Unknown command' using errcode='22023'; end if;
 return d.id;
end $$;
alter function public.edit_schedule(uuid,text,bigint,jsonb) owner to ariadne_scheduler;
revoke all on function public.edit_schedule(uuid,text,bigint,jsonb) from public,anon,service_role;
grant execute on function public.edit_schedule(uuid,text,bigint,jsonb) to authenticated;
create function app_private.guard_project_schedule_dates() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.start_date,new.end_date) is distinct from (old.start_date,old.end_date) and exists(
  select 1 from public.project_schedule_state st join public.activity_schedule_periods s on s.revision_id=st.current_revision_id
  where st.project_id=new.id and s.status='planned' and (s.start_date<new.start_date or s.end_date>new.end_date)) then
  raise exception 'Project dates exclude current schedule' using errcode='23514'; end if;
 return new;
end $$;
alter function app_private.guard_project_schedule_dates() owner to ariadne_guard;
revoke all on function app_private.guard_project_schedule_dates() from public,anon,authenticated,service_role;
create trigger c_guard_schedule_dates before update on public.projects for each row execute function app_private.guard_project_schedule_dates();
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
   when 'activities' then array['id','project_id','result_id','parent_activity_id','category','code','status','priority','sort_order','planned_start_date','planned_end_date','actual_start_date','actual_end_date','row_version']
   when 'indicators' then array['id','project_id','framework_item_id','code','status','type','unit','aggregation_method','direction','ratio_scale','baseline_date','baseline_value','baseline_numerator','baseline_denominator','target_date','target_value','target_numerator','target_denominator','row_version']
   when 'schedule_revisions' then array['id','project_id','revision_number','based_on_id','status','approved_at','approved_by','row_version']
   when 'activity_schedule_periods' then array['id','project_id','revision_id','activity_id','period_key','start_date','end_date','status','row_version']
   else array[]::text[] end);
$$;
notify pgrst, 'reload schema';
commit;
