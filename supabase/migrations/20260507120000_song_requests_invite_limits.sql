alter table public.song_requests
  add column if not exists invite_code text references public.invitation_codes(code);

create index if not exists song_requests_invite_code_idx on public.song_requests(invite_code);

create or replace function public.enforce_song_request_limit()
returns trigger
language plpgsql
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

drop trigger if exists trg_song_request_limit on public.song_requests;
create trigger trg_song_request_limit
before insert on public.song_requests
for each row execute function public.enforce_song_request_limit();
