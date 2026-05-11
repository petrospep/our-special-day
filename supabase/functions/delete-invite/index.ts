import { requireAdmin } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

type DeleteInviteBody = {
  code?: unknown;
  deleteUsed?: unknown;
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

  let body: DeleteInviteBody;

  try {
    body = await readJson<DeleteInviteBody>(req);
  } catch {
    return withCors(json({ ok: false, error: "invalid_input" }, 400));
  }

  const code = normalizeCode(body?.code);
  const deleteUsed = body?.deleteUsed === true;

  if (!code) {
    return withCors(json({ ok: false, error: "invalid_input" }, 400));
  }

  const { data: invite, error: inviteError } = await auth.supabaseAdmin
    .from("invitation_codes")
    .select("code, used")
    .eq("code", code)
    .maybeSingle();

  if (inviteError) {
    console.error(inviteError);

    return withCors(json({ ok: false, error: "invite_delete_failed" }, 500));
  }

  if (!invite) {
    return withCors(json({ ok: false, error: "not_found" }, 404));
  }

  if (invite.used && !deleteUsed) {
    return withCors(json({ ok: false, error: "used_code_confirmation_required" }, 409));
  }

  const [
    { count: rsvpCount, error: rsvpError },
    { count: guestCount, error: guestError },
    { count: songCount, error: songError },
  ] = await Promise.all([
    auth.supabaseAdmin
      .from("rsvp_responses")
      .select("id", { count: "exact", head: true })
      .eq("invite_code", code),
    auth.supabaseAdmin
      .from("rsvp_guests")
      .select("id", { count: "exact", head: true })
      .eq("invite_code", code),
    auth.supabaseAdmin
      .from("song_requests")
      .select("id", { count: "exact", head: true })
      .eq("invite_code", code),
  ]);

  if (rsvpError || guestError || songError) {
    console.error(rsvpError ?? guestError ?? songError);

    return withCors(json({ ok: false, error: "invite_delete_failed" }, 500));
  }

  const { data, error } = await auth.supabaseAdmin
    .from("invitation_codes")
    .delete()
    .eq("code", code)
    .select("code")
    .maybeSingle();

  if (error) {
    console.error(error);

    if (error.code === "23503") {
      return withCors(json({ ok: false, error: "has_related_records" }, 409));
    }

    return withCors(json({ ok: false, error: "invite_delete_failed" }, 500));
  }

  if (!data) {
    return withCors(json({ ok: false, error: "not_found" }, 404));
  }

  const { error: auditError } = await auth.supabaseAdmin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    action: "delete_invite",
    metadata: {
      code,
      used: invite.used,
      deleted_related_records: {
        rsvp_responses: rsvpCount ?? 0,
        rsvp_guests: guestCount ?? 0,
        song_requests: songCount ?? 0,
      },
    },
  });

  if (auditError) {
    console.error(auditError);
  }

  return withCors(json({ ok: true }));
});
