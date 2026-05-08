import type { Database } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];

type AdminFunctionError =
  | "unauthenticated"
  | "forbidden"
  | "server_not_configured"
  | "admin_check_failed";

type TableRow<TableName extends string, Fallback> = TableName extends keyof PublicTables
  ? PublicTables[TableName] extends { Row: infer Row }
    ? Row
    : Fallback
  : Fallback;

// TODO: Regenerate Supabase types so these aliases resolve to generated rows.
export type InvitationCodeRow = TableRow<
  "invitation_codes",
  {
    id: string;
    code: string;
    created_at: string;
    created_by: string | null;
    used: boolean;
    used_at: string | null;
    disabled: boolean;
    disabled_at: string | null;
    notes: string | null;
  }
>;

export type RsvpResponseRow = TableRow<
  "rsvp_responses",
  {
    id: string;
    invite_code: string;
    full_name: string;
    attending: boolean;
    guest_count: number;
    dietary_requirements: string | null;
    notes: string | null;
    submitted_at: string;
  }
>;

export type InviteCodeStatus = "valid" | "missing_code" | "not_found" | "used" | "disabled";

export type ValidateInviteRequest = {
  code: string;
};

export type ValidateInviteResponse =
  | {
      ok: true;
      valid: true;
    }
  | {
      ok: true;
      valid: false;
      reason: Exclude<InviteCodeStatus, "valid">;
    }
  | {
      ok: false;
      error: "server_not_configured" | "invite_lookup_failed";
    };

export type SubmitRsvpRequest = {
  code: string;
  fullName: string;
  attending: boolean;
  guestCount: number;
  dietaryRequirements?: string | null;
  notes?: string | null;
};

export type SubmitRsvpResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      error:
        | "invalid_code"
        | "disabled_code"
        | "already_used"
        | "invalid_input"
        | "server_not_configured";
    };

export type SubmitSongRequestRequest = {
  code: string;
  guestName: string;
  songTitle: string;
  artist: string;
};

export type SubmitSongRequestResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      error:
        | "invalid_code"
        | "disabled_code"
        | "used_code"
        | "song_request_limit_reached"
        | "invalid_input"
        | "server_not_configured";
    };

export type GenerateInviteRequest = {
  notes?: string | null;
};

export type GenerateInviteResponse =
  | {
      ok: true;
      code: string;
      url: string | null;
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "invite_create_failed"
        | "code_generation_failed"
        | AdminFunctionError;
    };

export type DisableInviteRequest = {
  code: string;
};

export type DisableInviteResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: "invalid_input" | "invite_disable_failed" | "not_found" | AdminFunctionError;
    };

export type DeleteInviteRequest = {
  code: string;
};

export type DeleteInviteResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "invite_delete_failed"
        | "has_related_records"
        | "not_found"
        | AdminFunctionError;
    };
