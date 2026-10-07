-- Milestone 3: foundational schema only. No Auth provisioning or access policies.
begin;
create schema app_private;
revoke all on schema app_private from public, anon, authenticated, service_role;
-- New helper functions are never callable by PUBLIC by default.
alter default privileges in schema app_private revoke execute on functions from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (btrim(display_name) <> ''),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete restrict,
  row_version bigint not null default 1 check (row_version > 0)
);

create table public.global_user_roles (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete restrict,
  row_version bigint not null default 1 check (row_version > 0)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(btrim(code)) and code <> ''),
  name text not null check (btrim(name) <> ''),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete restrict,
  row_version bigint not null default 1 check (row_version > 0)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(btrim(code)) and code <> ''),
  title text not null check (btrim(title) <> ''),
  description text,
  status text not null default 'draft' check (status in ('draft','active','completed','archived')),
  start_date date not null check (isfinite(start_date)),
  end_date date not null check (isfinite(end_date) and end_date >= start_date),
  donor text,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete restrict,
  row_version bigint not null default 1 check (row_version > 0)
);

create table public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role text not null default 'manager' check (role = 'manager'),
  status text not null default 'active' check (status in ('active','inactive')),
  unique (project_id,id),
  unique (project_id,user_id),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete restrict,
  row_version bigint not null default 1 check (row_version > 0)
);

create table public.project_organizations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  role text not null check (role in ('sole','lead','partner')),
  notes text,
  unique (project_id,id),
  unique (project_id,organization_id),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete restrict,
  row_version bigint not null default 1 check (row_version > 0)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) on delete restrict,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_id uuid references public.profiles(id) on delete restrict,
  actor_kind text not null check (actor_kind in ('user','system')),
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  entity_table text not null,
  entity_id text not null,
  old_values jsonb,
  new_values jsonb,
  request_id uuid,
  reason text,
  check ((actor_kind = 'user') = (actor_id is not null)),
  check (actor_kind <> 'system' or nullif(btrim(reason), '') is not null)
);
create index memberships_user_status_project_idx on public.project_memberships(user_id,status,project_id);
create index project_organizations_organization_idx on public.project_organizations(organization_id,project_id);
create unique index project_organizations_single_leader_idx on public.project_organizations(project_id) where role in ('sole','lead');
create index audit_project_time_idx on public.audit_log(project_id,occurred_at);
create index audit_entity_time_idx on public.audit_log(entity_table,entity_id,occurred_at);
create index audit_actor_idx on public.audit_log(actor_id);
create index profiles_created_by_idx on public.profiles(created_by) where created_by is not null;
create index profiles_updated_by_idx on public.profiles(updated_by) where updated_by is not null;
create index global_user_roles_created_by_idx on public.global_user_roles(created_by) where created_by is not null;
create index global_user_roles_updated_by_idx on public.global_user_roles(updated_by) where updated_by is not null;
create index organizations_created_by_idx on public.organizations(created_by) where created_by is not null;
create index organizations_updated_by_idx on public.organizations(updated_by) where updated_by is not null;
create index projects_created_by_idx on public.projects(created_by) where created_by is not null;
create index projects_updated_by_idx on public.projects(updated_by) where updated_by is not null;
create index project_memberships_created_by_idx on public.project_memberships(created_by) where created_by is not null;
create index project_memberships_updated_by_idx on public.project_memberships(updated_by) where updated_by is not null;
create index project_organizations_created_by_idx on public.project_organizations(created_by) where created_by is not null;
create index project_organizations_updated_by_idx on public.project_organizations(updated_by) where updated_by is not null;
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated, service_role;
alter table public.global_user_roles enable row level security;
revoke all on public.global_user_roles from public, anon, authenticated, service_role;
alter table public.organizations enable row level security;
revoke all on public.organizations from public, anon, authenticated, service_role;
alter table public.projects enable row level security;
revoke all on public.projects from public, anon, authenticated, service_role;
alter table public.project_memberships enable row level security;
revoke all on public.project_memberships from public, anon, authenticated, service_role;
alter table public.project_organizations enable row level security;
revoke all on public.project_organizations from public, anon, authenticated, service_role;
alter table public.audit_log enable row level security;
revoke all on public.audit_log from public, anon, authenticated, service_role;
revoke all on sequence public.audit_log_id_seq from public, anon, authenticated, service_role;
commit;
