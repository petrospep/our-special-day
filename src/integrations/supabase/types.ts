export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string;
          email: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          id: string;
          metadata: Json;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
      invitation_codes: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          disabled: boolean;
          disabled_at: string | null;
          id: string;
          notes: string | null;
          used: boolean;
          used_at: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          disabled?: boolean;
          disabled_at?: string | null;
          id?: string;
          notes?: string | null;
          used?: boolean;
          used_at?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          disabled?: boolean;
          disabled_at?: string | null;
          id?: string;
          notes?: string | null;
          used?: boolean;
          used_at?: string | null;
        };
        Relationships: [];
      };
      rsvp_guests: {
        Row: {
          age: number | null;
          created_at: string;
          first_name: string;
          id: string;
          invite_code: string;
          is_submitter: boolean;
          last_name: string;
          rsvp_response_id: string;
          under_13: boolean;
        };
        Insert: {
          age?: number | null;
          created_at?: string;
          first_name: string;
          id?: string;
          invite_code: string;
          is_submitter?: boolean;
          last_name?: string;
          rsvp_response_id: string;
          under_13?: boolean;
        };
        Update: {
          age?: number | null;
          created_at?: string;
          first_name?: string;
          id?: string;
          invite_code?: string;
          is_submitter?: boolean;
          last_name?: string;
          rsvp_response_id?: string;
          under_13?: boolean;
        };
        Relationships: [];
      };
      rsvp_responses: {
        Row: {
          attending: boolean;
          dietary_requirements: string | null;
          email: string | null;
          full_name: string;
          guest_count: number;
          id: string;
          invite_code: string;
          notes: string | null;
          phone_number: string | null;
          submitted_at: string;
        };
        Insert: {
          attending: boolean;
          dietary_requirements?: string | null;
          email?: string | null;
          full_name: string;
          guest_count?: number;
          id?: string;
          invite_code: string;
          notes?: string | null;
          phone_number?: string | null;
          submitted_at?: string;
        };
        Update: {
          attending?: boolean;
          dietary_requirements?: string | null;
          email?: string | null;
          full_name?: string;
          guest_count?: number;
          id?: string;
          invite_code?: string;
          notes?: string | null;
          phone_number?: string | null;
          submitted_at?: string;
        };
        Relationships: [];
      };
      rsvps: {
        Row: {
          attending: boolean;
          created_at: string;
          dietary_requirements: string | null;
          email: string;
          guest_name: string;
          id: string;
          message: string | null;
          number_of_guests: number;
        };
        Insert: {
          attending: boolean;
          created_at?: string;
          dietary_requirements?: string | null;
          email: string;
          guest_name: string;
          id?: string;
          message?: string | null;
          number_of_guests?: number;
        };
        Update: {
          attending?: boolean;
          created_at?: string;
          dietary_requirements?: string | null;
          email?: string;
          guest_name?: string;
          id?: string;
          message?: string | null;
          number_of_guests?: number;
        };
        Relationships: [];
      };
      song_requests: {
        Row: {
          artist: string;
          created_at: string;
          guest_name: string;
          id: string;
          invite_code: string | null;
          song_title: string;
        };
        Insert: {
          artist: string;
          created_at?: string;
          guest_name: string;
          id?: string;
          invite_code?: string | null;
          song_title: string;
        };
        Update: {
          artist?: string;
          created_at?: string;
          guest_name?: string;
          id?: string;
          invite_code?: string | null;
          song_title?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
