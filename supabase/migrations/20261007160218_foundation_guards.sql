-- Structural invariants and audit. Application authorization follows in milestone 5.
begin;

create function app_private.stamp_row() returns trigger
language plpgsql set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new)->>'id') is distinct from (to_jsonb(old)->>'id')
       or (to_jsonb(new)->>'project_id') is distinct from (to_jsonb(old)->>'project_id')
       or (tg_table_name = 'global_user_roles' and (to_jsonb(new)->>'user_id') <> (to_jsonb(old)->>'user_id')) then
      raise exception 'Primary key and project_id are immutable' using errcode = '23514';
    end if;
    if new.row_version <> old.row_version then
      raise exception 'Stale or forged row_version' using errcode = '40001';
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.row_version := old.row_version + 1;
  else
    new.created_at := clock_timestamp();
    new.created_by := actor;
    new.row_version := 1;
  end if;
  new.updated_at := clock_timestamp();
  new.updated_by := actor;
  return new;
end;
$$;

-- Every cross-row check uses a fresh READ COMMITTED snapshot after taking its lock.
-- Reject stronger snapshot isolation until equivalent retry protocols are implemented.
create function app_private.lock_admin_registry() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Foundation writes require READ COMMITTED' using errcode = '25000';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(1735289203, 1);
  return null;
end;
$$;

create function app_private.protect_last_admin() returns trigger
language plpgsql set search_path = '' as $$
declare loses_admin boolean := false;
begin
  if tg_table_name = 'profiles' then
    loses_admin := old.is_active and not new.is_active
      and exists (select 1 from public.global_user_roles where user_id = old.id);
  else
    loses_admin := exists (select 1 from public.profiles where id = old.user_id and is_active);
  end if;
  if loses_admin and not exists (
    select 1 from public.global_user_roles r join public.profiles p on p.id = r.user_id
    where p.is_active
  ) then
    raise exception 'Cannot remove the last active admin' using errcode = '23514';
  end if;
  return null;
end;
$$;
create trigger a_lock_admin_registry before insert or update or delete on public.profiles
for each statement execute function app_private.lock_admin_registry();
create trigger a_lock_admin_registry before insert or update or delete on public.global_user_roles
for each statement execute function app_private.lock_admin_registry();
create trigger protect_last_admin after update on public.profiles
for each row execute function app_private.protect_last_admin();
create trigger protect_last_admin after delete on public.global_user_roles
for each row execute function app_private.protect_last_admin();

create function app_private.guard_project_write() returns trigger
language plpgsql set search_path = '' as $$
declare pid uuid; project_status text;
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Foundation writes require READ COMMITTED' using errcode = '25000';
  end if;
  if tg_table_name = 'projects' then
    if tg_op = 'UPDATE' and old.status = 'archived' then
      -- Reopening is a separate, auditable write. All other columns stay unchanged.
      if new.status = 'archived' or
         (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
        raise exception 'Archived project is read-only; reopen separately' using errcode = '23514';
      end if;
    end if;
    return new;
  end if;
  pid := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  select status into project_status from public.projects where id = pid for update;
  if project_status = 'archived' then
    raise exception 'Archived project is read-only' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create function app_private.guard_organization_reference() returns trigger
language plpgsql set search_path = '' as $$
declare organization_status text;
begin
  if tg_op = 'INSERT' or new.organization_id <> old.organization_id then
    -- Conflicts with organization archival, so either the association precedes
    -- archival or sees the archived status and fails.
    select status into organization_status from public.organizations
      where id = new.organization_id for share;
    if organization_status = 'archived' then
      raise exception 'New references to archived organizations are forbidden' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create function app_private.check_partnership() returns trigger
language plpgsql set search_path = '' as $$
declare pid uuid; project_status text; sole_count int; lead_count int; partner_count int;
begin
  if tg_table_name = 'projects' then pid := new.id;
  elsif tg_op = 'DELETE' then pid := old.project_id;
  else pid := new.project_id;
  end if;
  select status into project_status from public.projects where id = pid for update;
  -- Draft can be incomplete, archived preserves its previous composition.
  if project_status in ('active','completed') then
    select count(*) filter (where role = 'sole'), count(*) filter (where role = 'lead'),
           count(*) filter (where role = 'partner')
      into sole_count, lead_count, partner_count
      from public.project_organizations where project_id = pid;
    if not ((sole_count = 1 and lead_count = 0 and partner_count = 0)
         or (sole_count = 0 and lead_count = 1 and partner_count >= 1)) then
      raise exception 'Project requires sole organization or lead and partner' using errcode = '23514';
    end if;
  end if;
  return null;
end;
$$;
create trigger a_guard_project before insert or update on public.projects
for each row execute function app_private.guard_project_write();
create trigger a_guard_project before insert or update or delete on public.project_organizations
for each row execute function app_private.guard_project_write();
create trigger a_guard_project before insert or update on public.project_memberships
for each row execute function app_private.guard_project_write();
create trigger b_guard_organization before insert or update on public.project_organizations
for each row execute function app_private.guard_organization_reference();
create constraint trigger check_partnership after insert or update on public.projects
 deferrable initially deferred for each row execute function app_private.check_partnership();
create constraint trigger check_partnership after insert or update or delete on public.project_organizations
 deferrable initially deferred for each row execute function app_private.check_partnership();

-- Deliberate allowlist: no automatic to_jsonb(row) payload that could capture
-- newly added sensitive columns. Free-text descriptions/notes are not copied.
create function app_private.audit_payload(entity text, data jsonb) returns jsonb
language sql immutable set search_path = '' as $$
 select jsonb_object_agg(key,value) from jsonb_each(data)
 where key = any(case entity
   when 'profiles' then array['id','is_active','row_version']
   when 'global_user_roles' then array['user_id','role','row_version']
   when 'organizations' then array['id','code','status','row_version']
   when 'projects' then array['id','code','status','start_date','end_date','currency_code','row_version']
   when 'project_memberships' then array['id','project_id','user_id','role','status','row_version']
   when 'project_organizations' then array['id','project_id','organization_id','role','row_version']
   else array[]::text[] end);
$$;

create function app_private.record_audit() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare before_row jsonb; after_row jsonb; row_data jsonb; actor uuid := auth.uid(); system_reason text;
begin
  if tg_op <> 'INSERT' then before_row := app_private.audit_payload(tg_table_name,to_jsonb(old)); end if;
  if tg_op <> 'DELETE' then after_row := app_private.audit_payload(tg_table_name,to_jsonb(new)); end if;
  row_data := coalesce(after_row,before_row);
  if actor is null then
    system_reason := nullif(btrim(current_setting('app.system_reason',true)), '');
    if system_reason is null then
      raise exception 'System writes require SET LOCAL app.system_reason' using errcode = '23514';
    end if;
  end if;
  insert into public.audit_log(project_id,actor_id,actor_kind,action,entity_table,entity_id,old_values,new_values,reason)
  values (case when tg_table_name = 'projects' then (row_data->>'id')::uuid
               else (row_data->>'project_id')::uuid end,
          actor,case when actor is null then 'system' else 'user' end,
          tg_op,tg_table_name,coalesce(row_data->>'id',row_data->>'user_id'),before_row,after_row,system_reason);
  return null;
end;
$$;

create function app_private.deny_destructive_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Physical deletion or audit mutation is forbidden' using errcode = '23514';
end;
$$;

-- Fixed, migration-time identifiers; no dynamic SQL in privileged runtime helpers.
do $$
declare t text;
begin
  foreach t in array array['profiles','global_user_roles','organizations','projects','project_memberships','project_organizations'] loop
    execute format('create trigger z_stamp_row before insert or update on public.%I for each row execute function app_private.stamp_row()',t);
    execute format('create trigger record_audit after insert or update or delete on public.%I for each row execute function app_private.record_audit()',t);
    execute format('create trigger deny_truncate before truncate on public.%I for each statement execute function app_private.deny_destructive_write()',t);
    if t not in ('global_user_roles','project_organizations') then
      execute format('create trigger deny_delete before delete on public.%I for each row execute function app_private.deny_destructive_write()',t);
    end if;
  end loop;
end;
$$;
create trigger deny_audit_mutation before update or delete or truncate on public.audit_log
for each statement execute function app_private.deny_destructive_write();
revoke all on all functions in schema app_private from public, anon, authenticated, service_role;
commit;
