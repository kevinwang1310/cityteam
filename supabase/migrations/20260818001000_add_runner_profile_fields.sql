alter table public.runners
  add column if not exists date_first_joined date,
  add column if not exists demo_shoes_received_date date,
  add column if not exists new_shoes_received_date date;
