# Task 10: Security Checklist and Verification

## Goal

Add manual security checks and run build/lint verification after the RSVP work is complete.

## Files To Add

- `docs/security-checklist.md`

## Security Checklist Content

Include manual tests:

- Open `/rsvp` with no code.
- Open `/rsvp?code=fake`.
- Generate a valid code as admin.
- Submit a valid RSVP.
- Submit the same code again.
- Try to query `invitation_codes` while logged out.
- Try to query `rsvp_responses` while logged out.
- Try `/admin` while logged out.
- Try admin actions as a logged-in non-admin user.
- Confirm secret/service key does not appear in the built frontend.
- Confirm no secret key is committed.
- Confirm `Authorization` headers for admin functions contain user JWTs only.
- Confirm public functions do not return private invitation metadata.

## Commands To Run

Run:

```sh
npm run build
npm run lint
```

Search for accidental secrets or server-only env names in browser code:

```sh
rg "SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|service_role" src dist
```

Search for direct browser writes that should not exist:

```sh
rg "from\\(\"invitation_codes\"\\)\\.(insert|update|delete|upsert)|from\\(\"rsvp_responses\"\\)\\.(insert|update|delete|upsert)" src
```

Expected result:

- No frontend secret-key usage.
- No direct browser writes to `invitation_codes` or `rsvp_responses`.

## Database Checks

In Supabase SQL editor or local Supabase:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('admin_users', 'invitation_codes', 'rsvp_responses', 'audit_log');
```

All rows should have `rowsecurity = true`.

Verify no anonymous public read policies exist for the protected tables:

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('invitation_codes', 'rsvp_responses');
```

## Acceptance Criteria

- `docs/security-checklist.md` exists.
- Build succeeds.
- Lint succeeds or documented pre-existing lint issues are listed.
- No secret env names appear in built frontend code except harmless documentation strings outside `dist`.
- Manual checklist has enough detail for a non-Codex operator to run final review.

