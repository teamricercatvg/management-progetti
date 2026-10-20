-- Milestone 9: definitions only; observations remain a subsequent milestone.
begin;
create table public.indicators (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete restrict,
 framework_item_id uuid not null,
 code text not null check (code=upper(btrim(code)) and length(code) between 1 and 80),
 title text not null check (length(btrim(title)) between 1 and 240),
 description text check (length(description)<=10000),
 verification_source text not null check (length(btrim(verification_source)) between 1 and 10000),
 type text not null check (type in ('absolute','ratio')),
 unit text not null check (length(btrim(unit)) between 1 and 120),
 aggregation_method text not null,
 direction text not null check (direction in ('increase','decrease')),
 ratio_scale numeric not null default 1 check (ratio_scale in (1,100)),
 baseline_date date check (isfinite(baseline_date)),
 baseline_value numeric(20,6), baseline_numerator numeric(20,6), baseline_denominator numeric(20,6),
 target_date date check (isfinite(target_date)),
 target_value numeric(20,6), target_numerator numeric(20,6), target_denominator numeric(20,6),
 status text not null default 'draft' check (status in ('draft','active','archived')),
 reference_code text check (length(reference_code)<=10000),
 measurement_period text check (length(measurement_period)<=10000),
 numerator_definition text check (length(numerator_definition)<=10000),
 denominator_definition text check (length(denominator_definition)<=10000),
 baseline_note text check (length(baseline_note)<=10000),
 target_note text check (length(target_note)<=10000),
 created_at timestamptz not null default now(), created_by uuid references public.profiles(id) on delete restrict,
 updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id) on delete restrict,
 row_version bigint not null default 1 check (row_version>0),
 unique(project_id,id), unique(project_id,code),
 foreign key(project_id,framework_item_id) references public.logical_framework_items(project_id,id) on delete restrict,
 check ((type='absolute' and ratio_scale=1 and aggregation_method in ('sum','last','mean')) or
        (type='ratio' and aggregation_method in ('ratio_of_sums','last'))),
 check (baseline_date is null or target_date is null or target_date>=baseline_date),
 check ((num_nonnulls(baseline_date,baseline_value,baseline_numerator,baseline_denominator)=0) or
   (type='absolute' and baseline_date is not null and baseline_value is not null and baseline_value<>'NaN'::numeric and baseline_numerator is null and baseline_denominator is null) or
   (type='ratio' and baseline_date is not null and baseline_value is null and baseline_numerator is not null and baseline_numerator<>'NaN'::numeric and baseline_denominator is not null and baseline_denominator>0 and baseline_denominator<>'NaN'::numeric)),
 check ((num_nonnulls(target_date,target_value,target_numerator,target_denominator)=0) or
   (type='absolute' and target_date is not null and target_value is not null and target_value<>'NaN'::numeric and target_numerator is null and target_denominator is null) or
   (type='ratio' and target_date is not null and target_value is null and target_numerator is not null and target_numerator<>'NaN'::numeric and target_denominator is not null and target_denominator>0 and target_denominator<>'NaN'::numeric)),
 check (status<>'active' or (baseline_date is not null and target_date is not null))
);
create index indicators_framework_idx on public.indicators(project_id,framework_item_id,code,id);
create index indicators_created_by_idx on public.indicators(created_by) where created_by is not null;
create index indicators_updated_by_idx on public.indicators(updated_by) where updated_by is not null;
alter table public.indicators enable row level security;
revoke all on public.indicators from public,anon,authenticated,service_role;
grant select on public.indicators to authenticated,ariadne_guard;
grant insert(project_id,framework_item_id,code,title,description,verification_source,type,unit,aggregation_method,direction,ratio_scale,baseline_date,baseline_value,baseline_numerator,baseline_denominator,target_date,target_value,target_numerator,target_denominator,status,reference_code,measurement_period,numerator_definition,denominator_definition,baseline_note,target_note), update(framework_item_id,code,title,description,verification_source,type,unit,aggregation_method,direction,ratio_scale,baseline_date,baseline_value,baseline_numerator,baseline_denominator,target_date,target_value,target_numerator,target_denominator,status,reference_code,measurement_period,numerator_definition,denominator_definition,baseline_note,target_note) on public.indicators to authenticated;
create policy internal_indicator_read on public.indicators for select to ariadne_guard using (true);
create policy indicator_read on public.indicators for select to authenticated using (app_private.can_access_project(project_id));
create policy indicator_insert on public.indicators for insert to authenticated with check (app_private.can_access_project(project_id));
create policy indicator_update on public.indicators for update to authenticated using (app_private.can_access_project(project_id)) with check (app_private.can_access_project(project_id));
create function app_private.guard_indicator() returns trigger
language plpgsql security definer set search_path='' as $$
declare parent_status text;
begin
 if tg_op='UPDATE' and old.status='archived' then
  if new.status<>'draft' or (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then
   raise exception 'Restore archived indicator to draft separately' using errcode='23514';
  end if;
 end if;
 select status into parent_status from public.logical_framework_items where id=new.framework_item_id and project_id=new.project_id;
 if parent_status is null or (new.status<>'archived' and parent_status<>'active') then
  raise exception 'Indicator requires active framework item in the same project' using errcode='23514';
 end if;
 return new;
end $$;
alter function app_private.guard_indicator() owner to ariadne_guard;
revoke all on function app_private.guard_indicator() from public,anon,authenticated,service_role;
create function app_private.guard_framework_indicators() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.type<>old.type and exists(select 1 from public.indicators where framework_item_id=old.id) then
  raise exception 'Framework item referenced by indicators cannot change type' using errcode='23514';
 end if;
 if new.status='archived' and exists(select 1 from public.indicators where framework_item_id=old.id and status<>'archived') then
  raise exception 'Archive indicators before framework item' using errcode='23514';
 end if;
 return new;
end $$;
alter function app_private.guard_framework_indicators() owner to ariadne_guard;
revoke all on function app_private.guard_framework_indicators() from public,anon,authenticated,service_role;
create trigger d_guard_framework_indicators before update on public.logical_framework_items for each row execute function app_private.guard_framework_indicators();
create trigger a_guard_project before insert or update on public.indicators for each row execute function app_private.guard_project_write();
create trigger b_guard_indicator before insert or update on public.indicators for each row execute function app_private.guard_indicator();
create trigger z_stamp_row before insert or update on public.indicators for each row execute function app_private.stamp_row();
create trigger record_audit after insert or update on public.indicators for each row execute function app_private.record_audit();
create trigger deny_delete before delete on public.indicators for each row execute function app_private.deny_destructive_write();
create trigger deny_truncate before truncate on public.indicators for each statement execute function app_private.deny_destructive_write();
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
   when 'indicators' then array['id','project_id','framework_item_id','code','status','type','unit','aggregation_method','direction','ratio_scale','baseline_date','baseline_value','baseline_numerator','baseline_denominator','target_date','target_value','target_numerator','target_denominator','row_version']
   else array[]::text[] end);
$$;



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
  update public.activities set status='archived' where project_id=target_project and result_id=any(branch_ids) and status<>'archived';
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
revoke all on function public.archive_framework_branch(uuid,uuid,bigint) from public,anon;
grant execute on function public.archive_framework_branch(uuid,uuid,bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
