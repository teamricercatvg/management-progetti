\set ON_ERROR_STOP on
\o /dev/null
begin;
set local app.system_reason = 'milestone-3 synthetic integrity test';
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'FAIL: %', label; end if;
 raise notice 'PASS: %', label;
end;
$$;
create function pg_temp.expect_error(command text, expected_state text, label text) returns void language plpgsql as $$
begin
 begin
   execute command;
 exception when others then
   if sqlstate <> expected_state then raise exception 'FAIL: % (expected %, got %: %)', label,expected_state,sqlstate,sqlerrm; end if;
   raise notice 'PASS: %', label;
   return;
 end;
 raise exception 'FAIL: % (operation succeeded)',label;
end;
$$;
select pg_temp.assert_true((select count(*)=7 and bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'), 'seven foundation tables, all RLS enabled');
select pg_temp.assert_true((select count(*)=0 from pg_policies where schemaname='public'), 'no permissive application policies');
select pg_temp.assert_true(not exists (
 select 1 from pg_tables t cross join unnest(array['anon','authenticated','service_role']) r
 where t.schemaname='public' and (has_table_privilege(r,quote_ident(t.tablename),'SELECT') or has_table_privilege(r,quote_ident(t.tablename),'INSERT') or has_table_privilege(r,quote_ident(t.tablename),'UPDATE') or has_table_privilege(r,quote_ident(t.tablename),'DELETE') or has_table_privilege(r,quote_ident(t.tablename),'TRUNCATE'))), 'no Data API role has table privileges, including service_role');
select pg_temp.assert_true(not exists (
 select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 cross join unnest(array['anon','authenticated','service_role']) r
 where n.nspname='app_private' and has_function_privilege(r,p.oid,'EXECUTE')), 'helpers not executable by API roles');
select pg_temp.assert_true(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.prosecdef), 'no privileged callable helper in milestone 3');

insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into public.profiles(id,display_name) select id,'Synthetic user' from auth.users;
insert into public.global_user_roles(user_id) values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
update public.profiles set is_active=false where id='00000000-0000-0000-0000-000000000002';
select pg_temp.expect_error($q$update public.profiles set is_active=false where id='00000000-0000-0000-0000-000000000001'$q$,'23514','last active admin cannot be disabled');
select pg_temp.expect_error($q$delete from public.global_user_roles where user_id='00000000-0000-0000-0000-000000000001'$q$,'23514','last active admin cannot be revoked');
select pg_temp.expect_error($q$update public.global_user_roles set role='manager'$q$,'23514','global role restricted to admin');
select pg_temp.expect_error($q$update public.profiles set display_name='  '$q$,'23514','required text cannot be blank');

insert into public.organizations(id,code,name) values
 ('10000000-0000-0000-0000-000000000001','ORG1','Synthetic sole'),
 ('10000000-0000-0000-0000-000000000002','ORG2','Synthetic lead'),
 ('10000000-0000-0000-0000-000000000003','ORG3','Synthetic partner');
insert into public.projects(id,code,title,start_date,end_date,currency_code) values
 ('20000000-0000-0000-0000-000000000001','P1','Synthetic project','2026-01-01','2026-12-31','EUR'),
 ('20000000-0000-0000-0000-000000000002','P2','Synthetic project 2','2026-01-01','2026-12-31','EUR');
set constraints all immediate;
select pg_temp.expect_error($q$update public.projects set status='active' where code='P1'$q$,'23514','activation without organizations fails');
select pg_temp.expect_error($q$update public.projects set code=' p1 ' where code='P1'$q$,'23514','code must be normalized');
select pg_temp.expect_error($q$update public.projects set code='P2' where code='P1'$q$,'23505','project code unique');
select pg_temp.expect_error($q$update public.projects set end_date='2025-01-01' where code='P1'$q$,'23514','project dates ordered');
select pg_temp.expect_error($q$update public.projects set currency_code='eu' where code='P1'$q$,'23514','currency format checked');
insert into public.project_organizations(id,project_id,organization_id,role) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','sole');
update public.projects set status='active' where code='P1';
select pg_temp.expect_error($q$insert into public.project_organizations(project_id,organization_id,role) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','lead')$q$,'23505','single sole or lead per project');
select pg_temp.expect_error($q$insert into public.project_organizations(project_id,organization_id,role) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','partner')$q$,'23514','sole plus partner rejected');
select pg_temp.expect_error($q$delete from public.project_organizations where id='30000000-0000-0000-0000-000000000001'$q$,'23514','last project organization cannot be removed');
-- Valid transactional replacement: temporary incompleteness is allowed.
set constraints all deferred;
update public.project_organizations set role='lead' where id='30000000-0000-0000-0000-000000000001';
insert into public.project_organizations(id,project_id,organization_id,role) values
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','partner');
set constraints all immediate;
select pg_temp.assert_true((select count(*)=2 from public.project_organizations), 'atomic sole to partnership transition accepted');
select pg_temp.expect_error($q$update public.project_organizations set project_id='20000000-0000-0000-0000-000000000002' where id='30000000-0000-0000-0000-000000000002'$q$,'23514','project_id immutable');
update public.organizations set status='archived' where code='ORG3';
select pg_temp.expect_error($q$insert into public.project_organizations(project_id,organization_id,role) values ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','sole')$q$,'23514','archived organization cannot receive new reference');

insert into public.project_memberships(id,project_id,user_id) values ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003');
select pg_temp.expect_error($q$update public.project_memberships set role='viewer'$q$,'23514','only manager membership supported');
select pg_temp.expect_error($q$insert into public.project_memberships(project_id,user_id) select project_id,user_id from public.project_memberships$q$,'23505','membership unique per user/project');
select pg_temp.expect_error($q$update public.project_memberships set user_id='00000000-0000-0000-0000-000000000009'$q$,'23503','membership user FK enforced');
-- Future child tables must use the prepared composite target; verify cross-project FK.
create table public.child_fixture(project_id uuid, membership_id uuid,
 foreign key (project_id,membership_id) references public.project_memberships(project_id,id));
select pg_temp.expect_error($q$insert into child_fixture values ('20000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001')$q$,'23503','composite FK rejects cross-project association');
drop table public.child_fixture;

set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
update public.projects set title='Updated synthetic project',created_at='2000-01-01',created_by='00000000-0000-0000-0000-000000000001' where code='P1';
select pg_temp.assert_true((select updated_by='00000000-0000-0000-0000-000000000003' and created_by is null and created_at>'2020-01-01' and row_version=3 from public.projects where code='P1'),'DB assigns editor, preserves creator and advances version');
select pg_temp.assert_true(exists(select 1 from public.audit_log where entity_table='projects' and actor_kind='user' and actor_id='00000000-0000-0000-0000-000000000003'), 'audit derives actor from session');
select pg_temp.assert_true(not exists(select 1 from public.audit_log where coalesce(old_values,new_values) ?| array['display_name','name','title','notes','email','password']), 'audit payload allowlist excludes free text and credentials');
select pg_temp.expect_error($q$update public.projects set row_version=1 where code='P1'$q$,'40001','forged or stale version rejected');
with updated as (update public.projects set title='Lost update' where code='P1' and row_version=1 returning id) select pg_temp.assert_true(count(*)=0, 'optimistic version predicate prevents lost update') from updated;
update public.projects set status='archived' where code='P1';
select pg_temp.expect_error($q$update public.projects set title='Forbidden' where code='P1'$q$,'23514','archived project read-only');
select pg_temp.expect_error($q$update public.projects set status='active',title='Forbidden' where code='P1'$q$,'23514','reopening cannot smuggle other edits');
select pg_temp.expect_error($q$update public.project_memberships set status='inactive'$q$,'23514','archived project children read-only');
update public.projects set status='active' where code='P1';
select pg_temp.expect_error($q$delete from public.projects where code='P2'$q$,'23514','operational deletion forbidden');
select pg_temp.expect_error($q$truncate public.project_memberships$q$,'23514','operational truncate forbidden');
select pg_temp.expect_error($q$update public.audit_log set reason='Forged'$q$,'23514','audit cannot be updated');
select pg_temp.expect_error($q$delete from public.audit_log$q$,'23514','audit cannot be deleted');
select pg_temp.expect_error($q$truncate public.audit_log$q$,'23514','audit cannot be truncated');
set local request.jwt.claim.sub='';
set local app.system_reason='';
select pg_temp.expect_error($q$update public.projects set title='Unaudited' where code='P1'$q$,'23514','system process must identify itself');
select pg_temp.assert_true((select title='Updated synthetic project' from public.projects where code='P1'),'audit failure rolls back business write');

-- Direct role probes: first grants, then RLS in isolation using temporary grants.
set local role anon;
do $$ begin
 begin perform * from public.projects; raise exception 'anon read unexpectedly allowed';
 exception when insufficient_privilege then raise notice 'PASS: anon direct read denied'; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
 begin insert into public.audit_log(actor_kind,action,entity_table,entity_id,reason) values('system','INSERT','forged','x','x');
 raise exception 'audit insert unexpectedly allowed';
 exception when insufficient_privilege then raise notice 'PASS: authenticated direct audit insert denied'; end;
end $$;
reset role;
grant select,insert,update,delete on public.projects to anon,authenticated;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.projects) then raise exception 'RLS leaked projects'; end if;
 update public.projects set title='Forbidden';
 if found then raise exception 'RLS allowed updates'; end if;
 delete from public.projects;
 if found then raise exception 'RLS allowed deletes'; end if;
 begin
  insert into public.projects(code,title,start_date,end_date,currency_code) values ('FORGED','Forbidden','2026-01-01','2026-12-31','EUR');
  raise exception 'RLS allowed insert';
 exception when insufficient_privilege then
  if sqlerrm not like '%row-level security%' then raise; end if;
  raise notice 'PASS: authenticated INSERT rejected by RLS with temporary grants';
 end;
 raise notice 'PASS: authenticated RLS denies rows even with temporary grants';
end $$;
reset role;
set local role anon;
do $$ begin
 if exists(select 1 from public.projects) then raise exception 'RLS leaked projects'; end if;
 raise notice 'PASS: anon RLS denies rows even with temporary grants';
end $$;
reset role;
rollback;
