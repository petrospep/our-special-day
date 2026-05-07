# Task 02: Database Security Migration

## Goal

Add the secure RSVP schema, RLS policies, admin helper, and atomic RSVP RPC.

## Repo Context

There is already a migration:

- `supabase/migrations/20260430164115_76f4f30a-c1e1-4807-aec6-d82905739ae3.sql`

It creates:

- `rsvps`
- `song_requests`

It currently allows anonymous RSVP inserts and broad authenticated reads. For the new invite-code RSVP flow, add a new migration instead of editing the existing one.

Suggested new file:

- `supabase/migrations/202605030001_secure_rsvp_schema.sql`

## Tables To Create

Create:

- `public.admin_users`
- `public.invitation_codes`
- `public.rsvp_responses`
- `public.audit_log`

Use `if not exists` where practical so local reruns are less brittle.

### `admin_users`

```sql
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
```

### `invitation_codes`

```sql
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
```

### `rsvp_responses`

```sql
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
```

### `audit_log`

```sql
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## RLS

Enable RLS:

```sql
alter table public.admin_users enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.rsvp_responses enable row level security;
alter table public.audit_log enable row level security;
```

Do not add public select policies for `invitation_codes` or `rsvp_responses`.

## Admin Helper

Create:

```sql
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
```

## RLS Policies

Admins may read admin data:

```sql
create policy "admins can read admin_users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

create policy "admins can read invitation codes"
on public.invitation_codes
for select
to authenticated
using (public.is_admin());

create policy "admins can read rsvp responses"
on public.rsvp_responses
for select
to authenticated
using (public.is_admin());

create policy "admins can read audit log"
on public.audit_log
for select
to authenticated
using (public.is_admin());
```

Admin writes should happen through Edge Functions using an elevated client, so do not add broad insert/update/delete policies.

## Atomic RPC

Create `public.submit_rsvp(...) returns json`.

Requirements:

- Normalize invite code with `lower(trim(...))`.
- Lock the matching invitation row with `for update`.
- Reject missing, disabled, or used codes.
- Insert into `rsvp_responses`.
- Mark invitation code as used in the same transaction.
- Clamp `guest_count` to at least `1`.
- Return `{ "ok": true }` or `{ "ok": false, "error": "<code>" }`.

Use the RPC from the original brief as the starting point.

## Important Review Point

Decide what to do with the old `rsvps` table:

- Leave it unused and remove frontend writes to it in later tasks, or
- Add a hardening migration to remove broad policies if the old table is no longer needed.

Do not break `song_requests` unless the product decision is to secure music submissions too.

## Acceptance Criteria

- Migration applies locally with Supabase CLI.
- `invitation_codes` and `rsvp_responses` have RLS enabled.
- Anonymous users cannot select from `invitation_codes` or `rsvp_responses`.
- Calling `submit_rsvp` twice with the same code can only succeed once.

