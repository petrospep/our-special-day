import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type FunctionErrorPayload = {
  ok?: boolean;
  error?: string;
  message?: string;
};

function isFunctionErrorPayload(value: unknown): value is FunctionErrorPayload {
  return typeof value === "object" && value !== null;
}

function parseFunctionResponse(text: string): unknown {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getFunctionErrorMessage(name: string, data: unknown, fallbackText: string) {
  if (isFunctionErrorPayload(data)) {
    return data.error || data.message || `Function ${name} failed`;
  }

  return fallbackText || `Function ${name} failed`;
}

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export async function callFunction<T>(
  name: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  if (!SUPABASE_URL) {
    throw new Error("Missing VITE_SUPABASE_URL environment variable");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const data = parseFunctionResponse(text);
  const returnedError = isFunctionErrorPayload(data) && data.ok === false;

  if (!response.ok || returnedError) {
    throw new Error(getFunctionErrorMessage(name, data, text));
  }

  return data as T;
}
