create table if not exists public.race_results (
  id text primary key,
  runner_id text not null references public.runners(id) on delete cascade,
  run_id text not null references public.runs(id) on delete cascade,
  finish_seconds integer not null check (finish_seconds >= 0),
  recorded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (runner_id, run_id)
);

create index if not exists race_results_runner_idx
  on public.race_results(runner_id);

create index if not exists race_results_run_idx
  on public.race_results(run_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_race_results_updated_at on public.race_results;
create trigger set_race_results_updated_at
before update on public.race_results
for each row
execute function public.set_updated_at();

alter table public.race_results enable row level security;

revoke all on public.race_results from anon;
revoke all on public.race_results from authenticated;
