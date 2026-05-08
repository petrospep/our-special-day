import { createSupabaseAdminClient } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 40;
const MAX_OPTIONAL_TEXT_LENGTH = 1000;
const MAX_GUESTS = 10;

type GuestInput = {
  firstName?: unknown;
  lastName?: unknown;
  under13?: unknown;
  age?: unknown;
};

type SubmitRsvpBody = {
  code?: unknown;
  submitter?: GuestInput;
  attending?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  guests?: unknown;
  dietaryRequirements?: unknown;
  notes?: unknown;
};

type SubmitRsvpError = "invalid_code" | "disabled_code" | "already_used" | "invalid_input";

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
  const submitter = body?.submitter;
  const attending = body?.attending;
  const email = trimOptionalString(body?.email);
  const phoneNumber = trimOptionalString(body?.phoneNumber);
  const guests = body?.guests;
  const dietaryRequirements = trimOptionalString(body?.dietaryRequirements);
  const notes = trimOptionalString(body?.notes);
  const submitterFirstName = trimRequiredString(submitter?.firstName);
  const submitterLastName = trimRequiredString(submitter?.lastName);
  const submitterUnder13 = submitter?.under13;
  const submitterAge = submitter?.age ?? null;

  if (
    !code ||
    !submitterFirstName ||
    !submitterLastName ||
    submitterFirstName.length > MAX_NAME_LENGTH ||
    submitterLastName.length > MAX_NAME_LENGTH ||
    typeof submitterUnder13 !== "boolean" ||
    (submitterAge !== null &&
      (typeof submitterAge !== "number" ||
        !Number.isInteger(submitterAge) ||
        submitterAge < 0 ||
        submitterAge > 12)) ||
    (submitterUnder13 && submitterAge === null) ||
    (!submitterUnder13 && submitterAge !== null) ||
    typeof attending !== "boolean" ||
    email === undefined ||
    phoneNumber === undefined ||
    (email !== null &&
      (email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
    (phoneNumber !== null && phoneNumber.length > MAX_PHONE_LENGTH) ||
    !Array.isArray(guests) ||
    guests.length + 1 > MAX_GUESTS ||
    dietaryRequirements === undefined ||
    notes === undefined ||
    (dietaryRequirements !== null && dietaryRequirements.length > MAX_OPTIONAL_TEXT_LENGTH) ||
    (notes !== null && notes.length > MAX_OPTIONAL_TEXT_LENGTH)
  ) {
    return withCors(invalidInput());
  }

  const normalizedGuests = [];

  for (const guest of guests) {
    const firstName = trimRequiredString(guest?.firstName);
    const lastName = trimRequiredString(guest?.lastName);
    const under13 = guest?.under13;
    const age = guest?.age ?? null;

    if (
      !firstName ||
      !lastName ||
      firstName.length > MAX_NAME_LENGTH ||
      lastName.length > MAX_NAME_LENGTH ||
      typeof under13 !== "boolean" ||
      (age !== null &&
        (typeof age !== "number" || !Number.isInteger(age) || age < 0 || age > 12)) ||
      (under13 && age === null) ||
      (!under13 && age !== null)
    ) {
      return withCors(invalidInput());
    }

    normalizedGuests.push({ firstName, lastName, under13, age });
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
    p_submitter_first_name: submitterFirstName,
    p_submitter_last_name: submitterLastName,
    p_submitter_under_13: submitterUnder13,
    p_submitter_age: submitterAge,
    p_attending: attending,
    p_email: email,
    p_phone_number: phoneNumber,
    p_guests: normalizedGuests,
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
