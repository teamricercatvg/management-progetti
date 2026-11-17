-- Approved financial correction history and expense reminders. No destructive writes.
begin;
alter table public.financial_entries
 add column correction_of_id uuid,
 add column reminder_text text check(length(reminder_text)<=4000),
 add column reminder_priority text check(reminder_priority in ('green','orange','red')),
 add constraint financial_correction_project foreign key(project_id,correction_of_id) references public.financial_entries(project_id,id),
 add constraint financial_correction_once unique(correction_of_id),
 add constraint financial_reminder_pair check ((reminder_text is null and reminder_priority is null) or
  (kind='expense' and length(btrim(reminder_text))>0 and reminder_priority is not null));
create or replace function app_private.guard_finance_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='budget_revisions' then
  if tg_op='UPDATE' and old.status='approved' then raise exception 'Piano approvato immutabile.' using errcode='23514'; end if;
 elsif tg_table_name='budget_lines' then
  if exists(select 1 from public.budget_revisions where id=new.revision_id and status='approved') then raise exception 'Piano approvato immutabile.' using errcode='23514'; end if;
 elsif tg_table_name='budget_allocations' then
  if exists(select 1 from public.budget_lines l join public.budget_revisions r on r.id=l.revision_id where l.id=new.budget_line_id and r.status='approved') then raise exception 'Ripartizione approvata immutabile.' using errcode='23514'; end if;
 elsif tg_table_name='project_exchange_rates' then
  if tg_op='UPDATE' then raise exception 'Creare una nuova versione del cambio.' using errcode='23514'; end if;
 elsif tg_table_name='financial_entries' then
  if tg_op='UPDATE' and old.status<>'draft' then
  if (to_jsonb(new)-array['reminder_text','reminder_priority']) is not distinct from (to_jsonb(old)-array['reminder_text','reminder_priority']) then return new; end if;
  if (to_jsonb(new)-array['status','closed_at','void_reason']) is distinct from (to_jsonb(old)-array['status','closed_at','void_reason'])
   or not ((old.status='confirmed' and new.status in ('closed','cancelled')) or (old.status='posted' and new.status='voided')) then
   raise exception 'Movimento registrato immutabile: annullare e rettificare.' using errcode='23514'; end if;
  end if;
 end if;
 return new;
end $$;

alter function public.edit_financial_plan(uuid,text,bigint,jsonb) rename to edit_financial_plan_before_followup;
revoke all on function public.edit_financial_plan_before_followup(uuid,text,bigint,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.edit_financial_plan_before_followup(uuid,text,bigint,jsonb) to ariadne_finance;
create function public.edit_financial_plan(target_project uuid,command text,expected_version bigint default null,payload jsonb default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare e public.financial_entries%rowtype; saved uuid; version bigint; replacement jsonb; project_status text;
begin
 if command not in ('correct_entry','save_reminder') then
  return public.edit_financial_plan_before_followup(target_project,command,expected_version,payload);
 end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'READ COMMITTED required' using errcode='25000'; end if;
 if not app_private.can_access_project(target_project) then raise insufficient_privilege; end if;
 select status into project_status from public.projects where id=target_project for update;
 if not found or project_status='archived' or not app_private.can_access_project(target_project) then raise insufficient_privilege; end if;
 select * into e from public.financial_entries where project_id=target_project and id=(payload->>'id')::uuid;
 if not found or e.row_version is distinct from expected_version then raise exception 'Movimento cambiato: ricarica la pagina.' using errcode='40001'; end if;
 if command='save_reminder' then
  if e.kind<>'expense' then raise exception 'Reminder disponibile solo per le spese.' using errcode='23514'; end if;
  update public.financial_entries set reminder_text=nullif(btrim(payload->>'reminder_text'),''),
   reminder_priority=case when nullif(btrim(payload->>'reminder_text'),'') is not null then payload->>'reminder_priority' end where id=e.id;
  return e.id;
 end if;
 if e.status not in ('posted','confirmed') or payload->>'kind' is distinct from e.kind or payload->>'register' is distinct from 'true' then
  raise exception 'Correggi un movimento registrato mantenendo il tipo e registrando la sostituzione.' using errcode='23514'; end if;
 -- Void and replace in the SAME transaction: any validation failure rolls back both.
 perform public.edit_financial_plan_before_followup(target_project,'void_entry',expected_version,payload);
 replacement:=payload || jsonb_build_object('id',gen_random_uuid(),'register','false');
 saved:=public.edit_financial_plan_before_followup(target_project,'save_entry',null,replacement);
 update public.financial_entries set correction_of_id=e.id,reminder_text=e.reminder_text,reminder_priority=e.reminder_priority where id=saved;
 select row_version into version from public.financial_entries where id=saved;
 perform public.edit_financial_plan_before_followup(target_project,'save_entry',version,replacement || jsonb_build_object('id',saved,'register','true'));
 return saved;
end $$;
alter function public.edit_financial_plan(uuid,text,bigint,jsonb) owner to ariadne_finance;
revoke all on function public.edit_financial_plan(uuid,text,bigint,jsonb) from public,anon,service_role;
grant execute on function public.edit_financial_plan(uuid,text,bigint,jsonb) to authenticated;
alter function app_private.audit_payload(text,jsonb) rename to audit_payload_before_followup;
create function app_private.audit_payload(entity text,data jsonb) returns jsonb language sql immutable set search_path='' as $$
 select app_private.audit_payload_before_followup(entity,data) || case when entity='financial_entries' then
 jsonb_build_object('correction_of_id',data->'correction_of_id','reminder_priority',data->'reminder_priority','has_reminder',nullif(data->>'reminder_text','') is not null) else '{}'::jsonb end;
$$;
revoke all on function app_private.audit_payload(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function app_private.audit_payload(text,jsonb) to ariadne_auditor;
notify pgrst,'reload schema';
commit;
