import { requireAdmin } from "../_shared/admin.ts";
import { generateInviteCode } from "../_shared/code.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

const MAX_NOTES_LENGTH = 1000;
const MAX_CODE_ATTEMPTS = 5;

type GenerateInviteBody = {
  notes?: unknown;
};

function trimOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

function inviteUrl(code: string) {
  const siteUrl = Deno.env.get("SITE_URL")?.trim();

  if (!siteUrl) {
    return null;
  }

  try {
    const url = new URL("/rsvp", siteUrl);
    url.searchParams.set("code", code);

    return url.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return withCors(json({ ok: false, error: "invalid_input" }, 400));
  }

  const auth = await requireAdmin(req);

  if ("errorResponse" in auth) {
    return withCors(auth.errorResponse);
  }

  let body: GenerateInviteBody;

  try {
    body = await readJson<GenerateInviteBody>(req);
  } catch {
    return withCors(json({ ok: false, error: "invalid_input" }, 400));
  }

  const notes = trimOptionalString(body?.notes);

  if (notes === undefined || (notes !== null && notes.length > MAX_NOTES_LENGTH)) {
    return withCors(json({ ok: false, error: "invalid_input" }, 400));
  }

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateInviteCode();
    const { error } = await auth.supabaseAdmin.from("invitation_codes").insert({
      code,
      created_by: auth.user.id,
      notes,
    });

    if (!error) {
      const { error: auditError } = await auth.supabaseAdmin.from("audit_log").insert({
        actor_user_id: auth.user.id,
        action: "generate_invite",
        metadata: { code },
      });

      if (auditError) {
        console.error(auditError);
      }

      return withCors(json({ ok: true, code, url: inviteUrl(code) }));
    }

    if (error.code !== "23505") {
      console.error(error);

      return withCors(json({ ok: false, error: "invite_create_failed" }, 500));
    }
  }

  return withCors(json({ ok: false, error: "code_generation_failed" }, 500));
});
