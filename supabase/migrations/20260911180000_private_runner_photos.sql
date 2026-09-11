insert into storage.buckets (id, name, public)
values ('runner-photos', 'runner-photos', false)
on conflict (id) do nothing;

-- Do not overwrite a photo that was replaced while the migration was uploading.
create or replace function public.migrate_runner_photo(p_id text, p_previous text, p_url text)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
  update public.runners set photo_url = p_url where id = p_id and photo_url = p_previous;
  return found;
end;
$$;
revoke all on function public.migrate_runner_photo(text, text, text) from public, anon, authenticated;
grant execute on function public.migrate_runner_photo(text, text, text) to service_role;
