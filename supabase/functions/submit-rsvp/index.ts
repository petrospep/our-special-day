import { createSupabaseAdminClient } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 40;
const MAX_GUESTS = 10;
const EVENT_TITLE = "Petros & Nikki's wedding";
const EVENT_DATE = "Saturday, 25 July 2026";
const EVENT_LOCATION = "Athens, Greece";
const DEFAULT_RSVP_EMAIL_FROM = "Petros & Nikki <wedding@petrikki.gr>";

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
  attendanceStatus?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  guests?: unknown;
};

type SubmitRsvpError = "invalid_code" | "disabled_code" | "already_used" | "invalid_input";

type SubmitRsvpResult = {
  ok?: unknown;
  error?: unknown;
};

type NormalizedGuest = {
  firstName: string;
  lastName: string;
  under13: boolean;
  age: number | null;
};

type AttendanceStatus = "attending" | "declined" | "maybe";

type RsvpEmailDetails = {
  code: string;
  submitterFirstName: string;
  submitterLastName: string;
  submitterUnder13: boolean;
  submitterAge: number | null;
  attending: boolean;
  attendanceStatus: AttendanceStatus;
  email: string | null;
  phoneNumber: string | null;
  guests: NormalizedGuest[];
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function normalizeAttendanceStatus(value: unknown, attending: unknown): AttendanceStatus | null {
  if (value === "attending" || value === "declined" || value === "maybe") {
    return value;
  }

  if (typeof attending === "boolean") {
    return attending ? "attending" : "declined";
  }

  return null;
}

function guestLabel(guest: NormalizedGuest) {
  const name = fullName(guest.firstName, guest.lastName);

  if (!guest.under13) {
    return name;
  }

  return `${name} (under 13, age ${guest.age})`;
}

function textLine(label: string, value: string | null) {
  return `${label}: ${value ?? "Not provided"}`;
}

function htmlRow(label: string, value: string | null) {
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value ?? "Not provided")}</p>`;
}

function buildGuestConfirmation(details: RsvpEmailDetails) {
  const submitterName = fullName(details.submitterFirstName, details.submitterLastName);
  const attendingCopy =
    details.attendanceStatus === "maybe"
      ? "We have you marked as very likely and awaiting final confirmation."
      : details.attending
        ? "We have you marked as attending."
        : "We have you marked as not attending.";
  const guestNames = details.guests.length
    ? details.guests.map(guestLabel).join(", ")
    : "No additional guests";

  return {
    subject: `RSVP confirmation for ${EVENT_TITLE}`,
    text: [
      `Hi ${submitterName},`,
      "",
      `Thank you for sending your RSVP for ${EVENT_TITLE}.`,
      attendingCopy,
      "",
      textLine("Event", EVENT_TITLE),
      textLine("Date", EVENT_DATE),
      textLine("Location", EVENT_LOCATION),
      textLine("Additional guests", guestNames),
      "",
      "With love,",
      "Petros & Nikki",
    ].join("\n"),
    html: [
      `<p>Hi ${escapeHtml(submitterName)},</p>`,
      `<p>Thank you for sending your RSVP for ${escapeHtml(EVENT_TITLE)}. ${escapeHtml(attendingCopy)}</p>`,
      htmlRow("Event", EVENT_TITLE),
      htmlRow("Date", EVENT_DATE),
      htmlRow("Location", EVENT_LOCATION),
      htmlRow("Additional guests", guestNames),
      "<p>With love,<br>Petros &amp; Nikki</p>",
    ].join(""),
  };
}

function buildOwnerNotification(details: RsvpEmailDetails) {
  const submitterName = fullName(details.submitterFirstName, details.submitterLastName);
  const submitterAge = details.submitterUnder13 ? `under 13, age ${details.submitterAge}` : "adult";
  const guestNames = details.guests.length
    ? details.guests.map(guestLabel).join(", ")
    : "No additional guests";
  const attendance =
    details.attendanceStatus === "maybe"
      ? "Very likely"
      : details.attending
        ? "Attending"
        : "Not attending";

  return {
    subject: `New RSVP: ${submitterName} - ${attendance}`,
    text: [
      `New RSVP for ${EVENT_TITLE}`,
      "",
      textLine("Invitation code", details.code),
      textLine("Submitter", `${submitterName} (${submitterAge})`),
      textLine("Attendance", attendance),
      textLine("Email", details.email),
      textLine("Phone", details.phoneNumber),
      textLine("Additional guests", guestNames),
      textLine("Party size", String(details.guests.length + 1)),
    ].join("\n"),
    html: [
      `<p>New RSVP for ${escapeHtml(EVENT_TITLE)}</p>`,
      htmlRow("Invitation code", details.code),
      htmlRow("Submitter", `${submitterName} (${submitterAge})`),
      htmlRow("Attendance", attendance),
      htmlRow("Email", details.email),
      htmlRow("Phone", details.phoneNumber),
      htmlRow("Additional guests", guestNames),
      htmlRow("Party size", String(details.guests.length + 1)),
    ].join(""),
  };
}

async function sendEmail({
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RSVP_EMAIL_FROM") ?? DEFAULT_RSVP_EMAIL_FROM;

  if (!apiKey) {
    console.warn("RSVP email skipped: missing RESEND_API_KEY.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend email failed with status ${response.status}: ${await response.text()}`);
  }
}

async function sendRsvpEmails(details: RsvpEmailDetails) {
  const ownerEmail = Deno.env.get("RSVP_OWNER_EMAIL");
  const messages: Array<Promise<void>> = [];

  if (details.email) {
    messages.push(sendEmail({ to: details.email, ...buildGuestConfirmation(details) }));
  }

  if (ownerEmail) {
    messages.push(
      sendEmail({
        to: ownerEmail,
        replyTo: details.email ?? undefined,
        ...buildOwnerNotification(details),
      }),
    );
  } else {
    console.warn("RSVP owner email skipped: missing RSVP_OWNER_EMAIL.");
  }

  const results = await Promise.allSettled(messages);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(result.reason);
    }
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
  const attendanceStatus = normalizeAttendanceStatus(body?.attendanceStatus, attending);
  const email = trimOptionalString(body?.email);
  const phoneNumber = trimOptionalString(body?.phoneNumber);
  const guests = body?.guests;
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
    attendanceStatus === null ||
    email === undefined ||
    phoneNumber === undefined ||
    (email !== null &&
      (email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
    (phoneNumber !== null && phoneNumber.length > MAX_PHONE_LENGTH) ||
    !Array.isArray(guests) ||
    guests.length + 1 > MAX_GUESTS
  ) {
    return withCors(invalidInput());
  }

  const normalizedGuests: NormalizedGuest[] = [];

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
    p_attending: attendanceStatus === "attending",
    p_attendance_status: attendanceStatus,
    p_email: email,
    p_phone_number: phoneNumber,
    p_guests: normalizedGuests,
  });

  if (error) {
    console.error(error);

    return withCors(json({ ok: false, error: "invalid_input" }, 500));
  }

  const result = data as SubmitRsvpResult | null;

  if (result?.ok === true) {
    await sendRsvpEmails({
      code,
      submitterFirstName,
      submitterLastName,
      submitterUnder13,
      submitterAge,
      attending: attendanceStatus === "attending",
      attendanceStatus,
      email,
      phoneNumber,
      guests: normalizedGuests,
    });

    return withCors(json({ ok: true }));
  }

  return withCors(json({ ok: false, error: mapRpcError(result?.error) }));
});
