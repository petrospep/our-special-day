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
    email: string | null;
    phone_number: string | null;
    submitted_at: string;
  }
>;

export type RsvpGuestRow = TableRow<
  "rsvp_guests",
  {
    id: string;
    rsvp_response_id: string;
    invite_code: string;
    first_name: string;
    last_name: string;
    is_submitter: boolean;
    under_13: boolean;
    age: number | null;
    created_at: string;
  }
>;

export type InviteCodeStatus = "valid" | "missing_code" | "not_found" | "used" | "disabled";

export type SubmittedRsvpGuest = {
  firstName: string;
  lastName: string;
  fullName: string;
  isSubmitter: boolean;
  under13: boolean;
  age: number | null;
};

export type SubmittedRsvpResponse = {
  fullName: string;
  attending: boolean;
  guestCount: number;
  email: string | null;
  phoneNumber: string | null;
  submittedAt: string;
  guests: SubmittedRsvpGuest[];
};

export type SubmittedSongRequest = {
  songTitle: string;
  artist: string;
  createdAt: string;
};

export type ValidateInviteRequest = {
  code: string;
  includeRsvpResponse?: boolean;
  includeSongRequestUsage?: boolean;
  allowUsedForSongRequests?: boolean;
  requireAttendingRsvpForSongRequests?: boolean;
};

export type ValidateInviteResponse =
  | {
      ok: true;
      valid: true;
      songRequestsSubmitted?: number;
      songRequestsLeft?: number;
      songRequestLimit?: number;
      songRequestGuestName?: string;
      songRequests?: SubmittedSongRequest[];
    }
  | {
      ok: true;
      valid: false;
      reason: Exclude<InviteCodeStatus, "valid"> | "rsvp_required" | "not_attending";
      rsvpResponse?: SubmittedRsvpResponse;
    }
  | {
      ok: false;
      error:
        | "server_not_configured"
        | "invite_lookup_failed"
        | "song_request_lookup_failed"
        | "rsvp_response_lookup_failed";
    };

export type SubmitRsvpRequest = {
  code: string;
  submitter: {
    firstName: string;
    lastName: string;
    under13: boolean;
    age?: number | null;
  };
  attending: boolean;
  email?: string | null;
  phoneNumber?: string | null;
  guests: Array<{
    firstName: string;
    lastName: string;
    under13: boolean;
    age?: number | null;
  }>;
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
  songTitle: string;
  artist: string;
};

export type SubmitSongRequestResponse =
  | {
      ok: true;
      songRequestsSubmitted?: number;
      songRequestsLeft?: number;
      songRequestLimit?: number;
      songRequests?: SubmittedSongRequest[];
    }
  | {
      ok: false;
      error:
        | "invalid_code"
        | "disabled_code"
        | "rsvp_required"
        | "not_attending"
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
