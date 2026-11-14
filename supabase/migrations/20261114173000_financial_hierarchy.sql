-- Explicit macro/category/line hierarchy, frozen in each approved revision.
begin;
alter table public.budget_lines
 add column macro_code text check (length(btrim(macro_code)) between 1 and 40),
 add column macro_name_snapshot text check (length(btrim(macro_name_snapshot)) between 1 and 160),
 add constraint budget_macro_pair check ((macro_code is null) = (macro_name_snapshot is null));

-- Reuse all existing authorization, locking and financial validation.
alter function public.edit_financial_plan(uuid,text,bigint,jsonb) rename to edit_financial_plan_before_hierarchy;
revoke all on function public.edit_financial_plan_before_hierarchy(uuid,text,bigint,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.edit_financial_plan_before_hierarchy(uuid,text,bigint,jsonb) to ariadne_finance;
create function public.edit_financial_plan(target_project uuid,command text,expected_version bigint default null,payload jsonb default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare saved uuid; macro text; label text; category uuid; source_revision uuid;
begin
 -- The original RPC checks access, locks the project and validates the version.
 saved:=public.edit_financial_plan_before_hierarchy(target_project,command,expected_version,payload);
 if command='save_line' and (payload ? 'macro_code' or payload ? 'macro_name') then
  macro:=nullif(upper(btrim(payload->>'macro_code')),''); label:=nullif(btrim(payload->>'macro_name'),'');
  if (macro is null)<>(label is null) then raise exception 'Indica sia codice sia nome della macrovoce, oppure lascia entrambi vuoti.' using errcode='23514'; end if;
  select id into strict category from public.budget_categories where project_id=target_project and code=upper(btrim(payload->>'category_code'));
  -- A category belongs to one macro within a revision. Editing its grouping
  -- updates its siblings in the draft, never an approved snapshot.
  update public.budget_lines set macro_code=macro,macro_name_snapshot=label where revision_id=saved and category_id=category;
  if macro is not null then
   update public.budget_lines set macro_name_snapshot=label where revision_id=saved and macro_code=macro and macro_name_snapshot is distinct from label;
  end if;
 elsif command='create_revision' then
  select based_on_id into source_revision from public.budget_revisions where id=saved;
  update public.budget_lines dest set macro_code=src.macro_code,macro_name_snapshot=src.macro_name_snapshot
   from public.budget_lines src where dest.revision_id=saved and src.revision_id=source_revision and dest.line_item_id=src.line_item_id;
 end if;
 return saved;
end $$;
alter function public.edit_financial_plan(uuid,text,bigint,jsonb) owner to ariadne_finance;
revoke all on function public.edit_financial_plan(uuid,text,bigint,jsonb) from public,anon,service_role;
grant execute on function public.edit_financial_plan(uuid,text,bigint,jsonb) to authenticated;

alter function app_private.audit_payload(text,jsonb) rename to audit_payload_before_hierarchy;
create function app_private.audit_payload(entity text,data jsonb) returns jsonb language sql immutable set search_path='' as $$
 select app_private.audit_payload_before_hierarchy(entity,data) || case when entity='budget_lines' then
 jsonb_build_object('macro_code',data->'macro_code','macro_name_snapshot',data->'macro_name_snapshot') else '{}'::jsonb end;
$$;
revoke all on function app_private.audit_payload(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function app_private.audit_payload(text,jsonb) to ariadne_auditor;
notify pgrst,'reload schema';
commit;
