import { requireAdmin } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

type ResetInviteSubmissionBody = {
  code?: unknown;
};

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

  let body: ResetInviteSubmissionBody;

  try {
    body = await readJson<ResetInviteSubmissionBody>(req);
  } catch {
    return withCors(json({ ok: false, error: "invalid_input" }, 400));
  }

  const code = normalizeCode(body?.code);

  if (!code) {
    return withCors(json({ ok: false, error: "invalid_input" }, 400));
  }

  const { data: invite, error: inviteError } = await auth.supabaseAdmin
    .from("invitation_codes")
    .select("code, used, disabled")
    .eq("code", code)
    .maybeSingle();

  if (inviteError) {
    console.error(inviteError);

    return withCors(json({ ok: false, error: "invite_reset_failed" }, 500));
  }

  if (!invite) {
    return withCors(json({ ok: false, error: "not_found" }, 404));
  }

  const { error } = await auth.supabaseAdmin
    .from("invitation_codes")
    .update({
      used: false,
      used_at: null,
    })
    .eq("code", code);

  if (error) {
    console.error(error);

    return withCors(json({ ok: false, error: "invite_reset_failed" }, 500));
  }

  const { error: auditError } = await auth.supabaseAdmin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    action: "reset_invite_submission",
    metadata: {
      code,
      was_used: invite.used,
      disabled: invite.disabled,
    },
  });

  if (auditError) {
    console.error(auditError);
  }

  return withCors(json({ ok: true }));
});
