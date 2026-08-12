create table if not exists public.upcoming_runs (
  id text primary key,
  run_date date not null,
  title text not null,
  snack_runner_id text references public.runners(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.upcoming_run_volunteers (
  id text primary key,
  upcoming_run_id text not null references public.upcoming_runs(id) on delete cascade,
  runner_id text not null references public.runners(id) on delete cascade,
  attending boolean not null default true,
  created_at timestamptz not null default now(),
  unique (upcoming_run_id, runner_id)
);

create index if not exists upcoming_runs_run_date_idx
  on public.upcoming_runs(run_date);

create index if not exists upcoming_run_volunteers_run_idx
  on public.upcoming_run_volunteers(upcoming_run_id);

alter table public.upcoming_run_volunteers
  add column if not exists note text;
