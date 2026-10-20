-- Atomic, RLS-protected archive of one framework branch, including activities.
begin;
create function public.archive_framework_branch(target_project uuid, target_item uuid, expected_version bigint)
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
