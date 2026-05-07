import { createSupabaseAdminClient } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

const MAX_FULL_NAME_LENGTH = 120;
const MAX_OPTIONAL_TEXT_LENGTH = 1000;

type SubmitRsvpBody = {
  code?: unknown;
  fullName?: unknown;
  attending?: unknown;
  guestCount?: unknown;
  dietaryRequirements?: unknown;
  notes?: unknown;
};

type SubmitRsvpError =
  | "invalid_code"
  | "disabled_code"
  | "already_used"
  | "invalid_input";

type SubmitRsvpResult = {
  ok?: unknown;
  error?: unknown;
};

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function trimRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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

function invalidInput() {
  return json({ ok: false, error: "invalid_input" satisfies SubmitRsvpError }, 400);
}

function mapRpcError(error: unknown): SubmitRsvpError {
  switch (error) {
    case "invalid_code":
      return "invalid_code";
    case "disabled_code":
      return "disabled_code";
    case "used_code":
    case "already_used":
      return "already_used";
    default:
      return "invalid_input";
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return withCors(invalidInput());
  }

  let body: SubmitRsvpBody;

  try {
    body = await readJson<SubmitRsvpBody>(req);
  } catch {
    return withCors(invalidInput());
  }

  const code = normalizeCode(body?.code);
  const fullName = trimRequiredString(body?.fullName);
  const attending = body?.attending;
  const guestCount = body?.guestCount;
  const dietaryRequirements = trimOptionalString(body?.dietaryRequirements);
  const notes = trimOptionalString(body?.notes);

  if (
    !code ||
    !fullName ||
    fullName.length > MAX_FULL_NAME_LENGTH ||
    typeof attending !== "boolean" ||
    typeof guestCount !== "number" ||
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > 10 ||
    dietaryRequirements === undefined ||
    notes === undefined ||
    (dietaryRequirements !== null && dietaryRequirements.length > MAX_OPTIONAL_TEXT_LENGTH) ||
    (notes !== null && notes.length > MAX_OPTIONAL_TEXT_LENGTH)
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

  const { data, error } = await supabaseAdmin.rpc("submit_rsvp", {
    p_invite_code: code,
    p_full_name: fullName,
    p_attending: attending,
    p_guest_count: guestCount,
    p_dietary_requirements: dietaryRequirements,
    p_notes: notes,
  });

  if (error) {
    console.error(error);

    return withCors(json({ ok: false, error: "invalid_input" }, 500));
  }

  const result = data as SubmitRsvpResult | null;

  if (result?.ok === true) {
    return withCors(json({ ok: true }));
  }

  return withCors(json({ ok: false, error: mapRpcError(result?.error) }));
});
