import { createSupabaseAdminClient } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

const MAX_SONG_TITLE_LENGTH = 150;
const MAX_ARTIST_LENGTH = 150;

type SubmitSongRequestBody = {
  code?: unknown;
  songTitle?: unknown;
  artist?: unknown;
};

type SubmitSongRequestError =
  | "invalid_code"
  | "disabled_code"
  | "rsvp_required"
  | "maybe"
  | "not_attending"
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

function mapSongRequest(request: { song_title: string; artist: string; created_at: string }) {
  return {
    songTitle: request.song_title,
    artist: request.artist,
    createdAt: request.created_at,
  };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return withCors(invalidInput(), req);
  }

  let body: SubmitSongRequestBody;

  try {
    body = await readJson<SubmitSongRequestBody>(req);
  } catch {
    return withCors(invalidInput(), req);
  }

  const code = normalizeCode(body?.code);
  const songTitle = trimRequiredString(body?.songTitle);
  const artist = trimRequiredString(body?.artist);

  if (
    !code ||
    !songTitle ||
    !artist ||
    songTitle.length > MAX_SONG_TITLE_LENGTH ||
    artist.length > MAX_ARTIST_LENGTH
  ) {
    return withCors(invalidInput(), req);
  }

  let supabaseAdmin;

  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    console.error(error);

    return withCors(json({ ok: false, error: "server_not_configured" }, 500), req);
  }

  const { data: invitation, error: inviteError } = await supabaseAdmin
    .from("invitation_codes")
    .select("code, disabled")
    .eq("code", code)
    .maybeSingle();

  if (inviteError) {
    console.error(inviteError);

    return withCors(json({ ok: false, error: "invalid_input" }, 500), req);
  }

  if (!invitation) {
    return withCors(
      json({ ok: false, error: "invalid_code" satisfies SubmitSongRequestError }),
      req,
    );
  }

  if (invitation.disabled) {
    return withCors(
      json({ ok: false, error: "disabled_code" satisfies SubmitSongRequestError }),
      req,
    );
  }

  const { data: rsvp, error: rsvpError } = await supabaseAdmin
    .from("rsvp_responses")
    .select("full_name, attending, attendance_status")
    .eq("invite_code", code)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rsvpError) {
    console.error(rsvpError);

    return withCors(json({ ok: false, error: "invalid_input" }, 500), req);
  }

  if (!rsvp) {
    return withCors(
      json({ ok: false, error: "rsvp_required" satisfies SubmitSongRequestError }),
      req,
    );
  }

  if (rsvp.attendance_status === "maybe") {
    return withCors(json({ ok: false, error: "maybe" satisfies SubmitSongRequestError }), req);
  }

  if (rsvp.attendance_status ? rsvp.attendance_status !== "attending" : !rsvp.attending) {
    return withCors(
      json({ ok: false, error: "not_attending" satisfies SubmitSongRequestError }),
      req,
    );
  }

  const { error } = await supabaseAdmin.from("song_requests").insert({
    invite_code: code,
    guest_name: rsvp.full_name,
    song_title: songTitle,
    artist,
  });

  if (error) {
    if (error.message?.includes("song_request_limit_reached")) {
      return withCors(
        json({ ok: false, error: "song_request_limit_reached" satisfies SubmitSongRequestError }),
        req,
      );
    }

    console.error(error);

    return withCors(json({ ok: false, error: "invalid_input" }, 500), req);
  }

  const { count, error: songCountError } = await supabaseAdmin
    .from("song_requests")
    .select("id", { count: "exact", head: true })
    .eq("invite_code", code);

  if (songCountError) {
    console.error(songCountError);

    return withCors(json({ ok: true }), req);
  }

  const submitted = count ?? 0;
  const limit = 3;
  const { data: songRequests, error: songRequestsError } = await supabaseAdmin
    .from("song_requests")
    .select("song_title, artist, created_at")
    .eq("invite_code", code)
    .order("created_at", { ascending: true });

  if (songRequestsError) {
    console.error(songRequestsError);

    return withCors(
      json({
        ok: true,
        songRequestsSubmitted: submitted,
        songRequestsLeft: Math.max(limit - submitted, 0),
        songRequestLimit: limit,
      }),
      req,
    );
  }

  return withCors(
    json({
      ok: true,
      songRequestsSubmitted: submitted,
      songRequestsLeft: Math.max(limit - submitted, 0),
      songRequestLimit: limit,
      songRequests: (songRequests ?? []).map(mapSongRequest),
    }),
    req,
  );
});
