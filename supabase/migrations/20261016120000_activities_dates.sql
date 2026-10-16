-- Activities and single planned/actual intervals, requested 16 October 2026.
-- Versioned schedule snapshots remain a subsequent milestone.
begin;
create table public.activities (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete restrict,
 result_id uuid not null,
 code text not null check (code=upper(btrim(code)) and length(code) between 1 and 80),
 title text not null check (length(btrim(title)) between 1 and 240),
 description text check (length(description)<=10000),
 notes text check (length(notes)<=10000),
 status text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled','archived')),
 priority text not null default 'normal' check (priority in ('low','normal','high')),
 sort_order integer not null default 0 check (sort_order>=0),
 planned_start_date date not null check (isfinite(planned_start_date)),
 planned_end_date date not null check (isfinite(planned_end_date) and planned_end_date>=planned_start_date),
 actual_start_date date check (isfinite(actual_start_date)),
 actual_end_date date check (actual_end_date is null or (isfinite(actual_end_date) and actual_start_date is not null and actual_end_date>=actual_start_date)),
 created_at timestamptz not null default now(),
 created_by uuid references public.profiles(id) on delete restrict,
 updated_at timestamptz not null default now(),
 updated_by uuid references public.profiles(id) on delete restrict,
 row_version bigint not null default 1 check (row_version>0),
 unique(project_id,id), unique(project_id,code),
 foreign key(project_id,result_id) references public.logical_framework_items(project_id,id) on delete restrict
);
create index activities_result_order_idx on public.activities(project_id,result_id,sort_order,id);
create index activities_created_by_idx on public.activities(created_by) where created_by is not null;
create index activities_updated_by_idx on public.activities(updated_by) where updated_by is not null;
alter table public.activities enable row level security;
revoke all on public.activities from public,anon,authenticated,service_role;
grant select on public.activities to authenticated,ariadne_guard;
grant insert(project_id,result_id,code,title,description,notes,priority,sort_order,planned_start_date,planned_end_date,actual_start_date,actual_end_date),
 update(result_id,code,title,description,notes,priority,sort_order,planned_start_date,planned_end_date,actual_start_date,actual_end_date,status) on public.activities to authenticated;
create policy internal_activity_read on public.activities for select to ariadne_guard using (true);
create policy activity_read on public.activities for select to authenticated using (app_private.can_access_project(project_id));
create policy activity_insert on public.activities for insert to authenticated with check (app_private.can_access_project(project_id));
create policy activity_update on public.activities for update to authenticated using (app_private.can_access_project(project_id)) with check (app_private.can_access_project(project_id));

-- The project lock (a_guard_project) serializes all activity and hierarchy writes.
create function app_private.guard_activity() returns trigger
language plpgsql security definer set search_path='' as $$
declare result_type text; result_status text;
begin
 if tg_op='UPDATE' and old.status='archived' then
  if new.status='archived' or (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then
   raise exception 'Restore archived activity separately' using errcode='23514';
  end if;
 end if;
 select type,status into result_type,result_status from public.logical_framework_items where id=new.result_id and project_id=new.project_id;
 if result_type is distinct from 'expected_result' then
  raise exception 'Activity requires result in the same project' using errcode='23514';
 end if;
 if new.status<>'archived' and result_status<>'active' then
  raise exception 'Restore result before activity' using errcode='23514';
 end if;
 -- Dates describe actual execution without changing the planned interval.
 if new.status not in ('archived','cancelled') then
  new.status := case when new.actual_end_date is not null then 'completed'
                     when new.actual_start_date is not null then 'in_progress'
                     else 'planned' end;
 end if;
 return new;
end $$;
alter function app_private.guard_activity() owner to ariadne_guard;
revoke all on function app_private.guard_activity() from public,anon,authenticated,service_role;

create function app_private.guard_result_activities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.type<>old.type and exists(select 1 from public.activities where result_id=old.id) then
  raise exception 'Result referenced by activities cannot change type' using errcode='23514';
 end if;
 if new.status='archived' and exists(select 1 from public.activities where result_id=old.id and status<>'archived') then
  raise exception 'Archive activities before result' using errcode='23514';
 end if;
 return new;
end $$;
alter function app_private.guard_result_activities() owner to ariadne_guard;
revoke all on function app_private.guard_result_activities() from public,anon,authenticated,service_role;
create trigger c_guard_result_activities before update on public.logical_framework_items for each row execute function app_private.guard_result_activities();
create trigger a_guard_project before insert or update on public.activities for each row execute function app_private.guard_project_write();
create trigger b_guard_activity before insert or update on public.activities for each row execute function app_private.guard_activity();
create trigger z_stamp_row before insert or update on public.activities for each row execute function app_private.stamp_row();
create trigger record_audit after insert or update on public.activities for each row execute function app_private.record_audit();
create trigger deny_delete before delete on public.activities for each row execute function app_private.deny_destructive_write();
create trigger deny_truncate before truncate on public.activities for each statement execute function app_private.deny_destructive_write();
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
   when 'activities' then array['id','project_id','result_id','code','status','priority','sort_order','planned_start_date','planned_end_date','actual_start_date','actual_end_date','row_version']
   else array[]::text[] end);
$$;



commit;
