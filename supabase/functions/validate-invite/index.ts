import { createSupabaseAdminClient } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

type ValidateInviteBody = {
  code?: unknown;
  includeRsvpResponse?: unknown;
  includeSongRequestUsage?: unknown;
  allowUsedForSongRequests?: unknown;
  requireAttendingRsvpForSongRequests?: unknown;
};

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function invalid(reason: "missing_code" | "not_found" | "used" | "disabled") {
  return json({ ok: true, valid: false, reason });
}

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
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
    return withCors(invalid("missing_code"));
  }

  let body: ValidateInviteBody;

  try {
    body = await readJson<ValidateInviteBody>(req);
  } catch {
    return withCors(invalid("missing_code"));
  }

  const code = normalizeCode(body?.code);
  const includeRsvpResponse = body?.includeRsvpResponse === true;
  const includeSongRequestUsage = body?.includeSongRequestUsage === true;
  const allowUsedForSongRequests = body?.allowUsedForSongRequests === true;
  const requireAttendingRsvpForSongRequests = body?.requireAttendingRsvpForSongRequests === true;

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
    if (!includeRsvpResponse) {
      return withCors(invalid("used"));
    }

    const { data: response, error: responseError } = await supabaseAdmin
      .from("rsvp_responses")
      .select("id, full_name, attending, guest_count, email, phone_number, submitted_at")
      .eq("invite_code", code)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (responseError) {
      console.error(responseError);

      return withCors(json({ ok: false, error: "rsvp_response_lookup_failed" }, 500));
    }

    if (!response) {
      return withCors(invalid("used"));
    }

    const { data: guests, error: guestsError } = await supabaseAdmin
      .from("rsvp_guests")
      .select("first_name, last_name, is_submitter, under_13, age, created_at")
      .eq("rsvp_response_id", response.id)
      .order("is_submitter", { ascending: false })
      .order("created_at", { ascending: true });

    if (guestsError) {
      console.error(guestsError);

      return withCors(json({ ok: false, error: "rsvp_response_lookup_failed" }, 500));
    }

    return withCors(
      json({
        ok: true,
        valid: false,
        reason: "used",
        rsvpResponse: {
          fullName: response.full_name,
          attending: response.attending,
          guestCount: response.guest_count,
          email: response.email,
          phoneNumber: response.phone_number,
          submittedAt: response.submitted_at,
          guests: (guests ?? []).map((guest) => ({
            firstName: guest.first_name,
            lastName: guest.last_name,
            fullName: fullName(guest.first_name, guest.last_name),
            isSubmitter: guest.is_submitter,
            under13: guest.under_13,
            age: guest.age,
          })),
        },
      }),
    );
  }

  if (!includeSongRequestUsage) {
    return withCors(json({ ok: true, valid: true }));
  }

  let songRequestGuestName: string | null = null;

  if (requireAttendingRsvpForSongRequests) {
    const { data: response, error: responseError } = await supabaseAdmin
      .from("rsvp_responses")
      .select("full_name, attending")
      .eq("invite_code", code)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (responseError) {
      console.error(responseError);

      return withCors(json({ ok: false, error: "rsvp_response_lookup_failed" }, 500));
    }

    if (!response) {
      return withCors(json({ ok: true, valid: false, reason: "rsvp_required" }));
    }

    if (!response.attending) {
      return withCors(json({ ok: true, valid: false, reason: "not_attending" }));
    }

    songRequestGuestName = response.full_name;
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
  const { data: songRequests, error: songRequestsError } = await supabaseAdmin
    .from("song_requests")
    .select("song_title, artist, created_at")
    .eq("invite_code", code)
    .order("created_at", { ascending: true });

  if (songRequestsError) {
    console.error(songRequestsError);

    return withCors(json({ ok: false, error: "song_request_lookup_failed" }, 500));
  }

  return withCors(
    json({
      ok: true,
      valid: true,
      songRequestsSubmitted: submitted,
      songRequestsLeft: Math.max(limit - submitted, 0),
      songRequestLimit: limit,
      songRequests: (songRequests ?? []).map(mapSongRequest),
      ...(songRequestGuestName ? { songRequestGuestName } : {}),
    }),
  );
});
