# Task 05: Admin Edge Functions

## Goal

Add admin-only Edge Functions for invitation management. Admin writes must not happen directly from the browser.

## Files To Add

- `supabase/functions/generate-invite/index.ts`
- `supabase/functions/disable-invite/index.ts`

## Shared Utilities

Use:

- `supabase/functions/_shared/admin.ts`
- `supabase/functions/_shared/code.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/json.ts`

## Auth Model

Admin-only functions require:

```http
Authorization: Bearer <signed-in-user-jwt>
```

The function must:

- Verify the JWT.
- Check `public.admin_users.user_id`.
- Use an elevated Supabase client only after this check.
- Return `401` for missing/invalid JWT.
- Return `403` for valid non-admin users.

## `generate-invite`

Request:

```json
{
  "notes": "optional notes"
}
```

Response:

```json
{
  "ok": true,
  "code": "w-k9x2mq7azp",
  "url": "https://yourdomain.gr/rsvp?code=w-k9x2mq7azp"
}
```

Requirements:

- Generate code server-side.
- Insert into `public.invitation_codes`.
- Store `created_by` as the authenticated admin user id.
- Store trimmed optional `notes`; max 1000 chars.
- Retry code generation on unique conflict.
- Stop after a reasonable number of attempts, for example 5.
- Use `SITE_URL` if available to build the full RSVP URL.
- If `SITE_URL` is unavailable, return `url: null` or omit `url` and still return `code`.
- Optionally insert an `audit_log` row.

## `disable-invite`

Request:

```json
{
  "code": "w-k9x2mq7azp"
}
```

Response:

```json
{ "ok": true }
```

Requirements:

- Verify admin.
- Normalize code with `lower(trim(code))`.
- Update matching row:

```sql
disabled = true,
disabled_at = now()
```

- Do not delete invitation rows.
- Return `not_found` if the code does not exist.
- Optionally insert an `audit_log` row.

## Acceptance Criteria

- Requests without `Authorization` fail.
- Requests from authenticated non-admin users fail.
- Admin users can generate a unique invite code.
- Admin users can disable an existing code.
- Browser code never contains a secret key.

