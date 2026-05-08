# Our Special Day

A static wedding RSVP app with a public RSVP flow, an `/admin` dashboard for invite-code management, and Supabase-backed storage, authentication, row-level security, and Edge Functions.

## Local Prerequisites

- Node.js 22 or newer.
- npm.
- Supabase CLI.
- Access to a Supabase project.

## Local Frontend Setup

Install dependencies:

```bash
npm ci
```

Create a local environment file such as `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

These `VITE_` values are bundled into the browser. Use the Supabase project URL and a publishable key only.

Run the frontend locally:

```bash
npm run dev
```

The app includes:

- `/rsvp` for guest RSVP submission.
- `/admin` for authenticated invite-code generation and RSVP review.

## Supabase Setup

Create a Supabase project, then link this repository to it:

```bash
supabase login
supabase link --project-ref <project-ref>
```

Configure the Edge Function secrets:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SITE_URL=
RESEND_API_KEY=
RSVP_EMAIL_FROM=
RSVP_OWNER_EMAIL=
```

Set them in Supabase:

```bash
supabase secrets set SUPABASE_URL="https://<project-ref>.supabase.co"
supabase secrets set SUPABASE_SECRET_KEY="<server-side-secret-key>"
supabase secrets set SITE_URL="https://example.com"
supabase secrets set RESEND_API_KEY="<resend-api-key>"
supabase secrets set RSVP_EMAIL_FROM="Petros & Nikki <rsvp@example.com>"
supabase secrets set RSVP_OWNER_EMAIL="<your-confirmation-email>"
```

`SUPABASE_SECRET_KEY` can also be the Supabase service role key if that is the server-side key you use for this project. It is server-side only and must never be added to `VITE_` variables, committed to Git, or exposed in browser code.

`submit-rsvp` sends RSVP email through Resend after the RSVP is stored. Guests receive a confirmation only when they provide an email address, and `RSVP_OWNER_EMAIL` receives every RSVP notification. Mail delivery failures are logged by the Edge Function and do not roll back the saved RSVP.

## Database Migrations

Run local migrations against the linked Supabase project:

```bash
supabase db push
```

For a dry run before applying changes:

```bash
supabase db push --dry-run
```

After the first admin user signs in through `/admin`, copy their Supabase Auth user ID and insert it into `admin_users`:

```sql
insert into public.admin_users (user_id, email)
values ('<auth-user-id>', '<admin-email>');
```

## Edge Functions

Deploy all project Edge Functions:

```bash
supabase functions deploy validate-invite --project-ref <project-ref> --no-verify-jwt
supabase functions deploy submit-rsvp --project-ref <project-ref> --no-verify-jwt
supabase functions deploy submit-song-request --project-ref <project-ref> --no-verify-jwt
supabase functions deploy generate-invite --project-ref <project-ref> --no-verify-jwt
supabase functions deploy disable-invite --project-ref <project-ref> --no-verify-jwt
```

The project also stores these settings in `supabase/config.toml`, but the explicit flags make manual deployments unambiguous. Admin functions still require an authenticated Supabase session and an `admin_users` row because the function code performs its own admin check.

## Supabase Auth Redirect URLs

In the Supabase Dashboard, open Authentication > URL Configuration.

Set the Site URL to the deployed frontend origin, for example:

```text
https://example.com
```

Add redirect URLs for the admin route:

```text
http://localhost:5173/admin
https://example.com/admin
```

For a GitHub Pages repo-path deployment, also add:

```text
https://<github-user-or-org>.github.io/<repo-name>/admin
```

The `/admin` route uses the current admin page URL as the magic-link redirect target, so each local, preview, and production admin URL must be allowed in Supabase Auth.

## GitHub Pages Deployment

This repository includes `.github/workflows/deploy.yml`. It runs on pushes to `main`, installs dependencies with `npm ci`, builds with `npm run build`, stages the prerendered client output into `dist`, uploads `dist`, and deploys with the official GitHub Pages actions.

In GitHub, configure Pages to use GitHub Actions as the source.

Add these repository or environment variables for the build:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Do not add `SUPABASE_SECRET_KEY` or service role keys to the frontend build environment.

### Vite Base Path

For a custom domain or root deployment, use:

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    prerender: {
      enabled: true,
      autoSubfolderIndex: true,
      crawlLinks: true,
    },
  },
  vite: {
    base: "/",
  },
});
```

For a GitHub Pages repo-path deployment, set the base to the repository name:

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    prerender: {
      enabled: true,
      autoSubfolderIndex: true,
      crawlLinks: true,
    },
  },
  vite: {
    base: "/repo-name/",
  },
});
```

Keep using `@lovable.dev/vite-tanstack-config`; pass extra Vite config through the existing wrapper instead of replacing it with raw Vite config.

## Manual Operator Checklist

1. Create Supabase project.
2. Copy project URL.
3. Create or copy publishable key.
4. Create or copy secret key for Edge Functions.
5. Configure frontend env:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Configure Edge Function secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `SITE_URL`
7. Configure Supabase Auth redirect URLs.
8. Run database migrations.
9. Deploy Edge Functions.
10. Sign in once through `/admin`.
11. Copy your Supabase Auth user ID.
12. Insert yourself into `admin_users`.
13. Test admin code generation.
14. Test RSVP submission.
15. Test used code cannot submit twice.
16. Deploy frontend.

## Security Notes

- Keep all `.env` files out of Git.
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` belong in the frontend environment.
- `SUPABASE_SECRET_KEY` and service role keys are server-side only. They can bypass row-level security and must only be used from Supabase Edge Functions or other trusted server environments.
- Do not expose Edge Function secrets in GitHub Pages, static hosting, browser code, screenshots, or client-side logs.
- Add admins by inserting known Supabase Auth user IDs into `public.admin_users`; do not rely on user-editable metadata for admin access.
- Keep Supabase Auth redirect URLs narrow. Add the exact `/admin` URLs you use for local and production environments.
