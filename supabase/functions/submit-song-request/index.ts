import { createSupabaseAdminClient } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

const MAX_GUEST_NAME_LENGTH = 100;
const MAX_SONG_TITLE_LENGTH = 150;
const MAX_ARTIST_LENGTH = 150;

type SubmitSongRequestBody = {
  code?: unknown;
  guestName?: unknown;
  songTitle?: unknown;
  artist?: unknown;
};

type SubmitSongRequestError =
  | "invalid_code"
  | "disabled_code"
  | "used_code"
  | "song_request_limit_reached"
  | "invalid_input";

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function trimRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function invalidInput() {
  return json({ ok: false, error: "invalid_input" satisfies SubmitSongRequestError }, 400);
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return withCors(invalidInput());
  }

  let body: SubmitSongRequestBody;

  try {
    body = await readJson<SubmitSongRequestBody>(req);
  } catch {
    return withCors(invalidInput());
  }

  const code = normalizeCode(body?.code);
  const guestName = trimRequiredString(body?.guestName);
  const songTitle = trimRequiredString(body?.songTitle);
  const artist = trimRequiredString(body?.artist);

  if (
    !code ||
    !guestName ||
    !songTitle ||
    !artist ||
    guestName.length > MAX_GUEST_NAME_LENGTH ||
    songTitle.length > MAX_SONG_TITLE_LENGTH ||
    artist.length > MAX_ARTIST_LENGTH
  ) {
    return withCors(invalidInput());
  }

  let supabaseAdmin;

  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    console.error(error);

    return withCors(json({ ok: false, error: "server_not_configured" }, 500));
  }

  const { data: invitation, error: inviteError } = await supabaseAdmin
    .from("invitation_codes")
    .select("code, used, disabled")
    .eq("code", code)
    .maybeSingle();

  if (inviteError) {
    console.error(inviteError);

    return withCors(json({ ok: false, error: "invalid_input" }, 500));
  }

  if (!invitation) {
    return withCors(json({ ok: false, error: "invalid_code" satisfies SubmitSongRequestError }));
  }

  if (invitation.disabled) {
    return withCors(json({ ok: false, error: "disabled_code" satisfies SubmitSongRequestError }));
  }

  if (invitation.used) {
    return withCors(json({ ok: false, error: "used_code" satisfies SubmitSongRequestError }));
  }

  const { error } = await supabaseAdmin.from("song_requests").insert({
    invite_code: code,
    guest_name: guestName,
    song_title: songTitle,
    artist,
  });

  if (error) {
    if (error.message?.includes("song_request_limit_reached")) {
      return withCors(
        json({ ok: false, error: "song_request_limit_reached" satisfies SubmitSongRequestError }),
      );
    }

    console.error(error);

    return withCors(json({ ok: false, error: "invalid_input" }, 500));
  }

  return withCors(json({ ok: true }));
});
