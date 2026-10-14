-- Milestone 5: only the approved Admin/Manager foundation contract.
begin;
-- Cluster roles are shared by databases; no LOGIN, membership, ownership of tables,
-- or BYPASSRLS. Explicit internal policies pair with narrowly scoped grants.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='ariadne_reader') then create role ariadne_reader nologin noinherit; end if;
  if not exists(select 1 from pg_roles where rolname='ariadne_guard') then create role ariadne_guard nologin noinherit; end if;
  if not exists(select 1 from pg_roles where rolname='ariadne_auditor') then create role ariadne_auditor nologin noinherit; end if;
  if not exists(select 1 from pg_roles where rolname='ariadne_identity') then create role ariadne_identity nologin noinherit; end if;
  if exists(select 1 from pg_roles where rolname in ('ariadne_reader','ariadne_guard','ariadne_auditor','ariadne_identity') and (rolcanlogin or rolsuper or rolbypassrls or rolcreaterole or rolcreatedb))
     or exists(select 1 from pg_auth_members m join pg_roles r on r.oid=m.roleid where r.rolname in ('ariadne_reader','ariadne_guard','ariadne_auditor','ariadne_identity')) then
    raise exception 'Dedicated authorization roles must be unprivileged and have no members';
  end if;
end $$;
grant usage on schema public, app_private, auth to ariadne_reader, ariadne_guard, ariadne_auditor, ariadne_identity;
grant execute on function auth.uid() to ariadne_reader, ariadne_guard, ariadne_auditor, ariadne_identity;
grant usage on schema app_private to authenticated;
grant select on public.profiles, public.global_user_roles, public.projects, public.project_memberships, public.project_organizations, public.organizations to ariadne_reader, ariadne_guard;
grant update on public.projects, public.organizations to ariadne_guard;
grant insert on public.audit_log to ariadne_auditor;
grant usage on sequence public.audit_log_id_seq to ariadne_auditor;
grant select, insert, update on public.profiles to ariadne_identity;
grant select, insert, delete on public.global_user_roles to ariadne_identity;

do $$ declare t text; begin
  foreach t in array array['profiles','global_user_roles','projects','project_memberships','project_organizations','organizations'] loop
    execute format('create policy internal_read on public.%I for select to ariadne_reader, ariadne_guard using (true)',t);
  end loop;
end $$;
create policy internal_project_lock on public.projects for update to ariadne_guard using (true) with check (true);
create policy internal_organization_lock on public.organizations for update to ariadne_guard using (true) with check (true);
create policy internal_audit on public.audit_log for insert to ariadne_auditor with check (true);
create policy internal_profile on public.profiles to ariadne_identity using (true) with check (true);
create policy internal_roles on public.global_user_roles to ariadne_identity using (true) with check (true);

create function app_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join public.global_user_roles r on r.user_id=p.id where p.id=auth.uid() and p.is_active);
$$;
create function app_private.is_active_user() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and is_active);
$$;
create function app_private.has_project_role(project_id uuid, roles text[] default array['manager']) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.project_memberships m join public.profiles p on p.id=m.user_id
 where p.id=auth.uid() and p.is_active and m.project_id=$1 and m.status='active' and m.role=any($2));
$$;
create function app_private.can_access_project(project_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_admin() or app_private.has_project_role($1);
$$;
create function app_private.can_read_organization(organization_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_admin() or exists(select 1 from public.project_organizations po where po.organization_id=$1 and app_private.has_project_role(po.project_id));
$$;
-- Dedicated owners for the previous trigger routines; no application caller can
-- invoke these trigger-only entry points or insert audit records directly.
alter function app_private.record_audit() security definer;
alter function app_private.record_audit() owner to ariadne_auditor;
grant execute on function app_private.audit_payload(text,jsonb) to ariadne_auditor;
alter function app_private.protect_last_admin() security definer;
alter function app_private.protect_last_admin() owner to ariadne_guard;
alter function app_private.guard_project_write() security definer;
alter function app_private.guard_project_write() owner to ariadne_guard;
alter function app_private.guard_organization_reference() security definer;
alter function app_private.guard_organization_reference() owner to ariadne_guard;
alter function app_private.check_partnership() security definer;
alter function app_private.check_partnership() owner to ariadne_guard;
alter function app_private.provision_auth_profile() owner to ariadne_identity;
alter function public.current_profile() owner to ariadne_reader;

-- Admin controls account activation and global roles; row/statement triggers
-- preserve audit and serialize protection of the last active administrator.
create function public.set_profile_active(target_user uuid, active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(1735289203,1);
 if not app_private.is_admin() then raise insufficient_privilege; end if;
 update public.profiles set is_active=active where id=target_user;
 if not found then raise exception 'Profile not found' using errcode='22023'; end if;
end $$;
create function public.set_admin_role(target_user uuid, enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 -- Acquire the shared registry lock before authorization, including concurrent revocation.
 perform pg_catalog.pg_advisory_xact_lock(1735289203,1);
 if not app_private.is_admin() then raise insufficient_privilege; end if;
 if enabled then
   if not exists(select 1 from public.profiles where id=target_user and is_active) then raise exception 'Active profile required' using errcode='22023'; end if;
   insert into public.global_user_roles(user_id) values(target_user) on conflict do nothing;
 else delete from public.global_user_roles where user_id=target_user;
 end if;
end $$;
alter function public.set_profile_active(uuid,boolean) owner to ariadne_identity;
alter function public.set_admin_role(uuid,boolean) owner to ariadne_identity;

create function public.search_organizations(query text) returns table(id uuid,code text,name text)
language sql stable security definer set search_path='' as $$
 select o.id,o.code,o.name from public.organizations o
 where app_private.is_active_user() and (app_private.is_admin() or exists(select 1 from public.project_memberships where user_id=auth.uid() and status='active'))
 and length(btrim($1)) between 2 and 120 and o.status='active'
 and (strpos(lower(o.code),lower(btrim($1)))>0 or strpos(lower(o.name),lower(btrim($1)))>0)
 order by o.code limit 20;
$$;
create function public.project_manager_names(project_id uuid) returns table(id uuid,display_name text)
language sql stable security definer set search_path='' as $$
 select p.id,p.display_name from public.profiles p join public.project_memberships m on m.user_id=p.id
 where m.project_id=$1 and m.status='active' and p.is_active and app_private.can_access_project($1);
$$;

do $$ declare signature text; begin
 foreach signature in array array['app_private.is_admin()','app_private.is_active_user()','app_private.has_project_role(uuid,text[])','app_private.can_access_project(uuid)','app_private.can_read_organization(uuid)','public.search_organizations(text)','public.project_manager_names(uuid)'] loop
   execute 'alter function '||signature||' owner to ariadne_reader';
   execute 'revoke all on function '||signature||' from public, anon, authenticated, service_role';
   execute 'grant execute on function '||signature||' to authenticated, ariadne_reader, ariadne_identity';
 end loop;
end $$;
revoke all on function public.set_profile_active(uuid,boolean), public.set_admin_role(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_profile_active(uuid,boolean), public.set_admin_role(uuid,boolean) to authenticated;

-- Column grants prevent clients forging identity, project, attribution or version.
grant select on public.profiles,public.global_user_roles,public.organizations,public.projects,public.project_memberships,public.project_organizations,public.audit_log to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant insert(code,name,country_code,status), update(code,name,country_code,status) on public.organizations to authenticated;
grant insert(code,title,description,status,start_date,end_date,donor,currency_code,notes), update(code,title,description,status,start_date,end_date,donor,currency_code,notes) on public.projects to authenticated;
grant insert(project_id,user_id,role,status), update(status) on public.project_memberships to authenticated;
grant insert(project_id,organization_id,role,notes), update(organization_id,role,notes) on public.project_organizations to authenticated;

create policy profile_read on public.profiles for select to authenticated using (app_private.is_admin() or (id=auth.uid() and app_private.is_active_user()));
create policy profile_name on public.profiles for update to authenticated using (app_private.is_admin() or (id=auth.uid() and app_private.is_active_user())) with check (app_private.is_admin() or (id=auth.uid() and app_private.is_active_user()));
create policy role_read on public.global_user_roles for select to authenticated using (app_private.is_admin());
create policy organization_read on public.organizations for select to authenticated using (app_private.can_read_organization(id));
create policy organization_create on public.organizations for insert to authenticated with check (app_private.is_admin());
create policy organization_update on public.organizations for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy project_read on public.projects for select to authenticated using (app_private.can_access_project(id));
create policy project_create on public.projects for insert to authenticated with check (app_private.is_admin());
create policy project_update on public.projects for update to authenticated using (app_private.can_access_project(id)) with check (app_private.can_access_project(id));
create policy membership_read on public.project_memberships for select to authenticated using (app_private.can_access_project(project_id));
create policy membership_create on public.project_memberships for insert to authenticated with check (app_private.is_admin());
create policy membership_update on public.project_memberships for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy partnership_read on public.project_organizations for select to authenticated using (app_private.can_access_project(project_id));
create policy partnership_create on public.project_organizations for insert to authenticated with check (app_private.can_access_project(project_id));
create policy partnership_update on public.project_organizations for update to authenticated using (app_private.can_access_project(project_id)) with check (app_private.can_access_project(project_id));
create policy audit_read on public.audit_log for select to authenticated using (app_private.is_admin() or app_private.has_project_role(project_id));

-- Only draft partnership children may be removed, through a checked operation.
grant delete on public.project_organizations to ariadne_guard;
create policy internal_partnership_delete on public.project_organizations for delete to ariadne_guard using (true);
grant execute on function app_private.can_access_project(uuid) to ariadne_guard;
create function public.remove_draft_project_organization(target_project uuid, target_link uuid) returns void
language plpgsql security definer set search_path='' as $$
declare project_status text;
begin
 if not app_private.can_access_project(target_project) then raise insufficient_privilege; end if;
 select status into project_status from public.projects where id=target_project for update;
 if project_status is distinct from 'draft' then raise exception 'Only draft associations can be removed' using errcode='23514'; end if;
 delete from public.project_organizations where id=target_link and project_id=target_project;
 if not found then raise exception 'Association not found' using errcode='22023'; end if;
end $$;
alter function public.remove_draft_project_organization(uuid,uuid) owner to ariadne_guard;
revoke all on function public.remove_draft_project_organization(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.remove_draft_project_organization(uuid,uuid) to authenticated;

-- Bound names consistently with Auth provisioning.
alter table public.profiles add constraint profile_name_length check(length(display_name)<=120) not valid;
alter table public.profiles validate constraint profile_name_length;
notify pgrst, 'reload schema';
commit;
