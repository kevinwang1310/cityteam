-- Writes now use authenticated administrator server routes, never browser API keys.
-- Deploy the server routes before applying this migration.
begin;
revoke all on table public.runners, public.runs, public.attendance, public.admins,
  public.race_results, public.upcoming_runs, public.upcoming_run_volunteers
  from public, anon, authenticated;
grant select on table public.runners, public.runs, public.attendance, public.admins,
  public.race_results, public.upcoming_runs, public.upcoming_run_volunteers
  to anon, authenticated;
grant all on table public.runners, public.runs, public.attendance, public.admins,
  public.race_results, public.upcoming_runs, public.upcoming_run_volunteers
  to service_role;
commit;
