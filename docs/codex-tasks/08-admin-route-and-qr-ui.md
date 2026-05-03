# Task 08: Admin Route, Invitation Management, and QR UI

## Goal

Build the admin page at `/admin` for authenticated admin users.

## Repo Context

Use TanStack file route:

- `src/routes/admin.tsx`

Use existing Supabase browser client:

```ts
import { supabase } from "@/integrations/supabase/client";
```

Use existing UI components in `src/components/ui/`.

## Dependencies

This task depends on:

- Task 01 function caller
- Task 02 RLS/admin schema
- Task 05 admin Edge Functions
- Task 06 shared types

## Required Features

1. Supabase Auth login.
2. Magic-link login or email/password login.
3. Session handling.
4. Detect admin access.
5. Generate invitation code button.
6. Copy RSVP link button.
7. QR code display for each generated link.
8. Download QR code as PNG or SVG.
9. List existing invitation codes.
10. Show code status:
    - unused
    - used
    - disabled
11. Disable code button.
12. List RSVP responses.

## Admin Writes

Must use Edge Functions:

- `generate-invite`
- `disable-invite`

Call them with:

```ts
const token = await getAccessToken();
await callFunction("generate-invite", body, token);
```

Do not insert or update `invitation_codes` directly from the browser.

## Admin Reads

May use direct Supabase queries protected by RLS:

- `supabase.from("invitation_codes").select(...)`
- `supabase.from("rsvp_responses").select(...)`

If reads fail with permission errors:

- Show a non-admin/access denied state.
- Do not try to bypass RLS from frontend code.

## QR Code

Add client-side QR generation.

Preferred package:

```text
qrcode
```

If adding the dependency, run:

```sh
npm install qrcode
npm install -D @types/qrcode
```

Requirements:

- Generate QR from RSVP URL.
- Show QR in the admin UI.
- Allow SVG or PNG download.
- Do not call a backend just to generate QR codes.

## Admin Access Detection

Options:

- Query `admin_users` with RLS after login.
- Or call a lightweight admin-only function if one exists.

The browser must not decide admin status based only on email.

## Acceptance Criteria

- Logged-out users see a login form.
- Authenticated non-admin users see access denied.
- Admins can generate invite codes.
- Admins can copy and download QR codes.
- Admins can disable codes.
- Admins can view invite status and RSVP responses.
- No admin write uses a direct browser table update.

