# Task 09: Deployment and Environment Documentation

## Goal

Add deployment workflow and practical setup docs for GitHub Pages/static hosting plus Supabase.

## Files To Add Or Update

- Add `.github/workflows/deploy.yml`
- Add or update `README.md`
- Update `vite.config.ts` only if needed

## Repo Context

`vite.config.ts` currently uses:

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig();
```

Do not replace this with raw Vite config. If a custom base is needed, pass additional config through the existing wrapper.

## GitHub Pages Workflow

Create `.github/workflows/deploy.yml` using official GitHub Pages actions.

Requirements:

- Trigger on pushes to `main`.
- Install dependencies with `npm ci`.
- Build with `npm run build`.
- Upload `dist`.
- Deploy to GitHub Pages.

Document:

- For a custom domain, use Vite `base: "/"`.
- For a repo-path deployment, set the base to `"/repo-name/"`.

## README Sections

Include:

- Project overview.
- Local prerequisites.
- Local frontend setup.
- Required frontend env vars:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

- Required Edge Function secrets:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SITE_URL=
```

- Supabase setup steps.
- How to run migrations.
- How to deploy Edge Functions.
- How to configure Supabase Auth redirect URLs for `/admin`.
- How to run the frontend locally.
- How to deploy to GitHub Pages.
- Security notes.

## Manual Operator Checklist

Add this checklist to `README.md`:

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

## Acceptance Criteria

- `README.md` contains no real secrets.
- Workflow uses official GitHub Pages actions.
- Documentation explains both custom-domain and repo-path base settings.
- Documentation explains that secret keys are server-side only.

