import { createSupabaseAdminClient } from "../_shared/admin.ts";
import { handleCors, withCors } from "../_shared/cors.ts";
import { json, readJson } from "../_shared/json.ts";
import { isValidInviteCode } from "../_shared/invite-code-word-pool.ts";

type GiftRegion = "uk" | "greece";

type RevealGiftDetailsBody = {
  code?: unknown;
  region?: unknown;
};

type RevealGiftDetailsError =
  | "invalid_code"
  | "disabled_code"
  | "invalid_input"
  | "invite_lookup_failed"
  | "server_not_configured";

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeRegion(value: unknown): GiftRegion | null {
  return value === "uk" || value === "greece" ? value : null;
}

function invalidInput() {
  return json({ ok: false, error: "invalid_input" satisfies RevealGiftDetailsError }, 400);
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return withCors(invalidInput(), req);
  }

  let body: RevealGiftDetailsBody;

  try {
    body = await readJson<RevealGiftDetailsBody>(req);
  } catch {
    return withCors(invalidInput(), req);
  }

  const code = normalizeCode(body?.code);
  const region = normalizeRegion(body?.region);

  if (!isValidInviteCode(code) || !region) {
    return withCors(invalidInput(), req);
  }

  let supabaseAdmin;

  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    console.error(error);

    return withCors(
      json({ ok: false, error: "server_not_configured" satisfies RevealGiftDetailsError }, 500),
      req,
    );
  }

  const { data: invitation, error: inviteError } = await supabaseAdmin
    .from("invitation_codes")
    .select("code, disabled")
    .eq("code", code)
    .maybeSingle();

  if (inviteError) {
    console.error(inviteError);

    return withCors(
      json({ ok: false, error: "invite_lookup_failed" satisfies RevealGiftDetailsError }, 500),
      req,
    );
  }

  if (!invitation) {
    return withCors(
      json({ ok: false, error: "invalid_code" satisfies RevealGiftDetailsError }),
      req,
    );
  }

  if (invitation.disabled) {
    return withCors(
      json({ ok: false, error: "disabled_code" satisfies RevealGiftDetailsError }),
      req,
    );
  }

  if (region === "greece") {
    return withCors(
      json({
        ok: true,
        region,
        message: "More details to be added later",
      }),
      req,
    );
  }

  return withCors(
    json({
      ok: true,
      region,
      bankDetails: {
        accountName: "NIKKI GEORGIADOU",
        sortCode: "11-67-22",
        accountNumber: "34207560",
        reference: "Please leave a reference or we won't know who to thank",
      },
    }),
    req,
  );
});
