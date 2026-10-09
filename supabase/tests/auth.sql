\set ON_ERROR_STOP on
begin;
set local app.system_reason = 'milestone-4 synthetic auth test';
create function pg_temp.check_true(ok boolean, label text) returns void language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 raise notice 'PASS: %',label;
end;
$$;
insert into auth.users(id,raw_user_meta_data,email_confirmed_at) values
('40000000-0000-0000-0000-000000000001','{"display_name":"Alice", "role":"admin", "is_active":true}',now()),
('40000000-0000-0000-0000-000000000002','{"display_name":"  "}',null);
select pg_temp.check_true((select display_name='Alice' from public.profiles where id='40000000-0000-0000-0000-000000000001'),'profile created by Auth trigger');
select pg_temp.check_true((select display_name='Utente' from public.profiles where id='40000000-0000-0000-0000-000000000002'),'blank name has safe fallback');
select pg_temp.check_true(not exists(select 1 from public.global_user_roles),'metadata cannot grant admin');
select pg_temp.check_true((select count(*)=2 from public.audit_log where entity_table='profiles' and entity_id like '40000000%'),'profile provisioning audited');
update auth.users set raw_user_meta_data='{"display_name":"Forged", "role":"admin"}' where id='40000000-0000-0000-0000-000000000001';
select pg_temp.check_true((select display_name='Alice' from public.profiles where id='40000000-0000-0000-0000-000000000001'),'metadata updates cannot change profile or role');
do $$ begin
 begin
  perform app_private.bootstrap_admin('40000000-0000-0000-0000-000000000002');
  raise exception 'FAIL: unconfirmed bootstrap succeeded';
 exception when check_violation then raise notice 'PASS: unconfirmed bootstrap denied'; end;
end $$;
select app_private.bootstrap_admin('40000000-0000-0000-0000-000000000001');
do $$ begin
 begin
  perform app_private.bootstrap_admin('40000000-0000-0000-0000-000000000001');
  raise exception 'FAIL: repeated bootstrap succeeded';
 exception when check_violation then raise notice 'PASS: repeated bootstrap denied'; end;
end $$;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.check_true((select count(*)=1 and bool_and(id='40000000-0000-0000-0000-000000000001'::uuid) and bool_and(is_admin) from public.current_profile()),'RPC returns only own profile and database role');
reset role;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select pg_temp.check_true((select count(*)=1 and not bool_or(is_admin) from public.current_profile()),'second user cannot impersonate admin');
reset role;
update public.profiles set is_active=false where id='40000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.check_true(not exists(select 1 from public.current_profile()),'disabled profile returns no identity');
reset role;
select pg_temp.check_true(not has_function_privilege('anon','public.current_profile()','EXECUTE'),'anonymous identity access denied');
select pg_temp.check_true(not has_function_privilege('service_role','public.current_profile()','EXECUTE'),'service role has no profile API');
select pg_temp.check_true(not has_function_privilege('authenticated','app_private.bootstrap_admin(uuid)','EXECUTE'),'bootstrap not callable by users');
select pg_temp.check_true(not exists(select 1 from pg_tables t cross join unnest(array['anon','authenticated','service_role']) r where t.schemaname='public' and (has_table_privilege(r,quote_ident(t.tablename),'SELECT') or has_table_privilege(r,quote_ident(t.tablename),'INSERT') or has_table_privilege(r,quote_ident(t.tablename),'UPDATE'))),'all direct table accesses remain closed');
rollback;
