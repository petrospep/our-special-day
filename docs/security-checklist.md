# Security Checklist

Use this checklist after RSVP, admin, Supabase migrations, Edge Functions, and frontend deployment setup are complete. Record the deployed frontend URL, Supabase project, date, operator, and result for each item before release.

## Setup

- Frontend URL: `____________________________`
- Supabase project ref: `____________________________`
- Operator: `____________________________`
- Review date: `____________________________`

Before starting:

1. Run the latest database migrations against the Supabase project.
2. Deploy `validate-invite`, `submit-rsvp`, `generate-invite`, and `disable-invite`.
3. Configure frontend environment with only:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Configure Edge Function secrets server-side only:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `SITE_URL`
5. Have one known admin user in `public.admin_users`.
6. Have one authenticated, non-admin test user available.

## RSVP Flow Checks

| Check | Steps | Expected result | Result |
| --- | --- | --- | --- |
| Open `/rsvp` with no code | Visit `/rsvp` with no query string in a private browser session. | The page does not expose invitation details. The RSVP form cannot be submitted until a valid invitation code is present. |  |
| Open `/rsvp?code=fake` | Visit `/rsvp?code=fake`. | The app shows an invalid or unavailable invitation state. No private invitation metadata is displayed. |  |
| Generate a valid code as admin | Sign in as the admin user at `/admin`, enter guest details, and generate a new invitation code. | The code is created successfully and the admin UI displays the generated invite link or code. |  |
| Submit a valid RSVP | Open the generated RSVP link in a separate private browser session and submit the RSVP form. | Submission succeeds once. The user sees a success state. |  |
| Submit the same code again | Reopen the same RSVP link and try to submit another RSVP. | The app blocks duplicate submission or reports that the code has already been used. No second response is created. |  |

## Authentication And Authorization Checks

| Check | Steps | Expected result | Result |
| --- | --- | --- | --- |
| Query `invitation_codes` while logged out | In the browser console on a logged-out page, use the public Supabase client to run `supabase.from("invitation_codes").select("*")`. | The request returns no protected rows or is rejected by RLS. |  |
| Query `rsvp_responses` while logged out | In the browser console on a logged-out page, use the public Supabase client to run `supabase.from("rsvp_responses").select("*")`. | The request returns no protected rows or is rejected by RLS. |  |
| Open `/admin` while logged out | Visit `/admin` in a private browser session. | Admin data and actions are not visible. The user is prompted to authenticate. |  |
| Try admin actions as non-admin | Sign in as an authenticated user who is not in `public.admin_users`, then try to generate and disable invite codes from `/admin`. | Admin Edge Functions reject the requests. No invitation code is created or modified. |  |

## Edge Function Checks

| Check | Steps | Expected result | Result |
| --- | --- | --- | --- |
| Admin Authorization headers use user JWTs only | In browser DevTools Network, perform admin actions and inspect requests to `generate-invite` and `disable-invite`. | `Authorization` contains the logged-in user's Supabase JWT. It does not contain `SUPABASE_SECRET_KEY`, a service-role key, or any server secret. |  |
| Public functions hide private metadata | Call `validate-invite` through the app with valid and invalid codes. Inspect responses in DevTools. | Responses include only fields needed for the RSVP UI. They do not expose private invitation metadata, admin-only fields, audit data, or server-side notes. |  |

## Build And Static Verification

Run from the repository root:

```sh
npm run build
npm run lint
```

Search for accidental secret or service-role usage in browser code:

```sh
rg "SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|service_role" src dist
```

Expected result:

- `dist` has no matches.
- `src` has no browser-client matches. Server-only modules such as `*.server.ts` may contain server environment variable names, but those strings must not be imported into browser code or appear in `dist`.

Search for direct browser writes that should not exist:

```sh
rg "from\\(\"invitation_codes\"\\)\\.(insert|update|delete|upsert)|from\\(\"rsvp_responses\"\\)\\.(insert|update|delete|upsert)" src
```

Expected result:

- No direct frontend writes to `invitation_codes`.
- No direct frontend writes to `rsvp_responses`.
- Writes should happen through Supabase Edge Functions or trusted server code only.

Also confirm no real secret value is committed:

```sh
git grep -n "SUPABASE_SECRET_KEY\\|SUPABASE_SERVICE_ROLE_KEY\\|service_role"
```

Expected result:

- Documentation may mention secret variable names.
- Server-only code may read secret variable names.
- No real secret values, JWTs, service-role keys, or secret-key literals are committed.

## Database Checks

Run in the Supabase SQL editor or local Supabase SQL shell:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('admin_users', 'invitation_codes', 'rsvp_responses', 'audit_log');
```

Expected result: every returned row has `rowsecurity = true`.

Verify policies on protected RSVP tables:

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('invitation_codes', 'rsvp_responses');
```

Expected result:

- No anonymous public read policy exposes invitation codes or RSVP responses.
- Any `anon` or `public` policy is narrowly scoped to the required public RSVP operation.
- Admin access is limited to authenticated users who pass the project admin check.

## Release Decision

- Build result: `pass / fail`
- Lint result: `pass / fail`
- Static secret search result: `pass / fail`
- Direct browser write search result: `pass / fail`
- Database RLS result: `pass / fail`
- Manual browser checks result: `pass / fail`
- Approved for release by: `____________________________`
