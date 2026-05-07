# Task 03: Edge Function Shared Utilities

## Goal

Add shared Supabase Edge Function helpers for JSON responses, CORS, invite-code generation, request parsing, and admin auth.

## Files To Add

- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/json.ts`
- `supabase/functions/_shared/code.ts`
- `supabase/functions/_shared/admin.ts`

## Runtime Context

Supabase Edge Functions run on Deno. Use URL imports compatible with Supabase Edge Functions, for example:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

## Environment Variables In Edge Functions

Read server-side values with `Deno.env.get(...)`.

Expected variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` preferred by this project plan

If the hosted Supabase project still exposes service role terminology, allow fallback to:

- `SUPABASE_SERVICE_ROLE_KEY`

Never expose either key to browser code.

## `json.ts`

Export:

```ts
export function json(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
```

## `cors.ts`

Export:

- `corsHeaders`
- `handleCors(req: Request)`
- `withCors(response: Response)`

Requirements:

- Support `OPTIONS`.
- Allow `authorization`, `content-type`, and `apikey` request headers if needed by Supabase clients.
- Prefer a configurable `SITE_ORIGIN` or `SITE_URL` allowlist. If unavailable, use `*` for this public wedding app.

## `code.ts`

Generate server-side invitation codes:

```ts
const CHARS = "abcdefghijkmnopqrstuvwxyz23456789";

export function generateInviteCode(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let value = "";

  for (const byte of bytes) {
    value += CHARS[byte % CHARS.length];
  }

  return `w-${value}`;
}
```

## `admin.ts`

Export helpers to:

- Build an elevated Supabase client using `SUPABASE_URL` and secret key.
- Read and validate `Authorization: Bearer <jwt>`.
- Verify the JWT with `supabase.auth.getUser(token)` or an equivalent Supabase Auth API.
- Check the authenticated user exists in `public.admin_users`.
- Return `{ user, supabaseAdmin }` on success.
- Return a JSON error response for unauthenticated or non-admin callers.

Important:

- The `Authorization` header contains a user JWT, not a Supabase API key.
- Use the secret key only inside this function runtime.
- Do not trust an email claim alone for admin authorization.

## Acceptance Criteria

- Shared helpers compile with `supabase functions serve` or equivalent.
- `OPTIONS` requests return an empty successful CORS response.
- Non-admin requests to admin helpers produce `401` or `403`, not a server error.

