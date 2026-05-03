# Task 06: Shared Types and Validation

## Goal

Add frontend TypeScript types and validation helpers for RSVP/admin flows.

## Repo Context

This repo already uses:

- TypeScript
- `zod`
- Generated Supabase types at `src/integrations/supabase/types.ts`

Prefer adding app-level types in `src/lib/rsvp-types.ts` or `src/lib/rsvp.ts`. Do not manually edit generated Supabase types unless this repo already treats that file as source-controlled generated output.

## Files To Add Or Update

- Add `src/lib/rsvp-types.ts`
- Add `src/lib/rsvp-validation.ts`
- Update imports in later UI tasks

## Types To Define

Define types for:

- `InviteCodeStatus`
- `ValidateInviteRequest`
- `ValidateInviteResponse`
- `SubmitRsvpRequest`
- `SubmitRsvpResponse`
- `GenerateInviteRequest`
- `GenerateInviteResponse`
- `DisableInviteRequest`
- `DisableInviteResponse`
- `InvitationCodeRow`
- `RsvpResponseRow`

For table row types, prefer generated helpers when available:

```ts
import type { Tables } from "@/integrations/supabase/types";

export type InvitationCodeRow = Tables<"invitation_codes">;
export type RsvpResponseRow = Tables<"rsvp_responses">;
```

If the generated file has not been refreshed after Task 02, temporarily define structural types and add a note to regenerate Supabase types.

## Validation

Use `zod`.

Validation rules:

- Code format: `w-` followed by 8 to 16 readable lowercase alphanumeric chars.
- Full name: required, trim, max 120 chars.
- Attending: required boolean.
- Guest count: integer, min 1, max 10.
- Dietary requirements: optional, max 1000 chars.
- Notes: optional, max 1000 chars.

Suggested code regex:

```ts
/^w-[a-km-np-z2-9]{8,16}$/
```

Export:

- `inviteCodeSchema`
- `rsvpFormSchema`
- `generateInviteSchema`
- `disableInviteSchema`
- Types inferred from each schema

## Acceptance Criteria

- Validation helpers are reusable by `/rsvp` and `/admin`.
- User-facing forms can map validation errors to accessible error text.
- No real guest data is stored in tests or fixtures.

