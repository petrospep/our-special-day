create table if not exists public.rsvp_guests (
  id uuid primary key default gen_random_uuid(),
  rsvp_response_id uuid not null references public.rsvp_responses(id) on delete cascade,
  invite_code text not null references public.invitation_codes(code),
  first_name text not null,
  last_name text not null default '',
  is_submitter boolean not null default false,
  under_13 boolean not null default false,
  age integer,
  created_at timestamptz not null default now(),
  constraint rsvp_guests_age_required_for_under_13
    check (
      (under_13 = false and age is null)
      or (under_13 = true and age between 0 and 12)
    )
);

create index if not exists rsvp_guests_response_id_idx
  on public.rsvp_guests (rsvp_response_id);

create index if not exists rsvp_guests_invite_code_idx
  on public.rsvp_guests (invite_code);

create unique index if not exists rsvp_guests_one_submitter_per_response_idx
  on public.rsvp_guests (rsvp_response_id)
  where is_submitter;

alter table public.rsvp_guests enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'rsvp_guests'
      and policyname = 'admins can read rsvp guests'
  ) then
    create policy "admins can read rsvp guests"
    on public.rsvp_guests
    for select
    to authenticated
    using (public.is_admin());
  end if;
end;
$$;

insert into public.rsvp_guests (
  rsvp_response_id,
  invite_code,
  first_name,
  last_name,
  is_submitter,
  under_13,
  age
)
select
  response.id,
  response.invite_code,
  response.full_name,
  '',
  true,
  false,
  null
from public.rsvp_responses response
where not exists (
  select 1
  from public.rsvp_guests guest
  where guest.rsvp_response_id = response.id
);

drop function if exists public.submit_rsvp(text, text, boolean, integer, text, text);

create or replace function public.submit_rsvp(
  p_invite_code text,
  p_submitter_first_name text,
  p_submitter_last_name text,
  p_submitter_under_13 boolean,
  p_submitter_age integer,
  p_attending boolean,
  p_guests jsonb default '[]'::jsonb,
  p_dietary_requirements text default null,
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := lower(trim(coalesce(p_invite_code, '')));
  v_submitter_first_name text := trim(coalesce(p_submitter_first_name, ''));
  v_submitter_last_name text := trim(coalesce(p_submitter_last_name, ''));
  v_submitter_under_13 boolean := coalesce(p_submitter_under_13, false);
  v_guests jsonb := coalesce(p_guests, '[]'::jsonb);
  v_guest jsonb;
  v_first_name text;
  v_last_name text;
  v_under_13 boolean;
  v_age integer;
  v_guest_count integer := 1;
  v_invitation public.invitation_codes%rowtype;
  v_response_id uuid;
begin
  if v_code = '' then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_submitter_first_name = '' or v_submitter_last_name = '' then
    return json_build_object('ok', false, 'error', 'guest_names_required');
  end if;

  if p_attending is null then
    return json_build_object('ok', false, 'error', 'attending_required');
  end if;

  if (not v_submitter_under_13 and p_submitter_age is not null)
    or (v_submitter_under_13 and (p_submitter_age is null or p_submitter_age < 0 or p_submitter_age > 12)) then
    return json_build_object('ok', false, 'error', 'guest_age_required');
  end if;

  if jsonb_typeof(v_guests) <> 'array' then
    return json_build_object('ok', false, 'error', 'invalid_guests');
  end if;

  v_guest_count := 1 + jsonb_array_length(v_guests);

  if v_guest_count > 10 then
    return json_build_object('ok', false, 'error', 'invalid_guests');
  end if;

  select *
  into v_invitation
  from public.invitation_codes
  where code = v_code
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_invitation.disabled then
    return json_build_object('ok', false, 'error', 'disabled_code');
  end if;

  if v_invitation.used then
    return json_build_object('ok', false, 'error', 'used_code');
  end if;

  insert into public.rsvp_responses (
    invite_code,
    full_name,
    attending,
    guest_count,
    dietary_requirements,
    notes
  ) values (
    v_code,
    v_submitter_first_name || ' ' || v_submitter_last_name,
    p_attending,
    v_guest_count,
    nullif(trim(p_dietary_requirements), ''),
    nullif(trim(p_notes), '')
  )
  returning id into v_response_id;

  insert into public.rsvp_guests (
    rsvp_response_id,
    invite_code,
    first_name,
    last_name,
    is_submitter,
    under_13,
    age
  ) values (
    v_response_id,
    v_code,
    v_submitter_first_name,
    v_submitter_last_name,
    true,
    v_submitter_under_13,
    case when v_submitter_under_13 then p_submitter_age else null end
  );

  for v_guest in select * from jsonb_array_elements(v_guests)
  loop
    v_first_name := trim(coalesce(v_guest->>'firstName', ''));
    v_last_name := trim(coalesce(v_guest->>'lastName', ''));
    v_under_13 := coalesce((v_guest->>'under13')::boolean, false);
    v_age := nullif(v_guest->>'age', '')::integer;

    if v_first_name = '' or v_last_name = '' then
      return json_build_object('ok', false, 'error', 'guest_names_required');
    end if;

    if (not v_under_13 and v_age is not null) or (v_under_13 and (v_age is null or v_age < 0 or v_age > 12)) then
      return json_build_object('ok', false, 'error', 'guest_age_required');
    end if;

    insert into public.rsvp_guests (
      rsvp_response_id,
      invite_code,
      first_name,
      last_name,
      is_submitter,
      under_13,
      age
    ) values (
      v_response_id,
      v_code,
      v_first_name,
      v_last_name,
      false,
      v_under_13,
      case when v_under_13 then v_age else null end
    );
  end loop;

  update public.invitation_codes
  set used = true,
      used_at = now()
  where id = v_invitation.id;

  return json_build_object('ok', true);
exception
  when invalid_text_representation then
    return json_build_object('ok', false, 'error', 'guest_age_required');
end;
$$;

grant execute on function public.submit_rsvp(text, text, text, boolean, integer, boolean, jsonb, text, text)
  to anon, authenticated;
