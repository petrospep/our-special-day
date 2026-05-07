# Wedding RSVP Supabase Plan: Assessment and Sequence

## Verdict

The proposed architecture is sensible for this repo: a static Vite/TanStack Router frontend, Supabase Auth for admins, Postgres/RLS for data, and Edge Functions for privileged operations is a good fit for a public wedding website.

The main changes needed for this repo are:

- This app already has Supabase client files at `src/integrations/supabase/`; do not duplicate them under `src/lib/supabase.ts` unless you intentionally migrate imports.
- This app already has an initial migration with public insert policies for `rsvps` and `song_requests`, and broad authenticated read policies. The RSVP plan should replace or supersede that model for wedding RSVPs. Existing `song_requests` can remain if desired, but its read policy should be reviewed.
- Routes should be TanStack file routes under `src/routes/`, for example `src/routes/rsvp.tsx` and `src/routes/admin.tsx`.
- `zod` is already installed and should be used for shared input validation.
- `@supabase/supabase-js` is already installed.
- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`; keep that wrapper and pass only additional config through it.

## Sequential Task Order

1. `01-supabase-client-and-function-caller.md`
2. `02-database-security-migration.md`
3. `03-edge-function-shared-utilities.md`
4. `04-public-rsvp-edge-functions.md`
5. `05-admin-edge-functions.md`
6. `06-shared-types-and-validation.md`
7. `07-rsvp-route-and-ui.md`
8. `08-admin-route-and-qr-ui.md`
9. `09-deployment-and-environment-docs.md`
10. `10-security-checklist-and-verification.md`

## Global Security Rules For Every Task

- Never commit real secrets.
- Never put `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or equivalent secret values in frontend code.
- The frontend may only use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Do not put publishable or secret keys in the `Authorization` header.
- For admin-only Edge Functions, `Authorization` must contain the signed-in user's JWT: `Bearer <access_token>`.
- Enable RLS on public tables.
- Do not add public read access to `invitation_codes` or `rsvp_responses`.
- Guest RSVP submission must go through `submit-rsvp`.
- Admin writes must go through Edge Functions.
- RSVP submission must be atomic and must prevent two successful submissions for one invite code.

