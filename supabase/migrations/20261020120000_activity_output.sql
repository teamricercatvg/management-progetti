-- Optional deliverable/output for each activity; existing rows remain unchanged.
begin;
alter table public.activities add column output text
  constraint activities_output_length check (length(output) <= 10000);
grant insert(output), update(output) on public.activities to authenticated;
comment on column public.activities.output is 'Output previsto o prodotto dalla singola attività; campo facoltativo.';
notify pgrst, 'reload schema';
commit;
