alter table public.upcoming_runs enable row level security;
alter table public.upcoming_run_volunteers enable row level security;

drop policy if exists "private_app_manage_upcoming_runs" on public.upcoming_runs;
create policy "private_app_manage_upcoming_runs"
on public.upcoming_runs
for all
to anon
using (true)
with check (true);

drop policy if exists "private_app_manage_upcoming_run_volunteers" on public.upcoming_run_volunteers;
create policy "private_app_manage_upcoming_run_volunteers"
on public.upcoming_run_volunteers
for all
to anon
using (true)
with check (true);

alter function public.set_updated_at()
set search_path = public, pg_temp;
