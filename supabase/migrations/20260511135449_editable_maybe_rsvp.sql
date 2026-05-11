alter table public.rsvp_responses
  add column if not exists attendance_status text;

update public.rsvp_responses
set attendance_status = case when attending then 'attending' else 'declined' end
where attendance_status is null;

alter table public.rsvp_responses
  alter column attendance_status set default 'attending',
  alter column attendance_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rsvp_responses_attendance_status_check'
  ) then
    alter table public.rsvp_responses
      add constraint rsvp_responses_attendance_status_check
      check (attendance_status in ('attending', 'declined', 'maybe'));
  end if;
end;
$$;

drop function if exists public.submit_rsvp(
  text,
  text,
  text,
  boolean,
  integer,
  boolean,
  text,
  text,
  jsonb
);

create or replace function public.submit_rsvp(
  p_invite_code text,
  p_submitter_first_name text,
  p_submitter_last_name text,
  p_submitter_under_13 boolean,
  p_submitter_age integer,
  p_attending boolean default null,
  p_attendance_status text default null,
  p_email text default null,
  p_phone_number text default null,
  p_guests jsonb default '[]'::jsonb
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
  v_attendance_status text := lower(trim(coalesce(
    p_attendance_status,
    case
      when p_attending is true then 'attending'
      when p_attending is false then 'declined'
      else null
    end,
    ''
  )));
  v_attending boolean;
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_phone_number text := nullif(trim(coalesce(p_phone_number, '')), '');
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

  if v_attendance_status not in ('attending', 'declined', 'maybe') then
    return json_build_object('ok', false, 'error', 'attending_required');
  end if;

  v_attending := v_attendance_status = 'attending';

  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    return json_build_object('ok', false, 'error', 'invalid_contact');
  end if;

  if v_phone_number is not null and length(v_phone_number) > 40 then
    return json_build_object('ok', false, 'error', 'invalid_contact');
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
  end loop;

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

  delete from public.rsvp_responses
  where invite_code = v_code;

  insert into public.rsvp_responses (
    invite_code,
    full_name,
    attending,
    attendance_status,
    guest_count,
    email,
    phone_number
  ) values (
    v_code,
    v_submitter_first_name || ' ' || v_submitter_last_name,
    v_attending,
    v_attendance_status,
    v_guest_count,
    v_email,
    v_phone_number
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
  set used = v_attendance_status <> 'maybe',
      used_at = case when v_attendance_status <> 'maybe' then now() else null end
  where id = v_invitation.id;

  return json_build_object('ok', true);
exception
  when invalid_text_representation then
    return json_build_object('ok', false, 'error', 'guest_age_required');
end;
$$;

grant execute on function public.submit_rsvp(text, text, text, boolean, integer, boolean, text, text, text, jsonb)
  to anon, authenticated;
