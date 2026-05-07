# Task 07: RSVP Route and UI

## Goal

Build the guest RSVP page at `/rsvp`.

## Repo Context

This app uses TanStack file routes. Add:

- `src/routes/rsvp.tsx`

Existing UI conventions:

- Shared shell/header/footer in `src/routes/__root.tsx`
- Wedding styling in `src/routes/index.tsx`
- UI components under `src/components/ui/`
- Toasts with `sonner`

Follow the existing visual style instead of creating a disconnected dashboard-like page.

## Dependencies

This task depends on:

- Task 01 function caller
- Task 04 public Edge Functions
- Task 06 validation helpers

## Behavior

The page must:

1. Read `code` from the URL query string.
2. Normalize and validate the code format client-side before calling the backend.
3. If no code is present, show a manual code input.
4. Call `validate-invite`.
5. If valid, show the RSVP form.
6. If invalid, show a friendly state for:
   - missing code
   - not found
   - used
   - disabled
7. Submit to `submit-rsvp`.
8. Show a success screen after a successful submission.
9. Prevent duplicate double-click submissions.
10. Preserve accessible labels and error messages.

## RSVP Form Fields

- Full name
- Attending yes/no
- Guest count
- Dietary requirements
- Notes

## Implementation Notes

- Use `callFunction` from `src/lib/functions.ts`.
- Use `zod` schemas from `src/lib/rsvp-validation.ts`.
- Use `useSearch` or browser `URLSearchParams`, following the repo's TanStack Router style.
- Keep local component state simple: `idle`, `validating`, `invalid`, `ready`, `submitting`, `success`, `error`.
- Do not write directly to the old `rsvps` table.
- Consider updating the home page RSVP button so it links to `/rsvp` instead of `#rsvp`, if the old embedded RSVP section is removed or deprecated.

## Acceptance Criteria

- `/rsvp` works with no code.
- `/rsvp?code=fake` shows a friendly invalid state.
- Valid codes show the form.
- Submit button is disabled while submitting.
- Successful submission shows a confirmation.
- Duplicate submission attempts for the same code show the used/already-submitted state.

