create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invitation_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  used boolean not null default false,
  used_at timestamptz,
  disabled boolean not null default false,
  disabled_at timestamptz,
  notes text
);

create index if not exists invitation_codes_code_idx
  on public.invitation_codes (code);

create table if not exists public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null references public.invitation_codes(code),
  full_name text not null,
  attending boolean not null,
  guest_count integer not null default 1,
  dietary_requirements text,
  notes text,
  submitted_at timestamptz not null default now()
);

create index if not exists rsvp_responses_invite_code_idx
  on public.rsvp_responses (invite_code);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.rsvp_responses enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_users'
      and policyname = 'admins can read admin_users'
  ) then
    create policy "admins can read admin_users"
    on public.admin_users
    for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invitation_codes'
      and policyname = 'admins can read invitation codes'
  ) then
    create policy "admins can read invitation codes"
    on public.invitation_codes
    for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'rsvp_responses'
      and policyname = 'admins can read rsvp responses'
  ) then
    create policy "admins can read rsvp responses"
    on public.rsvp_responses
    for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_log'
      and policyname = 'admins can read audit log'
  ) then
    create policy "admins can read audit log"
    on public.audit_log
    for select
    to authenticated
    using (public.is_admin());
  end if;
end;
$$;

create or replace function public.submit_rsvp(
  p_invite_code text,
  p_full_name text,
  p_attending boolean,
  p_guest_count integer default 1,
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
  v_full_name text := trim(coalesce(p_full_name, ''));
  v_guest_count integer := greatest(coalesce(p_guest_count, 1), 1);
  v_invitation public.invitation_codes%rowtype;
begin
  if v_code = '' then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_full_name = '' then
    return json_build_object('ok', false, 'error', 'full_name_required');
  end if;

  if p_attending is null then
    return json_build_object('ok', false, 'error', 'attending_required');
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
    v_full_name,
    p_attending,
    v_guest_count,
    nullif(trim(p_dietary_requirements), ''),
    nullif(trim(p_notes), '')
  );

  update public.invitation_codes
  set used = true,
      used_at = now()
  where id = v_invitation.id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.submit_rsvp(text, text, boolean, integer, text, text)
  to anon, authenticated;
