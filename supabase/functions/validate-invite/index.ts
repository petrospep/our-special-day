import { createSupabaseAdminClient } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

type ValidateInviteBody = {
  code?: unknown;
  includeSongRequestUsage?: unknown;
  allowUsedForSongRequests?: unknown;
};

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function invalid(reason: "missing_code" | "not_found" | "used" | "disabled") {
  return json({ ok: true, valid: false, reason });
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return withCors(invalid("missing_code"));
  }

  let body: ValidateInviteBody;

  try {
    body = await readJson<ValidateInviteBody>(req);
  } catch {
    return withCors(invalid("missing_code"));
  }

  const code = normalizeCode(body?.code);
  const includeSongRequestUsage = body?.includeSongRequestUsage === true;
  const allowUsedForSongRequests = body?.allowUsedForSongRequests === true;

  if (!code) {
    return withCors(invalid("missing_code"));
  }

  let supabaseAdmin;

  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    console.error(error);

    return withCors(json({ ok: false, error: "server_not_configured" }, 500));
  }

  const { data, error } = await supabaseAdmin
    .from("invitation_codes")
    .select("code, used, disabled")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error(error);

    return withCors(json({ ok: false, error: "invite_lookup_failed" }, 500));
  }

  if (!data) {
    return withCors(invalid("not_found"));
  }

  if (data.disabled) {
    return withCors(invalid("disabled"));
  }

  if (data.used && !allowUsedForSongRequests) {
    return withCors(invalid("used"));
  }

  if (!includeSongRequestUsage) {
    return withCors(json({ ok: true, valid: true }));
  }

  const { count, error: songCountError } = await supabaseAdmin
    .from("song_requests")
    .select("id", { count: "exact", head: true })
    .eq("invite_code", code);

  if (songCountError) {
    console.error(songCountError);

    return withCors(json({ ok: false, error: "song_request_lookup_failed" }, 500));
  }

  const submitted = count ?? 0;
  const limit = 3;

  return withCors(
    json({
      ok: true,
      valid: true,
      songRequestsSubmitted: submitted,
      songRequestsLeft: Math.max(limit - submitted, 0),
      songRequestLimit: limit,
    }),
  );
});
