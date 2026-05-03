const ALLOWED_HEADERS = "authorization, content-type, apikey";
const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/$/, "");

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

function configuredOrigins() {
  const value = Deno.env.get("SITE_ORIGIN") ?? Deno.env.get("SITE_URL") ?? "";

  return value.split(",").map(normalizeOrigin).filter(Boolean);
}

function corsOrigin(req?: Request) {
  const origins = configuredOrigins();

  if (origins.length === 0) {
    return "*";
  }

  const requestOrigin = req?.headers.get("origin");

  if (requestOrigin) {
    const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

    if (origins.includes(normalizedRequestOrigin)) {
      return normalizedRequestOrigin;
    }
  }

  return origins[0];
}

export const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": corsOrigin(),
  "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  "Access-Control-Allow-Methods": ALLOWED_METHODS,
  Vary: "Origin",
};

export function handleCors(req: Request) {
  if (req.method !== "OPTIONS") {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Allow-Origin": corsOrigin(req),
    },
  });
}

export function withCors(response: Response) {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
