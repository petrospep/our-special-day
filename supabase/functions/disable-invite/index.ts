import { requireAdmin } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

type DisableInviteBody = {
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

  let body: DisableInviteBody;

  try {
    body = await readJson<DisableInviteBody>(req);
  } catch {
    return withCors(json({ ok: false, error: "invalid_input" }, 400));
  }

  const code = normalizeCode(body?.code);

  if (!code) {
    return withCors(json({ ok: false, error: "invalid_input" }, 400));
  }

  const { data, error } = await auth.supabaseAdmin
    .from("invitation_codes")
    .update({
      disabled: true,
      disabled_at: new Date().toISOString(),
    })
    .eq("code", code)
    .select("code")
    .maybeSingle();

  if (error) {
    console.error(error);

    return withCors(json({ ok: false, error: "invite_disable_failed" }, 500));
  }

  if (!data) {
    return withCors(json({ ok: false, error: "not_found" }, 404));
  }

  const { error: auditError } = await auth.supabaseAdmin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    action: "disable_invite",
    metadata: { code },
  });

  if (auditError) {
    console.error(auditError);
  }

  return withCors(json({ ok: true }));
});
