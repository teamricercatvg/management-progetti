-- Milestone 4: controlled Auth provisioning, own identity only, no project access.
begin;

-- Bounded definer routines; no service-role client or direct table grants.
create function app_private.provision_auth_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous_reason text := current_setting('app.system_reason', true);
begin
  perform set_config('app.system_reason', 'Auth profile provisioning', true);
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data->>'display_name'),120),''), 'Utente'));
  perform set_config('app.system_reason', coalesce(previous_reason,''), true);
  return new;
end;
$$;
revoke all on function app_private.provision_auth_profile() from public, anon, authenticated, service_role;
create trigger on_auth_user_created after insert on auth.users
for each row execute function app_private.provision_auth_profile();

-- Existing Auth users may predate the application schema. Never import metadata roles.
select set_config('app.system_reason', 'Milestone 4 profile backfill', true);
insert into public.profiles(id, display_name)
select u.id, coalesce(nullif(left(btrim(u.raw_user_meta_data->>'display_name'),120),''),'Utente')
from auth.users u where not exists (select 1 from public.profiles p where p.id=u.id);

create function public.current_profile()
returns table(id uuid, display_name text, is_admin boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name,
    exists(select 1 from public.global_user_roles r where r.user_id=p.id and r.role='admin')
  from public.profiles p where p.id=auth.uid() and p.is_active;
$$;
revoke all on function public.current_profile() from public, anon, authenticated, service_role;
grant execute on function public.current_profile() to authenticated;

-- SQL-only operator bootstrap, never exposed through Data API.
create function app_private.bootstrap_admin(target_user uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Bootstrap requires READ COMMITTED' using errcode='25000';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(1735289203, 1);
  if exists(select 1 from public.global_user_roles) then
    raise exception 'Admin bootstrap already completed' using errcode='23514';
  end if;
  if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
                where p.id=target_user and p.is_active and u.email_confirmed_at is not null) then
    raise exception 'Bootstrap requires an active, confirmed Auth profile' using errcode='23514';
  end if;
  -- Caller must provide app.system_reason; audit fails closed if omitted.
  insert into public.global_user_roles(user_id,role) values(target_user,'admin');
end;
$$;
revoke all on function app_private.bootstrap_admin(uuid) from public, anon, authenticated, service_role;
commit;
