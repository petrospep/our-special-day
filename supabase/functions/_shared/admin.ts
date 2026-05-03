import {
  createClient,
  type SupabaseClient,
  type User,
} from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "./json.ts";

export type AdminAuthSuccess = {
  user: User;
  supabaseAdmin: SupabaseClient;
};

export type AdminAuthResult = AdminAuthSuccess | { errorResponse: Response };

function requiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function secretKey() {
  const key = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!key) {
    throw new Error(
      "Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return key;
}

export function createSupabaseAdminClient() {
  return createClient(requiredEnv("SUPABASE_URL"), secretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function readBearerToken(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

export async function requireAdmin(req: Request): Promise<AdminAuthResult> {
  const token = readBearerToken(req);

  if (!token) {
    return {
      errorResponse: json({ ok: false, error: "unauthenticated" }, 401),
    };
  }

  let supabaseAdmin: SupabaseClient;

  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    console.error(error);

    return {
      errorResponse: json({ ok: false, error: "server_not_configured" }, 500),
    };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return {
      errorResponse: json({ ok: false, error: "unauthenticated" }, 401),
    };
  }

  const { data: adminUser, error: adminError } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError) {
    console.error(adminError);

    return {
      errorResponse: json({ ok: false, error: "admin_check_failed" }, 500),
    };
  }

  if (!adminUser) {
    return {
      errorResponse: json({ ok: false, error: "forbidden" }, 403),
    };
  }

  return {
    user: userData.user,
    supabaseAdmin,
  };
}
