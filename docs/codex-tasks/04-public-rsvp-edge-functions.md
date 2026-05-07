# Task 04: Public RSVP Edge Functions

## Goal

Add public Edge Functions for invite validation and RSVP submission. These are the only guest-facing backend write/read endpoints for invitation codes.

## Files To Add

- `supabase/functions/validate-invite/index.ts`
- `supabase/functions/submit-rsvp/index.ts`

## Shared Utilities

Use helpers from:

- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/json.ts`
- `supabase/functions/_shared/admin.ts` only for elevated client creation if exported separately

These public functions do not require a user JWT.

## `validate-invite`

Purpose:

- Public endpoint.
- Checks whether a code exists and can be used.
- Does not leak private metadata.

Request:

```json
{
  "code": "w-k9x2mq7azp"
}
```

Responses:

```json
{ "ok": true, "valid": true }
```

```json
{ "ok": true, "valid": false, "reason": "not_found" }
```

Allowed reasons:

- `missing_code`
- `not_found`
- `used`
- `disabled`

Requirements:

- Normalize code with `lower(trim(code))`.
- Use an elevated Supabase client because RLS does not expose invitation codes publicly.
- Select only fields needed to determine validity: `code`, `used`, `disabled`.
- Do not return notes, `created_by`, RSVP details, or timestamps.

## `submit-rsvp`

Purpose:

- Public endpoint.
- Validates guest input.
- Calls the `public.submit_rsvp` RPC.

Request:

```json
{
  "code": "w-k9x2mq7azp",
  "fullName": "Guest Name",
  "attending": true,
  "guestCount": 2,
  "dietaryRequirements": "Vegetarian meal for one guest",
  "notes": ""
}
```

Success:

```json
{ "ok": true }
```

Failure:

```json
{ "ok": false, "error": "already_used" }
```

Validation requirements:

- `code`: required string, normalized server-side.
- `fullName`: required, trimmed, max 120 chars.
- `attending`: required boolean.
- `guestCount`: integer, 1 to 10.
- `dietaryRequirements`: optional, max 1000 chars.
- `notes`: optional, max 1000 chars.

Allowed error codes:

- `invalid_code`
- `disabled_code`
- `already_used`
- `invalid_input`

Security requirements:

- Do not insert directly from the frontend.
- Do not expose invitation or response rows directly.
- Call the atomic `submit_rsvp` RPC created in Task 02.

## Acceptance Criteria

- `validate-invite` does not reveal whether a code is disabled because of metadata beyond the allowed reason.
- `submit-rsvp` accepts a valid payload and returns `{ "ok": true }`.
- Submitting the same code twice returns `already_used` on the second attempt.
- Invalid body shapes return `invalid_input`.

