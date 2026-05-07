# Task 01: Supabase Client and Edge Function Caller

## Goal

Prepare frontend utilities for Supabase Auth and Edge Function calls without exposing secrets.

## Repo Context

This repo already has a generated browser client:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

Use the existing client import path:

```ts
import { supabase } from "@/integrations/supabase/client";
```

Do not create a second browser client unless there is a deliberate import migration.

## Files To Add Or Update

- Add `.env.example`
- Add `src/lib/functions.ts`
- Optionally add `src/lib/env.ts` if centralizing environment checks helps

## Requirements

`.env.example` must contain only public frontend variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Do not include:

```env
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`src/lib/functions.ts` must:

- Export `getAccessToken()`.
- Export a generic `callFunction<T>()`.
- Call `${VITE_SUPABASE_URL}/functions/v1/${name}`.
- Send JSON request bodies.
- Add `Authorization: Bearer <jwt>` only when an access token is provided.
- Never put publishable or secret keys in `Authorization`.
- Throw useful errors for non-2xx responses or `{ ok: false }` payloads.
- Tolerate non-JSON error responses.

Suggested implementation shape:

```ts
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export async function callFunction<T>(
  name: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || `Function ${name} failed`);
  }

  return data as T;
}
```

## Acceptance Criteria

- `npm run build` still compiles.
- `.env.example` contains no secret-key variable.
- A search for `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` under `src/` returns no frontend usage.

