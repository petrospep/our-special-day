export function json(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Expected application/json request body.");
  }

  return (await req.json()) as T;
}
