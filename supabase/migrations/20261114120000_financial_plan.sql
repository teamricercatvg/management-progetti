-- M12: versioned financial plan, joint allocations and an auditable movement register.
begin;

create table public.budget_categories (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 code text not null check(length(btrim(code)) between 1 and 40), name text not null check(length(btrim(name)) between 1 and 160),
 unique(project_id,id), unique(project_id,code)
);
create table public.budget_line_items (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 code text not null check(length(btrim(code)) between 1 and 40), unique(project_id,id), unique(project_id,code)
);
create table public.budget_revisions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 revision_number integer not null check(revision_number>0), based_on_id uuid,
 title text not null check(length(btrim(title)) between 1 and 240), reason text not null check(length(btrim(reason)) between 1 and 4000),
 status text not null default 'draft' check(status in ('draft','approved')),
 approved_at timestamptz, approved_by uuid references public.profiles(id), project_snapshot jsonb,
 unique(project_id,id), unique(project_id,revision_number),
 foreign key(project_id,based_on_id) references public.budget_revisions(project_id,id),
 check((status='approved')=(approved_at is not null and approved_by is not null and project_snapshot is not null))
);
create unique index budget_one_draft on public.budget_revisions(project_id) where status='draft';
create table public.budget_lines (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 revision_id uuid not null, line_item_id uuid not null, category_id uuid not null,
 category_name_snapshot text not null, description text not null check(length(btrim(description)) between 1 and 500),
 planned_amount numeric(14,2) not null check(planned_amount>=0 and planned_amount<1000000000000), notes text check(length(notes)<=4000),
 unique(project_id,id), unique(project_id,revision_id,line_item_id),
 foreign key(project_id,revision_id) references public.budget_revisions(project_id,id),
 foreign key(project_id,line_item_id) references public.budget_line_items(project_id,id),
 foreign key(project_id,category_id) references public.budget_categories(project_id,id)
);
create table public.budget_allocations (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), budget_line_id uuid not null,
 result_id uuid, partner_id uuid, project_year integer check(project_year between 1 and 100),
 result_label text, partner_label text,
 amount numeric(14,2) not null check(amount>=0 and amount<1000000000000),
 foreign key(project_id,budget_line_id) references public.budget_lines(project_id,id),
 foreign key(project_id,result_id) references public.logical_framework_items(project_id,id),
 foreign key(project_id,partner_id) references public.project_organizations(project_id,id),
 unique nulls not distinct (budget_line_id,result_id,partner_id,project_year),
 check(result_id is not null or partner_id is not null or project_year is not null)
);
create table public.project_budget_state (
 project_id uuid primary key references public.projects(id), initial_revision_id uuid not null, current_revision_id uuid not null,
 foreign key(project_id,initial_revision_id) references public.budget_revisions(project_id,id),
 foreign key(project_id,current_revision_id) references public.budget_revisions(project_id,id)
);
create table public.project_bank_accounts (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), partner_id uuid not null,
 name text not null check(length(btrim(name)) between 1 and 160), bank_name text check(length(bank_name)<=160),
 account_reference text check(length(account_reference)<=100), status text not null default 'active' check(status in ('active','archived')),
 unique(project_id,id), unique(project_id,id,partner_id), unique(project_id,partner_id,name),
 foreign key(project_id,partner_id) references public.project_organizations(project_id,id)
);
create table public.project_exchange_rates (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 source_currency_code text not null check(source_currency_code ~ '^[A-Z]{3}$'),
 rate_month date not null check(isfinite(rate_month) and extract(day from rate_month)=1),
 version integer not null check(version>0), rate numeric(24,12) not null check(rate>0 and rate<1000000000000),
 source text not null check(length(btrim(source)) between 1 and 500), calculation_method text not null check(length(btrim(calculation_method)) between 1 and 1000),
 source_reference text check(length(source_reference)<=1000), observed_at date not null check(isfinite(observed_at)),
 supersedes_rate_id uuid, reason text check(length(reason)<=4000),
 unique(project_id,id), unique(project_id,source_currency_code,rate_month,version), unique(supersedes_rate_id),
 foreign key(project_id,supersedes_rate_id) references public.project_exchange_rates(project_id,id)
);
-- One register makes partner/account cash flows consistent; kind-specific constraints
-- and RPC transitions keep commitments separate from actual receipts/payments.
create table public.financial_entries (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 kind text not null check(kind in ('income','commitment','expense','transfer')),
 reference text not null check(length(btrim(reference)) between 1 and 100), description text not null check(length(btrim(description)) between 1 and 500),
 entry_date date not null check(isfinite(entry_date)), partner_id uuid not null, account_id uuid,
 destination_partner_id uuid, destination_account_id uuid, line_item_id uuid, result_id uuid, commitment_id uuid,
 original_currency_code text not null check(original_currency_code ~ '^[A-Z]{3}$'),
 original_amount numeric(20,6) not null check(original_amount>0 and original_amount<1000000000000),
 exchange_rate_id uuid, applied_rate numeric(24,12), amount numeric(14,2) check(amount>0 and amount<1000000000000),
 status text not null default 'draft' check(status in ('draft','confirmed','closed','cancelled','posted','voided')),
 posted_at timestamptz, posted_by uuid references public.profiles(id), closed_at timestamptz,
 void_reason text check(length(void_reason)<=4000), notes text check(length(notes)<=4000),
 unique(project_id,id), unique(project_id,kind,reference),
 foreign key(project_id,partner_id) references public.project_organizations(project_id,id),
 foreign key(project_id,account_id,partner_id) references public.project_bank_accounts(project_id,id,partner_id),
 foreign key(project_id,destination_partner_id) references public.project_organizations(project_id,id),
 foreign key(project_id,destination_account_id,destination_partner_id) references public.project_bank_accounts(project_id,id,partner_id),
 foreign key(project_id,line_item_id) references public.budget_line_items(project_id,id),
 foreign key(project_id,result_id) references public.logical_framework_items(project_id,id),
 foreign key(project_id,commitment_id) references public.financial_entries(project_id,id),
 foreign key(project_id,exchange_rate_id) references public.project_exchange_rates(project_id,id),
 check((kind in ('commitment','expense'))=(line_item_id is not null)),
 check(kind='expense' or commitment_id is null), check(kind in ('commitment','expense') or result_id is null),
 check(kind<>'income' or account_id is not null),
 check((kind='transfer')=(destination_partner_id is not null)),
 check(kind='transfer' or destination_account_id is null),
 check(kind<>'transfer' or partner_id<>destination_partner_id or (account_id is not null and destination_account_id is not null and account_id<>destination_account_id)),
 check((kind='commitment' and status in ('draft','confirmed','closed','cancelled')) or (kind<>'commitment' and status in ('draft','posted','voided','cancelled'))),
 check(status in ('draft','cancelled') or (amount is not null and applied_rate is not null)),
 check(status not in ('confirmed','closed','posted','voided') or (posted_at is not null and posted_by is not null)),
 check(status not in ('cancelled','voided') or (void_reason is not null and length(btrim(void_reason))>0))
);
create index financial_commitment_payments on public.financial_entries(project_id,commitment_id,status);
create index financial_line_partner on public.financial_entries(project_id,line_item_id,partner_id,status);
create index financial_entry_date on public.financial_entries(project_id,kind,entry_date desc);
create index budget_allocations_line on public.budget_allocations(project_id,budget_line_id);

do $$ begin
 if not exists(select 1 from pg_roles where rolname='ariadne_finance') then create role ariadne_finance nologin noinherit; end if;
 if exists(select 1 from pg_roles where rolname='ariadne_finance' and (rolcanlogin or rolsuper or rolbypassrls or rolcreaterole or rolcreatedb)) or exists(select 1 from pg_auth_members where roleid='ariadne_finance'::regrole) then raise exception 'Unsafe finance role'; end if;
end $$;
grant usage on schema public,app_private,auth to ariadne_finance;
grant execute on function auth.uid(),app_private.can_access_project(uuid) to ariadne_finance;
grant select,update on public.projects to ariadne_finance;
create policy finance_projects on public.projects to ariadne_finance using(true) with check(true);
do $$ declare t text; begin
 foreach t in array array['project_organizations','organizations','logical_framework_items'] loop
  execute format('grant select on public.%I to ariadne_finance',t);
  execute format('create policy finance_reference on public.%I for select to ariadne_finance using(true)',t);
 end loop;
 foreach t in array array['budget_categories','budget_line_items','budget_revisions','budget_lines','budget_allocations','project_budget_state','project_bank_accounts','project_exchange_rates','financial_entries'] loop
  execute format('alter table public.%I add column created_at timestamptz not null default now(), add column created_by uuid references public.profiles(id), add column updated_at timestamptz not null default now(), add column updated_by uuid references public.profiles(id), add column row_version bigint not null default 1',t);
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to authenticated,ariadne_guard',t);
  execute format('grant select,insert,update on public.%I to ariadne_finance',t);
  execute format('create policy project_read on public.%I for select to authenticated using(app_private.can_access_project(project_id))',t);
  execute format('create policy internal_read on public.%I for select to ariadne_guard using(true)',t);
  execute format('create policy finance_write on public.%I to ariadne_finance using(true) with check(true)',t);
  execute format('create trigger z_stamp_row before insert or update on public.%I for each row execute function app_private.stamp_row()',t);
  execute format('create trigger record_audit after insert or update on public.%I for each row execute function app_private.record_audit()',t);
  execute format('create trigger deny_delete before delete on public.%I for each row execute function app_private.deny_destructive_write()',t);
  execute format('create trigger deny_truncate before truncate on public.%I for each statement execute function app_private.deny_destructive_write()',t);
 end loop;
end $$;
-- Preserve the existing audit allowlist. Financial audit stores values and links,
-- but no bank references, narrative descriptions or other free text.
alter function app_private.audit_payload(text,jsonb) rename to audit_payload_before_finance;
create function app_private.audit_payload(entity text,data jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when entity=any(array['budget_categories','budget_line_items','budget_revisions','budget_lines','budget_allocations','project_budget_state','project_bank_accounts','project_exchange_rates','financial_entries'])
 then (select jsonb_object_agg(key,value) from jsonb_each(data) where key=any(array['id','project_id','code','kind','revision_id','revision_number','based_on_id','initial_revision_id','current_revision_id','line_item_id','category_id','budget_line_id','partner_id','result_id','project_year','amount','planned_amount','original_amount','original_currency_code','applied_rate','exchange_rate_id','source_currency_code','rate_month','version','rate','supersedes_rate_id','entry_date','account_id','destination_partner_id','destination_account_id','commitment_id','status','posted_at','posted_by','closed_at','approved_at','approved_by','row_version']))
 || case when entity='project_budget_state' then jsonb_build_object('id',data->'project_id') else '{}'::jsonb end
 else app_private.audit_payload_before_finance(entity,data) end;
$$;
revoke all on function app_private.audit_payload(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function app_private.audit_payload(text,jsonb) to ariadne_auditor;

create function app_private.guard_finance_immutable() returns trigger language plpgsql set search_path='' as $$
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
  if (to_jsonb(new)-array['status','closed_at','void_reason']) is distinct from (to_jsonb(old)-array['status','closed_at','void_reason'])
   or not ((old.status='confirmed' and new.status in ('closed','cancelled')) or (old.status='posted' and new.status='voided')) then
   raise exception 'Movimento registrato immutabile: annullare e rettificare.' using errcode='23514'; end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function app_private.guard_finance_immutable() from public,anon,authenticated,service_role;
do $$ declare t text; begin
 foreach t in array array['budget_revisions','budget_lines','budget_allocations','project_exchange_rates','financial_entries'] loop
  execute format('create trigger immutable before insert or update on public.%I for each row execute function app_private.guard_finance_immutable()',t);
 end loop;
end $$;

create function app_private.finance_used(pid uuid,lid uuid,partner uuid default null) returns numeric
language sql stable set search_path='' as $$
 select coalesce(sum(case when e.kind='expense' and e.status='posted' then e.amount
 when e.kind='commitment' and e.status='confirmed' then e.amount-coalesce((select sum(x.amount) from public.financial_entries x where x.commitment_id=e.id and x.kind='expense' and x.status='posted'),0) else 0 end),0)
 from public.financial_entries e where e.project_id=pid and e.line_item_id=lid and (partner is null or e.partner_id=partner);
$$;
revoke all on function app_private.finance_used(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function app_private.finance_used(uuid,uuid,uuid) to ariadne_finance;

-- Keep the units and partner identities of existing financial records stable.
create function app_private.guard_finance_references() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='projects' then
  if new.currency_code is distinct from old.currency_code and (
   exists(select 1 from public.budget_revisions where project_id=old.id) or
   exists(select 1 from public.project_exchange_rates where project_id=old.id) or
   exists(select 1 from public.financial_entries where project_id=old.id)) then
   raise exception 'Valuta non modificabile dopo l’avvio del piano finanziario.' using errcode='23514'; end if;
 else
  if new.organization_id is distinct from old.organization_id and (
   exists(select 1 from public.budget_allocations where partner_id=old.id) or
   exists(select 1 from public.project_bank_accounts where partner_id=old.id) or
   exists(select 1 from public.financial_entries where partner_id=old.id or destination_partner_id=old.id)) then
   raise exception 'Partner già utilizzato nel piano finanziario: non può essere sostituito.' using errcode='23514'; end if;
 end if;
 return new;
end $$;
alter function app_private.guard_finance_references() owner to ariadne_guard;
revoke all on function app_private.guard_finance_references() from public,anon,authenticated,service_role;
create trigger c_guard_finance_currency before update on public.projects for each row execute function app_private.guard_finance_references();
create trigger c_guard_finance_partner before update on public.project_organizations for each row execute function app_private.guard_finance_references();

create function public.edit_financial_plan(target_project uuid,command text,expected_version bigint default null,payload jsonb default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare p record; d record; e public.financial_entries%rowtype; c public.financial_entries%rowtype; a record; rate_row public.project_exchange_rates%rowtype;
 current_id uuid; initial_id uuid; new_id uuid; line_id uuid; category_id uuid; item_id uuid;
 partner uuid; result uuid; account uuid; destination uuid; destination_account uuid;
 n integer; yr integer; planned numeric; allocated numeric; paid numeric; used numeric; partner_plan numeric;
 original numeric; converted numeric; applied numeric; currency text; kind text; new_status text; reason text;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'READ COMMITTED required' using errcode='25000'; end if;
 if not app_private.can_access_project(target_project) then raise insufficient_privilege; end if;
 select * into p from public.projects where id=target_project for update;
 if not found or not app_private.can_access_project(target_project) or p.status='archived' then raise insufficient_privilege; end if;
 -- All writers lock the project first. This serializes allocations, revision
 -- publishing, payment limits and simultaneous settlements without stale sums.
 select current_revision_id,initial_revision_id into current_id,initial_id from public.project_budget_state where project_id=target_project;
 select * into d from public.budget_revisions where project_id=target_project and status='draft';
 reason:=nullif(btrim(payload->>'notes'),'');
 if command='create_revision' then
  if d.id is not null then raise exception 'Esiste già una bozza. Ricarica la pagina.' using errcode='40001'; end if;
  select coalesce(max(revision_number),0)+1 into n from public.budget_revisions where project_id=target_project;
  insert into public.budget_revisions(project_id,revision_number,based_on_id,title,reason) values(target_project,n,current_id,payload->>'title',payload->>'reason') returning id into new_id;
  for a in select * from public.budget_lines where revision_id=current_id loop
   insert into public.budget_lines(project_id,revision_id,line_item_id,category_id,category_name_snapshot,description,planned_amount,notes)
    values(target_project,new_id,a.line_item_id,a.category_id,a.category_name_snapshot,a.description,a.planned_amount,a.notes) returning id into line_id;
   insert into public.budget_allocations(project_id,budget_line_id,result_id,partner_id,project_year,result_label,partner_label,amount)
    select project_id,line_id,result_id,partner_id,project_year,result_label,partner_label,amount from public.budget_allocations where budget_line_id=a.id and amount>0;
  end loop;
  return new_id;
 elsif command in ('save_line','save_allocation','publish') then
  if d.id is null or d.row_version is distinct from expected_version or d.based_on_id is distinct from current_id or d.id is distinct from (payload->>'revision_id')::uuid then
   raise exception 'Bozza cambiata: ricarica la pagina prima di salvare.' using errcode='40001'; end if;
  if command='save_line' then
   planned:=(payload->>'planned_amount')::numeric;
   if planned is null or planned<0 or planned>=1000000000000 or planned<>round(planned,2) then raise exception 'Importo previsto non valido (massimo due decimali).' using errcode='23514'; end if;
   item_id:=nullif(payload->>'line_item_id','')::uuid;
   if item_id is null then
    insert into public.budget_line_items(project_id,code) values(target_project,upper(btrim(payload->>'code'))) returning id into item_id;
   elsif not exists(select 1 from public.budget_lines where revision_id=d.id and line_item_id=item_id) then
    raise exception 'Voce non presente nella bozza.' using errcode='23514';
   end if;
   insert into public.budget_categories(project_id,code,name) values(target_project,upper(btrim(payload->>'category_code')),btrim(payload->>'category_name'))
    on conflict(project_id,code) do update set name=excluded.name returning id into category_id;
   select coalesce(sum(ba.amount),0) into allocated from public.budget_allocations ba join public.budget_lines l on l.id=ba.budget_line_id where l.revision_id=d.id and l.line_item_id=item_id;
   if allocated>planned then raise exception 'Riduci prima le ripartizioni: superano il nuovo importo.' using errcode='23514'; end if;
   insert into public.budget_lines(project_id,revision_id,line_item_id,category_id,category_name_snapshot,description,planned_amount,notes)
    values(target_project,d.id,item_id,category_id,upper(btrim(payload->>'category_code'))||' · '||btrim(payload->>'category_name'),btrim(payload->>'description'),planned,reason)
    on conflict(project_id,revision_id,line_item_id) do update set category_id=excluded.category_id,category_name_snapshot=excluded.category_name_snapshot,description=excluded.description,planned_amount=excluded.planned_amount,notes=excluded.notes;
  elsif command='save_allocation' then
   line_id:=(payload->>'budget_line_id')::uuid;
   select * into a from public.budget_lines where id=line_id and revision_id=d.id;
   if not found then raise exception 'Voce non presente nella bozza.' using errcode='23514'; end if;
   partner:=nullif(payload->>'partner_id','')::uuid; result:=nullif(payload->>'result_id','')::uuid; yr:=nullif(payload->>'project_year','')::integer;
   allocated:=(payload->>'amount')::numeric;
   if allocated is null or allocated<0 or allocated>=1000000000000 or allocated<>round(allocated,2) then raise exception 'Importo ripartito non valido.' using errcode='23514'; end if;
   if allocated>0 and yr is not null and (yr<1 or p.start_date+make_interval(years=>yr-1)>p.end_date) then raise exception 'Anno fuori dalla durata del progetto.' using errcode='23514'; end if;
   if allocated>0 and result is not null and not exists(select 1 from public.logical_framework_items where id=result and project_id=target_project and type='expected_result' and status='active') then raise exception 'Seleziona un risultato attivo del progetto.' using errcode='23514'; end if;
   select coalesce(sum(amount),0) into used from public.budget_allocations where budget_line_id=line_id and not (partner_id is not distinct from partner and result_id is not distinct from result and project_year is not distinct from yr);
   if used+allocated>a.planned_amount then raise exception 'Le ripartizioni superano il totale della voce.' using errcode='23514'; end if;
   insert into public.budget_allocations(project_id,budget_line_id,partner_id,result_id,project_year,amount)
    values(target_project,line_id,partner,result,yr,allocated) on conflict(budget_line_id,result_id,partner_id,project_year) do update set amount=excluded.amount;
  else
   if not exists(select 1 from public.budget_lines where revision_id=d.id and planned_amount>0) then raise exception 'Inserisci almeno una voce con importo positivo.' using errcode='23514'; end if;
   if exists(select 1 from public.budget_allocations ba join public.budget_lines l on l.id=ba.budget_line_id left join public.logical_framework_items f on f.id=ba.result_id
    where l.revision_id=d.id and ba.amount>0 and ((ba.result_id is not null and (f.type<>'expected_result' or f.status<>'active')) or (ba.project_year is not null and p.start_date+make_interval(years=>ba.project_year-1)>p.end_date))) then
    raise exception 'Verifica risultati attivi e anni delle ripartizioni prima di approvare.' using errcode='23514'; end if;
   update public.budget_allocations ba set result_label=(select f.code||' · '||f.title from public.logical_framework_items f where f.id=ba.result_id),partner_label=(select o.code||' · '||o.name from public.project_organizations po join public.organizations o on o.id=po.organization_id where po.id=ba.partner_id)
    from public.budget_lines l where l.id=ba.budget_line_id and l.revision_id=d.id;
   update public.budget_revisions set title=payload->>'title',reason=payload->>'reason',status='approved',approved_at=clock_timestamp(),approved_by=auth.uid(),project_snapshot=jsonb_build_object('start_date',p.start_date,'end_date',p.end_date,'currency_code',p.currency_code) where id=d.id;
   insert into public.project_budget_state(project_id,initial_revision_id,current_revision_id) values(target_project,coalesce(initial_id,d.id),d.id)
    on conflict(project_id) do update set current_revision_id=excluded.current_revision_id;
   return d.id;
  end if;
  update public.budget_revisions set title=title where id=d.id;
  return d.id;
 elsif command='save_account' then
  new_id:=nullif(payload->>'id','')::uuid;
  if new_id is null then
   insert into public.project_bank_accounts(project_id,partner_id,name,bank_name,account_reference) values(target_project,(payload->>'partner_id')::uuid,btrim(payload->>'name'),nullif(payload->>'bank_name',''),nullif(payload->>'account_reference','')) returning id into new_id;
  else
   select * into a from public.project_bank_accounts where project_id=target_project and id=new_id;
   if not found or a.row_version is distinct from expected_version then raise exception 'Conto cambiato: ricarica la pagina.' using errcode='40001'; end if;
   update public.project_bank_accounts set name=btrim(payload->>'name'),bank_name=nullif(payload->>'bank_name',''),account_reference=nullif(payload->>'account_reference',''),status=payload->>'status' where id=new_id;
  end if;
  return new_id;
 elsif command='save_rate' then
  currency:=upper(payload->>'source_currency_code'); applied:=(payload->>'rate')::numeric;
  if currency=p.currency_code or applied is null or applied<=0 or applied>=1000000000000 or applied<>round(applied,12) then raise exception 'Valuta estera e cambio positivo richiesti (massimo 12 decimali).' using errcode='23514'; end if;
  select * into rate_row from public.project_exchange_rates where project_id=target_project and source_currency_code=currency and rate_month=(payload->>'rate_month')::date order by version desc limit 1;
  if coalesce(rate_row.version,0) is distinct from expected_version then raise exception 'Serie cambi aggiornata: ricarica la pagina.' using errcode='40001'; end if;
  if rate_row.id is not null and nullif(btrim(payload->>'reason'),'') is null then raise exception 'Motiva la correzione del cambio.' using errcode='23514'; end if;
  insert into public.project_exchange_rates(project_id,source_currency_code,rate_month,version,rate,source,calculation_method,source_reference,observed_at,supersedes_rate_id,reason)
   values(target_project,currency,(payload->>'rate_month')::date,coalesce(rate_row.version,0)+1,applied,payload->>'source',payload->>'calculation_method',nullif(payload->>'source_reference',''),(payload->>'observed_at')::date,rate_row.id,nullif(payload->>'reason','')) returning id into new_id;
  return new_id;
 elsif command='save_entry' then
  if current_id is null then raise exception 'Approva prima il piano finanziario.' using errcode='23514'; end if;
  new_id:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
  if exists(select 1 from public.financial_entries where id=new_id and project_id<>target_project) then raise insufficient_privilege; end if;
  select * into e from public.financial_entries where id=new_id and project_id=target_project;
  if e.id is not null and (e.status<>'draft' or e.row_version is distinct from expected_version) then raise exception 'Movimento già registrato o modificato: ricarica la pagina.' using errcode='40001'; end if;
  kind:=payload->>'kind'; currency:=upper(payload->>'original_currency_code'); original:=(payload->>'original_amount')::numeric;
  if e.id is not null and e.kind is distinct from kind then raise exception 'Il tipo di movimento non può cambiare.' using errcode='23514'; end if;
  if original is null or original<=0 or original>=1000000000000 or original<>round(original,6) or ((kind<>'expense' or currency=p.currency_code) and original<>round(original,2)) then raise exception 'Importo non valido: due decimali nella valuta del progetto, fino a sei nelle spese estere.' using errcode='23514'; end if;
  if kind<>'expense' and currency<>p.currency_code then raise exception 'Usa la valuta principale del progetto.' using errcode='23514'; end if;
  partner:=(payload->>'partner_id')::uuid; account:=nullif(payload->>'account_id','')::uuid;
  destination:=nullif(payload->>'destination_partner_id','')::uuid; destination_account:=nullif(payload->>'destination_account_id','')::uuid;
  item_id:=nullif(payload->>'line_item_id','')::uuid; result:=nullif(payload->>'result_id','')::uuid;
  if (account is not null and not exists(select 1 from public.project_bank_accounts where id=account and project_id=target_project and partner_id=partner and status='active'))
    or (destination_account is not null and not exists(select 1 from public.project_bank_accounts where id=destination_account and project_id=target_project and partner_id=destination and status='active')) then raise exception 'Il conto deve essere attivo e appartenere al partner selezionato.' using errcode='23514'; end if;
  if item_id is not null and not exists(select 1 from public.budget_lines where revision_id=current_id and line_item_id=item_id) then raise exception 'Seleziona una voce del piano approvato.' using errcode='23514'; end if;
  if result is not null and nullif(payload->>'commitment_id','') is null and not exists(select 1 from public.logical_framework_items where id=result and project_id=target_project and type='expected_result' and status='active') then raise exception 'Seleziona un risultato attivo del progetto.' using errcode='23514'; end if;
  if nullif(payload->>'commitment_id','') is not null then
   select * into c from public.financial_entries where id=(payload->>'commitment_id')::uuid and project_id=target_project;
   if c.id is null or c.kind<>'commitment' or c.status<>'confirmed' or c.line_item_id is distinct from item_id or c.partner_id is distinct from partner or c.result_id is distinct from result then
    raise exception 'Impegno aperto, voce, partner e risultato devono corrispondere.' using errcode='23514'; end if;
  end if;
  new_status:=case when payload->>'register'='true' then case when kind='commitment' then 'confirmed' else 'posted' end else 'draft' end;
  applied:=null; converted:=null;
  if currency=p.currency_code then applied:=1; converted:=round(original,2);
  elsif kind='expense' then
   select * into rate_row from public.project_exchange_rates where project_id=target_project and source_currency_code=currency and rate_month=date_trunc('month',(payload->>'entry_date')::date)::date order by version desc limit 1;
   applied:=rate_row.rate; converted:=round(original*applied,2);
  end if;
  if new_status<>'draft' and (applied is null or converted is null or converted<=0) then raise exception 'Inserisci prima il cambio mensile: la spesa non ha un importo convertito valido.' using errcode='23514'; end if;
  if new_status='posted' and c.id is not null then
   select coalesce(sum(fe.amount),0) into paid from public.financial_entries fe where fe.commitment_id=c.id and fe.kind='expense' and fe.status='posted';
   if paid+converted>c.amount then raise exception 'Il pagamento supera il residuo dell’impegno.' using errcode='23514'; end if;
  end if;
  if new_status in ('confirmed','posted') and kind in ('commitment','expense') then
   select planned_amount into planned from public.budget_lines where revision_id=current_id and line_item_id=item_id;
   select coalesce(sum(ba.amount),0) into partner_plan from public.budget_allocations ba join public.budget_lines l on l.id=ba.budget_line_id where l.revision_id=current_id and l.line_item_id=item_id and ba.partner_id=partner;
   used:=case when c.id is null then converted else 0 end;
   if (app_private.finance_used(target_project,item_id)+used>planned or app_private.finance_used(target_project,item_id,partner)+used>partner_plan) and reason is null then
    raise exception 'Superamento del previsto della voce o del partner: indica la motivazione nelle note.' using errcode='23514'; end if;
  end if;
  insert into public.financial_entries(id,project_id,kind,reference,description,entry_date,partner_id,account_id,destination_partner_id,destination_account_id,line_item_id,result_id,commitment_id,original_currency_code,original_amount,exchange_rate_id,applied_rate,amount,status,posted_at,posted_by,notes)
   values(new_id,target_project,kind,btrim(payload->>'reference'),btrim(payload->>'description'),(payload->>'entry_date')::date,partner,account,destination,destination_account,item_id,result,nullif(payload->>'commitment_id','')::uuid,currency,original,rate_row.id,applied,converted,new_status,case when new_status<>'draft' then clock_timestamp() end,case when new_status<>'draft' then auth.uid() end,reason)
   on conflict(id) do update set reference=excluded.reference,description=excluded.description,entry_date=excluded.entry_date,partner_id=excluded.partner_id,account_id=excluded.account_id,destination_partner_id=excluded.destination_partner_id,destination_account_id=excluded.destination_account_id,line_item_id=excluded.line_item_id,result_id=excluded.result_id,commitment_id=excluded.commitment_id,original_currency_code=excluded.original_currency_code,original_amount=excluded.original_amount,exchange_rate_id=excluded.exchange_rate_id,applied_rate=excluded.applied_rate,amount=excluded.amount,status=excluded.status,posted_at=excluded.posted_at,posted_by=excluded.posted_by,notes=excluded.notes;
  return new_id;
 elsif command in ('close_commitment','void_entry') then
  select * into e from public.financial_entries where project_id=target_project and id=(payload->>'id')::uuid;
  if e.id is null or e.row_version is distinct from expected_version then raise exception 'Movimento cambiato: ricarica la pagina.' using errcode='40001'; end if;
  if nullif(btrim(payload->>'reason'),'') is null then raise exception 'Inserisci una motivazione.' using errcode='23514'; end if;
  if command='close_commitment' then
   if e.kind<>'commitment' or e.status<>'confirmed' then raise exception 'Solo gli impegni aperti possono essere chiusi.' using errcode='23514'; end if;
   update public.financial_entries set status='closed',closed_at=clock_timestamp(),void_reason=payload->>'reason' where id=e.id;
  else
   if e.status not in ('draft','confirmed','posted') then raise exception 'Movimento già chiuso o annullato.' using errcode='23514'; end if;
   if e.kind='commitment' and exists(select 1 from public.financial_entries where commitment_id=e.id and status='posted') then raise exception 'Impegno con pagamenti: usa la chiusura per liberare il residuo.' using errcode='23514'; end if;
   update public.financial_entries set status=case when e.kind='commitment' or e.status='draft' then 'cancelled' else 'voided' end,void_reason=payload->>'reason' where id=e.id;
  end if;
  return e.id;
 else raise exception 'Operazione non valida.' using errcode='22023'; end if;
end $$;
alter function public.edit_financial_plan(uuid,text,bigint,jsonb) owner to ariadne_finance;
revoke all on function public.edit_financial_plan(uuid,text,bigint,jsonb) from public,anon,service_role;
grant execute on function public.edit_financial_plan(uuid,text,bigint,jsonb) to authenticated;
-- One statement snapshot: a settlement cannot be observed without its matching
-- commitment. No PostgREST 1000-row truncation of financial totals.
create function public.financial_snapshot(target_project uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'revisions',(select coalesce(jsonb_agg(to_jsonb(t) order by revision_number),'[]') from public.budget_revisions t where project_id=target_project),
  'lines',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.budget_lines t where project_id=target_project),
  'items',(select coalesce(jsonb_agg(to_jsonb(t) order by code),'[]') from public.budget_line_items t where project_id=target_project),
  'categories',(select coalesce(jsonb_agg(to_jsonb(t) order by code),'[]') from public.budget_categories t where project_id=target_project),
  'allocations',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.budget_allocations t where project_id=target_project and amount>0),
  'state',(select to_jsonb(t) from public.project_budget_state t where project_id=target_project),
  'accounts',(select coalesce(jsonb_agg(to_jsonb(t) order by name),'[]') from public.project_bank_accounts t where project_id=target_project),
  'rates',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('rate',t.rate::text) order by rate_month desc,version desc),'[]') from public.project_exchange_rates t where project_id=target_project),
  'entries',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('original_amount',t.original_amount::text,'applied_rate',t.applied_rate::text) order by entry_date desc,created_at desc),'[]') from public.financial_entries t where project_id=target_project),
  'partners',(select coalesce(jsonb_agg(jsonb_build_object('id',po.id,'label',o.code||' · '||o.name,'role',po.role) order by o.code),'[]') from public.project_organizations po join public.organizations o on o.id=po.organization_id where po.project_id=target_project),
  'results',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',code||' · '||title,'status',status) order by sort_order,code),'[]') from public.logical_framework_items where project_id=target_project and type='expected_result')
 ) where app_private.can_access_project(target_project);
$$;
revoke all on function public.financial_snapshot(uuid) from public,anon,service_role;
grant execute on function public.financial_snapshot(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
