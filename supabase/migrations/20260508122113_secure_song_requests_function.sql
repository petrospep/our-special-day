drop policy if exists "Anyone can submit song requests" on public.song_requests;
drop policy if exists "Authenticated can view song requests" on public.song_requests;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'song_requests'
      and policyname = 'admins can read song requests'
  ) then
    create policy "admins can read song requests"
    on public.song_requests
    for select
    to authenticated
    using (public.is_admin());
  end if;
end;
$$;

create or replace function public.enforce_song_request_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_count integer;
begin
  if new.invite_code is null then
    raise exception 'invite_code required';
  end if;

  select count(*) into request_count
  from public.song_requests
  where invite_code = new.invite_code;

  if request_count >= 3 then
    raise exception 'song_request_limit_reached';
  end if;

  return new;
end;
$$;
