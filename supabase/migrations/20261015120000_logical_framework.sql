-- Milestone 8: approved three-level hierarchy, session RLS and audit.
begin;
create table public.logical_framework_items (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete restrict,
 parent_id uuid,
 type text not null check (type in ('general_objective','specific_objective','expected_result')),
 code text not null check (code = upper(btrim(code)) and length(code) between 1 and 80),
 title text not null check (length(btrim(title)) between 1 and 240),
 description text check (length(description) <= 10000),
 assumptions text check (length(assumptions) <= 10000),
 sort_order integer not null default 0 check (sort_order >= 0),
 status text not null default 'active' check (status in ('active','archived')),
 created_at timestamptz not null default now(),
 created_by uuid references public.profiles(id) on delete restrict,
 updated_at timestamptz not null default now(),
 updated_by uuid references public.profiles(id) on delete restrict,
 row_version bigint not null default 1 check (row_version > 0),
 unique(project_id,id), unique(project_id,code),
 foreign key(project_id,parent_id) references public.logical_framework_items(project_id,id) on delete restrict,
 check ((type = 'general_objective') = (parent_id is null))
);
create index framework_tree_idx on public.logical_framework_items(project_id,parent_id,sort_order,id);
create index framework_created_by_idx on public.logical_framework_items(created_by) where created_by is not null;
create index framework_updated_by_idx on public.logical_framework_items(updated_by) where updated_by is not null;
alter table public.logical_framework_items enable row level security;
revoke all on public.logical_framework_items from public, anon, authenticated, service_role;
grant select on public.logical_framework_items to authenticated, ariadne_guard;
grant insert(project_id,parent_id,type,code,title,description,assumptions,sort_order,status),
 update(parent_id,type,code,title,description,assumptions,sort_order,status) on public.logical_framework_items to authenticated;
create policy internal_framework_read on public.logical_framework_items for select to ariadne_guard using (true);
create policy framework_read on public.logical_framework_items for select to authenticated using (app_private.can_access_project(project_id));
create policy framework_insert on public.logical_framework_items for insert to authenticated with check (app_private.can_access_project(project_id));
create policy framework_update on public.logical_framework_items for update to authenticated using (app_private.can_access_project(project_id)) with check (app_private.can_access_project(project_id));

-- a_guard_project locks the project first, serializing hierarchy changes with
-- each other and with project archival. Checks below use fresh RC snapshots.
create function app_private.guard_framework() returns trigger
language plpgsql security definer set search_path='' as $$
declare parent_type text; parent_status text;
begin
 if tg_op = 'UPDATE' then
  if old.status = 'archived' and (new.status <> 'active' or
    (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status')) then
   raise exception 'Restore archived element separately' using errcode='23514';
  end if;
  if new.type <> old.type and exists(select 1 from public.logical_framework_items where parent_id=old.id) then
   raise exception 'Referenced element cannot change type' using errcode='23514';
  end if;
 end if;
 if new.parent_id is not null then
  select type,status into parent_type,parent_status from public.logical_framework_items where id=new.parent_id and project_id=new.project_id;
  if parent_type is null or not ((new.type='specific_objective' and parent_type='general_objective') or
    (new.type='expected_result' and parent_type='specific_objective')) then
   raise exception 'Invalid hierarchy' using errcode='23514';
  end if;
  if new.status='active' and parent_status <> 'active' then
   raise exception 'Active child requires active parent' using errcode='23514';
  end if;
 end if;
 if new.status='archived' and exists(select 1 from public.logical_framework_items where parent_id=new.id and status='active') then
  raise exception 'Archive active children first' using errcode='23514';
 end if;
 return new;
end $$;
alter function app_private.guard_framework() owner to ariadne_guard;
revoke all on function app_private.guard_framework() from public,anon,authenticated,service_role;
create trigger a_guard_project before insert or update on public.logical_framework_items for each row execute function app_private.guard_project_write();
create trigger b_guard_framework before insert or update on public.logical_framework_items for each row execute function app_private.guard_framework();
create trigger z_stamp_row before insert or update on public.logical_framework_items for each row execute function app_private.stamp_row();
create trigger record_audit after insert or update on public.logical_framework_items for each row execute function app_private.record_audit();
create trigger deny_delete before delete on public.logical_framework_items for each row execute function app_private.deny_destructive_write();
create trigger deny_truncate before truncate on public.logical_framework_items for each statement execute function app_private.deny_destructive_write();
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
   else array[]::text[] end);
$$;


commit;
